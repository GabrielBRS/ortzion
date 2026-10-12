//! Port de armazenamento: abstração usada pelos casos de uso para
//! persistir e recuperar entradas, independente da tecnologia concreta
//! (Moka, memória para testes, etc.).

use std::time::Duration;

use async_trait::async_trait;
use bytes::Bytes;

use crate::domain::{error::CacheError, key::CacheKey};

/// Operações de armazenamento do cache.
#[async_trait]
pub trait CacheRepository: Send + Sync {
    /// Insere ou substitui a entrada identificada por `key`, vivendo
    /// por `ttl` (após `ttl`, a entrada expira e passa a ser um miss).
    async fn put(&self, key: CacheKey, value: Bytes, ttl: Duration) -> Result<(), CacheError>;

    /// Retorna o valor associado a `key`, ou `None` em cache miss
    /// (diferente de um hit com valor vazio, que é `Some(Bytes::new())`).
    async fn get(&self, key: &CacheKey) -> Result<Option<Bytes>, CacheError>;

    /// Remove a entrada. Retorna `true` se existia. Idempotente:
    /// remover chave inexistente retorna `false`, sem erro.
    async fn delete(&self, key: &CacheKey) -> Result<bool, CacheError>;
}
