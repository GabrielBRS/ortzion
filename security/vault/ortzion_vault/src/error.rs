//! O erro do vault.
//!
//! MENTALIDADE JAVA A CORRIGIR: em Java você tem uma HIERARQUIA de exceções
//! (`VaultException` -> `SealedException` -> ...) porque a única forma de
//! "um erro OU outro" é herança. Rust tem soma de tipos nativa: um enum É
//! o "ou". Sem hierarquia, sem `instanceof`, sem catch por tipo pai.
//! O `match` é exaustivo — esqueceu uma variante, não compila.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("vault selado")]
    Selado,
    #[error("vault já inicializado")]
    JaInicializado,
    #[error("vault não inicializado")]
    NaoInicializado,
    #[error("quórum insuficiente")]
    QuorumInsuficiente { tem: usize, precisa: usize },
    #[error("falha ao abrir o vault")]
    UnsealFalhou,

    #[error("certificado de cliente ausente")]
    SemCert,
    #[error("certificado de cliente inválido")]
    CertInvalido,
    #[error("permissão negada")]
    Proibido,

    #[error("caminho inválido")]
    CaminhoInvalido,
    #[error("não encontrado")]
    NaoEncontrado,

    /// Display diz só "erro interno". O detalhe vai pro log, nunca pro cliente.
    #[error("erro interno")]
    Infra(String),
}

impl VaultError {
    pub fn infra<E: std::fmt::Display>(e: E) -> Self {
        VaultError::Infra(e.to_string())
    }
}

impl IntoResponse for VaultError {
    fn into_response(self) -> Response {
        let status = match self {
            // 503, não 500: selado é estado esperado, e o k8s precisa
            // distinguir "quebrado" de "esperando unseal".
            VaultError::Selado => StatusCode::SERVICE_UNAVAILABLE,

            VaultError::JaInicializado => StatusCode::CONFLICT,
            VaultError::NaoInicializado => StatusCode::PRECONDITION_FAILED,
            VaultError::QuorumInsuficiente { .. } => StatusCode::ACCEPTED,
            VaultError::UnsealFalhou => StatusCode::BAD_REQUEST,

            VaultError::SemCert | VaultError::CertInvalido => StatusCode::UNAUTHORIZED,
            VaultError::Proibido => StatusCode::FORBIDDEN,

            VaultError::CaminhoInvalido => StatusCode::BAD_REQUEST,
            VaultError::NaoEncontrado => StatusCode::NOT_FOUND,

            VaultError::Infra(ref detalhe) => {
                tracing::error!(%detalhe, "falha interna");
                StatusCode::INTERNAL_SERVER_ERROR
            }
        };

        let corpo = match &self {
            VaultError::QuorumInsuficiente { tem, precisa } => {
                json!({ "erro": self.to_string(), "tem": tem, "precisa": precisa })
            }
            _ => json!({ "erro": self.to_string() }),
        };

        (status, Json(corpo)).into_response()
    }
}