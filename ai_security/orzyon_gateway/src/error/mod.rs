use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug)]
pub enum GatewayError {
    Unauthenticated,
    Forbidden { reason: String },
    BadRequest { message: String },
    Unavailable { service: &'static str },
}

impl IntoResponse for GatewayError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            Self::Unauthenticated => (
                StatusCode::UNAUTHORIZED,
                "unauthenticated",
                "credencial ausente ou recusada pelo identity".into(),
            ),
            Self::Forbidden { reason } => (StatusCode::FORBIDDEN, "forbidden", reason.clone()),
            Self::BadRequest { message } => {
                (StatusCode::BAD_REQUEST, "bad_request", message.clone())
            }
            Self::Unavailable { service } => (
                StatusCode::BAD_GATEWAY,
                "unavailable",
                format!("{service} não respondeu"),
            ),
        };

        (
            status,
            Json(json!({ "error": code, "message": message })),
        )
            .into_response()
    }
}
