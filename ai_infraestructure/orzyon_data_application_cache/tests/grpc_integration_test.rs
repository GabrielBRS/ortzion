//! Testes de integração gRPC: sobe o servidor real em porta efêmera
//! (via `TcpListenerStream`) e exercita o contrato `orzyon.cache.v1`
//! com um cliente Tonic.

use std::{net::SocketAddr, time::Duration};

use orzyon_data_application_cache::{
    composition_root::build_grpc_router,
    config::AppConfig,
    pb::{self, cache_service_client::CacheServiceClient},
};
use tonic::{Code, Request};

fn test_config() -> AppConfig {
    AppConfig {
        grpc_addr: "127.0.0.1:0".parse().unwrap(),
        default_ttl: Duration::from_secs(300),
        max_capacity: 1000,
        max_entry_bytes: 1024,
        grpc_max_decoding_bytes: 4096,
        log_level: "info".to_string(),
    }
}

async fn start_server(config: &AppConfig) -> SocketAddr {
    let incoming = tonic::transport::server::TcpIncoming::bind("127.0.0.1:0".parse().unwrap())
        .expect("bind ephemeral port");
    let addr = incoming.local_addr().unwrap();

    let router = build_grpc_router(config);
    tokio::spawn(async move {
        let _ = router
            .serve_with_incoming_shutdown(incoming, std::future::pending::<()>())
            .await;
    });
    addr
}

async fn connect(addr: SocketAddr) -> CacheServiceClient<tonic::transport::Channel> {
    CacheServiceClient::connect(format!("http://{addr}"))
        .await
        .unwrap()
}

fn put_request(namespace: &str, key: &str, value: &[u8]) -> Request<pb::PutRequest> {
    Request::new(pb::PutRequest {
        namespace: namespace.to_string(),
        key: key.to_string(),
        value: value.to_vec(),
        ttl: None,
    })
}

#[tokio::test]
async fn put_get_delete_roundtrip() {
    let addr = start_server(&test_config()).await;
    let mut client = connect(addr).await;

    client.put(put_request("ns", "k", b"hello")).await.unwrap();

    let get = client
        .get(Request::new(pb::GetRequest {
            namespace: "ns".to_string(),
            key: "k".to_string(),
        }))
        .await
        .unwrap()
        .into_inner();
    assert!(get.found);
    assert_eq!(get.value, b"hello");

    let delete = client
        .delete(Request::new(pb::DeleteRequest {
            namespace: "ns".to_string(),
            key: "k".to_string(),
        }))
        .await
        .unwrap()
        .into_inner();
    assert!(delete.deleted);

    let get = client
        .get(Request::new(pb::GetRequest {
            namespace: "ns".to_string(),
            key: "k".to_string(),
        }))
        .await
        .unwrap()
        .into_inner();
    assert!(!get.found);
}

#[tokio::test]
async fn get_distinguishes_miss_from_empty_value() {
    let addr = start_server(&test_config()).await;
    let mut client = connect(addr).await;

    // Miss: found=false.
    let miss = client
        .get(Request::new(pb::GetRequest {
            namespace: "ns".to_string(),
            key: "absent".to_string(),
        }))
        .await
        .unwrap()
        .into_inner();
    assert!(!miss.found);
    assert!(miss.value.is_empty());

    // Hit com valor vazio: found=true.
    client.put(put_request("ns", "empty", b"")).await.unwrap();
    let hit = client
        .get(Request::new(pb::GetRequest {
            namespace: "ns".to_string(),
            key: "empty".to_string(),
        }))
        .await
        .unwrap()
        .into_inner();
    assert!(hit.found);
    assert!(hit.value.is_empty());
}

#[tokio::test]
async fn put_overwrites_and_delete_is_idempotent() {
    let addr = start_server(&test_config()).await;
    let mut client = connect(addr).await;

    client.put(put_request("ns", "k", b"v1")).await.unwrap();
    client.put(put_request("ns", "k", b"v2")).await.unwrap();

    let get = client
        .get(Request::new(pb::GetRequest {
            namespace: "ns".to_string(),
            key: "k".to_string(),
        }))
        .await
        .unwrap()
        .into_inner();
    assert_eq!(get.value, b"v2");

    // Duas exclusões: ambas bem-sucedidas; a segunda reporta deleted=false.
    assert!(
        client
            .delete(Request::new(pb::DeleteRequest {
                namespace: "ns".to_string(),
                key: "k".to_string(),
            }))
            .await
            .unwrap()
            .into_inner()
            .deleted
    );
    assert!(
        !client
            .delete(Request::new(pb::DeleteRequest {
                namespace: "ns".to_string(),
                key: "k".to_string(),
            }))
            .await
            .unwrap()
            .into_inner()
            .deleted
    );
}

#[tokio::test]
async fn namespaces_are_isolated() {
    let addr = start_server(&test_config()).await;
    let mut client = connect(addr).await;

    client.put(put_request("ns-a", "same", b"a")).await.unwrap();
    client.put(put_request("ns-b", "same", b"b")).await.unwrap();

    for (namespace, expected) in [("ns-a", &b"a"[..]), ("ns-b", &b"b"[..])] {
        let get = client
            .get(Request::new(pb::GetRequest {
                namespace: namespace.to_string(),
                key: "same".to_string(),
            }))
            .await
            .unwrap()
            .into_inner();
        assert!(get.found);
        assert_eq!(get.value, expected);
    }
}

#[tokio::test]
async fn entry_with_ttl_expires() {
    let addr = start_server(&test_config()).await;
    let mut client = connect(addr).await;

    client
        .put(Request::new(pb::PutRequest {
            namespace: "ns".to_string(),
            key: "ephemeral".to_string(),
            value: b"v".to_vec(),
            ttl: Some(prost_types::Duration {
                seconds: 1,
                nanos: 0,
            }),
        }))
        .await
        .unwrap();

    let hit = client
        .get(Request::new(pb::GetRequest {
            namespace: "ns".to_string(),
            key: "ephemeral".to_string(),
        }))
        .await
        .unwrap()
        .into_inner();
    assert!(hit.found);

    tokio::time::sleep(Duration::from_millis(1200)).await;

    let miss = client
        .get(Request::new(pb::GetRequest {
            namespace: "ns".to_string(),
            key: "ephemeral".to_string(),
        }))
        .await
        .unwrap()
        .into_inner();
    assert!(!miss.found);
}

#[tokio::test]
async fn invalid_key_is_rejected_with_invalid_argument() {
    let addr = start_server(&test_config()).await;
    let mut client = connect(addr).await;

    let err = client.put(put_request("ns", "", b"v")).await.unwrap_err();
    assert_eq!(err.code(), Code::InvalidArgument);
}

#[tokio::test]
async fn oversized_value_is_rejected_with_invalid_argument() {
    let addr = start_server(&test_config()).await; // max_entry_bytes = 1024
    let mut client = connect(addr).await;

    let big = vec![0u8; 2048];
    let err = client.put(put_request("ns", "k", &big)).await.unwrap_err();
    assert_eq!(err.code(), Code::InvalidArgument);
    assert!(
        err.message().contains("too large"),
        "unexpected message: {}",
        err.message()
    );
}

#[tokio::test]
async fn message_beyond_grpc_decode_limit_is_rejected() {
    // max_entry (1024) < decode limit (4096) < mensagem enviada (8192):
    // a rejeição acontece no transporte gRPC, antes do caso de uso.
    let addr = start_server(&test_config()).await;
    let mut client = connect(addr).await;

    let big = vec![1u8; 8192];
    let err = client.put(put_request("ns", "k", &big)).await.unwrap_err();
    // O tonic 0.13 mapeia mensagem acima do limite de decodificação para
    // `OutOfRange`; o importante é a rejeição no transporte gRPC.
    assert_eq!(err.code(), Code::OutOfRange, "unexpected status: {err:?}");
    assert!(
        err.message().contains("too large"),
        "unexpected message: {}",
        err.message()
    );
}
