//! A porta de persistência.
//!
//! MENTALIDADE JAVA A CORRIGIR: não existe `IStore` / `StoreImpl`.
//! O prefixo `I` e o sufixo `Impl` existem em Java porque interface e classe
//! disputam o mesmo namespace e você precisa desempatar o nome. Em Rust:
//!   - trait Store       -> o contrato
//!   - struct FsStore    -> um adapter, nomeado pelo que ELE é
//!   - struct SledStore  -> outro
//! O nome diz a tecnologia, não a posição na hierarquia.

pub mod fs;

use async_trait::async_trait;

use crate::VaultError;

/// O store guarda BLOB OPACO. Ele nunca vê texto claro, nunca vê chave.
/// Isso é o que permite o backend ser um NFS, um S3 ou um Postgres sem
/// mudar o modelo de ameaça: quem rouba o backend rouba lixo cifrado.
#[async_trait]
pub trait Store: Send + Sync {
    async fn get(&self, chave: &str) -> Result<Option<Vec<u8>>, VaultError>;
    async fn put(&self, chave: &str, valor: &[u8]) -> Result<(), VaultError>;
    async fn delete(&self, chave: &str) -> Result<(), VaultError>;
    async fn list(&self, prefixo: &str) -> Result<Vec<String>, VaultError>;
}

/// Normaliza e valida um caminho vindo da rede.
///
/// `{*caminho}` do axum aceita `..`. Sem isto:
///   GET /v1/kv/smart-finance/pix/../../__sys/selo
/// passa pelo check de policy (o prefixo bate!) e sai do namespace.
///
/// Regra: rejeitar, não sanitizar. Sanitizar é jogo de gato e rato
/// (`..%2f`, `....//`, unicode). Rejeitar é decidível.
pub fn normalizar(bruto: &str) -> Result<String, VaultError> {
    let c = bruto.trim_matches('/');

    if c.is_empty()
        || c.contains("..")
        || c.contains('\0')
        || c.contains("//")
        || c.starts_with("__sys")
        || c.len() > 512
        || !c
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '/' | '-' | '_' | '.'))
    {
        return Err(VaultError::CaminhoInvalido);
    }
    Ok(c.to_string())
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn aceita_caminho_normal() {
        assert_eq!(
            normalizar("/smart-finance/pix/db/").unwrap(),
            "smart-finance/pix/db"
        );
    }

    #[test]
    fn rejeita_traversal() {
        for mau in [
            "smart-finance/pix/../../__sys/selo",
            "..",
            "a//b",
            "__sys/selo",
            "a\0b",
            "a b",
            "a;drop",
        ] {
            assert!(normalizar(mau).is_err(), "deveria rejeitar: {mau}");
        }
    }
}