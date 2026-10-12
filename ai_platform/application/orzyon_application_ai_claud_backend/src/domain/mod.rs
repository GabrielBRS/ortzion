//! Tipos de domínio espelhando `src/domain/types.ts` do frontend.
//! O JSON da API segue os mesmos shapes (camelCase).

use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize, Serializer};
use utoipa::ToSchema;
use uuid::Uuid;

pub mod capacity;
pub mod costs;
pub mod metrics;
pub mod pricing;
pub mod samples;

pub fn ser_ts<S: Serializer>(ts: &DateTime<Utc>, s: S) -> Result<S::Ok, S::Error> {
    s.serialize_str(&ts.to_rfc3339_opts(SecondsFormat::Millis, true))
}

pub fn ser_ts_opt<S: Serializer>(ts: &Option<DateTime<Utc>>, s: S) -> Result<S::Ok, S::Error> {
    match ts {
        Some(t) => s.serialize_some(&t.to_rfc3339_opts(SecondsFormat::Millis, true)),
        None => s.serialize_none(),
    }
}

pub const GIB: f64 = 1073741824.0; // 2^30

pub fn brl_from_cents(cents: i64) -> f64 {
    ((cents as f64) / 100.0 * 100.0).round() / 100.0
}

pub fn cents_from_brl(brl: f64) -> i64 {
    (brl * 100.0).round() as i64
}

pub fn gib_from_bytes(bytes: i64) -> f64 {
    bytes as f64 / GIB
}

pub fn bytes_from_gib(gib: f64) -> i64 {
    (gib * GIB).round() as i64
}

pub fn vcpu_from_millicores(mc: i64) -> f64 {
    mc as f64 / 1000.0
}

pub fn millicores_from_vcpu(v: f64) -> i64 {
    (v * 1000.0).round() as i64
}

/// Arredonda valores monetários da API para 2 casas.
pub fn money(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum LimitPolicy {
    #[serde(rename = "alertar")]
    Alertar,
    #[serde(rename = "bloquear_alocacoes")]
    BloquearAlocacoes,
    #[serde(rename = "pausar_lote")]
    PausarLote,
}

impl LimitPolicy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Alertar => "alertar",
            Self::BloquearAlocacoes => "bloquear_alocacoes",
            Self::PausarLote => "pausar_lote",
        }
    }
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "alertar" => Some(Self::Alertar),
            "bloquear_alocacoes" => Some(Self::BloquearAlocacoes),
            "pausar_lote" => Some(Self::PausarLote),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum Modality {
    #[serde(rename = "virtual")]
    Virtual,
    #[serde(rename = "dedicado")]
    Dedicado,
}

impl Modality {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Virtual => "virtual",
            Self::Dedicado => "dedicado",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum ComputeProfile {
    #[serde(rename = "unified")]
    Unified,
    #[serde(rename = "dedicated_gpu")]
    DedicatedGpu,
}

impl ComputeProfile {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Unified => "unified",
            Self::DedicatedGpu => "dedicated_gpu",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum ClusterStatus {
    #[serde(rename = "provisionando")]
    Provisionando,
    #[serde(rename = "ativo")]
    Ativo,
    #[serde(rename = "pausado")]
    Pausado,
}

impl ClusterStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Provisionando => "provisionando",
            Self::Ativo => "ativo",
            Self::Pausado => "pausado",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Member {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Organization {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    /// Orçamento mensal em BRL (2 casas).
    pub monthly_budget: f64,
    pub limit_policy: LimitPolicy,
    /// 0..1
    pub alert_threshold: f64,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub members: Vec<Member>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ClusterCapacity {
    pub nodes: i32,
    pub vcpu_per_node: f64,
    /// dedicated_gpu: RAM do host. unified: total físico da memória unificada.
    pub memory_per_node_gi_b: f64,
    pub gpus_per_node: i32,
    /// Somente dedicated_gpu: VRAM de cada GPU.
    pub vram_per_gpu_gi_b: f64,
    /// Somente unified: parcela da memória unificada destinada à GPU, por nó.
    pub gpu_share_per_node_gi_b: f64,
    pub storage_gi_b: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Cluster {
    pub id: Uuid,
    pub org_id: Uuid,
    pub pool_id: Uuid,
    pub name: String,
    pub purpose: String,
    pub modality: Modality,
    pub profile: ComputeProfile,
    pub status: ClusterStatus,
    pub capacity: ClusterCapacity,
    pub monthly_budget: f64,
    pub limit_policy: LimitPolicy,
    #[serde(serialize_with = "ser_ts")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Reservation {
    pub vcpu: f64,
    /// RAM do host (ou parcela de CPU da memória unificada).
    pub memory_gi_b: f64,
    /// GPUs inteiras (dedicated_gpu).
    pub gpus: i64,
    /// VRAM reservada (dedicated) ou parcela de GPU (unified).
    pub gpu_memory_gi_b: f64,
}

impl Reservation {
    pub const EMPTY: Reservation = Reservation {
        vcpu: 0.0,
        memory_gi_b: 0.0,
        gpus: 0,
        gpu_memory_gi_b: 0.0,
    };
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum Quantization {
    FP16,
    FP8,
    INT8,
    INT4,
}

impl Quantization {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FP16 => "FP16",
            Self::FP8 => "FP8",
            Self::INT8 => "INT8",
            Self::INT4 => "INT4",
        }
    }
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "FP16" => Some(Self::FP16),
            "FP8" => Some(Self::FP8),
            "INT8" => Some(Self::INT8),
            "INT4" => Some(Self::INT4),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ModelProfile {
    pub id: Uuid,
    pub name: String,
    pub params_b: f64,
    pub max_context: i64,
    pub quantizations: Vec<Quantization>,
    pub description: String,
    pub tag: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct InferenceEngine {
    pub id: Uuid,
    pub name: String,
    pub vendor: String,
    pub description: String,
    pub profiles: Vec<ComputeProfile>,
    pub compatibility: String,
    pub requires_gpu: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum DeploymentStatus {
    #[serde(rename = "preparando")]
    Preparando,
    #[serde(rename = "carregando")]
    Carregando,
    #[serde(rename = "disponivel")]
    Disponivel,
    #[serde(rename = "pausado")]
    Pausado,
    #[serde(rename = "falha")]
    Falha,
}

impl DeploymentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Preparando => "preparando",
            Self::Carregando => "carregando",
            Self::Disponivel => "disponivel",
            Self::Pausado => "pausado",
            Self::Falha => "falha",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ModelDeployment {
    pub id: Uuid,
    pub cluster_id: Uuid,
    pub name: String,
    pub model_id: Uuid,
    pub engine_id: Uuid,
    pub quantization: Quantization,
    pub context_length: i64,
    pub status: DeploymentStatus,
    pub reservation: Reservation,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_reason: Option<String>,
    #[serde(serialize_with = "ser_ts")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AgentRoute {
    pub id: String,
    pub condition: String,
    pub target: String,
    pub fallback: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum AgentStatus {
    #[serde(rename = "ativo")]
    Ativo,
    #[serde(rename = "pausado")]
    Pausado,
}

impl AgentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Ativo => "ativo",
            Self::Pausado => "pausado",
        }
    }
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AgentRuntime {
    pub vcpu: f64,
    pub memory_gi_b: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub id: Uuid,
    pub cluster_id: Uuid,
    pub name: String,
    pub description: String,
    pub status: AgentStatus,
    pub tags: Vec<String>,
    pub system_prompt: String,
    pub deployment_id: Option<Uuid>,
    pub analysis_profile: String,
    pub temperature: f64,
    pub max_tokens: i64,
    pub tools: Vec<String>,
    pub knowledge: Vec<String>,
    pub routes: Vec<AgentRoute>,
    pub concurrency: i64,
    pub runtime: AgentRuntime,
    /// Peso de tráfego demonstrativo (requisições/min em média).
    pub traffic_base: f64,
    #[serde(serialize_with = "ser_ts")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum ServiceKind {
    #[serde(rename = "source")]
    Source,
    #[serde(rename = "image")]
    Image,
}

impl ServiceKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Source => "source",
            Self::Image => "image",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum SourceRuntime {
    #[serde(rename = "python")]
    Python,
    #[serde(rename = "mojo")]
    Mojo,
    #[serde(rename = "python_mojo")]
    PythonMojo,
}

impl SourceRuntime {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Python => "python",
            Self::Mojo => "mojo",
            Self::PythonMojo => "python_mojo",
        }
    }
    pub fn label(&self) -> &'static str {
        match self {
            Self::Python => "Python",
            Self::Mojo => "Mojo",
            Self::PythonMojo => "Python + Mojo",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum ServiceStatus {
    #[serde(rename = "na_fila")]
    NaFila,
    #[serde(rename = "construindo")]
    Construindo,
    #[serde(rename = "implantando")]
    Implantando,
    #[serde(rename = "ativo")]
    Ativo,
    #[serde(rename = "pausado")]
    Pausado,
    #[serde(rename = "falha")]
    Falha,
}

impl ServiceStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::NaFila => "na_fila",
            Self::Construindo => "construindo",
            Self::Implantando => "implantando",
            Self::Ativo => "ativo",
            Self::Pausado => "pausado",
            Self::Falha => "falha",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EnvVar {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LogLine {
    #[serde(serialize_with = "ser_ts")]
    pub ts: DateTime<Utc>,
    pub level: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Service {
    pub id: Uuid,
    pub cluster_id: Uuid,
    pub name: String,
    pub kind: ServiceKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub runtime: Option<SourceRuntime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,
    pub command: String,
    pub env: Vec<EnvVar>,
    pub version: String,
    pub status: ServiceStatus,
    pub reservation: Reservation,
    pub endpoint: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub logs: Vec<LogLine>,
    pub traffic_base: f64,
    #[serde(serialize_with = "ser_ts")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PoolPerNode {
    pub vcpu: f64,
    pub memory_gi_b: f64,
    pub gpus: i64,
    /// 0 em memória unificada.
    pub vram_per_gpu_gi_b: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ComputePool {
    pub id: Uuid,
    pub name: String,
    pub region: String,
    pub profile: ComputeProfile,
    pub hardware: String,
    pub nodes: i64,
    pub per_node: PoolPerNode,
    pub health: String,
    pub nodes_degraded: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    pub id: Uuid,
    pub org_id: Uuid,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cluster_id: Option<Uuid>,
    #[serde(serialize_with = "ser_ts")]
    pub ts: DateTime<Utc>,
    pub level: String,
    pub source: String,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum UserRole {
    #[serde(rename = "cliente")]
    Cliente,
    #[serde(rename = "operador")]
    Operador,
}

impl UserRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Cliente => "cliente",
            Self::Operador => "operador",
        }
    }
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "cliente" => Some(Self::Cliente),
            "operador" => Some(Self::Operador),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub user_name: String,
    pub email: String,
    pub role: UserRole,
    pub org_id: Uuid,
    pub cluster_id: Option<Uuid>,
    #[serde(serialize_with = "ser_ts")]
    pub started_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AppData {
    pub orgs: Vec<Organization>,
    pub pools: Vec<ComputePool>,
    pub clusters: Vec<Cluster>,
    pub models: Vec<ModelProfile>,
    pub engines: Vec<InferenceEngine>,
    pub deployments: Vec<ModelDeployment>,
    pub agents: Vec<Agent>,
    pub services: Vec<Service>,
    pub events: Vec<ActivityEvent>,
}
