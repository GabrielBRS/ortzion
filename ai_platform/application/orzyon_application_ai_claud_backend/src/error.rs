//! Erros padronizados da API: código estável, mensagem em pt-BR, detalhes de
//! validação e identificador de requisição. Nunca expõe stack traces.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use utoipa::ToSchema;

pub mod codes {
    pub const VALIDATION: &str = "validation_error";
    pub const UNAUTHENTICATED: &str = "unauthenticated";
    pub const FORBIDDEN: &str = "forbidden";
    pub const NOT_FOUND: &str = "not_found";
    pub const CONFLICT: &str = "conflict";
    pub const IDEMPOTENCY_CONFLICT: &str = "idempotency_key_conflict";
    pub const DEMO_MODE_DISABLED: &str = "demo_mode_disabled";
    pub const CSRF: &str = "csrf_origin_rejected";
    pub const INTERNAL: &str = "internal_error";
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ApiErrorBody {
    pub code: String,
    pub message: String,
    pub details: Vec<String>,
    /// Preenchido pelo middleware de request id antes de enviar a resposta.
    pub request_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ApiError {
    pub status: StatusCode,
    pub code: &'static str,
    pub message: String,
    pub details: Vec<String>,
}

pub type AppResult<T> = Result<T, ApiError>;

impl ApiError {
    pub fn new(status: StatusCode, code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status,
            code,
            message: message.into(),
            details: Vec::new(),
        }
    }

    pub fn with_details(mut self, details: Vec<String>) -> Self {
        self.details = details;
        self
    }

    pub fn validation(message: impl Into<String>, details: Vec<String>) -> Self {
        Self::new(StatusCode::UNPROCESSABLE_ENTITY, codes::VALIDATION, message).with_details(details)
    }

    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(StatusCode::BAD_REQUEST, codes::VALIDATION, message)
    }

    pub fn unauthenticated(message: impl Into<String>) -> Self {
        Self::new(StatusCode::UNAUTHORIZED, codes::UNAUTHENTICATED, message)
    }

    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::new(StatusCode::FORBIDDEN, codes::FORBIDDEN, message)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(StatusCode::NOT_FOUND, codes::NOT_FOUND, message)
    }

    pub fn conflict(message: impl Into<String>, details: Vec<String>) -> Self {
        Self::new(StatusCode::CONFLICT, codes::CONFLICT, message).with_details(details)
    }

    pub fn internal() -> Self {
        Self::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            codes::INTERNAL,
            "Erro interno. Tente novamente em instantes.",
        )
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(e: sqlx::Error) -> Self {
        tracing::error!(error = %e, "erro de banco de dados");
        ApiError::internal()
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = ApiErrorBody {
            code: self.code.to_string(),
            message: self.message,
            details: self.details,
            request_id: None,
        };
        (
            self.status,
            Json(serde_json::json!({ "error": body })),
        )
            .into_response()
    }
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorEnvelope {
    pub error: ApiErrorBody,
}
