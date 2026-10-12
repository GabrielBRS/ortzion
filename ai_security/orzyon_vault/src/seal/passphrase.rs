//! Unsealer v1: passphrase + Argon2id.
//!
//! Defende: disco roubado, snapshot, backup, app comprometido lendo o FS.
//! NÃO defende: root na máquina com o vault aberto. Nada defende disso.
//!
//! Custo: restart precisa de humano. Aceitável em lab, não em produção 24/7.
//! v2 = TpmUnsealer (auto) + estas partes viram recovery key offline.
//!
//! Note que este arquivo NÃO conhece `Vault`, nem `Store`, nem HTTP.
//! Ele só sabe transformar uma senha em uma chave protegida. É um adapter.

use argon2::{Algorithm, Argon2, Params, Version};
use async_trait::async_trait;
use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    ChaCha20Poly1305, Key, Nonce,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::{seal::Unsealer, VaultError};

/// Parâmetros do Argon2id. Estes números são o custo do brute force.
///
/// OWASP 2024 mínimo: 19 MiB, t=2, p=1. Isto aqui é 256 MiB / t=4 —
/// deliberadamente caro, porque só roda uma vez por boot. A senha do
/// operador é a única barreira entre um disco roubado e todos os segredos.
const MEM_KIB: u32 = 256 * 1024;
const ITERACOES: u32 = 4;
const PARALELISMO: u32 = 4;

/// Vai pro disco em claro. Nada aqui é secreto — o salt é público por design.
#[derive(Serialize, Deserialize)]
struct Selo {
    salt: Vec<u8>,
    nonce: Vec<u8>,
    root_cifrada: Vec<u8>,
    mem_kib: u32,
    iteracoes: u32,
    paralelismo: u32,
}

pub struct PassphraseUnsealer;

impl PassphraseUnsealer {
    pub fn novo() -> Self {
        Self
    }
}

#[async_trait]
impl Unsealer for PassphraseUnsealer {
    fn nome(&self) -> &'static str {
        "passphrase-argon2id"
    }

    fn quorum(&self) -> usize {
        1
    }

    async fn selar(
        &self,
        root: &[u8],
        partes: &[Zeroizing<Vec<u8>>],
    ) -> Result<Vec<u8>, VaultError> {
        let senha = partes.first().ok_or(VaultError::QuorumInsuficiente {
            tem: 0,
            precisa: 1,
        })?;

        let mut salt = vec![0u8; 16];
        OsRng.fill_bytes(&mut salt);

        let selo_params = Selo {
            salt: salt.clone(),
            nonce: vec![],
            root_cifrada: vec![],
            mem_kib: MEM_KIB,
            iteracoes: ITERACOES,
            paralelismo: PARALELISMO,
        };

        // Argon2 com 256 MiB bloqueia a thread por ~1s. Dentro de um handler
        // async isso trava um worker do Tokio inteiro. spawn_blocking manda
        // pra pool de bloqueio, que é feita exatamente pra isso.
        let senha_c = senha.clone();
        let salt_c = salt.clone();
        let kek = tokio::task::spawn_blocking(move || {
            let params = Params::new(MEM_KIB, ITERACOES, PARALELISMO, Some(32))
                .map_err(|e| VaultError::Infra(format!("params: {e}")))?;
            let a2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
            let mut k = Zeroizing::new(vec![0u8; 32]);
            a2.hash_password_into(&senha_c, &salt_c, &mut k)
                .map_err(|e| VaultError::Infra(format!("argon2: {e}")))?;
            Ok::<_, VaultError>(k)
        })
            .await
            .map_err(VaultError::infra)??;

        let cifra = ChaCha20Poly1305::new(Key::from_slice(&kek));
        let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng);
        let root_cifrada = cifra
            .encrypt(&nonce, root)
            .map_err(|_| VaultError::Infra("falha ao cifrar root".into()))?;

        let selo = Selo {
            salt,
            nonce: nonce.to_vec(),
            root_cifrada,
            ..selo_params
        };
        serde_json::to_vec(&selo).map_err(VaultError::infra)
    }

    async fn abrir(
        &self,
        blob: &[u8],
        partes: &[Zeroizing<Vec<u8>>],
    ) -> Result<Zeroizing<Vec<u8>>, VaultError> {
        let senha = partes.first().ok_or(VaultError::QuorumInsuficiente {
            tem: 0,
            precisa: 1,
        })?;
        let selo: Selo = serde_json::from_slice(blob).map_err(VaultError::infra)?;

        // Lê os params DO SELO, não das constantes. Se você subir MEM_KIB no
        // ano que vem, os vaults antigos continuam abrindo.
        let senha_c = senha.clone();
        let salt_c = selo.salt.clone();
        let (m, t, p) = (selo.mem_kib, selo.iteracoes, selo.paralelismo);
        let kek = tokio::task::spawn_blocking(move || {
            let params = Params::new(m, t, p, Some(32))
                .map_err(|e| VaultError::Infra(format!("params: {e}")))?;
            let a2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
            let mut k = Zeroizing::new(vec![0u8; 32]);
            a2.hash_password_into(&senha_c, &salt_c, &mut k)
                .map_err(|e| VaultError::Infra(format!("argon2: {e}")))?;
            Ok::<_, VaultError>(k)
        })
            .await
            .map_err(VaultError::infra)??;

        let cifra = ChaCha20Poly1305::new(Key::from_slice(&kek));
        let root = cifra
            .decrypt(Nonce::from_slice(&selo.nonce), selo.root_cifrada.as_ref())
            // Senha errada e blob corrompido dão o MESMO erro. Não conte ao
            // atacante qual dos dois foi.
            .map_err(|_| VaultError::UnsealFalhou)?;

        Ok(Zeroizing::new(root))
    }
}