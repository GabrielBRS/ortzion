//! Porte fiel de `src/lib/capacity.ts` (regras de capacidade, reservas,
//! estimativas de memória e pools), incluindo as mensagens em pt-BR.

use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use super::{
    Cluster, ClusterCapacity, ComputePool, ComputeProfile, InferenceEngine, ModelProfile,
    Quantization, Reservation,
};
use crate::format::{fmt_gib, fmt_num};

#[derive(Debug, Clone, Copy, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ClusterTotals {
    pub vcpu: f64,
    /// RAM do host (GPU dedicada) ou parcela de CPU da memória unificada.
    pub cpu_memory_gi_b: f64,
    pub gpus: i64,
    /// VRAM total (GPU dedicada) ou parcela destinada à GPU (memória unificada).
    pub gpu_memory_gi_b: f64,
    /// Somente memória unificada: total físico. Em GPU dedicada, igual a cpuMemoryGiB (RAM).
    pub physical_memory_gi_b: f64,
    pub storage_gi_b: f64,
}

/// Nunca conta a memória unificada em dobro: o total físico é dividido entre
/// parcela de CPU e parcela de GPU.
pub fn cluster_totals(profile: ComputeProfile, c: &ClusterCapacity) -> ClusterTotals {
    let vcpu = c.nodes as f64 * c.vcpu_per_node;
    let gpus = c.nodes as i64 * c.gpus_per_node as i64;
    if profile == ComputeProfile::Unified {
        let physical = c.nodes as f64 * c.memory_per_node_gi_b;
        let gpu_share = c.nodes as f64 * c.gpu_share_per_node_gi_b;
        return ClusterTotals {
            vcpu,
            gpus,
            physical_memory_gi_b: physical,
            gpu_memory_gi_b: gpu_share,
            cpu_memory_gi_b: physical - gpu_share,
            storage_gi_b: c.storage_gi_b,
        };
    }
    let ram = c.nodes as f64 * c.memory_per_node_gi_b;
    ClusterTotals {
        vcpu,
        gpus,
        cpu_memory_gi_b: ram,
        physical_memory_gi_b: ram,
        gpu_memory_gi_b: gpus as f64 * c.vram_per_gpu_gi_b,
        storage_gi_b: c.storage_gi_b,
    }
}

pub fn add_res(a: Reservation, b: &Reservation) -> Reservation {
    Reservation {
        vcpu: a.vcpu + b.vcpu,
        memory_gi_b: a.memory_gi_b + b.memory_gi_b,
        gpus: a.gpus + b.gpus,
        gpu_memory_gi_b: a.gpu_memory_gi_b + b.gpu_memory_gi_b,
    }
}

/// Soma das reservas ativas (mesma regra de `clusterReserved` do mock):
/// implantações/serviços pausados ou com falha não reservam; agentes só quando ativos.
pub fn cluster_reserved_from_items(items: &[ReservationItem], exclude_id: Option<Uuid>) -> Reservation {
    items
        .iter()
        .filter(|i| Some(i.id) != exclude_id)
        .fold(Reservation::EMPTY, |acc, i| add_res(acc, &i.reservation))
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReservationItem {
    pub id: Uuid,
    pub kind: String, // 'implantação' | 'serviço' | 'agente'
    pub name: String,
    pub reservation: Reservation,
}

/// Verifica se uma reserva cabe no cluster. Lista vazia significa que cabe.
/// `reserved` deve ser a soma das reservas ativas (já excluindo `exclude_id`).
pub fn check_fit(
    cluster: &Cluster,
    reserved: Reservation,
    req: &Reservation,
) -> Vec<String> {
    let mut issues: Vec<String> = Vec::new();
    if cluster.status == super::ClusterStatus::Pausado {
        issues.push(
            "O cluster está pausado. Retome o cluster antes de alocar novos recursos.".to_string(),
        );
    }
    let t = cluster_totals(cluster.profile, &cluster.capacity);
    let cap = &cluster.capacity;
    let unified = cluster.profile == ComputeProfile::Unified;
    let mem_label = if unified {
        "Memória unificada (parcela de CPU)"
    } else {
        "Memória RAM"
    };
    let gpu_mem_label = if unified {
        "Memória destinada à GPU"
    } else {
        "VRAM"
    };

    let free = |total: f64, used: f64| (total - used).max(0.0);
    if req.vcpu > free(t.vcpu, reserved.vcpu) {
        issues.push(format!(
            "vCPU insuficiente: solicitado {} vCPU, disponível {} de {} vCPU contratados.",
            fmt_num(req.vcpu, 1),
            fmt_num(free(t.vcpu, reserved.vcpu), 1),
            fmt_num(t.vcpu, 1)
        ));
    }
    if req.memory_gi_b > free(t.cpu_memory_gi_b, reserved.memory_gi_b) {
        issues.push(format!(
            "{} insuficiente: solicitado {}, disponível {} de {}.",
            mem_label,
            fmt_gib(req.memory_gi_b),
            fmt_gib(free(t.cpu_memory_gi_b, reserved.memory_gi_b)),
            fmt_gib(t.cpu_memory_gi_b)
        ));
    }
    if req.gpus > free(t.gpus as f64, reserved.gpus as f64) as i64 {
        issues.push(format!(
            "GPU insuficiente: solicitado {} GPU, disponível {} de {}.",
            req.gpus,
            free(t.gpus as f64, reserved.gpus as f64) as i64,
            t.gpus
        ));
    }
    if req.gpu_memory_gi_b > free(t.gpu_memory_gi_b, reserved.gpu_memory_gi_b) {
        issues.push(format!(
            "{} insuficiente: solicitado {}, disponível {} de {}.",
            gpu_mem_label,
            fmt_gib(req.gpu_memory_gi_b),
            fmt_gib(free(t.gpu_memory_gi_b, reserved.gpu_memory_gi_b)),
            fmt_gib(t.gpu_memory_gi_b)
        ));
    }

    // Restrições por nó: uma carga não se espalha automaticamente entre máquinas.
    if req.vcpu > cap.vcpu_per_node {
        issues.push(format!(
            "Uma única carga não pode usar mais que {} vCPU (capacidade de um nó).",
            fmt_num(cap.vcpu_per_node, 1)
        ));
    }
    if req.gpus > cap.gpus_per_node as i64 {
        issues.push(format!(
            "Uma única implantação não pode usar mais que {} GPU, pois todas precisam estar no mesmo nó.",
            cap.gpus_per_node
        ));
    }
    let gpu_mem_per_node = if unified {
        cap.gpu_share_per_node_gi_b
    } else {
        cap.gpus_per_node as f64 * cap.vram_per_gpu_gi_b
    };
    if req.gpu_memory_gi_b > gpu_mem_per_node {
        issues.push(format!(
            "{} exigida ({}) excede o que um único nó oferece ({}). A memória de nós diferentes não forma uma GPU única.",
            gpu_mem_label,
            fmt_gib(req.gpu_memory_gi_b),
            fmt_gib(gpu_mem_per_node)
        ));
    }
    issues
}

// ---------------------------------------------------------------------------
// Estimativa ilustrativa de memória de implantações de modelo

pub fn bytes_per_param(q: Quantization) -> f64 {
    match q {
        Quantization::FP16 => 2.0,
        Quantization::FP8 => 1.0,
        Quantization::INT8 => 1.0,
        Quantization::INT4 => 0.5,
    }
}

#[derive(Debug, Clone, Copy, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MemoryEstimate {
    pub weights_gi_b: f64,
    pub kv_cache_gi_b: f64,
    pub overhead_gi_b: f64,
    pub total_gi_b: f64,
}

pub fn estimate_model_memory(
    model: &ModelProfile,
    quant: Quantization,
    context_length: i64,
) -> MemoryEstimate {
    let weights_gi_b = (model.params_b * 1e9 * bytes_per_param(quant)) / 2f64.powi(30);
    let kv_cache_gi_b = model.params_b * (context_length as f64 / 1000.0) * 0.0045;
    let overhead_gi_b = 1.5 + weights_gi_b * 0.05;
    MemoryEstimate {
        weights_gi_b,
        kv_cache_gi_b,
        overhead_gi_b,
        total_gi_b: weights_gi_b + kv_cache_gi_b + overhead_gi_b,
    }
}

/// Reserva sugerida para uma implantação, conforme perfil do cluster e motor.
pub fn deployment_reservation(
    cluster: &Cluster,
    engine: &InferenceEngine,
    est: &MemoryEstimate,
) -> Reservation {
    if !engine.requires_gpu {
        return Reservation {
            vcpu: 8.0,
            memory_gi_b: (est.total_gi_b + 4.0).ceil(),
            gpus: 0,
            gpu_memory_gi_b: 0.0,
        };
    }
    if cluster.profile == ComputeProfile::Unified {
        return Reservation {
            vcpu: 4.0,
            memory_gi_b: (4.0 + est.weights_gi_b * 0.05).ceil(),
            gpus: 1,
            gpu_memory_gi_b: (est.total_gi_b / 8.0).ceil() * 8.0,
        };
    }
    let vram = if cluster.capacity.vram_per_gpu_gi_b > 0.0 {
        cluster.capacity.vram_per_gpu_gi_b
    } else {
        80.0
    };
    let gpus = ((est.total_gi_b / vram).ceil() as i64).max(1);
    Reservation {
        vcpu: 4.0 + (gpus as f64) * 2.0,
        memory_gi_b: (8.0 + est.weights_gi_b * 0.25).ceil(),
        gpus,
        gpu_memory_gi_b: gpus as f64 * vram,
    }
}

// ---------------------------------------------------------------------------
// Pools

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PoolUsageEntry {
    pub total: f64,
    pub allocated: f64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PoolUsage {
    pub total_nodes: i64,
    pub vcpu: PoolUsageEntry,
    pub memory: PoolUsageEntry,
    pub gpus: PoolUsageEntry,
    pub clusters: Vec<Cluster>,
}

pub fn pool_usage(pool: &ComputePool, clusters: Vec<Cluster>) -> PoolUsage {
    let mut vcpu = 0.0;
    let mut memory = 0.0;
    let mut gpus = 0.0;
    for c in &clusters {
        let cap = &c.capacity;
        vcpu += cap.nodes as f64 * cap.vcpu_per_node;
        memory += cap.nodes as f64 * cap.memory_per_node_gi_b;
        gpus += (cap.nodes * cap.gpus_per_node) as f64;
    }
    PoolUsage {
        total_nodes: pool.nodes,
        vcpu: PoolUsageEntry {
            total: pool.nodes as f64 * pool.per_node.vcpu,
            allocated: vcpu,
        },
        memory: PoolUsageEntry {
            total: pool.nodes as f64 * pool.per_node.memory_gi_b,
            allocated: memory,
        },
        gpus: PoolUsageEntry {
            total: (pool.nodes * pool.per_node.gpus) as f64,
            allocated: gpus,
        },
        clusters,
    }
}

/// Verifica se a capacidade contratada cabe no pool, descontando o próprio
/// cluster quando editado. `other_caps` = capacidades dos outros clusters do pool.
pub fn check_pool_fit(
    pool: &ComputePool,
    other_caps: &[(Uuid, ClusterCapacity)],
    cap: &ClusterCapacity,
) -> Vec<String> {
    let mut issues: Vec<String> = Vec::new();
    let mut used_vcpu = 0.0;
    let mut used_mem = 0.0;
    let mut used_gpus = 0.0;
    for (_, c) in other_caps {
        used_vcpu += c.nodes as f64 * c.vcpu_per_node;
        used_mem += c.nodes as f64 * c.memory_per_node_gi_b;
        used_gpus += (c.nodes * c.gpus_per_node) as f64;
    }
    let n = pool.nodes as f64;
    let p = &pool.per_node;
    if cap.vcpu_per_node > p.vcpu
        || cap.memory_per_node_gi_b > p.memory_gi_b
        || cap.gpus_per_node as f64 > p.gpus as f64
    {
        issues.push("A capacidade por nó excede o hardware de um nó deste pool.".to_string());
    }
    if used_vcpu + cap.nodes as f64 * cap.vcpu_per_node > n * p.vcpu {
        issues.push(
            "O pool não possui vCPU disponível suficiente para esta capacidade.".to_string(),
        );
    }
    if used_mem + cap.nodes as f64 * cap.memory_per_node_gi_b > n * p.memory_gi_b {
        issues.push(
            "O pool não possui memória disponível suficiente para esta capacidade.".to_string(),
        );
    }
    if used_gpus + (cap.nodes * cap.gpus_per_node) as f64 > n * p.gpus as f64 {
        issues.push(
            "O pool não possui GPUs disponíveis suficientes para esta capacidade.".to_string(),
        );
    }
    issues
}

/// A nova capacidade não pode ficar abaixo do que já está reservado no cluster.
pub fn check_capacity_against_reservations(
    cluster: &Cluster,
    reserved: Reservation,
    cap: &ClusterCapacity,
) -> Vec<String> {
    let t = cluster_totals(cluster.profile, cap);
    let mut issues: Vec<String> = Vec::new();
    let unified = cluster.profile == ComputeProfile::Unified;
    if t.vcpu < reserved.vcpu {
        issues.push(format!(
            "Há {} vCPU reservados; a capacidade não pode ser menor que isso.",
            fmt_num(reserved.vcpu, 1)
        ));
    }
    if t.cpu_memory_gi_b < reserved.memory_gi_b {
        issues.push(format!(
            "Há {} de {} reservados; reduza as cargas antes de diminuir.",
            fmt_gib(reserved.memory_gi_b),
            if unified {
                "memória da parcela de CPU"
            } else {
                "RAM"
            }
        ));
    }
    if t.gpus < reserved.gpus {
        issues.push(format!(
            "Há {} GPU reservadas por implantações.",
            reserved.gpus
        ));
    }
    if t.gpu_memory_gi_b < reserved.gpu_memory_gi_b {
        issues.push(format!(
            "Há {} de {} reservados por implantações.",
            fmt_gib(reserved.gpu_memory_gi_b),
            if unified {
                "memória destinada à GPU"
            } else {
                "VRAM"
            }
        ));
    }
    if unified && cap.gpu_share_per_node_gi_b > cap.memory_per_node_gi_b - 16.0 {
        issues.push(
            "Na memória unificada, mantenha ao menos 16 GiB por nó para o sistema e a CPU."
                .to_string(),
        );
    }
    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cap(nodes: i32, vcpu: f64, mem: f64, gpus: i32, vram: f64, share: f64, st: f64) -> ClusterCapacity {
        ClusterCapacity {
            nodes,
            vcpu_per_node: vcpu,
            memory_per_node_gi_b: mem,
            gpus_per_node: gpus,
            vram_per_gpu_gi_b: vram,
            gpu_share_per_node_gi_b: share,
            storage_gi_b: st,
        }
    }

    #[test]
    fn unified_memory_not_double_counted() {
        // 1 nó de 256 GiB unificados com 192 GiB destinados à GPU.
        let t = cluster_totals(ComputeProfile::Unified, &cap(1, 32.0, 256.0, 2, 0.0, 192.0, 1024.0));
        assert_eq!(t.physical_memory_gi_b, 256.0);
        assert_eq!(t.gpu_memory_gi_b, 192.0);
        assert_eq!(t.cpu_memory_gi_b, 64.0);
        // CPU + GPU nunca excede o físico.
        assert!(t.cpu_memory_gi_b + t.gpu_memory_gi_b <= t.physical_memory_gi_b);
    }

    #[test]
    fn dedicated_totals() {
        let t = cluster_totals(
            ComputeProfile::DedicatedGpu,
            &cap(2, 64.0, 512.0, 8, 80.0, 0.0, 4096.0),
        );
        assert_eq!(t.vcpu, 128.0);
        assert_eq!(t.gpus, 16);
        assert_eq!(t.cpu_memory_gi_b, 1024.0);
        assert_eq!(t.physical_memory_gi_b, 1024.0);
        assert_eq!(t.gpu_memory_gi_b, 1280.0);
    }

    #[test]
    fn model_memory_estimate_matches_mock() {
        let model = ModelProfile {
            id: Uuid::nil(),
            name: "Modelo Demo 70B".into(),
            params_b: 70.0,
            max_context: 131072,
            quantizations: vec![Quantization::FP16],
            description: String::new(),
            tag: "Grande".into(),
        };
        let est = estimate_model_memory(&model, Quantization::INT8, 32768);
        // weights = 70e9 / 2^30 ≈ 65,19 GiB
        assert!((est.weights_gi_b - 65.192).abs() < 0.01);
        // kv = 70 * 32,768 * 0,0045 = 10,32192
        assert!((est.kv_cache_gi_b - 10.32192).abs() < 1e-6);
    }

    #[test]
    fn reservation_formulas() {
        let unified_cluster = Cluster {
            id: Uuid::nil(),
            org_id: Uuid::nil(),
            pool_id: Uuid::nil(),
            name: "lab".into(),
            purpose: String::new(),
            modality: super::super::Modality::Virtual,
            profile: ComputeProfile::Unified,
            status: super::super::ClusterStatus::Ativo,
            capacity: cap(1, 32.0, 256.0, 2, 0.0, 192.0, 1024.0),
            monthly_budget: 0.0,
            limit_policy: super::super::LimitPolicy::Alertar,
            created_at: chrono::Utc::now(),
        };
        let gpu_engine = InferenceEngine {
            id: Uuid::nil(),
            name: "MAX".into(),
            vendor: "Modular".into(),
            description: String::new(),
            profiles: vec![ComputeProfile::Unified],
            compatibility: String::new(),
            requires_gpu: true,
        };
        let cpu_engine = InferenceEngine {
            requires_gpu: false,
            ..gpu_engine.clone()
        };
        let est = MemoryEstimate {
            weights_gi_b: 65.0,
            kv_cache_gi_b: 10.0,
            overhead_gi_b: 4.75,
            total_gi_b: 79.75,
        };
        let r = deployment_reservation(&unified_cluster, &gpu_engine, &est);
        assert_eq!(r.vcpu, 4.0);
        assert_eq!(r.gpus, 1);
        assert_eq!(r.gpu_memory_gi_b, 80.0); // ceil(79.75/8)*8
        let r_cpu = deployment_reservation(&unified_cluster, &cpu_engine, &est);
        assert_eq!(r_cpu.vcpu, 8.0);
        assert_eq!(r_cpu.gpus, 0);
        assert_eq!(r_cpu.memory_gi_b, 84.0); // ceil(79.75+4)
    }
}
