//! A máquina de estados. O coração do vault.
//!
//! `seal.rs` É o módulo `seal`. `seal/` guarda os FILHOS dele.
//! Não existe `seal/seal.rs`. Módulo é arquivo, pasta é só onde os filhos moram.

pub mod passphrase;

use std::sync::Arc;

use async_trait::async_trait;
use serde::Serialize;
use tokio::sync::RwLock;
use zeroize::Zeroizing;

use crate::{keyring::Keyring, store::Store, VaultError};

/// A PORTA do unseal.
///
/// A pergunta "de onde vem a chave-mestra" não tem resposta única — depende
/// de hardware que você talvez não tenha ainda. Então ela não é uma decisão:
/// é uma trait. O composition root escolhe o adapter, e trocar TPM por
/// passphrase é uma variável de ambiente.
#[async_trait]
pub trait Unsealer: Send + Sync {
    fn nome(&self) -> &'static str;

    /// Quantas partes externas antes de tentar abrir.
    /// TPM = 0 (auto). Passphrase = 1. Shamir 3-de-5 = 3.
    fn quorum(&self) -> usize;

    /// Protege a root key para gravar em disco. Chamado só no `init`.
    async fn selar(
        &self,
        root: &[u8],
        partes: &[Zeroizing<Vec<u8>>],
    ) -> Result<Vec<u8>, VaultError>;

    /// Recupera a root key do blob selado.
    async fn abrir(
        &self,
        blob: &[u8],
        partes: &[Zeroizing<Vec<u8>>],
    ) -> Result<Zeroizing<Vec<u8>>, VaultError>;
}

/// Chave onde o blob selado mora no store. Fora do namespace de segredos.
const CHAVE_SELO: &str = "__sys/selo";

/// Os três estados. Um enum, não três booleanos.
///
/// Com `sealed: bool` + `initialized: bool` você tem 4 combinações e uma
/// delas é impossível — e nada te impede de cair nela. Com enum, o estado
/// ilegal não é representável.
enum Estado {
    /// Sem `init`: não existe root key no mundo.
    NaoInicializado,
    /// Blob em disco, root key ainda não recuperada. Acumulando partes.
    Selado { partes: Vec<Zeroizing<Vec<u8>>> },
    /// Root key na RAM. Só aqui o vault serve.
    Aberto { keyring: Arc<Keyring> },
}

#[derive(Serialize)]
pub struct EstadoPublico {
    pub inicializado: bool,
    pub selado: bool,
    pub quorum_necessario: usize,
    pub partes_recebidas: usize,
    pub unsealer: String,
}

pub struct Vault {
    estado: RwLock<Estado>,
    unsealer: Arc<dyn Unsealer>,
    store: Arc<dyn Store>,
}

impl Vault {
    /// Sobe SEMPRE selado. Nunca aberto. Esta é a regra que separa um vault
    /// de um banco de dados com AES.
    pub async fn carregar(
        unsealer: Arc<dyn Unsealer>,
        store: Arc<dyn Store>,
    ) -> Result<Self, VaultError> {
        let estado = match store.get(CHAVE_SELO).await? {
            Some(_) => Estado::Selado { partes: Vec::new() },
            None => Estado::NaoInicializado,
        };
        Ok(Self {
            estado: RwLock::new(estado),
            unsealer,
            store,
        })
    }

    pub async fn estado_publico(&self) -> EstadoPublico {
        let e = self.estado.read().await;
        let (inicializado, selado, recebidas) = match &*e {
            Estado::NaoInicializado => (false, true, 0),
            Estado::Selado { partes } => (true, true, partes.len()),
            Estado::Aberto { .. } => (true, false, 0),
        };
        EstadoPublico {
            inicializado,
            selado,
            quorum_necessario: self.unsealer.quorum(),
            partes_recebidas: recebidas,
            unsealer: self.unsealer.nome().to_string(),
        }
    }

    /// Acontece UMA VEZ NA VIDA. Gera a root key e sela pela primeira vez.
    /// Se este fluxo tiver bug, não existe conserto: os dados nascem perdidos.
    pub async fn init(&self, partes: Vec<Zeroizing<Vec<u8>>>) -> Result<(), VaultError> {
        let mut estado = self.estado.write().await;

        // Guarda contra init duplo: sobrescrever o selo apaga TODOS os
        // segredos existentes de forma irrecuperável.
        if !matches!(*estado, Estado::NaoInicializado) {
            return Err(VaultError::JaInicializado);
        }
        if partes.len() != self.unsealer.quorum() {
            return Err(VaultError::QuorumInsuficiente {
                tem: partes.len(),
                precisa: self.unsealer.quorum(),
            });
        }

        let root = Keyring::gerar_root();
        let blob = self.unsealer.selar(&root, &partes).await?;
        self.store.put(CHAVE_SELO, &blob).await?;

        // Init não abre o vault. Sobe selado; o operador faz unseal.
        // Um caminho a menos onde a chave existe aberta sem intenção.
        *estado = Estado::Selado { partes: Vec::new() };
        tracing::info!(unsealer = self.unsealer.nome(), "vault inicializado");
        Ok(())
    }

    /// Acumula uma parte. Ao atingir o quórum, tenta abrir.
    pub async fn unseal(&self, parte: Zeroizing<Vec<u8>>) -> Result<EstadoPublico, VaultError> {
        let mut estado = self.estado.write().await;

        let partes = match &mut *estado {
            Estado::NaoInicializado => return Err(VaultError::NaoInicializado),
            Estado::Aberto { .. } => return Ok(self.montar_publico(&estado)),
            Estado::Selado { partes } => partes,
        };

        partes.push(parte);
        let precisa = self.unsealer.quorum();
        if partes.len() < precisa {
            return Err(VaultError::QuorumInsuficiente {
                tem: partes.len(),
                precisa,
            });
        }

        let blob = self
            .store
            .get(CHAVE_SELO)
            .await?
            .ok_or(VaultError::NaoInicializado)?;

        match self.unsealer.abrir(&blob, partes).await {
            Ok(root) => {
                let keyring = Arc::new(Keyring::nova(root, 1)?);
                *estado = Estado::Aberto { keyring };
                tracing::info!("vault ABERTO");
                Ok(self.montar_publico(&estado))
            }
            Err(_) => {
                // Partes erradas: descarta TUDO. Sem isso, o atacante manda
                // partes uma a uma e faz brute force incremental.
                *estado = Estado::Selado { partes: Vec::new() };
                tracing::warn!("unseal falhou — partes descartadas");
                Err(VaultError::UnsealFalhou)
            }
        }
    }

    /// Volta a selar. O Drop do Keyring dispara o Zeroize da root key.
    pub async fn seal(&self) {
        let mut estado = self.estado.write().await;
        if matches!(*estado, Estado::Aberto { .. }) {
            *estado = Estado::Selado { partes: Vec::new() };
            tracing::warn!("vault SELADO");
        }
    }

    /// Só devolve o keyring se estiver aberto. Usado pelo extractor.
    pub async fn keyring(&self) -> Result<Arc<Keyring>, VaultError> {
        match &*self.estado.read().await {
            Estado::Aberto { keyring } => Ok(keyring.clone()),
            _ => Err(VaultError::Selado),
        }
    }

    pub fn store(&self) -> &Arc<dyn Store> {
        &self.store
    }

    fn montar_publico(&self, estado: &Estado) -> EstadoPublico {
        let (inicializado, selado, recebidas) = match estado {
            Estado::NaoInicializado => (false, true, 0),
            Estado::Selado { partes } => (true, true, partes.len()),
            Estado::Aberto { .. } => (true, false, 0),
        };
        EstadoPublico {
            inicializado,
            selado,
            quorum_necessario: self.unsealer.quorum(),
            partes_recebidas: recebidas,
            unsealer: self.unsealer.nome().to_string(),
        }
    }
}