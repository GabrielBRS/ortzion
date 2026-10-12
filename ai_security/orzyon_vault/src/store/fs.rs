//! Store em filesystem. v1.
//!
//! Defesa em profundidade: o `normalizar()` já rejeita `..`, mas este adapter
//! também nunca constrói um caminho a partir da string do usuário. A chave é
//! hex-encodada e vira UM nome de arquivo plano. Mesmo que o `normalizar()`
//! tenha um bug, é fisicamente impossível escapar do diretório: hex não
//! contém `/` nem `.`.
//!
//! Duas camadas independentes. É assim que se erra sem virar incidente.

use std::path::{Path, PathBuf};

use async_trait::async_trait;

use crate::{store::Store, VaultError};

pub struct FsStore {
    dir: PathBuf,
}

impl FsStore {
    pub async fn novo(dir: impl AsRef<Path>) -> Result<Self, VaultError> {
        let dir = dir.as_ref().to_path_buf();
        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(VaultError::infra)?;

        // 0700. Sem isto, o `other` do container lê os blobs.
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut p = tokio::fs::metadata(&dir)
                .await
                .map_err(VaultError::infra)?
                .permissions();
            p.set_mode(0o700);
            tokio::fs::set_permissions(&dir, p)
                .await
                .map_err(VaultError::infra)?;
        }
        Ok(Self { dir })
    }

    fn arquivo(&self, chave: &str) -> PathBuf {
        self.dir.join(hex::encode(chave.as_bytes()))
    }
}

#[async_trait]
impl Store for FsStore {
    async fn get(&self, chave: &str) -> Result<Option<Vec<u8>>, VaultError> {
        match tokio::fs::read(self.arquivo(chave)).await {
            Ok(b) => Ok(Some(b)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(VaultError::infra(e)),
        }
    }

    async fn put(&self, chave: &str, valor: &[u8]) -> Result<(), VaultError> {
        let alvo = self.arquivo(chave);
        let tmp = alvo.with_extension("tmp");

        // write + rename: rename é atômico no mesmo FS. Sem isto, um crash no
        // meio do write deixa o selo truncado — e o vault não abre nunca mais.
        tokio::fs::write(&tmp, valor)
            .await
            .map_err(VaultError::infra)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            tokio::fs::set_permissions(&tmp, std::fs::Permissions::from_mode(0o600))
                .await
                .map_err(VaultError::infra)?;
        }

        tokio::fs::rename(&tmp, &alvo)
            .await
            .map_err(VaultError::infra)
    }

    async fn delete(&self, chave: &str) -> Result<(), VaultError> {
        match tokio::fs::remove_file(self.arquivo(chave)).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(VaultError::infra(e)),
        }
    }

    async fn list(&self, prefixo: &str) -> Result<Vec<String>, VaultError> {
        let mut rd = tokio::fs::read_dir(&self.dir)
            .await
            .map_err(VaultError::infra)?;
        let mut saida = Vec::new();

        while let Some(ent) = rd.next_entry().await.map_err(VaultError::infra)? {
            let nome = ent.file_name();
            let hexs = nome.to_string_lossy();
            if hexs.ends_with(".tmp") {
                continue;
            }
            let Ok(bytes) = hex::decode(hexs.as_bytes()) else {
                continue;
            };
            let Ok(chave) = String::from_utf8(bytes) else {
                continue;
            };
            if chave.starts_with("__sys") {
                continue;
            }
            if chave.starts_with(prefixo) {
                saida.push(chave);
            }
        }
        saida.sort();
        Ok(saida)
    }
}