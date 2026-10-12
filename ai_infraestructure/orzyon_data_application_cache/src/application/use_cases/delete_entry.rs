//! Caso de uso: remover uma entrada (idempotente).

use std::sync::Arc;

use crate::{
    application::ports::cache_repository::CacheRepository,
    domain::{error::CacheError, key::CacheKey},
};

/// Remove a entrada. Excluir chave inexistente é bem-sucedido e
/// retorna `false` — nunca falha por "não encontrado".
pub struct DeleteEntry {
    repository: Arc<dyn CacheRepository>,
}

impl DeleteEntry {
    pub fn new(repository: Arc<dyn CacheRepository>) -> Self {
        Self { repository }
    }

    pub async fn execute(&self, namespace: &str, entry_key: &str) -> Result<bool, CacheError> {
        let key = CacheKey::new(namespace, entry_key)?;
        self.repository.delete(&key).await
    }
}
