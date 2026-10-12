//! Tradução de [`CacheError`] para status gRPC.
//!
//! Nunca expõe valores de entradas do cache; erros internos são
//! registrados no log do servidor e retornados de forma genérica.

use tonic::Status;
use tracing::error;

use crate::domain::error::CacheError;

pub fn cache_error_to_status(err: CacheError) -> Status {
    match &err {
        CacheError::InvalidNamespace(_) | CacheError::InvalidKey(_) | CacheError::InvalidTtl(_) => {
            Status::invalid_argument(err.to_string())
        }
        CacheError::EntryTooLarge { .. } => Status::invalid_argument(err.to_string()),
        CacheError::Internal(message) => {
            error!(error = %message, "internal cache error");
            Status::internal("internal cache error")
        }
    }
}
