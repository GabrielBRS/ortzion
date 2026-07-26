//! Policy como DADO. Um .toml por serviço, versionado em git.
//!
//! Adicionar o serviço de Crédito amanhã = um arquivo novo + um cert novo.
//! Zero deploy do vault.
//!
//! DENY BY DEFAULT. Lembra que eu te disse que o axum não tem isso de graça?
//! Aqui a gente inverte na mão: `autorizar()` só devolve Ok se ALGUMA regra
//! casar. Caminho sem policy = negado. Num vault isso não é preferência.

use std::{collections::HashMap, path::Path};

use serde::Deserialize;

use crate::{
    auth::{Acao, Identidade},
    VaultError,
};

#[derive(Debug, Deserialize)]
pub struct Regra {
    /// `smart-finance/pix/*` ou `smart-finance/pix/db` (exato).
    pub caminho: String,
    pub acoes: Vec<Acao>,
}

#[derive(Debug, Deserialize)]
pub struct Policy {
    /// spiffe://sgt/smart-finance/pix
    pub identidade: String,
    pub regras: Vec<Regra>,
}

pub struct PolicyStore {
    por_identidade: HashMap<String, Policy>,
}

impl PolicyStore {
    pub fn carregar(dir: impl AsRef<Path>) -> Result<Self, VaultError> {
        let dir = dir.as_ref();
        let mut por_identidade = HashMap::new();

        let entradas = std::fs::read_dir(dir).map_err(|e| {
            VaultError::Infra(format!("policies em {}: {e}", dir.display()))
        })?;

        for ent in entradas {
            let ent = ent.map_err(VaultError::infra)?;
            let p = ent.path();
            if p.extension().and_then(|s| s.to_str()) != Some("toml") {
                continue;
            }
            let txt = std::fs::read_to_string(&p).map_err(VaultError::infra)?;
            let pol: Policy = toml::from_str(&txt)
                .map_err(|e| VaultError::Infra(format!("{}: {e}", p.display())))?;

            if por_identidade.contains_key(&pol.identidade) {
                // Duas policies para a mesma identidade: qual vence? Ambiguidade
                // em autorização é bug. Recusa subir.
                return Err(VaultError::Infra(format!(
                    "identidade duplicada: {}",
                    pol.identidade
                )));
            }
            tracing::info!(identidade = %pol.identidade, regras = pol.regras.len(), "policy carregada");
            por_identidade.insert(pol.identidade.clone(), pol);
        }

        if por_identidade.is_empty() {
            tracing::warn!("nenhuma policy carregada — o vault vai negar tudo");
        }
        Ok(Self { por_identidade })
    }

    pub fn autorizar(
        &self,
        ident: &Identidade,
        caminho: &str,
        acao: Acao,
    ) -> Result<(), VaultError> {
        let Some(pol) = self.por_identidade.get(&ident.spiffe) else {
            return Err(VaultError::Proibido); // identidade sem policy: nega
        };

        let ok = pol
            .regras
            .iter()
            .any(|r| casa(&r.caminho, caminho) && r.acoes.contains(&acao));

        if ok {
            Ok(())
        } else {
            Err(VaultError::Proibido)
        }
    }
}

/// Glob de um nível só: prefixo exato ou `prefixo/*`.
///
/// O detalhe que morde: `smart-finance/pix/*` NÃO pode casar com
/// `smart-finance/pixel/db`. Um `starts_with` ingênuo casaria — e o serviço
/// de Pix passaria a ler os segredos de um serviço chamado "pixel".
/// Por isso a barra é obrigatória na fronteira.
fn casa(padrao: &str, caminho: &str) -> bool {
    match padrao.strip_suffix('*') {
        Some(pref) => {
            let pref = pref.strip_suffix('/').unwrap_or(pref);
            caminho == pref
                || (caminho.starts_with(pref) && caminho.as_bytes().get(pref.len()) == Some(&b'/'))
        }
        None => padrao == caminho,
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn glob_respeita_fronteira_de_barra() {
        assert!(casa("smart-finance/pix/*", "smart-finance/pix/db"));
        assert!(casa("smart-finance/pix/*", "smart-finance/pix/a/b"));
        assert!(casa("smart-finance/pix/*", "smart-finance/pix"));

        // O bug clássico do starts_with:
        assert!(!casa("smart-finance/pix/*", "smart-finance/pixel/db"));
        assert!(!casa("smart-finance/pix/*", "smart-finance/credito/db"));
    }

    #[test]
    fn exato_e_exato() {
        assert!(casa("a/b", "a/b"));
        assert!(!casa("a/b", "a/b/c"));
    }
}