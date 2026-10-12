//! Configuração da aplicação por variáveis de ambiente.
//!
//! Valores padrão são adequados para desenvolvimento local. Veja
//! `.env.example` e o README para a documentação completa.

use std::{env, net::SocketAddr, num::ParseIntError, time::Duration};

use thiserror::Error;

pub const ENV_GRPC_ADDR: &str = "ORZYON_CACHE_GRPC_ADDR";
pub const ENV_DEFAULT_TTL_SECS: &str = "ORZYON_CACHE_DEFAULT_TTL_SECS";
pub const ENV_MAX_CAPACITY: &str = "ORZYON_CACHE_MAX_CAPACITY";
pub const ENV_MAX_ENTRY_BYTES: &str = "ORZYON_CACHE_MAX_ENTRY_BYTES";
pub const ENV_GRPC_MAX_DECODING_BYTES: &str = "ORZYON_CACHE_GRPC_MAX_DECODING_BYTES";
pub const ENV_LOG_LEVEL: &str = "ORZYON_LOG_LEVEL";

const DEFAULT_GRPC_ADDR: &str = "127.0.0.1:50051";
const DEFAULT_DEFAULT_TTL_SECS: u64 = 300;
const DEFAULT_MAX_CAPACITY: u64 = 100_000;
const DEFAULT_MAX_ENTRY_BYTES: u64 = 1024 * 1024;
const DEFAULT_GRPC_MAX_DECODING_BYTES: u64 = 4 * 1024 * 1024;
const DEFAULT_LOG_LEVEL: &str = "info";

/// Configuração validada da aplicação.
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// Endereço/interface e porta onde o servidor gRPC faz bind.
    /// Por padrão loopback apenas (`127.0.0.1:50051`).
    pub grpc_addr: SocketAddr,
    /// TTL aplicado a entradas que não informam TTL próprio.
    pub default_ttl: Duration,
    /// Capacidade alvo global em **quantidade de entradas** (não é um
    /// limite rígido de memória RAM). Quando excedida, o Moka aplica
    /// evicção aproximada (TinyLFU/W-TinyLFU).
    pub max_capacity: u64,
    /// Tamanho máximo, em bytes, de um único valor armazenado.
    pub max_entry_bytes: usize,
    /// Tamanho máximo de uma mensagem gRPC recebida. Deve ser maior que
    /// `max_entry_bytes` para comportar o valor + metadados da mensagem.
    pub grpc_max_decoding_bytes: usize,
    /// Filtro de nível de log (sintaxe `tracing-subscriber` EnvFilter).
    pub log_level: String,
}

/// Erro de configuração (valor ausente/inválido ou combinação incoerente).
#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("invalid integer value for {var}: {source}")]
    InvalidInteger {
        var: &'static str,
        #[source]
        source: ParseIntError,
    },
    #[error("invalid socket address for {var}: {source}")]
    InvalidAddress {
        var: &'static str,
        #[source]
        source: std::net::AddrParseError,
    },
    #[error("invalid configuration: {0}")]
    Validation(String),
}

impl AppConfig {
    /// Carrega a configuração a partir de variáveis de ambiente,
    /// aplicando os padrões de desenvolvimento para as ausentes.
    pub fn from_env() -> Result<Self, ConfigError> {
        let grpc_addr: SocketAddr = env_string(ENV_GRPC_ADDR, DEFAULT_GRPC_ADDR)
            .parse()
            .map_err(|source| ConfigError::InvalidAddress {
                var: ENV_GRPC_ADDR,
                source,
            })?;

        let default_ttl_secs = env_u64(ENV_DEFAULT_TTL_SECS, DEFAULT_DEFAULT_TTL_SECS)?;
        let max_capacity = env_u64(ENV_MAX_CAPACITY, DEFAULT_MAX_CAPACITY)?;
        let max_entry_bytes = env_u64(ENV_MAX_ENTRY_BYTES, DEFAULT_MAX_ENTRY_BYTES)? as usize;
        let grpc_max_decoding_bytes =
            env_u64(ENV_GRPC_MAX_DECODING_BYTES, DEFAULT_GRPC_MAX_DECODING_BYTES)? as usize;
        let log_level = env_string(ENV_LOG_LEVEL, DEFAULT_LOG_LEVEL);

        if default_ttl_secs == 0 {
            return Err(ConfigError::Validation(format!(
                "{ENV_DEFAULT_TTL_SECS} must be greater than zero"
            )));
        }
        if max_capacity == 0 {
            return Err(ConfigError::Validation(format!(
                "{ENV_MAX_CAPACITY} must be greater than zero"
            )));
        }
        if max_entry_bytes == 0 {
            return Err(ConfigError::Validation(format!(
                "{ENV_MAX_ENTRY_BYTES} must be greater than zero"
            )));
        }
        if grpc_max_decoding_bytes <= max_entry_bytes {
            return Err(ConfigError::Validation(format!(
                "{ENV_GRPC_MAX_DECODING_BYTES} ({grpc_max_decoding_bytes}) must be greater than \
                 {ENV_MAX_ENTRY_BYTES} ({max_entry_bytes}) so an entry fits in a gRPC message"
            )));
        }

        Ok(Self {
            grpc_addr,
            default_ttl: Duration::from_secs(default_ttl_secs),
            max_capacity,
            max_entry_bytes,
            grpc_max_decoding_bytes,
            log_level,
        })
    }
}

fn env_string(var: &str, default: &str) -> String {
    env::var(var)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| default.to_string())
}

fn env_u64(var: &'static str, default: u64) -> Result<u64, ConfigError> {
    env_string(var, &default.to_string())
        .parse()
        .map_err(|source| ConfigError::InvalidInteger { var, source })
}
