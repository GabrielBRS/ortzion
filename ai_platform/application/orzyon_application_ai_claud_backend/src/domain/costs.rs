//! Custos derivados da tabela de tarifas fictícias — porte de `src/lib/costs.ts`
//! com cálculo por segmentos de `cluster_capacity_history` (criação,
//! redimensionamentos e pausas dentro do mês corrente; nada retroativo).

use chrono::{DateTime, Datelike, Timelike, Utc};
use serde::Serialize;
use utoipa::ToSchema;

use super::metrics::{active_workloads, avg_diurnal, local_offset, MetricsView};
use super::pricing::{HOURS_PER_MONTH, PRICING};
use super::{Cluster, ClusterCapacity, ComputeProfile, Modality};

#[derive(Debug, Clone, Copy, Serialize, ToSchema)]
pub struct CapacityCostBreakdown {
    pub vcpu: f64,
    pub memory: f64,
    pub gpu: f64,
    pub storage: f64,
    pub compute_total: f64,
    pub total: f64,
}

/// Custo mensal da capacidade reservada (independe do uso).
pub fn capacity_monthly_cost(
    profile: ComputeProfile,
    modality: Modality,
    cap: &ClusterCapacity,
) -> CapacityCostBreakdown {
    let p = &PRICING.capacity;
    let mult = if modality == Modality::Dedicado {
        p.dedicated_modality_multiplier
    } else {
        1.0
    };
    let vcpu = cap.nodes as f64 * cap.vcpu_per_node * p.vcpu_hour * HOURS_PER_MONTH * mult;
    let mem_rate = if profile == ComputeProfile::Unified {
        p.unified_memory_gi_b_hour
    } else {
        p.ram_gi_b_hour
    };
    let memory = cap.nodes as f64 * cap.memory_per_node_gi_b * mem_rate * HOURS_PER_MONTH * mult;
    let gpu_rate = if profile == ComputeProfile::Unified {
        p.unified_gpu_hour
    } else {
        p.dedicated_gpu_hour
    };
    let gpu = cap.nodes as f64 * cap.gpus_per_node as f64 * gpu_rate * HOURS_PER_MONTH * mult;
    let storage = cap.storage_gi_b * p.storage_gi_b_month;
    let compute_total = vcpu + memory + gpu;
    CapacityCostBreakdown {
        vcpu,
        memory,
        gpu,
        storage,
        compute_total,
        total: compute_total + storage,
    }
}

#[derive(Debug, Clone, Copy, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MonthWindow {
    #[serde(serialize_with = "super::ser_ts")]
    pub start: DateTime<Utc>,
    #[serde(serialize_with = "super::ser_ts")]
    pub end: DateTime<Utc>,
    pub total_hours: f64,
    pub elapsed_hours: f64,
    pub fraction: f64,
}

/// Janela do mês corrente no fuso local do protótipo (UTC-3).
pub fn month_window(now: DateTime<Utc>) -> MonthWindow {
    let local = now.with_timezone(&local_offset());
    let start_local = local
        .with_day(1)
        .unwrap()
        .with_hour(0)
        .unwrap()
        .with_minute(0)
        .unwrap()
        .with_second(0)
        .unwrap()
        .with_nanosecond(0)
        .unwrap();
    let (y, m) = if local.month() == 12 {
        (local.year() + 1, 1)
    } else {
        (local.year(), local.month() + 1)
    };
    let end_local = start_local.with_year(y).unwrap().with_month(m).unwrap();
    let start = start_local.with_timezone(&Utc);
    let end = end_local.with_timezone(&Utc);
    let total_h = (end - start).num_milliseconds() as f64 / 3_600_000.0;
    let elapsed_h = (now - start).num_milliseconds() as f64 / 3_600_000.0;
    MonthWindow {
        start,
        end,
        total_hours: total_h,
        elapsed_hours: elapsed_h,
        fraction: elapsed_h / total_h,
    }
}

/// Segmento de histórico de capacidade: vale de `effective_from` até o próximo.
#[derive(Debug, Clone)]
pub struct CapacitySegment {
    pub effective_from: DateTime<Utc>,
    pub capacity: ClusterCapacity,
    /// Status do cluster durante o segmento ('ativo', 'pausado', ...).
    pub status: String,
}

#[derive(Debug, Clone, Copy, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReservedByResource {
    pub vcpu: f64,
    pub memory: f64,
    pub gpu: f64,
    pub storage: f64,
}

/// Soma o custo reservado acumulado no mês por segmentos do histórico.
/// Segmento pausado cobra apenas armazenamento.
pub fn reserved_to_date(
    profile: ComputeProfile,
    modality: Modality,
    segments: &[CapacitySegment],
    win: &MonthWindow,
    now: DateTime<Utc>,
) -> (f64, ReservedByResource) {
    let mut total = 0.0;
    let mut by = ReservedByResource {
        vcpu: 0.0,
        memory: 0.0,
        gpu: 0.0,
        storage: 0.0,
    };
    for (i, seg) in segments.iter().enumerate() {
        let seg_end = segments
            .get(i + 1)
            .map(|s| s.effective_from)
            .unwrap_or(now)
            .min(now);
        let seg_start = seg.effective_from.max(win.start);
        if seg_end <= seg_start {
            continue;
        }
        let hours = (seg_end - seg_start).num_milliseconds() as f64 / 3_600_000.0;
        if hours <= 0.0 {
            continue;
        }
        let cost = capacity_monthly_cost(profile, modality, &seg.capacity);
        let running = seg.status != "pausado";
        let compute_h = if running { hours / HOURS_PER_MONTH } else { 0.0 };
        by.vcpu += cost.vcpu * compute_h;
        by.memory += cost.memory * compute_h;
        by.gpu += cost.gpu * compute_h;
        let storage = (cost.storage / win.total_hours) * hours;
        by.storage += storage;
        total += cost.compute_total * compute_h + storage;
    }
    (total, by)
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct VariableBreakdown {
    pub gateway: f64,
    pub egress: f64,
    pub observability: f64,
    pub total: f64,
}

pub fn variable_for(requests: f64) -> VariableBreakdown {
    let f = &PRICING.usage_factors;
    let v = &PRICING.variable;
    let gateway = (requests / 1e6) * v.gateway_per_million_requests;
    let egress = ((requests * f.egress_ki_b_per_request) / 2f64.powi(20)) * v.egress_per_gi_b;
    let observability = ((requests * f.log_ki_b_per_request) / 2f64.powi(20)) * v.observability_per_gi_b;
    VariableBreakdown {
        gateway,
        egress,
        observability,
        total: gateway + egress + observability,
    }
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ClusterCost {
    pub cluster: Cluster,
    pub capacity: CapacityCostBreakdown,
    /// Capacidade: custo mensal efetivo considerando segmentos e status.
    pub reserved_monthly: f64,
    pub reserved_to_date: f64,
    /// Capacidade acumulada no mês por recurso (soma = reservedToDate).
    pub reserved_by_resource: ReservedByResource,
    pub variable_to_date: f64,
    pub variable_projected: f64,
    pub requests_to_date: f64,
    pub to_date: f64,
    pub projected: f64,
    pub variable: VariableBreakdown,
}

/// Custo de um cluster. `segments` deve estar ordenado por `effective_from` e
/// cobrir ao menos a criação; o último segmento reflete capacidade/status atuais.
pub fn cluster_cost(
    data: &MetricsView,
    cluster: &Cluster,
    segments: &[CapacitySegment],
    now: DateTime<Utc>,
) -> ClusterCost {
    let capacity = capacity_monthly_cost(cluster.profile, cluster.modality, &cluster.capacity);
    let win = month_window(now);
    let active_from = if cluster.created_at > win.start {
        cluster.created_at
    } else {
        win.start
    };
    let active_h = ((now - active_from).num_milliseconds() as f64 / 3_600_000.0).max(0.0);
    let remaining_h = win.total_hours - win.elapsed_hours;
    let running = cluster.status != super::ClusterStatus::Pausado;
    let hourly_compute = capacity.compute_total / HOURS_PER_MONTH;
    let hourly_storage = capacity.storage / win.total_hours;

    let (reserved_to_date, reserved_by_resource) = if segments.is_empty() {
        // Sem histórico (não deveria ocorrer): comportamento equivalente ao mock.
        let compute_h = if running { active_h / HOURS_PER_MONTH } else { 0.0 };
        let by = ReservedByResource {
            vcpu: capacity.vcpu * compute_h,
            memory: capacity.memory * compute_h,
            gpu: capacity.gpu * compute_h,
            storage: hourly_storage * active_h,
        };
        let total = if running { hourly_compute * active_h } else { 0.0 } + by.storage;
        (total, by)
    } else {
        reserved_to_date(cluster.profile, cluster.modality, segments, &win, now)
    };
    let reserved_monthly =
        reserved_to_date + (if running { hourly_compute } else { 0.0 } + hourly_storage) * remaining_h;

    let rate_per_min: f64 = active_workloads(data, &[cluster.id.to_string()])
        .iter()
        .map(|w| w.rate_per_min)
        .sum();
    let req_per_hour = rate_per_min * 60.0 * avg_diurnal();
    let requests_to_date = req_per_hour * active_h;
    let v_to_date = variable_for(requests_to_date);
    let v_projected = variable_for(requests_to_date + req_per_hour * remaining_h);
    ClusterCost {
        cluster: cluster.clone(),
        capacity,
        reserved_monthly: super::money(reserved_monthly),
        reserved_to_date: super::money(reserved_to_date),
        reserved_by_resource: ReservedByResource {
            vcpu: super::money(reserved_by_resource.vcpu),
            memory: super::money(reserved_by_resource.memory),
            gpu: super::money(reserved_by_resource.gpu),
            storage: super::money(reserved_by_resource.storage),
        },
        variable_to_date: super::money(v_to_date.total),
        variable_projected: super::money(v_projected.total),
        requests_to_date: requests_to_date.round(),
        to_date: super::money(reserved_to_date + v_to_date.total),
        projected: super::money(reserved_monthly + v_projected.total),
        variable: VariableBreakdown {
            gateway: super::money(v_to_date.gateway),
            egress: super::money(v_to_date.egress),
            observability: super::money(v_to_date.observability),
            total: super::money(v_to_date.total),
        },
    }
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OrgCosts {
    pub items: Vec<ClusterCost>,
    pub to_date: f64,
    pub projected: f64,
    pub reserved_to_date: f64,
    pub variable_to_date: f64,
    pub reserved_projected: f64,
    pub variable_projected: f64,
}

pub fn org_costs(items: Vec<ClusterCost>) -> OrgCosts {
    let sum = |f: fn(&ClusterCost) -> f64| super::money(items.iter().map(f).sum::<f64>());
    OrgCosts {
        to_date: sum(|x| x.to_date),
        projected: sum(|x| x.projected),
        reserved_to_date: sum(|x| x.reserved_to_date),
        variable_to_date: sum(|x| x.variable_to_date),
        reserved_projected: sum(|x| x.reserved_monthly),
        variable_projected: sum(|x| x.variable_projected),
        items,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn cap(nodes: i32, vcpu: f64, mem: f64, gpus: i32, storage: f64) -> ClusterCapacity {
        ClusterCapacity {
            nodes,
            vcpu_per_node: vcpu,
            memory_per_node_gi_b: mem,
            gpus_per_node: gpus,
            vram_per_gpu_gi_b: 80.0,
            gpu_share_per_node_gi_b: 0.0,
            storage_gi_b: storage,
        }
    }

    #[test]
    fn capacity_cost_dedicated_multiplier() {
        let c = capacity_monthly_cost(
            ComputeProfile::DedicatedGpu,
            Modality::Dedicado,
            &cap(1, 64.0, 512.0, 8, 4096.0),
        );
        let p = &PRICING.capacity;
        let expect_vcpu = 64.0 * p.vcpu_hour * HOURS_PER_MONTH * 1.25;
        assert!((c.vcpu - expect_vcpu).abs() < 1e-6);
        assert!((c.total - (c.compute_total + c.storage)).abs() < 1e-9);
    }

    #[test]
    fn segmented_cost_no_retroactivity() {
        // Mês: out/2026 (UTC-3). Cluster criado dia 1 com 1 nó; dobrado no meio do mês.
        let win_start_local = local_offset().with_ymd_and_hms(2026, 10, 1, 0, 0, 0).unwrap();
        let win_start = win_start_local.with_timezone(&Utc);
        let mid = win_start + chrono::Duration::hours(365); // ~metade de um mês de 730h
        let now = win_start + chrono::Duration::hours(730);
        let win = month_window(now);

        let small = CapacitySegment {
            effective_from: win_start,
            capacity: cap(1, 64.0, 512.0, 8, 4096.0),
            status: "ativo".into(),
        };
        let big = CapacitySegment {
            effective_from: mid,
            capacity: cap(2, 64.0, 512.0, 8, 4096.0),
            status: "ativo".into(),
        };
        let (total_seg, _) = reserved_to_date(
            ComputeProfile::DedicatedGpu,
            Modality::Virtual,
            &[small.clone(), big],
            &win,
            now,
        );
        let (total_flat, _) = reserved_to_date(
            ComputeProfile::DedicatedGpu,
            Modality::Virtual,
            &[CapacitySegment {
                effective_from: win_start,
                capacity: cap(2, 64.0, 512.0, 8, 4096.0),
                status: "ativo".into(),
            }],
            &win,
            now,
        );
        // Segmentado deve custar menos que aplicar a nova capacidade ao mês inteiro.
        assert!(total_seg < total_flat);
        // E mais que a capacidade antiga o mês inteiro.
        let (total_small, _) = reserved_to_date(
            ComputeProfile::DedicatedGpu,
            Modality::Virtual,
            &[small],
            &win,
            now,
        );
        assert!(total_seg > total_small);
    }

    #[test]
    fn paused_segment_charges_only_storage() {
        let win_start = local_offset()
            .with_ymd_and_hms(2026, 10, 1, 0, 0, 0)
            .unwrap()
            .with_timezone(&Utc);
        let mid = win_start + chrono::Duration::hours(365);
        let now = win_start + chrono::Duration::hours(730);
        let win = month_window(now);
        let segments = vec![
            CapacitySegment {
                effective_from: win_start,
                capacity: cap(1, 64.0, 512.0, 8, 4096.0),
                status: "ativo".into(),
            },
            CapacitySegment {
                effective_from: mid,
                capacity: cap(1, 64.0, 512.0, 8, 4096.0),
                status: "pausado".into(),
            },
        ];
        let (total, by) = reserved_to_date(
            ComputeProfile::DedicatedGpu,
            Modality::Virtual,
            &segments,
            &win,
            now,
        );
        let cost = capacity_monthly_cost(ComputeProfile::DedicatedGpu, Modality::Virtual, &cap(1, 64.0, 512.0, 8, 4096.0));
        let half_compute = cost.compute_total * (365.0 / HOURS_PER_MONTH);
        let full_storage = cost.storage; // mês inteiro de armazenamento
        assert!((by.vcpu - cost.vcpu * (365.0 / HOURS_PER_MONTH)).abs() < 0.01);
        assert!((total - (half_compute + full_storage)).abs() < 0.5);
    }
}
