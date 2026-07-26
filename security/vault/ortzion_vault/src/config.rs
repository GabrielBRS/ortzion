//! O ÚNICO módulo do sistema que chama std::env::var.
//!
//! Se `FsStore` lesse VAULT_DATA_DIR por dentro, você não conseguiria abrir
//! dois stores apontando pra diretórios diferentes, e testaria com variável
//! global — que é ThreadLocal disfarçado. Config entra pelo composition root
//! e desce como argumento.

use std::path::PathBuf;

use anyhow::Context;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModoUnseal {
    /// v1. Uma senha, Argon2id. Restart precisa de humano.
    Passphrase,
    /// v2. Auto-unseal. Requer /dev/tpmrm0.
    Tpm,
}

#[derive(Debug, Clone)]
pub struct Config {
    pub bind: String,
    pub data_dir: PathBuf,
    pub policies_dir: PathBuf,
    pub audit_log: PathBuf,
    pub unseal: ModoUnseal,
    pub tls: TlsConfig,
}

#[derive(Debug, Clone)]
pub struct TlsConfig {
    pub cert: PathBuf,
    pub key: PathBuf,
    /// O CA do sgt-identity. Quem assinou o cert do app.
    pub ca: PathBuf,
}

fn req(chave: &str) -> anyhow::Result<String> {
    std::env::var(chave).with_context(|| format!("variável {chave} não definida"))
}
fn opt(chave: &str, padrao: &str) -> String {
    std::env::var(chave).unwrap_or_else(|_| padrao.into())
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let unseal = match opt("VAULT_UNSEAL", "passphrase").as_str() {
            "passphrase" => ModoUnseal::Passphrase,
            "tpm" => ModoUnseal::Tpm,
            outro => anyhow::bail!("VAULT_UNSEAL inválido: {outro}"),
        };

        Ok(Self {
            bind: opt("VAULT_BIND", "0.0.0.0:8200"),
            data_dir: PathBuf::from(opt("VAULT_DATA_DIR", "./data")),
            policies_dir: PathBuf::from(opt("VAULT_POLICIES_DIR", "./policies")),
            audit_log: PathBuf::from(opt("VAULT_AUDIT_LOG", "./data/audit.jsonl")),
            unseal,
            tls: TlsConfig {
                // Sem padrão. Sem cert não sobe. Falha de config é falha de boot.
                cert: PathBuf::from(req("VAULT_TLS_CERT")?),
                key: PathBuf::from(req("VAULT_TLS_KEY")?),
                ca: PathBuf::from(req("VAULT_TLS_CA")?),
            },
        })
    }
}

// Repare o que NÃO tem aqui: nenhum segredo.
//
// Um vault que lê senha do env é um vault que não resolveu nada — quem lê
// /proc/PID/environ leva tudo. A passphrase de unseal entra por HTTP no
// /sys/unseal, digitada por um humano, e nunca toca em disco nem em env.
// É o motivo inteiro deste projeto existir.