//! Envelope encryption.
//!
//! A root key NUNCA criptografa dado. Ela só criptografa DEKs de 32 bytes.
//!
//! Por quê:
//!   1. Rotação. Trocar a root key = re-criptografar N DEKs, não N segredos.
//!   2. Nonce. Uma chave só, milhões de writes, nonce de 96 bits aleatório
//!      => aniversário. Uma DEK nova por segredo mata isso na raiz.
//!
//!   root key --(cifra)--> DEK --(cifra)--> segredo

use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng, Payload},
    ChaCha20Poly1305, Key, Nonce,
};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::VaultError;

pub const TAMANHO_CHAVE: usize = 32;

/// O que vai pro disco. Nada aqui é sensível sem a root key.
#[derive(Debug, Serialize, Deserialize)]
pub struct Envelope {
    /// Versão da root key que selou a DEK. Habilita rotação sem downtime.
    pub versao: u32,
    pub nonce_dek: Vec<u8>,
    pub dek_selada: Vec<u8>,
    pub nonce_dado: Vec<u8>,
    pub ciphertext: Vec<u8>,
}

pub struct Keyring {
    /// Zeroizing: no Drop o compilador GARANTE a limpeza da memória.
    ///
    /// Em Java isto é impossível: String é imutável, você não apaga.
    /// É por isso que a API Java usa `char[] password` — gambiarra em cima
    /// de uma limitação da linguagem. Rust resolve no tipo.
    root: Zeroizing<Vec<u8>>,
    versao: u32,
}

impl Keyring {
    pub fn nova(root: Zeroizing<Vec<u8>>, versao: u32) -> Result<Self, VaultError> {
        if root.len() != TAMANHO_CHAVE {
            return Err(VaultError::Infra("root key com tamanho errado".into()));
        }
        Ok(Self { root, versao })
    }

    /// Gera uma root key nova. Só chamado uma vez na vida, no `init`.
    pub fn gerar_root() -> Zeroizing<Vec<u8>> {
        use rand::RngCore;
        let mut k = Zeroizing::new(vec![0u8; TAMANHO_CHAVE]);
        // OsRng: getrandom(2). Nunca use rand::thread_rng para material de chave.
        rand::rngs::OsRng.fill_bytes(&mut k);
        k
    }

    pub fn expor_root(&self) -> &[u8] {
        &self.root
    }

    /// `aad` = o caminho do segredo. Amarra o ciphertext ao lugar dele.
    ///
    /// Sem isso, um atacante com acesso ao disco copia o blob de
    /// `smart-finance/pix/db` para `smart-finance/credito/db` e o vault
    /// decripta felizmente — você acabou de trocar a senha de um banco pela
    /// do outro. Com AAD, a autenticação falha.
    pub fn selar(&self, aad: &str, claro: &[u8]) -> Result<Envelope, VaultError> {
        use rand::RngCore;

        // DEK nova por segredo.
        let mut dek = Zeroizing::new(vec![0u8; TAMANHO_CHAVE]);
        rand::rngs::OsRng.fill_bytes(&mut dek);

        let cifra_dado = ChaCha20Poly1305::new(Key::from_slice(&dek));
        let nonce_dado = ChaCha20Poly1305::generate_nonce(&mut OsRng);
        let ciphertext = cifra_dado
            .encrypt(
                &nonce_dado,
                Payload {
                    msg: claro,
                    aad: aad.as_bytes(),
                },
            )
            .map_err(|_| VaultError::Infra("falha ao cifrar dado".into()))?;

        // A root key só toca nos 32 bytes da DEK.
        let cifra_root = ChaCha20Poly1305::new(Key::from_slice(&self.root));
        let nonce_dek = ChaCha20Poly1305::generate_nonce(&mut OsRng);
        let dek_selada = cifra_root
            .encrypt(
                &nonce_dek,
                Payload {
                    msg: &dek,
                    aad: aad.as_bytes(),
                },
            )
            .map_err(|_| VaultError::Infra("falha ao selar DEK".into()))?;

        Ok(Envelope {
            versao: self.versao,
            nonce_dek: nonce_dek.to_vec(),
            dek_selada,
            nonce_dado: nonce_dado.to_vec(),
            ciphertext,
        })
    }

    pub fn abrir(&self, aad: &str, env: &Envelope) -> Result<Zeroizing<Vec<u8>>, VaultError> {
        if env.versao != self.versao {
            // v2: buscar a chave daquela versão no keyring histórico.
            return Err(VaultError::Infra(format!(
                "envelope da versão {} — keyring está na {}",
                env.versao, self.versao
            )));
        }

        let cifra_root = ChaCha20Poly1305::new(Key::from_slice(&self.root));
        let dek = Zeroizing::new(
            cifra_root
                .decrypt(
                    Nonce::from_slice(&env.nonce_dek),
                    Payload {
                        msg: &env.dek_selada,
                        aad: aad.as_bytes(),
                    },
                )
                .map_err(|_| VaultError::Infra("DEK não autenticou".into()))?,
        );

        let cifra_dado = ChaCha20Poly1305::new(Key::from_slice(&dek));
        let claro = cifra_dado
            .decrypt(
                Nonce::from_slice(&env.nonce_dado),
                Payload {
                    msg: &env.ciphertext,
                    aad: aad.as_bytes(),
                },
            )
            .map_err(|_| VaultError::Infra("dado não autenticou".into()))?;

        Ok(Zeroizing::new(claro))
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn round_trip() {
        let kr = Keyring::nova(Keyring::gerar_root(), 1).unwrap();
        let env = kr.selar("smart-finance/pix/db", b"s3nh4").unwrap();
        assert_eq!(&*kr.abrir("smart-finance/pix/db", &env).unwrap(), b"s3nh4");
    }

    #[test]
    fn aad_impede_troca_de_caminho() {
        let kr = Keyring::nova(Keyring::gerar_root(), 1).unwrap();
        let env = kr.selar("smart-finance/pix/db", b"s3nh4").unwrap();
        // Mesmo blob, caminho diferente: tem que falhar.
        assert!(kr.abrir("smart-finance/credito/db", &env).is_err());
    }

    #[test]
    fn dek_diferente_a_cada_write() {
        let kr = Keyring::nova(Keyring::gerar_root(), 1).unwrap();
        let a = kr.selar("p", b"igual").unwrap();
        let b = kr.selar("p", b"igual").unwrap();
        assert_ne!(a.ciphertext, b.ciphertext);
    }
}