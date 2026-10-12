//! Adapter inbound gRPC: handlers que recebem mensagens Protobuf,
//! acionam os casos de uso e traduzem erros para `tonic::Status`.

pub mod cache_service;
pub mod error_mapping;
