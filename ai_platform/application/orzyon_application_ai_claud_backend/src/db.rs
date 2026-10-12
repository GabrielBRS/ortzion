//! Acesso a dados: mapeamento linha→domínio e consultas compartilhadas.
//! Usa `sqlx::query` com checagem em runtime (sem macros `query!`).

use chrono::{DateTime, Utc};
use sqlx::{PgPool, Postgres, Row, Transaction};
use uuid::Uuid;

use crate::domain::capacity::{ReservationItem, ClusterTotals, cluster_totals};
use crate::domain::costs::CapacitySegment;
use crate::domain::*;
use crate::error::{ApiError, AppResult};

pub type Tx<'a> = Transaction<'a, Postgres>;

// ---------------------------------------------------------------------------
// Mapeamentos

fn profile(s: &str) -> ComputeProfile {
    match s {
        "unified" => ComputeProfile::Unified,
        _ => ComputeProfile::DedicatedGpu,
    }
}

pub fn map_cluster(r: &sqlx::postgres::PgRow) -> Cluster {
    let capacity = ClusterCapacity {
        nodes: r.get("nodes"),
        vcpu_per_node: vcpu_from_millicores(r.get("vcpu_per_node_millicores")),
        memory_per_node_gi_b: gib_from_bytes(r.get("memory_per_node_bytes")),
        gpus_per_node: r.get("gpus_per_node"),
        vram_per_gpu_gi_b: gib_from_bytes(r.get("vram_per_gpu_bytes")),
        gpu_share_per_node_gi_b: gib_from_bytes(r.get("gpu_share_per_node_bytes")),
        storage_gi_b: gib_from_bytes(r.get("storage_bytes")),
    };
    Cluster {
        id: r.get("id"),
        org_id: r.get("org_id"),
        pool_id: r.get("pool_id"),
        name: r.get("name"),
        purpose: r.get("purpose"),
        modality: if r.get::<String, _>("modality") == "dedicado" {
            Modality::Dedicado
        } else {
            Modality::Virtual
        },
        profile: profile(&r.get::<String, _>("profile")),
        status: match r.get::<String, _>("status").as_str() {
            "provisionando" => ClusterStatus::Provisionando,
            "pausado" => ClusterStatus::Pausado,
            _ => ClusterStatus::Ativo,
        },
        capacity,
        monthly_budget: brl_from_cents(r.get("monthly_budget_cents")),
        limit_policy: LimitPolicy::parse(&r.get::<String, _>("limit_policy")).unwrap_or(LimitPolicy::Alertar),
        created_at: r.get("created_at"),
    }
}

const CLUSTER_COLS: &str = "id, org_id, pool_id, name, purpose, modality, profile, status, nodes,
    vcpu_per_node_millicores, memory_per_node_bytes, gpus_per_node, vram_per_gpu_bytes,
    gpu_share_per_node_bytes, storage_bytes, monthly_budget_cents, limit_policy, created_at";

pub fn map_org(r: &sqlx::postgres::PgRow) -> Organization {
    Organization {
        id: r.get("id"),
        name: r.get("name"),
        slug: r.get("slug"),
        monthly_budget: brl_from_cents(r.get("monthly_budget_cents")),
        limit_policy: LimitPolicy::parse(&r.get::<String, _>("limit_policy")).unwrap_or(LimitPolicy::Alertar),
        alert_threshold: r.get("alert_threshold"),
        members: Vec::new(),
    }
}

pub fn map_pool(r: &sqlx::postgres::PgRow) -> ComputePool {
    ComputePool {
        id: r.get("id"),
        name: r.get("name"),
        region: r.get("region"),
        profile: profile(&r.get::<String, _>("profile")),
        hardware: r.get("hardware"),
        nodes: r.get::<i32, _>("nodes") as i64,
        per_node: PoolPerNode {
            vcpu: r.get::<i32, _>("vcpu_per_node") as f64,
            memory_gi_b: gib_from_bytes(r.get("memory_per_node_bytes")),
            gpus: r.get::<i32, _>("gpus_per_node") as i64,
            vram_per_gpu_gi_b: gib_from_bytes(r.get("vram_per_gpu_bytes")),
        },
        health: r.get("health"),
        nodes_degraded: r.get::<i32, _>("nodes_degraded") as i64,
    }
}

pub fn map_model(r: &sqlx::postgres::PgRow) -> ModelProfile {
    let quants: Vec<String> = serde_json::from_value(r.get("quantizations")).unwrap_or_default();
    ModelProfile {
        id: r.get("id"),
        name: r.get("name"),
        params_b: r.get("params_b"),
        max_context: r.get::<i32, _>("max_context") as i64,
        quantizations: quants.iter().filter_map(|q| Quantization::parse(q)).collect(),
        description: r.get("description"),
        tag: r.get("tag"),
    }
}

pub fn map_engine(r: &sqlx::postgres::PgRow) -> InferenceEngine {
    let profiles: Vec<String> = serde_json::from_value(r.get("profiles")).unwrap_or_default();
    InferenceEngine {
        id: r.get("id"),
        name: r.get("name"),
        vendor: r.get("vendor"),
        description: r.get("description"),
        profiles: profiles.iter().map(|p| profile(p)).collect(),
        compatibility: r.get("compatibility"),
        requires_gpu: r.get("requires_gpu"),
    }
}

fn reservation_from(r: &sqlx::postgres::PgRow, prefix: &str) -> Reservation {
    Reservation {
        vcpu: vcpu_from_millicores(r.get(format!("{prefix}vcpu_millicores").as_str())),
        memory_gi_b: gib_from_bytes(r.get(format!("{prefix}memory_bytes").as_str())),
        gpus: r.get::<i32, _>(format!("{prefix}gpus").as_str()) as i64,
        gpu_memory_gi_b: gib_from_bytes(r.get(format!("{prefix}gpu_memory_bytes").as_str())),
    }
}

pub fn map_deployment(r: &sqlx::postgres::PgRow) -> ModelDeployment {
    ModelDeployment {
        id: r.get("id"),
        cluster_id: r.get("cluster_id"),
        name: r.get("name"),
        model_id: r.get("model_id"),
        engine_id: r.get("engine_id"),
        quantization: Quantization::parse(&r.get::<String, _>("quantization")).unwrap_or(Quantization::FP16),
        context_length: r.get::<i32, _>("context_length") as i64,
        status: match r.get::<String, _>("status").as_str() {
            "preparando" => DeploymentStatus::Preparando,
            "carregando" => DeploymentStatus::Carregando,
            "pausado" => DeploymentStatus::Pausado,
            "falha" => DeploymentStatus::Falha,
            _ => DeploymentStatus::Disponivel,
        },
        reservation: reservation_from(r, "res_"),
        failure_reason: r.get("failure_reason"),
        created_at: r.get("created_at"),
    }
}

const DEPLOYMENT_COLS: &str = "id, cluster_id, name, model_id, engine_id, quantization,
    context_length, status, res_vcpu_millicores, res_memory_bytes, res_gpus,
    res_gpu_memory_bytes, failure_reason, created_at";

pub fn map_agent(r: &sqlx::postgres::PgRow) -> Agent {
    Agent {
        id: r.get("id"),
        cluster_id: r.get("cluster_id"),
        name: r.get("name"),
        description: r.get("description"),
        status: if r.get::<String, _>("status") == "pausado" {
            AgentStatus::Pausado
        } else {
            AgentStatus::Ativo
        },
        tags: serde_json::from_value(r.get("tags")).unwrap_or_default(),
        system_prompt: r.get("system_prompt"),
        deployment_id: r.get("deployment_id"),
        analysis_profile: r.get("analysis_profile"),
        temperature: r.get("temperature"),
        max_tokens: r.get::<i32, _>("max_tokens") as i64,
        tools: serde_json::from_value(r.get("tools")).unwrap_or_default(),
        knowledge: serde_json::from_value(r.get("knowledge")).unwrap_or_default(),
        routes: serde_json::from_value(r.get("routes")).unwrap_or_default(),
        concurrency: r.get::<i32, _>("concurrency") as i64,
        runtime: AgentRuntime {
            vcpu: vcpu_from_millicores(r.get("runtime_vcpu_millicores")),
            memory_gi_b: gib_from_bytes(r.get("runtime_memory_bytes")),
        },
        traffic_base: r.get("traffic_base"),
        updated_at: r.get("updated_at"),
    }
}

pub fn map_service(r: &sqlx::postgres::PgRow) -> Service {
    Service {
        id: r.get("id"),
        cluster_id: r.get("cluster_id"),
        name: r.get("name"),
        kind: if r.get::<String, _>("kind") == "image" {
            ServiceKind::Image
        } else {
            ServiceKind::Source
        },
        runtime: r
            .get::<Option<String>, _>("runtime")
            .and_then(|s| match s.as_str() {
                "mojo" => Some(SourceRuntime::Mojo),
                "python_mojo" => Some(SourceRuntime::PythonMojo),
                "python" => Some(SourceRuntime::Python),
                _ => None,
            }),
        file_name: r.get("file_name"),
        code: r.get("code"),
        image: r.get("image"),
        command: r.get("command"),
        env: serde_json::from_value(r.get("env")).unwrap_or_default(),
        version: r.get("version"),
        status: match r.get::<String, _>("status").as_str() {
            "na_fila" => ServiceStatus::NaFila,
            "construindo" => ServiceStatus::Construindo,
            "implantando" => ServiceStatus::Implantando,
            "pausado" => ServiceStatus::Pausado,
            "falha" => ServiceStatus::Falha,
            _ => ServiceStatus::Ativo,
        },
        reservation: reservation_from(r, "res_"),
        endpoint: r.get("endpoint"),
        logs: Vec::new(),
        traffic_base: r.get("traffic_base"),
        created_at: r.get("created_at"),
    }
}

const SERVICE_COLS: &str = "id, cluster_id, name, kind, runtime, file_name, code, image,
    command, env, version, status, res_vcpu_millicores, res_memory_bytes, res_gpus,
    res_gpu_memory_bytes, endpoint, traffic_base, created_at";

pub fn map_event(r: &sqlx::postgres::PgRow) -> ActivityEvent {
    ActivityEvent {
        id: r.get("id"),
        org_id: r.get("org_id"),
        cluster_id: r.get("cluster_id"),
        ts: r.get("ts"),
        level: r.get("level"),
        source: r.get("source"),
        message: r.get("message"),
    }
}

// ---------------------------------------------------------------------------
// Consultas simples

pub async fn load_org(pool: &PgPool, id: Uuid) -> AppResult<Option<Organization>> {
    let row = sqlx::query(
        "SELECT id, name, slug, monthly_budget_cents, limit_policy, alert_threshold FROM organizations WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(row.as_ref().map(map_org))
}

pub async fn load_cluster(pool: &PgPool, id: Uuid) -> AppResult<Option<Cluster>> {
    let row = sqlx::query(&format!("SELECT {CLUSTER_COLS} FROM clusters WHERE id = $1"))
        .bind(id)
        .fetch_optional(pool)
        .await?;
    Ok(row.as_ref().map(map_cluster))
}

/// Carrega o cluster com lock de linha (para mudanças de capacidade/reservas).
pub async fn lock_cluster(tx: &mut Tx<'_>, id: Uuid) -> AppResult<Option<Cluster>> {
    let row = sqlx::query(&format!("SELECT {CLUSTER_COLS} FROM clusters WHERE id = $1 FOR UPDATE"))
        .bind(id)
        .fetch_optional(&mut **tx)
        .await?;
    Ok(row.as_ref().map(map_cluster))
}

pub async fn load_pool(pool: &PgPool, id: Uuid) -> AppResult<Option<ComputePool>> {
    let row = sqlx::query(
        "SELECT id, name, region, profile, hardware, nodes, vcpu_per_node, memory_per_node_bytes, gpus_per_node, vram_per_gpu_bytes, health, nodes_degraded FROM compute_pools WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(row.as_ref().map(map_pool))
}

pub async fn load_deployment(pool: &PgPool, id: Uuid) -> AppResult<Option<ModelDeployment>> {
    let row = sqlx::query(&format!("SELECT {DEPLOYMENT_COLS} FROM model_deployments WHERE id = $1"))
        .bind(id)
        .fetch_optional(pool)
        .await?;
    Ok(row.as_ref().map(map_deployment))
}

pub async fn load_agent(pool: &PgPool, id: Uuid) -> AppResult<Option<Agent>> {
    let row = sqlx::query("SELECT * FROM agents WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await?;
    Ok(row.as_ref().map(map_agent))
}

pub async fn load_service(pool: &PgPool, id: Uuid) -> AppResult<Option<Service>> {
    let row = sqlx::query(&format!("SELECT {SERVICE_COLS} FROM services WHERE id = $1"))
        .bind(id)
        .fetch_optional(pool)
        .await?;
    Ok(row.as_ref().map(map_service))
}

pub async fn load_service_logs(pool: &PgPool, service_id: Uuid) -> AppResult<Vec<LogLine>> {
    let rows = sqlx::query("SELECT ts, level, message FROM service_logs WHERE service_id = $1 ORDER BY ts, id")
        .bind(service_id)
        .fetch_all(pool)
        .await?;
    Ok(rows
        .iter()
        .map(|r| LogLine {
            ts: r.get("ts"),
            level: r.get("level"),
            message: r.get("message"),
        })
        .collect())
}

/// Capacidades dos clusters do pool, exceto `exclude`.
pub async fn pool_capacities(
    pool: &PgPool,
    pool_id: Uuid,
    exclude: Option<Uuid>,
) -> AppResult<Vec<(Uuid, ClusterCapacity)>> {
    let rows = sqlx::query(&format!(
        "SELECT {CLUSTER_COLS} FROM clusters WHERE pool_id = $1 AND ($2::uuid IS NULL OR id <> $2)"
    ))
    .bind(pool_id)
    .bind(exclude)
    .fetch_all(pool)
    .await?;
    Ok(rows.iter().map(|r| (map_cluster(r).id, map_cluster(r).capacity)).collect())
}

/// Variante transacional (usada dentro de mudanças de capacidade).
pub async fn pool_capacities_tx(
    tx: &mut Tx<'_>,
    pool_id: Uuid,
    exclude: Option<Uuid>,
) -> AppResult<Vec<(Uuid, ClusterCapacity)>> {
    let rows = sqlx::query(&format!(
        "SELECT {CLUSTER_COLS} FROM clusters WHERE pool_id = $1 AND ($2::uuid IS NULL OR id <> $2)"
    ))
    .bind(pool_id)
    .bind(exclude)
    .fetch_all(&mut **tx)
    .await?;
    Ok(rows.iter().map(|r| (map_cluster(r).id, map_cluster(r).capacity)).collect())
}

/// Itens que mantêm reserva ativa no cluster. Pausados e com falha liberam a
/// reserva; agentes reservam apenas quando ativos (e nunca duplicam os pesos
/// da implantação compartilhada).
pub async fn reserved_items(
    ex: impl sqlx::PgExecutor<'_>,
    cluster_id: Uuid,
) -> AppResult<Vec<ReservationItem>> {
    let mut items: Vec<ReservationItem> = Vec::new();
    let deps = sqlx::query(&format!(
        "SELECT {DEPLOYMENT_COLS} FROM model_deployments WHERE cluster_id = $1 AND status NOT IN ('pausado', 'falha')"
    ))
    .bind(cluster_id)
    .fetch_all(ex)
    .await?;
    for r in &deps {
        let d = map_deployment(r);
        items.push(ReservationItem {
            id: d.id,
            kind: "implantação".into(),
            name: d.name,
            reservation: d.reservation,
        });
    }
    Ok(items)
}

pub async fn reserved_items_services(
    ex: impl sqlx::PgExecutor<'_>,
    cluster_id: Uuid,
    items: &mut Vec<ReservationItem>,
) -> AppResult<()> {
    let svcs = sqlx::query(&format!(
        "SELECT {SERVICE_COLS} FROM services WHERE cluster_id = $1 AND status NOT IN ('pausado', 'falha')"
    ))
    .bind(cluster_id)
    .fetch_all(ex)
    .await?;
    for r in &svcs {
        let s = map_service(r);
        items.push(ReservationItem {
            id: s.id,
            kind: "serviço".into(),
            name: s.name,
            reservation: s.reservation,
        });
    }
    Ok(())
}

pub async fn reserved_items_agents(
    ex: impl sqlx::PgExecutor<'_>,
    cluster_id: Uuid,
    items: &mut Vec<ReservationItem>,
) -> AppResult<()> {
    let rows = sqlx::query("SELECT * FROM agents WHERE cluster_id = $1 AND status = 'ativo'")
        .bind(cluster_id)
        .fetch_all(ex)
        .await?;
    for r in &rows {
        let a = map_agent(r);
        items.push(ReservationItem {
            id: a.id,
            kind: "agente".into(),
            name: a.name,
            reservation: Reservation {
                vcpu: a.runtime.vcpu,
                memory_gi_b: a.runtime.memory_gi_b,
                gpus: 0,
                gpu_memory_gi_b: 0.0,
            },
        });
    }
    Ok(())
}

pub async fn all_reserved_items(pool: &PgPool, cluster_id: Uuid) -> AppResult<Vec<ReservationItem>> {
    let mut items = reserved_items(pool, cluster_id).await?;
    reserved_items_services(pool, cluster_id, &mut items).await?;
    reserved_items_agents(pool, cluster_id, &mut items).await?;
    Ok(items)
}

/// Soma das reservas dentro de uma transação (chamador já travou o cluster).
pub async fn reserved_sum_tx(
    tx: &mut Tx<'_>,
    cluster_id: Uuid,
    exclude_id: Option<Uuid>,
) -> AppResult<Reservation> {
    let mut items = reserved_items(&mut **tx, cluster_id).await?;
    reserved_items_services(&mut **tx, cluster_id, &mut items).await?;
    reserved_items_agents(&mut **tx, cluster_id, &mut items).await?;
    Ok(crate::domain::capacity::cluster_reserved_from_items(&items, exclude_id))
}

// ---------------------------------------------------------------------------
// Histórico de capacidade

pub async fn record_capacity(
    tx: &mut Tx<'_>,
    cluster_id: Uuid,
    capacity: &ClusterCapacity,
    status: &str,
    effective_from: DateTime<Utc>,
) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO cluster_capacity_history (cluster_id, effective_from, capacity, status) VALUES ($1, $2, $3, $4)",
    )
    .bind(cluster_id)
    .bind(effective_from)
    .bind(serde_json::to_value(capacity).unwrap_or_default())
    .bind(status)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn capacity_segments(pool: &PgPool, cluster_id: Uuid) -> AppResult<Vec<CapacitySegment>> {
    let rows = sqlx::query(
        "SELECT effective_from, capacity, status FROM cluster_capacity_history WHERE cluster_id = $1 ORDER BY effective_from, id",
    )
    .bind(cluster_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .iter()
        .filter_map(|r| {
            let cap: ClusterCapacity = serde_json::from_value(r.get("capacity")).ok()?;
            Some(CapacitySegment {
                effective_from: r.get("effective_from"),
                capacity: cap,
                status: r.get("status"),
            })
        })
        .collect())
}

// ---------------------------------------------------------------------------
// Visão agregada (bootstrap, métricas, custos)

#[derive(Debug, Clone, Default)]
pub struct DataView {
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

impl DataView {
    pub fn metrics_view(&self) -> std::collections::HashMap<Uuid, Vec<ReservationItem>> {
        let mut map: std::collections::HashMap<Uuid, Vec<ReservationItem>> = std::collections::HashMap::new();
        for d in &self.deployments {
            if d.status == DeploymentStatus::Pausado || d.status == DeploymentStatus::Falha {
                continue;
            }
            map.entry(d.cluster_id).or_default().push(ReservationItem {
                id: d.id,
                kind: "implantação".into(),
                name: d.name.clone(),
                reservation: d.reservation,
            });
        }
        for s in &self.services {
            if s.status == ServiceStatus::Pausado || s.status == ServiceStatus::Falha {
                continue;
            }
            map.entry(s.cluster_id).or_default().push(ReservationItem {
                id: s.id,
                kind: "serviço".into(),
                name: s.name.clone(),
                reservation: s.reservation,
            });
        }
        for a in &self.agents {
            if a.status != AgentStatus::Ativo {
                continue;
            }
            map.entry(a.cluster_id).or_default().push(ReservationItem {
                id: a.id,
                kind: "agente".into(),
                name: a.name.clone(),
                reservation: Reservation {
                    vcpu: a.runtime.vcpu,
                    memory_gi_b: a.runtime.memory_gi_b,
                    gpus: 0,
                    gpu_memory_gi_b: 0.0,
                },
            });
        }
        map
    }

    pub fn cluster_totals(&self, cluster: &Cluster) -> ClusterTotals {
        cluster_totals(cluster.profile, &cluster.capacity)
    }
}

/// Carrega a visão completa escopada às organizações informadas.
/// `with_logs` inclui logs dos serviços (bootstrap); caso contrário omite.
pub async fn load_data_view(pool: &PgPool, org_ids: &[Uuid], with_logs: bool) -> AppResult<DataView> {
    let mut view = DataView::default();

    let org_rows = sqlx::query(
        "SELECT id, name, slug, monthly_budget_cents, limit_policy, alert_threshold FROM organizations WHERE id = ANY($1) ORDER BY name",
    )
    .bind(org_ids)
    .fetch_all(pool)
    .await?;
    view.orgs = org_rows.iter().map(map_org).collect();

    let member_rows = sqlx::query("SELECT id, org_id, name, email, role FROM org_members WHERE org_id = ANY($1) ORDER BY name")
        .bind(org_ids)
        .fetch_all(pool)
        .await?;
    for r in &member_rows {
        let org_id: Uuid = r.get("org_id");
        if let Some(o) = view.orgs.iter_mut().find(|o| o.id == org_id) {
            o.members.push(Member {
                id: r.get("id"),
                name: r.get("name"),
                email: r.get("email"),
                role: r.get("role"),
            });
        }
    }

    let pool_rows = sqlx::query(
        "SELECT id, name, region, profile, hardware, nodes, vcpu_per_node, memory_per_node_bytes, gpus_per_node, vram_per_gpu_bytes, health, nodes_degraded FROM compute_pools ORDER BY name",
    )
    .fetch_all(pool)
    .await?;
    view.pools = pool_rows.iter().map(map_pool).collect();

    let cluster_rows = sqlx::query(&format!(
        "SELECT {CLUSTER_COLS} FROM clusters WHERE org_id = ANY($1) ORDER BY created_at"
    ))
    .bind(org_ids)
    .fetch_all(pool)
    .await?;
    view.clusters = cluster_rows.iter().map(map_cluster).collect();
    let cluster_ids: Vec<Uuid> = view.clusters.iter().map(|c| c.id).collect();

    let model_rows = sqlx::query("SELECT * FROM model_profiles ORDER BY params_b")
        .fetch_all(pool)
        .await?;
    view.models = model_rows.iter().map(map_model).collect();

    let engine_rows = sqlx::query("SELECT * FROM inference_engines ORDER BY name")
        .fetch_all(pool)
        .await?;
    view.engines = engine_rows.iter().map(map_engine).collect();

    let dep_rows = sqlx::query(&format!(
        "SELECT {DEPLOYMENT_COLS} FROM model_deployments WHERE cluster_id = ANY($1) ORDER BY created_at"
    ))
    .bind(&cluster_ids)
    .fetch_all(pool)
    .await?;
    view.deployments = dep_rows.iter().map(map_deployment).collect();

    let agent_rows = sqlx::query("SELECT * FROM agents WHERE cluster_id = ANY($1) ORDER BY name")
        .bind(&cluster_ids)
        .fetch_all(pool)
        .await?;
    view.agents = agent_rows.iter().map(map_agent).collect();

    let svc_rows = sqlx::query(&format!(
        "SELECT {SERVICE_COLS} FROM services WHERE cluster_id = ANY($1) ORDER BY created_at"
    ))
    .bind(&cluster_ids)
    .fetch_all(pool)
    .await?;
    view.services = svc_rows.iter().map(map_service).collect();
    if with_logs {
        for s in &mut view.services {
            s.logs = load_service_logs(pool, s.id).await?;
        }
    }

    let event_rows = sqlx::query(
        "SELECT id, org_id, cluster_id, ts, level, source, message FROM activity_events WHERE org_id = ANY($1) ORDER BY ts DESC LIMIT 300",
    )
    .bind(org_ids)
    .fetch_all(pool)
    .await?;
    view.events = event_rows.iter().map(map_event).collect();

    Ok(view)
}

pub async fn insert_event(
    ex: impl sqlx::PgExecutor<'_>,
    org_id: Uuid,
    level: &str,
    source: &str,
    message: &str,
    cluster_id: Option<Uuid>,
) -> AppResult<Uuid> {
    let id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO activity_events (id, org_id, cluster_id, ts, level, source, message) VALUES ($1, $2, $3, now(), $4, $5, $6)",
    )
    .bind(id)
    .bind(org_id)
    .bind(cluster_id)
    .bind(level)
    .bind(source)
    .bind(message)
    .execute(ex)
    .await?;
    Ok(id)
}

/// Insere evento apenas se não existir um idêntico recente (idempotência do worker).
pub async fn insert_event_once(
    ex: impl sqlx::PgExecutor<'_>,
    org_id: Uuid,
    level: &str,
    source: &str,
    message: &str,
    cluster_id: Option<Uuid>,
) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO activity_events (id, org_id, cluster_id, ts, level, source, message)
         SELECT $1, $2, $3, now(), $4, $5, $6
         WHERE NOT EXISTS (
             SELECT 1 FROM activity_events
             WHERE org_id = $2 AND source = $5 AND message = $6
               AND (cluster_id IS NOT DISTINCT FROM $3)
               AND ts > now() - interval '1 day'
         )",
    )
    .bind(Uuid::new_v4())
    .bind(org_id)
    .bind(cluster_id)
    .bind(level)
    .bind(source)
    .bind(message)
    .execute(ex)
    .await?;
    Ok(())
}

pub async fn org_of_cluster(pool: &PgPool, cluster_id: Uuid) -> AppResult<Option<Uuid>> {
    let row = sqlx::query("SELECT org_id FROM clusters WHERE id = $1")
        .bind(cluster_id)
        .fetch_optional(pool)
        .await?;
    Ok(row.map(|r| r.get("org_id")))
}

pub async fn org_of_deployment(pool: &PgPool, deployment_id: Uuid) -> AppResult<Option<Uuid>> {
    let row = sqlx::query(
        "SELECT c.org_id FROM model_deployments d JOIN clusters c ON c.id = d.cluster_id WHERE d.id = $1",
    )
    .bind(deployment_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| r.get("org_id")))
}

pub async fn org_of_agent(pool: &PgPool, agent_id: Uuid) -> AppResult<Option<Uuid>> {
    let row = sqlx::query(
        "SELECT c.org_id FROM agents a JOIN clusters c ON c.id = a.cluster_id WHERE a.id = $1",
    )
    .bind(agent_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| r.get("org_id")))
}

pub async fn org_of_service(pool: &PgPool, service_id: Uuid) -> AppResult<Option<Uuid>> {
    let row = sqlx::query(
        "SELECT c.org_id FROM services s JOIN clusters c ON c.id = s.cluster_id WHERE s.id = $1",
    )
    .bind(service_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| r.get("org_id")))
}

pub fn api_error_not_found(what: &str) -> ApiError {
    ApiError::not_found(format!("{what} não encontrado."))
}
