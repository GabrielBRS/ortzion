//! Handler gRPC do serviço de cache.
//!
//! Os métodos apenas convertem mensagens Protobuf para os tipos
//! internos, acionam os casos de uso e empacotam as respostas. Toda
//! regra de negócio fica nos casos de uso; todo acesso ao armazenamento
//! passa pelo port `CacheRepository`.
//!
//! Os logs registram apenas metadados (namespace, key, tamanho do
//! valor). Valores nunca são logados.

use bytes::Bytes;
use tonic::{Request, Response, Status};
use tracing::debug;

use crate::{
    adapters::inbound::grpc::error_mapping::cache_error_to_status,
    application::use_cases::{delete_entry::DeleteEntry, get_entry::GetEntry, put_entry::PutEntry},
    pb,
};

/// Implementação do serviço `orzyon.cache.v1.CacheService`.
pub struct CacheGrpcHandler {
    put_entry: PutEntry,
    get_entry: GetEntry,
    delete_entry: DeleteEntry,
}

impl CacheGrpcHandler {
    pub fn new(put_entry: PutEntry, get_entry: GetEntry, delete_entry: DeleteEntry) -> Self {
        Self {
            put_entry,
            get_entry,
            delete_entry,
        }
    }
}

#[tonic::async_trait]
impl pb::cache_service_server::CacheService for CacheGrpcHandler {
    async fn put(
        &self,
        request: Request<pb::PutRequest>,
    ) -> Result<Response<pb::PutResponse>, Status> {
        let req = request.into_inner();
        debug!(
            namespace = %req.namespace,
            key = %req.key,
            value_bytes = req.value.len(),
            "cache put"
        );

        let ttl = req
            .ttl
            .map(std::time::Duration::try_from)
            .transpose()
            .map_err(|_| Status::invalid_argument("ttl must be a valid, non-negative duration"))?;

        self.put_entry
            .execute(&req.namespace, &req.key, Bytes::from(req.value), ttl)
            .await
            .map(|_| Response::new(pb::PutResponse {}))
            .map_err(cache_error_to_status)
    }

    async fn get(
        &self,
        request: Request<pb::GetRequest>,
    ) -> Result<Response<pb::GetResponse>, Status> {
        let req = request.into_inner();
        debug!(namespace = %req.namespace, key = %req.key, "cache get");

        let outcome = self
            .get_entry
            .execute(&req.namespace, &req.key)
            .await
            .map_err(cache_error_to_status)?;

        // `found` distingue explicitamente miss de hit com valor vazio.
        let (found, value) = match outcome {
            Some(bytes) => (true, bytes.to_vec()),
            None => (false, Vec::new()),
        };
        Ok(Response::new(pb::GetResponse { found, value }))
    }

    async fn delete(
        &self,
        request: Request<pb::DeleteRequest>,
    ) -> Result<Response<pb::DeleteResponse>, Status> {
        let req = request.into_inner();
        debug!(namespace = %req.namespace, key = %req.key, "cache delete");

        let deleted = self
            .delete_entry
            .execute(&req.namespace, &req.key)
            .await
            .map_err(cache_error_to_status)?;
        Ok(Response::new(pb::DeleteResponse { deleted }))
    }
}
