//! Testes de configuração: padrões de desenvolvimento, overrides por
//! variáveis de ambiente e validação de combinações incoerentes.
//!
//! Como `std::env::set_var` afeta o processo inteiro, todos os cenários
//! rodam dentro de um único teste, em sequência.

use std::time::Duration;

use orzyon_data_application_cache::config::{
    AppConfig, ENV_DEFAULT_TTL_SECS, ENV_GRPC_ADDR, ENV_GRPC_MAX_DECODING_BYTES, ENV_LOG_LEVEL,
    ENV_MAX_CAPACITY, ENV_MAX_ENTRY_BYTES,
};

const ALL_VARS: &[&str] = &[
    ENV_GRPC_ADDR,
    ENV_DEFAULT_TTL_SECS,
    ENV_MAX_CAPACITY,
    ENV_MAX_ENTRY_BYTES,
    ENV_GRPC_MAX_DECODING_BYTES,
    ENV_LOG_LEVEL,
];

fn clear_all() {
    for var in ALL_VARS {
        std::env::remove_var(var);
    }
}

#[test]
fn defaults_overrides_and_validation() {
    clear_all();

    // 1. Padrões de desenvolvimento.
    let config = AppConfig::from_env().unwrap();
    assert_eq!(config.grpc_addr, "127.0.0.1:50051".parse().unwrap());
    assert_eq!(config.default_ttl, Duration::from_secs(300));
    assert_eq!(config.max_capacity, 100_000);
    assert_eq!(config.max_entry_bytes, 1024 * 1024);
    assert_eq!(config.grpc_max_decoding_bytes, 4 * 1024 * 1024);
    assert_eq!(config.log_level, "info");

    // 2. Overrides por variáveis de ambiente.
    std::env::set_var(ENV_GRPC_ADDR, "127.0.0.1:51001");
    std::env::set_var(ENV_DEFAULT_TTL_SECS, "30");
    std::env::set_var(ENV_MAX_CAPACITY, "42");
    std::env::set_var(ENV_MAX_ENTRY_BYTES, "2048");
    std::env::set_var(ENV_GRPC_MAX_DECODING_BYTES, "4096");
    std::env::set_var(ENV_LOG_LEVEL, "debug");

    let config = AppConfig::from_env().unwrap();
    assert_eq!(config.grpc_addr, "127.0.0.1:51001".parse().unwrap());
    assert_eq!(config.default_ttl, Duration::from_secs(30));
    assert_eq!(config.max_capacity, 42);
    assert_eq!(config.max_entry_bytes, 2048);
    assert_eq!(config.grpc_max_decoding_bytes, 4096);
    assert_eq!(config.log_level, "debug");

    // 3. Validação: TTL zero é rejeitado.
    std::env::set_var(ENV_DEFAULT_TTL_SECS, "0");
    assert!(AppConfig::from_env().is_err());
    std::env::set_var(ENV_DEFAULT_TTL_SECS, "30");

    // 4. Validação: limite gRPC menor/igual ao limite de entrada é rejeitado.
    std::env::set_var(ENV_GRPC_MAX_DECODING_BYTES, "2048"); // == max_entry_bytes
    assert!(AppConfig::from_env().is_err());

    // 5. Validação: valor não numérico é rejeitado.
    std::env::set_var(ENV_MAX_CAPACITY, "not-a-number");
    assert!(AppConfig::from_env().is_err());

    // 6. Validação: endereço inválido é rejeitado.
    std::env::remove_var(ENV_MAX_CAPACITY);
    std::env::set_var(ENV_GRPC_ADDR, "not-an-address");
    assert!(AppConfig::from_env().is_err());

    clear_all();
}
