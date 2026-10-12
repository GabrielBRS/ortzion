//! Adapters: implementações concretas dos ports.
//!
//! - [`inbound`]: entrada de requisições (servidor gRPC).
//! - [`outbound`]: saída para infraestrutura (armazenamento Moka).

pub mod inbound;
pub mod outbound;
