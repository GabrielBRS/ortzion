//! Implementação do port [`CacheRepository`] com Moka
//! (`moka::future::Cache`).
//!
//! O Moka é o único repositório de dados deste serviço: capacidade em
//! quantidade de entradas, TTL por entrada e expiração são delegados a
//! ele. DashMap não é usado nesta etapa — não há estado auxiliar
//! concorrente que justifique uma segunda estrutura (ver README).

use std::time::{Duration, Instant};

use async_trait::async_trait;
use bytes::Bytes;
use moka::{future::Cache, Expiry};

use crate::{
    application::ports::cache_repository::CacheRepository,
    domain::{error::CacheError, key::CacheKey},
};

/// Valor armazenado junto com o TTL resolvido, consumido pela política
/// de expiração do Moka.
#[derive(Clone)]
struct StoredValue {
    data: Bytes,
    ttl: Duration,
}

/// Política de expiração por entrada: usa o TTL gravado no valor
/// (já resolvido pelo caso de uso: TTL do request ou padrão).
struct PerEntryExpiry;

impl Expiry<CacheKey, StoredValue> for PerEntryExpiry {
    fn expire_after_create(
        &self,
        _key: &CacheKey,
        value: &StoredValue,
        _created_at: Instant,
    ) -> Option<Duration> {
        Some(value.ttl)
    }
}

/// Repositório de cache baseado em Moka, dentro do processo.
pub struct MokaCacheRepository {
    cache: Cache<CacheKey, StoredValue>,
}

impl MokaCacheRepository {
    pub fn new(max_capacity: u64) -> Self {
        let cache = Cache::builder()
            .max_capacity(max_capacity)
            .expire_after(PerEntryExpiry)
            .build();
        Self { cache }
    }
}

#[async_trait]
impl CacheRepository for MokaCacheRepository {
    async fn put(&self, key: CacheKey, value: Bytes, ttl: Duration) -> Result<(), CacheError> {
        self.cache
            .insert(key, StoredValue { data: value, ttl })
            .await;
        Ok(())
    }

    async fn get(&self, key: &CacheKey) -> Result<Option<Bytes>, CacheError> {
        Ok(self.cache.get(key).await.map(|stored| stored.data))
    }

    async fn delete(&self, key: &CacheKey) -> Result<bool, CacheError> {
        Ok(self.cache.remove(key).await.is_some())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn evicts_entries_beyond_capacity() {
        let repo = MokaCacheRepository::new(2);

        for i in 0..3u8 {
            let key = CacheKey::new("capacity-test", &format!("key-{i}")).unwrap();
            repo.put(key, Bytes::from_static(b"value"), Duration::from_secs(60))
                .await
                .unwrap();
        }
        repo.cache.run_pending_tasks().await;

        let count = repo.cache.entry_count();
        assert!(
            count <= 2,
            "expected eviction down to capacity, got {count} entries"
        );
    }
}
