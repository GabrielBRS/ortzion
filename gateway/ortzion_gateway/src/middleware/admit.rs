use axum::{
    extract::{Request, State},
    http::header::AUTHORIZATION,
    middleware::Next,
    response::Response,
};

use crate::error::GatewayError;
use crate::mapping;
use crate::state::AppState;

pub async fn admit(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, GatewayError> {
    if req.uri().path().starts_with("/health") {
        return Ok(next.run(req).await);
    }

    let token = mapping::token_from_authorization(req.headers().get(AUTHORIZATION))?;
    let principal = state.clients.identity.who_am_i(&token).await?;
    let decision = state
        .clients
        .authorization
        .authorize(&principal, req.method().as_str(), req.uri().path())
        .await?;

    if !decision.allowed {
        return Err(GatewayError::Forbidden {
            reason: decision.reason,
        });
    }

    req.extensions_mut().insert(principal);
    Ok(next.run(req).await)
}
