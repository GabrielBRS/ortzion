mod config;
mod error;
mod grcp_clients;
mod mapping;
mod middleware;
mod routes;
mod state;

use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let cfg = config::Config::from_env()?;
    let clients = grcp_clients::Clients::connect(&cfg).await?;
    let state = state::AppState { clients };

    let app = middleware::apply(routes::router(), state.clone()).with_state(state);

    let listener = TcpListener::bind(&cfg.bind).await?;
    tracing::info!(addr = %cfg.bind, "gateway escutando REST");
    axum::serve(listener, app).await?;

    Ok(())
}
