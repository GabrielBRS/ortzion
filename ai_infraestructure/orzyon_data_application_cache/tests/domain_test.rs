//! Testes do domínio: validação de namespace/chave e identidade
//! estruturada (sem concatenação ambígua).

use std::collections::HashSet;

use orzyon_data_application_cache::domain::{
    error::CacheError,
    key::{CacheKey, EntryKey, Namespace, MAX_KEY_LEN, MAX_NAMESPACE_LEN},
};

#[test]
fn namespace_rejects_empty() {
    let err = Namespace::new("").unwrap_err();
    assert!(matches!(err, CacheError::InvalidNamespace(_)));
}

#[test]
fn namespace_rejects_oversize() {
    let raw = "n".repeat(MAX_NAMESPACE_LEN + 1);
    assert!(Namespace::new(&raw).is_err());
}

#[test]
fn key_rejects_empty() {
    assert!(EntryKey::new("").is_err());
}

#[test]
fn key_rejects_oversize() {
    let raw = "k".repeat(MAX_KEY_LEN + 1);
    assert!(EntryKey::new(&raw).is_err());
}

#[test]
fn key_rejects_control_characters() {
    assert!(EntryKey::new("bad\u{0007}key").is_err());
    assert!(Namespace::new("bad\u{0001}ns").is_err());
}

#[test]
fn valid_segments_are_accepted() {
    assert!(Namespace::new("tenant-a").is_ok());
    assert!(EntryKey::new("sessões:ütf8").is_ok());
}

#[test]
fn composite_identity_is_structured_without_ambiguity() {
    // Se a identidade fosse uma concatenação de strings, pares como
    // ("a", "bc") e ("ab", "c") colidiriam. Com identidade estruturada
    // eles são distintos.
    let k1 = CacheKey::new("a", "bc").unwrap();
    let k2 = CacheKey::new("ab", "c").unwrap();
    assert_ne!(k1, k2);

    let mut set = HashSet::new();
    set.insert(k1.clone());
    set.insert(k2.clone());
    assert_eq!(set.len(), 2);

    // Mesmo par => mesma identidade (mesmo hash, igualdade).
    let k1_again = CacheKey::new("a", "bc").unwrap();
    assert_eq!(k1, k1_again);
    assert!(set.contains(&k1_again));
}

#[test]
fn composite_key_validates_both_parts() {
    assert!(CacheKey::new("", "key").is_err());
    assert!(CacheKey::new("ns", "").is_err());
    assert!(CacheKey::new("ns", "key").is_ok());
    assert_eq!(CacheKey::new("ns", "key").unwrap().to_string(), "ns/key");
}
