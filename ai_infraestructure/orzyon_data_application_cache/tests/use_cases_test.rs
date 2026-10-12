//! Testes dos casos de uso com um repositório em memória (stub do
//! port `CacheRepository`), mantendo os casos de uso desacoplados do
//! Moka. Cobre também a aplicação do TTL padrão e de limites.

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::Duration,
};

use async_trait::async_trait;
use bytes::Bytes;
use orzyon_data_application_cache::{
    application::{
        ports::cache_repository::CacheRepository,
        use_cases::{delete_entry::DeleteEntry, get_entry::GetEntry, put_entry::PutEntry},
    },
    domain::{error::CacheError, key::CacheKey},
};

#[derive(Default)]
struct RecordingRepository {
    entries: Mutex<HashMap<CacheKey, (Bytes, Duration)>>,
}

#[async_trait]
impl CacheRepository for RecordingRepository {
    async fn put(&self, key: CacheKey, value: Bytes, ttl: Duration) -> Result<(), CacheError> {
        self.entries.lock().unwrap().insert(key, (value, ttl));
        Ok(())
    }

    async fn get(&self, key: &CacheKey) -> Result<Option<Bytes>, CacheError> {
        Ok(self
            .entries
            .lock()
            .unwrap()
            .get(key)
            .map(|(value, _)| value.clone()))
    }

    async fn delete(&self, key: &CacheKey) -> Result<bool, CacheError> {
        Ok(self.entries.lock().unwrap().remove(key).is_some())
    }
}

const DEFAULT_TTL: Duration = Duration::from_secs(60);
const MAX_ENTRY_BYTES: usize = 1024;

fn use_cases() -> (PutEntry, GetEntry, DeleteEntry) {
    let repository: Arc<dyn CacheRepository> = Arc::new(RecordingRepository::default());
    (
        PutEntry::new(Arc::clone(&repository), DEFAULT_TTL, MAX_ENTRY_BYTES),
        GetEntry::new(Arc::clone(&repository)),
        DeleteEntry::new(repository),
    )
}

#[tokio::test]
async fn put_then_get_returns_value() {
    let (put, get, _delete) = use_cases();

    put.execute("ns", "k", Bytes::from_static(b"v1"), None)
        .await
        .unwrap();

    let value = get.execute("ns", "k").await.unwrap();
    assert_eq!(value, Some(Bytes::from_static(b"v1")));
}

#[tokio::test]
async fn put_overwrites_existing_entry() {
    let (put, get, _delete) = use_cases();

    put.execute("ns", "k", Bytes::from_static(b"v1"), None)
        .await
        .unwrap();
    put.execute("ns", "k", Bytes::from_static(b"v2"), None)
        .await
        .unwrap();

    assert_eq!(
        get.execute("ns", "k").await.unwrap(),
        Some(Bytes::from_static(b"v2"))
    );
}

#[tokio::test]
async fn get_missing_key_is_none() {
    let (_put, get, _delete) = use_cases();
    assert_eq!(get.execute("ns", "missing").await.unwrap(), None);
}

#[tokio::test]
async fn get_distinguishes_hit_with_empty_value_from_miss() {
    let (put, get, _delete) = use_cases();

    put.execute("ns", "empty", Bytes::new(), None)
        .await
        .unwrap();

    // Hit com valor vazio => Some(vazio); miss => None.
    assert_eq!(
        get.execute("ns", "empty").await.unwrap(),
        Some(Bytes::new())
    );
    assert_eq!(get.execute("ns", "absent").await.unwrap(), None);
}

#[tokio::test]
async fn delete_is_idempotent() {
    let (put, get, delete) = use_cases();

    // Excluir inexistente não falha.
    assert!(!delete.execute("ns", "k").await.unwrap());

    put.execute("ns", "k", Bytes::from_static(b"v"), None)
        .await
        .unwrap();
    assert!(delete.execute("ns", "k").await.unwrap());
    assert_eq!(get.execute("ns", "k").await.unwrap(), None);

    // Segunda exclusão continua sem erro.
    assert!(!delete.execute("ns", "k").await.unwrap());
}

#[tokio::test]
async fn namespaces_are_isolated() {
    let (put, get, _delete) = use_cases();

    put.execute("ns-a", "same-key", Bytes::from_static(b"a"), None)
        .await
        .unwrap();
    put.execute("ns-b", "same-key", Bytes::from_static(b"b"), None)
        .await
        .unwrap();

    assert_eq!(
        get.execute("ns-a", "same-key").await.unwrap(),
        Some(Bytes::from_static(b"a"))
    );
    assert_eq!(
        get.execute("ns-b", "same-key").await.unwrap(),
        Some(Bytes::from_static(b"b"))
    );
}

#[tokio::test]
async fn default_ttl_is_applied_when_request_has_none() {
    let repository = Arc::new(RecordingRepository::default());
    let repository_dyn: Arc<dyn CacheRepository> = repository.clone();
    let put = PutEntry::new(repository_dyn, DEFAULT_TTL, MAX_ENTRY_BYTES);

    put.execute("ns", "k", Bytes::from_static(b"v"), None)
        .await
        .unwrap();

    let entries = repository.entries.lock().unwrap();
    let (_, ttl) = entries.get(&CacheKey::new("ns", "k").unwrap()).unwrap();
    assert_eq!(*ttl, DEFAULT_TTL);
}

#[tokio::test]
async fn explicit_ttl_overrides_default() {
    let repository = Arc::new(RecordingRepository::default());
    let repository_dyn: Arc<dyn CacheRepository> = repository.clone();
    let put = PutEntry::new(repository_dyn, DEFAULT_TTL, MAX_ENTRY_BYTES);

    let custom = Duration::from_secs(5);
    put.execute("ns", "k", Bytes::from_static(b"v"), Some(custom))
        .await
        .unwrap();

    let entries = repository.entries.lock().unwrap();
    let (_, ttl) = entries.get(&CacheKey::new("ns", "k").unwrap()).unwrap();
    assert_eq!(*ttl, custom);
}

#[tokio::test]
async fn rejects_empty_namespace_and_key() {
    let (put, _get, _delete) = use_cases();

    let err = put
        .execute("", "k", Bytes::from_static(b"v"), None)
        .await
        .unwrap_err();
    assert!(matches!(err, CacheError::InvalidNamespace(_)));

    let err = put
        .execute("ns", "", Bytes::from_static(b"v"), None)
        .await
        .unwrap_err();
    assert!(matches!(err, CacheError::InvalidKey(_)));
}

#[tokio::test]
async fn rejects_oversized_value() {
    let (put, _get, _delete) = use_cases();
    let oversized = Bytes::from(vec![0u8; MAX_ENTRY_BYTES + 1]);

    let err = put.execute("ns", "k", oversized, None).await.unwrap_err();
    assert!(
        matches!(err, CacheError::EntryTooLarge { size, max } if size == MAX_ENTRY_BYTES + 1 && max == MAX_ENTRY_BYTES)
    );
}

#[tokio::test]
async fn rejects_zero_ttl() {
    let (put, _get, _delete) = use_cases();

    let err = put
        .execute("ns", "k", Bytes::from_static(b"v"), Some(Duration::ZERO))
        .await
        .unwrap_err();
    assert!(matches!(err, CacheError::InvalidTtl(_)));
}

#[tokio::test]
async fn value_at_exactly_max_size_is_accepted() {
    let (put, get, _delete) = use_cases();
    let value = Bytes::from(vec![7u8; MAX_ENTRY_BYTES]);

    put.execute("ns", "k", value.clone(), None).await.unwrap();
    assert_eq!(get.execute("ns", "k").await.unwrap(), Some(value));
}
