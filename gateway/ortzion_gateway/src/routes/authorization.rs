use axum::{
    extract::{Extension, State},
    routing::get,
    Json, Router,
};
use serde::Serialize;

use crate::error::GatewayError;
use crate::grcp_clients::identity::Principal;
use crate::state::AppState;

pub struct Authorization {
    pub routes: Router<AppState>,
}

impl Authorization {
    pub fn new() -> Self {
        Self {
            routes: Router::new().route("/check", get(check)),
        }
    }
}

#[derive(Serialize)]
struct CheckResponse {
    allowed: bool,
    reason: String,
    subject: String,
}

async fn check(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
) -> Result<Json<CheckResponse>, GatewayError> {
    let decision = state
        .clients
        .authorization
        .authorize(&principal, "GET", "/authorization/check")
        .await?;

    Ok(Json(CheckResponse {
        allowed: decision.allowed,
        reason: decision.reason,
        subject: principal.subject,
    }))
}
