//! ESTE ARQUIVO É A PROVA DO PORQUÊ DO lib.rs.
//!
//! `tests/` compila como um crate SEPARADO. Ele só enxerga o que a lib
//! exporta. Se a lógica estivesse dentro de main.rs, este arquivo seria
//! impossível de escrever — não existe `use` que alcance um binário.
//!
//! Em Java você nunca sentiu isso porque não existe a distinção. Aqui, pôr
//! o código no main.rs custa a sua suíte de testes de integração inteira.
//!
//! rode com: cargo test

use std::sync::Arc;

use sgt_vault::{
    seal::{passphrase::PassphraseUnsealer, Unsealer, Vault},
    store::{fs::FsStore, Store},
};
use zeroize::Zeroizing;

async fn vault_temp() -> (Arc<Vault>, tempdir_lite::Dir) {
    let dir = tempdir_lite::Dir::nova();
    let store: Arc<dyn Store> = Arc::new(FsStore::novo(dir.path()).await.unwrap());
    let unsealer: Arc<dyn Unsealer> = Arc::new(PassphraseUnsealer::novo());
    (Arc::new(Vault::carregar(unsealer, store).await.unwrap()), dir)
}

fn senha(s: &str) -> Zeroizing<Vec<u8>> {
    Zeroizing::new(s.as_bytes().to_vec())
}

#[tokio::test]
async fn sobe_nao_inicializado() {
    let (v, _d) = vault_temp().await;
    let e = v.estado_publico().await;
    assert!(!e.inicializado);
    assert!(e.selado);
}

#[tokio::test]
async fn init_nao_abre_o_vault() {
    let (v, _d) = vault_temp().await;
    v.init(vec![senha("correcthorsebatterystaple")]).await.unwrap();

    // O init NÃO abre. Um caminho a menos onde a chave existe sem intenção.
    let e = v.estado_publico().await;
    assert!(e.inicializado);
    assert!(e.selado);
}

#[tokio::test]
async fn init_duplo_e_recusado() {
    let (v, _d) = vault_temp().await;
    v.init(vec![senha("senha1")]).await.unwrap();

    // Se isto passasse, o segundo init sobrescreveria o selo e TODOS os
    // segredos existentes viravam lixo irrecuperável. É o pior bug possível.
    assert!(v.init(vec![senha("senha2")]).await.is_err());
}

#[tokio::test]
async fn unseal_com_senha_certa_abre() {
    let (v, _d) = vault_temp().await;
    v.init(vec![senha("s3nh4-boa")]).await.unwrap();

    v.unseal(senha("s3nh4-boa")).await.unwrap();
    assert!(!v.estado_publico().await.selado);
    assert!(v.keyring().await.is_ok());
}

#[tokio::test]
async fn unseal_com_senha_errada_falha_e_continua_selado() {
    let (v, _d) = vault_temp().await;
    v.init(vec![senha("certa")]).await.unwrap();

    assert!(v.unseal(senha("errada")).await.is_err());
    assert!(v.estado_publico().await.selado);
    assert!(v.keyring().await.is_err()); // => 503, não 500
}

#[tokio::test]
async fn seal_fecha_de_novo() {
    let (v, _d) = vault_temp().await;
    v.init(vec![senha("abc")]).await.unwrap();
    v.unseal(senha("abc")).await.unwrap();

    v.seal().await; // break-glass: Drop do Keyring => Zeroize da root key
    assert!(v.estado_publico().await.selado);
    assert!(v.keyring().await.is_err());
}

/// tempdir minimalista pra não puxar dependência de dev só pra isto.
mod tempdir_lite {
    use std::path::{Path, PathBuf};

    pub struct Dir(PathBuf);

    impl Dir {
        pub fn nova() -> Self {
            let p = std::env::temp_dir().join(format!(
                "sgt_vault_test_{}_{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            std::fs::create_dir_all(&p).unwrap();
            Dir(p)
        }
        pub fn path(&self) -> &Path {
            &self.0
        }
    }

    impl Drop for Dir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }
}