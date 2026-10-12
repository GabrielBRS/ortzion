//! Casos de uso: orquestram validação e regras de aplicação sobre o
//! port [`crate::application::ports::cache_repository::CacheRepository`].
//!
//! Cada caso de uso é uma struct pequena e focada, recebendo o
//! repositório já resolvido pelo Composition Root.

pub mod delete_entry;
pub mod get_entry;
pub mod put_entry;
