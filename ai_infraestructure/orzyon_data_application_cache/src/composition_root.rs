//! Composition Root: ponto único e explícito de montagem das
//! dependências concretas.
//!
//! Responsabilidades:
//! 1. carregar e validar a configuração;
//! 2. inicializar os logs estruturados;
//! 3. construir o adaptador Moka;
//! 4. injetar o port de armazenamento nos casos de uso;
//! 5. construir os handlers gRPC e registrar o serviço no servidor;
//! 6. coordenar o encerramento gracioso (SIGINT/SIGTERM).
//!
//! Nenhuma dependência concreta é criada dentro de handlers ou casos
//! de uso — tudo passa por aqui.

use std::sync::Arc;

use tokio::signal;
use tonic::transport::server::Router;
use tracing::info;
use tracing_subscriber::EnvFilter;

use crate::{
    adapters::{
        inbound::grpc::cache_service::CacheGrpcHandler,
        outbound::cache::moka_repository::MokaCacheRepository,
    },
    application::{
        ports::cache_repository::CacheRepository,
        use_cases::{delete_entry::DeleteEntry, get_entry::GetEntry, put_entry::PutEntry},
    },
    config::AppConfig,
    pb,
};

/// Constrói o repositório concreto (adaptador Moka) já como `dyn` do port.
pub fn build_repository(config: &AppConfig) -> Arc<dyn CacheRepository> {
    Arc::new(MokaCacheRepository::new(config.max_capacity))
}

/// Constrói os casos de uso com o repositório injetado.
pub fn build_use_cases(
    config: &AppConfig,
    repository: Arc<dyn CacheRepository>,
) -> (PutEntry, GetEntry, DeleteEntry) {
    (
        PutEntry::new(
            Arc::clone(&repository),
            config.default_ttl,
            config.max_entry_bytes,
        ),
        GetEntry::new(Arc::clone(&repository)),
        DeleteEntry::new(repository),
    )
}

/// Monta o router gRPC: handler + limites de mensagem + serviço
/// registrado. "Rotas" aqui são serviços/métodos RPC — não há REST.
pub fn build_grpc_router(config: &AppConfig) -> Router {
    let repository = build_repository(config);
    let (put_entry, get_entry, delete_entry) = build_use_cases(config, repository);
    let handler = CacheGrpcHandler::new(put_entry, get_entry, delete_entry);

    let service = pb::cache_service_server::CacheServiceServer::new(handler)
        .max_decoding_message_size(config.grpc_max_decoding_bytes)
        .max_encoding_message_size(config.grpc_max_decoding_bytes);

    tonic::transport::Server::builder().add_service(service)
}

/// Ponto de entrada da aplicação: configura, monta e serve até o
/// encerramento gracioso.
pub async fn run() -> Result<(), Box<dyn std::error::Error>> {
    let config = AppConfig::from_env()?;
    init_tracing(&config);

    let addr = config.grpc_addr;
    let router = build_grpc_router(&config);

    info!(
        %addr,
        max_capacity = config.max_capacity,
        default_ttl_secs = config.default_ttl.as_secs(),
        max_entry_bytes = config.max_entry_bytes,
        "starting Orzyon cache gRPC server"
    );

    router.serve_with_shutdown(addr, shutdown_signal()).await?;

    info!("gRPC server stopped; in-memory cache data was discarded");
    Ok(())
}

fn init_tracing(config: &AppConfig) {
    let env_filter =
        EnvFilter::try_new(&config.log_level).unwrap_or_else(|_| EnvFilter::new("info"));
    let _ = tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .try_init();
}

async fn shutdown_signal() {
    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};
        let mut terminate = signal(SignalKind::terminate()).expect("install SIGTERM handler");
        tokio::select! {
            _ = signal::ctrl_c() => {},
            _ = terminate.recv() => {},
        }
    }
    #[cfg(not(unix))]
    {
        let _ = signal::ctrl_c().await;
    }
    info!("shutdown signal received, draining gRPC server");
}
