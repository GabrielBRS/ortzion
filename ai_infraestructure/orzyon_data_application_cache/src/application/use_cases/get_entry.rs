//! Caso de uso: buscar uma entrada.

use std::sync::Arc;

use bytes::Bytes;

use crate::{
    application::ports::cache_repository::CacheRepository,
    domain::{error::CacheError, key::CacheKey},
};

/// Busca uma entrada. `Ok(None)` representa cache miss;
/// `Ok(Some(bytes))` representa hit — inclusive com valor vazio.
pub struct GetEntry {
    repository: Arc<dyn CacheRepository>,
}

impl GetEntry {
    pub fn new(repository: Arc<dyn CacheRepository>) -> Self {
        Self { repository }
    }

    pub async fn execute(
        &self,
        namespace: &str,
        entry_key: &str,
    ) -> Result<Option<Bytes>, CacheError> {
        let key = CacheKey::new(namespace, entry_key)?;
        self.repository.get(&key).await
    }
}
