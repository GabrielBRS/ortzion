//! Testes do adaptador outbound Moka (`MokaCacheRepository`):
//! CRUD, sobrescrita, miss, exclusão idempotente, isolamento entre
//! namespaces, valor vazio e expiração por TTL.

use std::time::Duration;

use bytes::Bytes;
use orzyon_data_application_cache::{
    adapters::outbound::cache::moka_repository::MokaCacheRepository,
    application::ports::cache_repository::CacheRepository, domain::key::CacheKey,
};

const TTL: Duration = Duration::from_secs(60);

fn repo() -> MokaCacheRepository {
    MokaCacheRepository::new(1000)
}

#[tokio::test]
async fn put_then_get_returns_value() {
    let repo = repo();
    let key = CacheKey::new("ns", "k").unwrap();

    repo.put(key.clone(), Bytes::from_static(b"v"), TTL)
        .await
        .unwrap();

    assert_eq!(
        repo.get(&key).await.unwrap(),
        Some(Bytes::from_static(b"v"))
    );
}

#[tokio::test]
async fn put_overwrites_existing_entry() {
    let repo = repo();
    let key = CacheKey::new("ns", "k").unwrap();

    repo.put(key.clone(), Bytes::from_static(b"v1"), TTL)
        .await
        .unwrap();
    repo.put(key.clone(), Bytes::from_static(b"v2"), TTL)
        .await
        .unwrap();

    assert_eq!(
        repo.get(&key).await.unwrap(),
        Some(Bytes::from_static(b"v2"))
    );
}

#[tokio::test]
async fn get_missing_key_returns_none() {
    let repo = repo();
    let key = CacheKey::new("ns", "missing").unwrap();
    assert_eq!(repo.get(&key).await.unwrap(), None);
}

#[tokio::test]
async fn empty_value_is_a_hit_not_a_miss() {
    let repo = repo();
    let key = CacheKey::new("ns", "empty").unwrap();

    repo.put(key.clone(), Bytes::new(), TTL).await.unwrap();

    // Hit com valor vazio => Some(Bytes::new()) — distinguível de None.
    assert_eq!(repo.get(&key).await.unwrap(), Some(Bytes::new()));
}

#[tokio::test]
async fn delete_is_idempotent() {
    let repo = repo();
    let key = CacheKey::new("ns", "k").unwrap();

    assert!(!repo.delete(&key).await.unwrap());

    repo.put(key.clone(), Bytes::from_static(b"v"), TTL)
        .await
        .unwrap();
    assert!(repo.delete(&key).await.unwrap());
    assert_eq!(repo.get(&key).await.unwrap(), None);

    assert!(!repo.delete(&key).await.unwrap());
}

#[tokio::test]
async fn namespaces_are_isolated() {
    let repo = repo();
    let key_a = CacheKey::new("ns-a", "same").unwrap();
    let key_b = CacheKey::new("ns-b", "same").unwrap();

    repo.put(key_a.clone(), Bytes::from_static(b"a"), TTL)
        .await
        .unwrap();
    repo.put(key_b.clone(), Bytes::from_static(b"b"), TTL)
        .await
        .unwrap();

    assert_eq!(
        repo.get(&key_a).await.unwrap(),
        Some(Bytes::from_static(b"a"))
    );
    assert_eq!(
        repo.get(&key_b).await.unwrap(),
        Some(Bytes::from_static(b"b"))
    );

    // Remover em um namespace não afeta o outro.
    assert!(repo.delete(&key_a).await.unwrap());
    assert_eq!(repo.get(&key_a).await.unwrap(), None);
    assert_eq!(
        repo.get(&key_b).await.unwrap(),
        Some(Bytes::from_static(b"b"))
    );
}

#[tokio::test]
async fn entry_expires_after_ttl() {
    let repo = repo();
    let key = CacheKey::new("ns", "ephemeral").unwrap();

    // TTL curto, mas com margem confortável para evitar teste frágil.
    repo.put(
        key.clone(),
        Bytes::from_static(b"v"),
        Duration::from_millis(100),
    )
    .await
    .unwrap();

    // Antes da expiração: hit.
    assert_eq!(
        repo.get(&key).await.unwrap(),
        Some(Bytes::from_static(b"v"))
    );

    tokio::time::sleep(Duration::from_millis(250)).await;

    // Após a expiração: miss.
    assert_eq!(repo.get(&key).await.unwrap(), None);
}
