//! mTLS. Onde a identidade nasce.
//!
//! O axum::serve() não fala TLS. Este módulo faz o accept loop na mão:
//! aceita TCP -> handshake TLS exigindo cert de cliente -> extrai o SAN URI
//! -> injeta como extension -> entrega pro Router.
//!
//! É o padrão do exemplo `low-level-rustls` do axum. Verboso de propósito:
//! quem monta a identidade é você, não um framework.

use std::{net::SocketAddr, path::Path, sync::Arc};

use hyper::body::Incoming;
use hyper_util::rt::{TokioExecutor, TokioIo};
use rustls::{
    server::WebPkiClientVerifier, RootCertStore, ServerConfig,
};
use tokio::net::TcpListener;
use tokio_rustls::TlsAcceptor;
use tower::Service;

use crate::VaultError;

/// Injetado nas extensions da request pelo accept loop.
/// O extractor `Identidade` lê daqui.
#[derive(Debug, Clone)]
pub struct PeerCert {
    pub spiffe: String,
}

/// Monta o ServerConfig exigindo cert de cliente assinado pelo seu CA.
///
/// `WebPkiClientVerifier::builder(ca).build()` = cert OBRIGATÓRIO.
/// Existe `.allow_unauthenticated()` — que aceita conexão sem cert.
/// Num vault, usar isso é o mesmo que não ter mTLS. Não use.
pub fn config_servidor(
    cert_pem: &Path,
    key_pem: &Path,
    ca_pem: &Path,
) -> Result<Arc<ServerConfig>, VaultError> {
    let certs = carregar_certs(cert_pem)?;
    let key = carregar_key(key_pem)?;

    let mut raiz = RootCertStore::empty();
    for c in carregar_certs(ca_pem)? {
        raiz.add(c).map_err(VaultError::infra)?;
    }

    let verificador = WebPkiClientVerifier::builder(Arc::new(raiz))
        .build()
        .map_err(VaultError::infra)?;

    let mut cfg = ServerConfig::builder()
        .with_client_cert_verifier(verificador)
        .with_single_cert(certs, key)
        .map_err(VaultError::infra)?;

    cfg.alpn_protocols = vec![b"h2".to_vec(), b"http/1.1".to_vec()];
    Ok(Arc::new(cfg))
}

fn carregar_certs(p: &Path) -> Result<Vec<rustls::pki_types::CertificateDer<'static>>, VaultError> {
    let dados = std::fs::read(p)
        .map_err(|e| VaultError::Infra(format!("{}: {e}", p.display())))?;
    rustls_pemfile::certs(&mut &dados[..])
        .collect::<Result<Vec<_>, _>>()
        .map_err(VaultError::infra)
}

fn carregar_key(p: &Path) -> Result<rustls::pki_types::PrivateKeyDer<'static>, VaultError> {
    let dados = std::fs::read(p)
        .map_err(|e| VaultError::Infra(format!("{}: {e}", p.display())))?;
    rustls_pemfile::private_key(&mut &dados[..])
        .map_err(VaultError::infra)?
        .ok_or_else(|| VaultError::Infra(format!("sem chave privada em {}", p.display())))
}

/// Extrai o SAN URI do cert. É aqui que `spiffe://sgt/smart-finance/pix`
/// vira a identidade do chamador.
///
/// Por que SAN URI e não CN: o CN é texto livre e está deprecado para
/// identidade desde o RFC 6125. SAN é o campo correto, e URI carrega
/// hierarquia — que é o que você quer para mapear em policy.
fn extrair_spiffe(der: &[u8]) -> Result<String, VaultError> {
    use x509_parser::prelude::*;

    let (_, cert) = X509Certificate::from_der(der).map_err(|_| VaultError::CertInvalido)?;

    let san = cert
        .subject_alternative_name()
        .map_err(|_| VaultError::CertInvalido)?
        .ok_or(VaultError::CertInvalido)?;

    for nome in &san.value.general_names {
        if let GeneralName::URI(uri) = nome {
            if uri.starts_with("spiffe://") {
                return Ok(uri.to_string());
            }
        }
    }
    Err(VaultError::CertInvalido)
}

/// O accept loop. Substitui o axum::serve().
pub async fn servir(
    listener: TcpListener,
    tls: Arc<ServerConfig>,
    app: axum::Router,
) -> Result<(), VaultError> {
    let acceptor = TlsAcceptor::from(tls);

    loop {
        let (tcp, remoto) = match listener.accept().await {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!(%e, "accept falhou");
                continue;
            }
        };
        let acceptor = acceptor.clone();
        let app = app.clone();

        // Um handshake lento/travado NÃO pode segurar o loop. Task por conexão.
        tokio::spawn(async move {
            if let Err(e) = conexao(tcp, remoto, acceptor, app).await {
                tracing::debug!(%remoto, erro = %e, "conexão encerrada");
            }
        });
    }
}

async fn conexao(
    tcp: tokio::net::TcpStream,
    remoto: SocketAddr,
    acceptor: TlsAcceptor,
    app: axum::Router,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let stream = acceptor.accept(tcp).await?;

    // O cert só existe DEPOIS do handshake. Extrai uma vez por conexão,
    // não por request — o cert não muda no meio de uma conexão TLS.
    let spiffe = {
        let (_, conn) = stream.get_ref();
        let certs = conn.peer_certificates().ok_or("sem cert de cliente")?;
        let folha = certs.first().ok_or("cadeia vazia")?;
        extrair_spiffe(folha)?
    };
    tracing::debug!(%remoto, %spiffe, "conexão mTLS estabelecida");

    let peer = PeerCert { spiffe };

    let svc = hyper::service::service_fn(move |mut req: hyper::Request<Incoming>| {
        req.extensions_mut().insert(peer.clone());
        let mut app = app.clone();
        async move {
            let svc = <axum::Router as tower::ServiceExt<hyper::Request<Incoming>>>::ready(&mut app)
                .await
                .unwrap();
            svc.call(req).await
        }
    });

    hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
        .serve_connection(TokioIo::new(stream), svc)
        .await?;
    Ok(())
}