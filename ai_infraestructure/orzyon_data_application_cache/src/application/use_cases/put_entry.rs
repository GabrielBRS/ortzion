//! Caso de uso: inserir ou substituir uma entrada.

use std::{sync::Arc, time::Duration};

use bytes::Bytes;

use crate::{
    application::ports::cache_repository::CacheRepository,
    domain::{error::CacheError, key::CacheKey},
};

/// Insere/substitui uma entrada, aplicando as regras de aplicação:
/// validação de identidade (domínio), limite de tamanho do valor e
/// resolução do TTL (o do request, quando informado, senão o padrão).
pub struct PutEntry {
    repository: Arc<dyn CacheRepository>,
    default_ttl: Duration,
    max_entry_bytes: usize,
}

impl PutEntry {
    pub fn new(
        repository: Arc<dyn CacheRepository>,
        default_ttl: Duration,
        max_entry_bytes: usize,
    ) -> Self {
        Self {
            repository,
            default_ttl,
            max_entry_bytes,
        }
    }

    pub async fn execute(
        &self,
        namespace: &str,
        entry_key: &str,
        value: Bytes,
        ttl: Option<Duration>,
    ) -> Result<(), CacheError> {
        let key = CacheKey::new(namespace, entry_key)?;

        if value.len() > self.max_entry_bytes {
            return Err(CacheError::EntryTooLarge {
                size: value.len(),
                max: self.max_entry_bytes,
            });
        }

        let ttl = match ttl {
            Some(ttl) if ttl.is_zero() => {
                return Err(CacheError::InvalidTtl(
                    "TTL must be greater than zero".to_string(),
                ));
            }
            Some(ttl) => ttl,
            None => self.default_ttl,
        };

        self.repository.put(key, value, ttl).await
    }
}
