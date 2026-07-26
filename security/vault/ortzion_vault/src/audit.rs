//! O audit log. A razão de o vault existir.
//!
//! Lembra o que eu te falei: um vault não te torna imune — root na máquina
//! lê a RAM e acabou. O que ele te dá é UMA pergunta respondível:
//!
//!   "quem leu a senha do Postgres de produção às 3h da manhã?"
//!
//! Encadeado por hash: cada linha inclui o hash da anterior. Um atacante que
//! apaga a linha dele quebra a corrente e a próxima verificação denuncia.
//! Não impede adulteração — torna adulteração DETECTÁVEL. É a diferença
//! entre não saber e saber.
//!
//! REGRA: audita ANTES de responder, e audita a NEGATIVA também. Um log que
//! só tem sucesso não mostra o atacante varrendo caminhos.

use std::sync::Arc;

use serde::Serialize;
use sha2::{Digest, Sha256};
use tokio::{
    io::AsyncWriteExt,
    sync::Mutex,
};

use crate::{auth::Acao, VaultError};

#[derive(Serialize)]
pub struct Entrada<'a> {
    pub ts: String,
    pub identidade: &'a str,
    pub caminho: &'a str,
    pub acao: Acao,
    pub resultado: &'a str,
    /// Hash da entrada anterior. Hex.
    pub anterior: String,
}

pub struct AuditLog {
    arquivo: Arc<Mutex<tokio::fs::File>>,
    ultimo_hash: Arc<Mutex<String>>,
}

impl AuditLog {
    pub async fn abrir(caminho: impl AsRef<std::path::Path>) -> Result<Self, VaultError> {
        let f = tokio::fs::OpenOptions::new()
            .create(true)
            .append(true) // append-only. Nunca truncate.
            .open(caminho)
            .await
            .map_err(VaultError::infra)?;

        Ok(Self {
            arquivo: Arc::new(Mutex::new(f)),
            ultimo_hash: Arc::new(Mutex::new("genesis".to_string())),
        })
    }

    pub async fn registrar(&self, identidade: &str, caminho: &str, acao: Acao, resultado: &str) {
        let anterior = self.ultimo_hash.lock().await.clone();

        let e = Entrada {
            ts: agora_iso(),
            identidade,
            caminho,
            acao,
            resultado,
            anterior,
        };

        let Ok(linha) = serde_json::to_string(&e) else {
            tracing::error!("falha ao serializar audit — ISTO É GRAVE");
            return;
        };

        let hash = hex::encode(Sha256::digest(linha.as_bytes()));

        let mut f = self.arquivo.lock().await;
        // Se o audit falha, a operação NÃO deveria ter acontecido. Num vault
        // sério isto aborta o request (fail-closed). Aqui só grita, porque v1.
        if let Err(err) = f.write_all(format!("{linha}\n").as_bytes()).await {
            tracing::error!(%err, "AUDIT FALHOU — operação sem rastro");
            return;
        }
        // fsync a cada linha. Lento e proposital: audit em page cache que
        // some num crash não é audit.
        let _ = f.sync_data().await;

        *self.ultimo_hash.lock().await = hash;
    }
}

fn agora_iso() -> String {
    let d = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", d.as_secs())
}