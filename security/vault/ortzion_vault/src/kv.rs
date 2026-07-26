//! Os handlers de segredo.
//!
//! Olha a assinatura de `ler`. Quatro portões, todos ANTES do corpo rodar:
//!
//!   VaultAberto  -> selado? o handler não existe.  503
//!   Identidade   -> sem cert? não existe.          401
//!   normalizar   -> `..`? não passa.               400
//!   autorizar    -> sem policy? nega por default.  403
//!
//! Três dos quatro são TIPOS, não `if`. Você não pode esquecer um extractor
//! e ainda assim ter o handler compilando com sentido — sem `VaultAberto`
//! você não tem keyring, e sem keyring não tem como decifrar nada.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::{
    audit::AuditLog,
    auth::{Acao, Identidade, PolicyStore, VaultAberto},
    keyring::Envelope,
    seal::Vault,
    store::normalizar,
    AppState, VaultError,
};

#[derive(Serialize)]
pub struct SegredoResp {
    pub caminho: String,
    pub valor: String,
}

#[derive(Deserialize)]
pub struct EscreverReq {
    pub valor: String,
}

#[axum::debug_handler]
pub async fn ler(
    VaultAberto(keyring): VaultAberto,
    ident: Identidade,
    State(vault): State<Arc<Vault>>,
    State(policies): State<Arc<PolicyStore>>,
    State(audit): State<Arc<AuditLog>>,
    Path(bruto): Path<String>,
) -> Result<Json<SegredoResp>, VaultError> {
    let caminho = normalizar(&bruto)?;

    // Audita a NEGATIVA também. Um log só com sucesso não mostra o atacante
    // varrendo caminhos — que é exatamente o que você quer ver.
    if let Err(e) = policies.autorizar(&ident, &caminho, Acao::Ler) {
        audit
            .registrar(&ident.spiffe, &caminho, Acao::Ler, "negado")
            .await;
        return Err(e);
    }

    let blob = vault.store().get(&caminho).await?;
    let Some(blob) = blob else {
        audit
            .registrar(&ident.spiffe, &caminho, Acao::Ler, "nao_encontrado")
            .await;
        return Err(VaultError::NaoEncontrado);
    };

    let env: Envelope = serde_json::from_slice(&blob).map_err(VaultError::infra)?;
    // O caminho entra como AAD. Blob movido de lugar não autentica.
    let claro = keyring.abrir(&caminho, &env)?;
    let valor = String::from_utf8(claro.to_vec()).map_err(VaultError::infra)?;

    // Audita ANTES de responder. Se o processo morrer entre o audit e o
    // send, você tem um falso positivo — sobra um leitor no log que não leu.
    // O contrário (ler sem log) é o que você não pode ter.
    audit
        .registrar(&ident.spiffe, &caminho, Acao::Ler, "ok")
        .await;

    Ok(Json(SegredoResp { caminho, valor }))
}

#[axum::debug_handler]
pub async fn escrever(
    VaultAberto(keyring): VaultAberto,
    ident: Identidade,
    State(vault): State<Arc<Vault>>,
    State(policies): State<Arc<PolicyStore>>,
    State(audit): State<Arc<AuditLog>>,
    Path(bruto): Path<String>,
    // Extractor de body vai por ÚLTIMO, sempre. Json consome a request;
    // qualquer extractor depois dele não compila. Não é convenção — é o
    // trait FromRequest vs FromRequestParts. O compilador cobra.
    Json(req): Json<EscreverReq>,
) -> Result<StatusCode, VaultError> {
    let caminho = normalizar(&bruto)?;

    if let Err(e) = policies.autorizar(&ident, &caminho, Acao::Escrever) {
        audit
            .registrar(&ident.spiffe, &caminho, Acao::Escrever, "negado")
            .await;
        return Err(e);
    }

    let env = keyring.selar(&caminho, req.valor.as_bytes())?;
    let blob = serde_json::to_vec(&env).map_err(VaultError::infra)?;
    vault.store().put(&caminho, &blob).await?;

    audit
        .registrar(&ident.spiffe, &caminho, Acao::Escrever, "ok")
        .await;
    Ok(StatusCode::NO_CONTENT)
}

#[axum::debug_handler]
pub async fn apagar(
    VaultAberto(_keyring): VaultAberto,
    ident: Identidade,
    State(vault): State<Arc<Vault>>,
    State(policies): State<Arc<PolicyStore>>,
    State(audit): State<Arc<AuditLog>>,
    Path(bruto): Path<String>,
) -> Result<StatusCode, VaultError> {
    let caminho = normalizar(&bruto)?;

    if let Err(e) = policies.autorizar(&ident, &caminho, Acao::Apagar) {
        audit
            .registrar(&ident.spiffe, &caminho, Acao::Apagar, "negado")
            .await;
        return Err(e);
    }

    vault.store().delete(&caminho).await?;
    audit
        .registrar(&ident.spiffe, &caminho, Acao::Apagar, "ok")
        .await;
    Ok(StatusCode::NO_CONTENT)
}

// Silencia o import não usado quando o AppState não é referenciado direto.
#[allow(unused)]
type _S = AppState;