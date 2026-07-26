pub mod api;
pub mod audit;
pub mod auth;
pub mod config;
pub mod error;
pub mod keyring;
pub mod seal;
pub mod store;
pub mod tls;

pub use error::VaultError;

use std::sync::Arc;

#[derive(Clone, axum::extract::FromRef)]
pub struct AppState {
    pub vault: Arc<seal::Vault>,
    pub policies: Arc<auth::PolicyStore>,
    pub audit: Arc<audit::AuditLog>,
}