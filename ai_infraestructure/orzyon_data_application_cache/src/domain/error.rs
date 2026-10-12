//! Erros de domínio e de aplicação, compartilhados por todas as camadas.

use thiserror::Error;

/// Erros de validação e de execução do cache.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum CacheError {
    #[error("invalid namespace: {0}")]
    InvalidNamespace(String),

    #[error("invalid key: {0}")]
    InvalidKey(String),

    #[error("invalid TTL: {0}")]
    InvalidTtl(String),

    #[error("entry value is too large: {size} bytes exceeds the limit of {max} bytes")]
    EntryTooLarge { size: usize, max: usize },

    #[error("internal cache error: {0}")]
    Internal(String),
}
