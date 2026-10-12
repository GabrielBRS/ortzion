//! Orzyon Data Application Cache.
//!
//! Serviço de cache chave-valor em memória, com identificação por
//! `(namespace, key)` e API gRPC. O cache vive no próprio processo
//! (Moka); o acesso remoto entre aplicações acontece exclusivamente
//! via gRPC.
//!
//! A organização segue arquitetura hexagonal (ports and adapters):
//!
//! - [`domain`]: tipos e regras puras (chave, erros), sem dependência
//!   de transporte ou armazenamento.
//! - [`application`]: casos de uso e traits de port (ex.: repositório de
//!   cache). Não conhece gRPC, Protobuf, Moka ou DashMap.
//! - [`adapters::inbound`]: servidor/handlers gRPC e tradução de erros.
//! - [`adapters::outbound`]: implementação do port de armazenamento com
//!   Moka (`moka::future::Cache`).
//! - [`composition_root`]: montagem explícita das dependências concretas
//!   e inicialização da aplicação.

pub mod adapters;
pub mod application;
pub mod composition_root;
pub mod config;
pub mod domain;

/// Mensagens e stubs gerados a partir de `proto/orzyon/cache/v1/cache.proto`.
pub mod pb {
    #![allow(clippy::all)]
    tonic::include_proto!("orzyon.cache.v1");
}
