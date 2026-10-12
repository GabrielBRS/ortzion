use axum::http::HeaderValue;
use serde::Serialize;

use crate::error::GatewayError;
use crate::grcp_clients::identity::Principal;

#[derive(Serialize)]
pub struct MeResponse {
    pub subject: String,
    pub tenant: String,
}

pub fn token_from_authorization(value: Option<&HeaderValue>) -> Result<String, GatewayError> {
    let raw = value
        .and_then(|v| v.to_str().ok())
        .ok_or(GatewayError::Unauthenticated)?;

    let token = raw
        .strip_prefix("Bearer ")
        .unwrap_or(raw)
        .trim();

    if token.is_empty() {
        return Err(GatewayError::Unauthenticated);
    }

    Ok(token.to_string())
}

pub fn principal_to_me(principal: &Principal) -> MeResponse {
    MeResponse {
        subject: principal.subject.clone(),
        tenant: principal.tenant.clone(),
    }
}
