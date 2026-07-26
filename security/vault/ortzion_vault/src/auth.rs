//! Quem é você (cert) + o que você pode (policy).
//!
//! A IDEIA CENTRAL:
//!   Rota é CÓDIGO. Caminho é DADO. Policy é DADO.
//!
//! `smart-finance/pix/db` NÃO é uma rota. Se fosse, adicionar o serviço de
//! Crédito exigiria recompilar e redeployar o vault — o componente que menos
//! pode reiniciar. Existe UMA rota: `/v1/kv/{*caminho}`.

pub mod policy;

pub use policy::{Policy, PolicyStore, Regra};

use std::sync::Arc;

use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
};
use serde::{Deserialize, Serialize};

use crate::{tls::PeerCert, VaultError};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Acao {
    Ler,
    Escrever,
    Apagar,
    Listar,
}

/// A identidade do chamador. Vem do CERTIFICADO, nunca do body ou de header.
///
/// Isto importa: se a identidade viesse de um header (`X-App-Id: pix`), o
/// cliente escolheria quem ele é, e a autorização inteira viraria decoração.
/// O SAN URI do cert foi assinado pelo seu CA e o cliente não consegue forjar
/// sem a chave privada do CA.
#[derive(Debug, Clone)]
pub struct Identidade {
    /// spiffe://sgt/smart-finance/pix
    pub spiffe: String,
}

impl<S> FromRequestParts<S> for Identidade
where
    S: Send + Sync,
{
    type Rejection = VaultError;

    // Sem #[async_trait]: axum 0.8 usa async nativo em trait para extractors.
    // Se você copiar exemplo de 0.7, vai ter o atributo aqui e não compila.
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // O accept loop em tls.rs injeta isto. Se não tem cert, a conexão TLS
        // nem teria sido estabelecida — mas checamos de qualquer forma.
        let cert = parts
            .extensions
            .get::<PeerCert>()
            .ok_or(VaultError::SemCert)?;
        Ok(Identidade {
            spiffe: cert.spiffe.clone(),
        })
    }
}

/// Só existe se o vault estiver ABERTO.
///
/// Mesmo truque do AdminClaims: a máquina de estados vira tipo. Um handler
/// que pede `VaultAberto` é literalmente incapaz de rodar com o vault selado.
/// Não é `if`, não é convenção, não é code review. É a assinatura da função.
pub struct VaultAberto(pub Arc<crate::keyring::Keyring>);

impl<S> FromRequestParts<S> for VaultAberto
where
    Arc<crate::seal::Vault>: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = VaultError;

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let vault = Arc::<crate::seal::Vault>::from_ref(state);
        Ok(VaultAberto(vault.keyring().await?)) // Err(Selado) => 503
    }
}