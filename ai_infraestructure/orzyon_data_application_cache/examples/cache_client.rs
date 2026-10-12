//! Cliente de exemplo: conecta no servidor e executa Put, Get e Delete.
//!
//! Uso (com o servidor rodando):
//!
//! ```sh
//! cargo run --example cache_client
//! # ou apontando para outro endereço:
//! ORZYON_CACHE_GRPC_ADDR=127.0.0.1:50051 cargo run --example cache_client
//! ```

use orzyon_data_application_cache::pb::{self, cache_service_client::CacheServiceClient};
use tonic::Request;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let raw =
        std::env::var("ORZYON_CACHE_GRPC_ADDR").unwrap_or_else(|_| "127.0.0.1:50051".to_string());
    let endpoint = if raw.contains("://") {
        raw
    } else {
        format!("http://{raw}")
    };

    let mut client = CacheServiceClient::connect(endpoint).await?;

    let namespace = "demo";
    let key = "greeting";

    // Put
    client
        .put(Request::new(pb::PutRequest {
            namespace: namespace.to_string(),
            key: key.to_string(),
            value: b"hello from the Orzyon cache client".to_vec(),
            ttl: None,
        }))
        .await?;
    println!("put ok: {namespace}/{key}");

    // Get
    let response = client
        .get(Request::new(pb::GetRequest {
            namespace: namespace.to_string(),
            key: key.to_string(),
        }))
        .await?
        .into_inner();
    if response.found {
        println!("get hit: {}", String::from_utf8_lossy(&response.value));
    } else {
        println!("get miss");
    }

    // Delete
    let deleted = client
        .delete(Request::new(pb::DeleteRequest {
            namespace: namespace.to_string(),
            key: key.to_string(),
        }))
        .await?
        .into_inner()
        .deleted;
    println!("delete ok (removed: {deleted})");

    // Get após delete => miss
    let response = client
        .get(Request::new(pb::GetRequest {
            namespace: namespace.to_string(),
            key: key.to_string(),
        }))
        .await?
        .into_inner();
    println!("get after delete: found={}", response.found);

    Ok(())
}
