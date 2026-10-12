//! Identidade estruturada das entradas: `(namespace, key)`.
//!
//! `CacheKey` compõe `Namespace` + `EntryKey` como campos separados e
//! deriva `Hash`/`Eq` sobre a estrutura — nunca há concatenação de
//! strings, portanto pares como `("a", "bc")` e `("ab", "c")` são
//! identidades distintas sem ambiguidade.

use std::fmt;

use crate::domain::error::CacheError;

pub const MAX_NAMESPACE_LEN: usize = 128;
pub const MAX_KEY_LEN: usize = 512;

/// Namespace lógico de uma entrada. Separação lógica, **não** é
/// mecanismo de autorização.
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Namespace(String);

impl Namespace {
    pub fn new(raw: &str) -> Result<Self, CacheError> {
        validate(
            "namespace",
            raw,
            MAX_NAMESPACE_LEN,
            CacheError::InvalidNamespace,
        )?;
        Ok(Self(raw.to_string()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for Namespace {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

/// Chave de uma entrada dentro de um namespace.
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct EntryKey(String);

impl EntryKey {
    pub fn new(raw: &str) -> Result<Self, CacheError> {
        validate("key", raw, MAX_KEY_LEN, CacheError::InvalidKey)?;
        Ok(Self(raw.to_string()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for EntryKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

/// Identidade completa de uma entrada no cache.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CacheKey {
    namespace: Namespace,
    entry_key: EntryKey,
}

impl CacheKey {
    pub fn new(namespace: &str, entry_key: &str) -> Result<Self, CacheError> {
        Ok(Self {
            namespace: Namespace::new(namespace)?,
            entry_key: EntryKey::new(entry_key)?,
        })
    }

    pub fn namespace(&self) -> &Namespace {
        &self.namespace
    }

    pub fn entry_key(&self) -> &EntryKey {
        &self.entry_key
    }
}

impl fmt::Display for CacheKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}/{}", self.namespace, self.entry_key)
    }
}

fn validate(
    label: &str,
    raw: &str,
    max_len: usize,
    to_error: fn(String) -> CacheError,
) -> Result<(), CacheError> {
    if raw.is_empty() {
        return Err(to_error(format!("{label} must not be empty")));
    }
    if raw.len() > max_len {
        return Err(to_error(format!(
            "{label} must be at most {max_len} bytes, got {}",
            raw.len()
        )));
    }
    if raw.chars().any(char::is_control) {
        return Err(to_error(format!(
            "{label} must not contain control characters"
        )));
    }
    Ok(())
}
