//! O binário. Olha o tamanho dele.
//!
//! Este é o ÚNICO arquivo do sistema que sabe, ao mesmo tempo, que existem:
//! filesystem, Argon2, TLS, a porta 8200 e um diretório de policies.
//! Todo o resto é cego.
//!
//! É o Composition Root. Não é maestro — maestro rege durante a música.
//! Depois do `servir(...).await`, este arquivo não faz mais nada. Ele monta
//! a máquina, entrega a chave e sai de cena.

use std::sync::Arc;

use anyhow::Context;
use sgt_vault::{
    api, audit::AuditLog, auth::PolicyStore, config::{Config, ModoUnseal},
    seal::{passphrase::PassphraseUnsealer, Unsealer, Vault},
    store::{fs::FsStore, Store},
    tls, AppState,
};
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 1. Config. Falha AQUI se faltar variável — não na primeira request.
    let cfg = Config::from_env()?;

    // 2. Observabilidade.
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();
    tracing::info!(?cfg, "config carregada"); // seguro: Config não tem segredo

    // 3. Provider de cripto do rustls. Esquecer isto = panic no primeiro
    //    handshake, não no boot. Uma linha, e ela precisa vir antes do TLS.
    rustls::crypto::ring::default_provider()
        .install_default()
        .map_err(|_| anyhow::anyhow!("falha ao instalar o provider do rustls"))?;

    // 4. Adapters, de baixo pra cima. Nenhum deles conhece os outros.
    let store: Arc<dyn Store> = Arc::new(FsStore::novo(&cfg.data_dir).await?);

    let unsealer: Arc<dyn Unsealer> = match cfg.unseal {
        ModoUnseal::Passphrase => Arc::new(PassphraseUnsealer::novo()),
        ModoUnseal::Tpm => anyhow::bail!("TpmUnsealer é v2 — confira `ls -l /dev/tpm*` primeiro"),
    };
    // Trocar passphrase por TPM é UMA variável de ambiente. A decisão que
    // você ainda não tem informação pra tomar não te prende.

    // 5. O vault. Sobe SELADO, sempre.
    let vault = Arc::new(Vault::carregar(unsealer, store).await?);

    let policies = Arc::new(PolicyStore::carregar(&cfg.policies_dir)?);
    let audit = Arc::new(AuditLog::abrir(&cfg.audit_log).await?);

    // 6. State.
    let state = AppState { vault, policies, audit };

    // 7. Router. Quase último, não primeiro.
    let app = api::rotas()
        .layer(TraceLayer::new_for_http())
        .with_state(state);
    // `with_state` transforma Router<AppState> em Router<()>. Esquecer isto
    // não compila: o tipo do router carrega a dívida.

    // 8. mTLS + transporte.
    let tls_cfg = tls::config_servidor(&cfg.tls.cert, &cfg.tls.key, &cfg.tls.ca)
        .context("carregando material TLS")?;

    let listener = TcpListener::bind(&cfg.bind).await?;
    tracing::warn!(addr = %cfg.bind, "vault ONLINE e SELADO — aguardando /sys/unseal");

    tls::servir(listener, tls_cfg, app).await?;
    Ok(())
}