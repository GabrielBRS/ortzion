pub mod authorization;
pub mod big_data;
pub mod health;
pub mod identity;
pub mod ortzion;
pub mod payments;
pub mod smart_finance;

use axum::Router;
use serde::Serialize;

use crate::state::AppState;

pub use identity::Identity;

#[derive(Serialize)]
pub struct PingResponse {
    pub service: &'static str,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .merge(health::router())
        .nest("/identity", Identity::new().routes)
        .nest("/authorization", authorization::Authorization::new().routes)
        .nest("/payments", payments::Payments::new().routes)
        .nest("/smart-finance", smart_finance::SmartFinance::new().routes)
        .nest("/ortzion", ortzion::Ortzion::new().routes)
        .nest("/big-data", big_data::BigData::new().routes)
}
