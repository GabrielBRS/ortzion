//! Rotas de sistema. As únicas que respondem com o vault selado.

use std::sync::Arc;

use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;
use zeroize::{Zeroize, Zeroizing};

use crate::{
    seal::{EstadoPublico, Vault},
    VaultError,
};

/// Liveness. O processo respira? Não toca no vault.
/// Se esta rota checasse o estado do vault, um vault selado seria "unhealthy"
/// e o kubelet mataria o pod em loop — impedindo você de fazer o unseal.
pub async fn health() -> &'static str {
    "ok"
}

/// Readiness. Dá pra atender? Selado => não.
pub async fn estado(State(vault): State<Arc<Vault>>) -> (StatusCode, Json<EstadoPublico>) {
    let e = vault.estado_publico().await;
    let st = if e.selado {
        StatusCode::SERVICE_UNAVAILABLE
    } else {
        StatusCode::OK
    };
    (st, Json(e))
}

#[derive(Deserialize)]
pub struct PartesReq {
    pub partes: Vec<String>,
}

impl Drop for PartesReq {
    // O serde já alocou a senha em claro no heap. Sem isto, ela fica lá
    // depois do request. Não é paranoia: é 3 linhas.
    fn drop(&mut self) {
        for p in &mut self.partes {
            p.zeroize();
        }
    }
}

/// UMA VEZ NA VIDA. Gera a root key e sela.
///
/// NOTA DE PRODUÇÃO: esta rota não tem autenticação, porque no `init` ainda
/// não existe policy nem CA carregada de forma útil. A mitigação real é de
/// rede: `/sys/init` só deve ser alcançável de localhost ou de uma rede de
/// management. Um `init` chamado por um atacante antes de você = ele é dono
/// do vault. É o único momento em que o vault é vulnerável por design.
pub async fn init(
    State(vault): State<Arc<Vault>>,
    Json(req): Json<PartesReq>,
) -> Result<StatusCode, VaultError> {
    let partes: Vec<_> = req
        .partes
        .iter()
        .map(|s| Zeroizing::new(s.as_bytes().to_vec()))
        .collect();

    vault.init(partes).await?;
    Ok(StatusCode::CREATED)
}

#[derive(Deserialize)]
pub struct UnsealReq {
    pub parte: String,
}

impl Drop for UnsealReq {
    fn drop(&mut self) {
        self.parte.zeroize();
    }
}

pub async fn unseal(
    State(vault): State<Arc<Vault>>,
    Json(req): Json<UnsealReq>,
) -> Result<Json<EstadoPublico>, VaultError> {
    let parte = Zeroizing::new(req.parte.as_bytes().to_vec());
    Ok(Json(vault.unseal(parte).await?))
}

/// Break-glass. Descobriu invasão? Sela e a root key some da RAM.
pub async fn seal(State(vault): State<Arc<Vault>>) -> StatusCode {
    vault.seal().await;
    StatusCode::NO_CONTENT
}