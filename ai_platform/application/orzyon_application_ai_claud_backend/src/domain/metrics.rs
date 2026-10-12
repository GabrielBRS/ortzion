//! Séries temporais sintéticas determinísticas, porte fiel de `src/lib/metrics.ts`.
//!
//! Os valores dependem apenas do instante do bucket e do identificador da carga.
//! `hashString` usa UTF-16 code units e multiplicação imul 32-bit, como o JS.
//! O fuso "local" do protótipo é fixado em UTC-3 (horário de Brasília, sem DST
//! desde 2019), equivalente ao `getHours()` do navegador brasileiro.

use std::collections::HashMap;
use std::sync::OnceLock;

use chrono::{DateTime, Datelike, FixedOffset, Timelike, Utc};
use serde::Serialize;
use utoipa::ToSchema;

use super::capacity::{cluster_reserved_from_items, cluster_totals, ReservationItem};
use super::{Cluster, ClusterStatus};

pub const LOCAL_OFFSET_HOURS: i32 = -3;

pub fn local_offset() -> FixedOffset {
    FixedOffset::west_opt(3 * 3600).unwrap()
}

/// FNV-1a sobre UTF-16 code units, com multiplicação imul 32-bit (como `Math.imul`).
pub fn hash_string(s: &str) -> u32 {
    let mut h: u32 = 2166136261;
    for cu in s.encode_utf16() {
        h ^= cu as u32;
        h = h.wrapping_mul(16777619);
    }
    h
}

fn noise(seed: u32, i: i64) -> f64 {
    let x = (seed as f64 * 0.000127 + i as f64 * 12.9898).sin() * 43758.5453;
    x - x.floor() // 0..1, igual a `x - Math.floor(x)`
}

struct LocalParts {
    hour: f64, // hora + minutos/60
    day: u32,  // 0 = domingo (como Date.getDay())
}

fn local_parts(ts_ms: i64) -> LocalParts {
    let utc = DateTime::<Utc>::from_timestamp_millis(ts_ms).unwrap_or_default();
    let local = utc.with_timezone(&local_offset());
    let hour = local.hour() as f64 + local.minute() as f64 / 60.0;
    let day = local.weekday().num_days_from_sunday();
    LocalParts { hour, day }
}

/// Curva diária: mais tráfego no horário comercial.
pub fn diurnal(hour: f64, day: u32) -> f64 {
    let weekend = if day == 0 || day == 6 { 0.6 } else { 1.0 };
    let curve = 0.35 + 0.65 * (std::f64::consts::PI * (hour - 6.0) / 16.0).sin().max(0.0);
    curve * weekend
}

fn diurnal_ms(ts_ms: i64) -> f64 {
    let p = local_parts(ts_ms);
    diurnal(p.hour, p.day)
}

/// Média da curva diária em uma semana (7 a 13 de jan/2024, domingo a sábado).
pub fn avg_diurnal() -> f64 {
    static AVG: OnceLock<f64> = OnceLock::new();
    *AVG.get_or_init(|| {
        let mut sum = 0.0;
        for d in 0..7u32 {
            for h in 0..24 {
                // new Date(2024, 0, 7 + d, h, 30): 07/01/2024 era domingo.
                sum += diurnal(h as f64 + 0.5, d % 7);
            }
        }
        sum / (7.0 * 24.0)
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Deserialize, serde::Serialize, ToSchema)]
pub enum Period {
    #[serde(rename = "24h")]
    H24,
    #[serde(rename = "7d")]
    D7,
    #[serde(rename = "30d")]
    D30,
}

struct PeriodCfg {
    points: usize,
    bucket_min: i64,
}

fn period_cfg(p: Period) -> PeriodCfg {
    match p {
        Period::H24 => PeriodCfg { points: 24, bucket_min: 60 },
        Period::D7 => PeriodCfg { points: 42, bucket_min: 240 },
        Period::D30 => PeriodCfg { points: 30, bucket_min: 1440 },
    }
}

#[derive(Debug, Clone)]
pub struct Workload {
    pub id: String,
    pub cluster_id: String,
    pub kind: &'static str, // 'agente' | 'serviço'
    pub name: String,
    pub rate_per_min: f64,
    pub latency_ms: f64,
    pub tokens_in: f64,
    pub tokens_out: f64,
    pub concurrency: f64,
}

fn latency_by_params(params_b: f64) -> f64 {
    120.0 + params_b * 9.0
}

/// Visão mínima dos dados necessária às métricas.
pub struct MetricsView<'a> {
    pub clusters: &'a [Cluster],
    pub agents: &'a [super::Agent],
    pub deployments: &'a [super::ModelDeployment],
    pub models: &'a [super::ModelProfile],
    pub services: &'a [super::Service],
    /// Reservas ativas por cluster (mesma regra de `reservationItems`).
    pub reserved_items: &'a HashMap<uuid::Uuid, Vec<ReservationItem>>,
}

/// Cargas que geram tráfego no momento. Pausadas ou sem modelo disponível não geram.
pub fn active_workloads(data: &MetricsView, cluster_ids: &[String]) -> Vec<Workload> {
    let mut out: Vec<Workload> = Vec::new();
    for a in data.agents {
        let aid = a.id.to_string();
        let acid = a.cluster_id.to_string();
        if !cluster_ids.iter().any(|c| c == &acid) || a.status != super::AgentStatus::Ativo {
            continue;
        }
        let cluster = data.clusters.iter().find(|c| c.id == a.cluster_id);
        match cluster {
            Some(c) if c.status == ClusterStatus::Ativo => {}
            _ => continue,
        }
        let dep = data
            .deployments
            .iter()
            .find(|d| Some(d.id) == a.deployment_id && d.status == super::DeploymentStatus::Disponivel);
        let Some(dep) = dep else { continue };
        let params_b = data
            .models
            .iter()
            .find(|m| m.id == dep.model_id)
            .map(|m| m.params_b)
            .unwrap_or(8.0);
        let profile_factor = match a.analysis_profile.as_str() {
            "Especializado" => 1.35,
            "Avançado" => 1.15,
            _ => 1.0,
        };
        out.push(Workload {
            id: aid,
            cluster_id: acid,
            kind: "agente",
            name: a.name.clone(),
            rate_per_min: a.traffic_base,
            latency_ms: latency_by_params(params_b) * profile_factor,
            tokens_in: 850.0,
            tokens_out: (a.max_tokens as f64).min(420.0),
            concurrency: a.concurrency as f64,
        });
    }
    for s in data.services {
        let sid = s.id.to_string();
        let scid = s.cluster_id.to_string();
        if !cluster_ids.iter().any(|c| c == &scid) || s.status != super::ServiceStatus::Ativo {
            continue;
        }
        let cluster = data.clusters.iter().find(|c| c.id == s.cluster_id);
        match cluster {
            Some(c) if c.status == ClusterStatus::Ativo => {}
            _ => continue,
        }
        out.push(Workload {
            id: sid.clone(),
            cluster_id: scid,
            kind: "serviço",
            name: s.name.clone(),
            rate_per_min: s.traffic_base,
            latency_ms: 35.0 + (hash_string(&sid) % 40) as f64,
            tokens_in: 0.0,
            tokens_out: 0.0,
            concurrency: 16.0,
        });
    }
    out
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SeriesPoint {
    pub ts: i64,
    pub label: String,
    pub requests: i64,
    pub errors: i64,
    pub error_rate: f64,
    pub p50: i64,
    /// Derivado (p50 × 2,3); percentis agregados não são média de percentis.
    pub p95: i64,
    pub tokens_in: i64,
    pub tokens_out: i64,
    pub tokens_per_sec: i64,
    pub cpu_pct: f64,
    pub mem_pct: f64,
    pub gpu_pct: f64,
    pub gpu_mem_pct: f64,
    pub cpu_used: f64,
    pub mem_used_gi_b: f64,
    pub gpu_mem_used_gi_b: f64,
    pub queue: i64,
    pub concurrency: i64,
}

fn bucket_label(ts_ms: i64, period: Period) -> String {
    let utc = DateTime::<Utc>::from_timestamp_millis(ts_ms).unwrap_or_default();
    let local = utc.with_timezone(&local_offset());
    match period {
        Period::H24 => format!("{:02}:{:02}", local.hour(), local.minute()),
        Period::D7 => {
            const WD: [&str; 7] = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
            format!(
                "{} {:02}",
                WD[local.weekday().num_days_from_sunday() as usize],
                local.hour()
            )
        }
        Period::D30 => format!("{:02}/{:02}", local.day(), local.month()),
    }
}

pub struct SeriesScope {
    pub cluster_ids: Vec<String>,
    pub workload_id: Option<String>,
}

pub fn build_series(
    data: &MetricsView,
    scope: &SeriesScope,
    period: Period,
    now_ms: i64,
) -> Vec<SeriesPoint> {
    let cfg = period_cfg(period);
    let bucket_ms = cfg.bucket_min * 60000;
    let end = (now_ms / bucket_ms) * bucket_ms;
    let mut workloads = active_workloads(data, &scope.cluster_ids);
    if let Some(wid) = &scope.workload_id {
        workloads.retain(|w| &w.id == wid);
    }

    struct CapEntry {
        status: ClusterStatus,
        id: uuid::Uuid,
        total_vcpu: f64,
        total_mem: f64,
        total_gpu: f64,
        total_gpu_mem: f64,
        reserved: super::Reservation,
        peak: f64,
    }

    let mut caps: Vec<CapEntry> = Vec::new();
    for c in data
        .clusters
        .iter()
        .filter(|c| scope.cluster_ids.iter().any(|x| x == &c.id.to_string()))
    {
        let t = cluster_totals(c.profile, &c.capacity);
        let empty = Vec::new();
        let items = data.reserved_items.get(&c.id).unwrap_or(&empty);
        let peak = active_workloads(data, &[c.id.to_string()])
            .iter()
            .map(|w| w.rate_per_min)
            .sum::<f64>()
            .max(1.0);
        caps.push(CapEntry {
            status: c.status,
            id: c.id,
            total_vcpu: t.vcpu,
            total_mem: t.cpu_memory_gi_b,
            total_gpu: t.gpus as f64,
            total_gpu_mem: t.gpu_memory_gi_b,
            reserved: cluster_reserved_from_items(items, None),
            peak,
        });
    }
    let total_cpu: f64 = caps.iter().map(|x| x.total_vcpu).sum();
    let total_mem: f64 = caps.iter().map(|x| x.total_mem).sum();
    let total_gpu: f64 = caps.iter().map(|x| x.total_gpu).sum();
    let total_gpu_mem: f64 = caps.iter().map(|x| x.total_gpu_mem).sum();

    let mut points: Vec<SeriesPoint> = Vec::with_capacity(cfg.points);
    for i in (0..cfg.points).rev() {
        let ts = end - i as i64 * bucket_ms;
        let bucket_idx = ts / bucket_ms;
        // Para buckets de várias horas, usa a média diária aproximada.
        let curve = if cfg.bucket_min >= 1440 {
            let day = local_parts(ts).day;
            avg_diurnal() * if day == 0 || day == 6 { 0.6 } else { 1.12 }
        } else {
            diurnal_ms(ts + bucket_ms / 2)
        };

        let mut requests = 0.0;
        let mut errors = 0.0;
        let mut lat_weighted = 0.0;
        let mut tokens_in = 0.0;
        let mut tokens_out = 0.0;
        let mut concurrency = 0.0;
        let mut load_by_cluster: HashMap<String, f64> = HashMap::new();
        for w in &workloads {
            let n = noise(hash_string(&w.id), bucket_idx);
            let r = w.rate_per_min * cfg.bucket_min as f64 * curve * (0.85 + 0.3 * n);
            let err_rate = 0.002 + 0.01 * noise(hash_string(&w.id).wrapping_add(7), bucket_idx) * curve;
            requests += r;
            errors += r * err_rate;
            lat_weighted += r * w.latency_ms * (0.9 + 0.35 * curve);
            tokens_in += r * w.tokens_in;
            tokens_out += r * w.tokens_out;
            concurrency += w.concurrency * curve * 0.55;
            *load_by_cluster.entry(w.cluster_id.clone()).or_insert(0.0) += w.rate_per_min * curve;
        }

        let mut cpu_used = 0.0;
        let mut mem_used = 0.0;
        let mut gpu_busy = 0.0;
        let mut gpu_mem_used = 0.0;
        for x in &caps {
            if x.status != ClusterStatus::Ativo {
                continue;
            }
            let load = (load_by_cluster.get(&x.id.to_string()).copied().unwrap_or(0.0) / x.peak).min(1.0);
            let n = noise(hash_string(&x.id.to_string()), bucket_idx);
            cpu_used += x.reserved.vcpu * (0.22 + 0.5 * load + 0.06 * n);
            mem_used += x.reserved.memory_gi_b * (0.62 + 0.22 * load);
            gpu_busy += x.reserved.gpus as f64 * (0.18 + 0.62 * load + 0.05 * n);
            gpu_mem_used += x.reserved.gpu_memory_gi_b * (0.7 + 0.22 * load);
        }

        let p50 = if requests > 0.0 { lat_weighted / requests } else { 0.0 };
        let agent_count = workloads.iter().filter(|w| w.kind == "agente").count();
        let queue = if !workloads.is_empty() {
            (curve.powi(3) * 4.0 * agent_count as f64).round() as i64
        } else {
            0
        };
        points.push(SeriesPoint {
            ts,
            label: bucket_label(ts, period),
            requests: requests.round() as i64,
            errors: errors.round() as i64,
            error_rate: if requests > 0.0 { errors / requests } else { 0.0 },
            p50: p50.round() as i64,
            p95: (p50 * 2.3).round() as i64,
            tokens_in: tokens_in.round() as i64,
            tokens_out: tokens_out.round() as i64,
            tokens_per_sec: (tokens_out / (cfg.bucket_min * 60) as f64).round() as i64,
            cpu_pct: if total_cpu != 0.0 { (cpu_used / total_cpu) * 100.0 } else { 0.0 },
            mem_pct: if total_mem != 0.0 { (mem_used / total_mem) * 100.0 } else { 0.0 },
            gpu_pct: if total_gpu != 0.0 { (gpu_busy / total_gpu) * 100.0 } else { 0.0 },
            gpu_mem_pct: if total_gpu_mem != 0.0 { (gpu_mem_used / total_gpu_mem) * 100.0 } else { 0.0 },
            cpu_used,
            mem_used_gi_b: mem_used,
            gpu_mem_used_gi_b: gpu_mem_used,
            queue,
            concurrency: concurrency.round() as i64,
        });
    }
    points
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SeriesSummary {
    pub requests: i64,
    pub errors: i64,
    pub error_rate: f64,
    pub p50: i64,
    pub p95: i64,
    pub tokens_in: i64,
    pub tokens_out: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last: Option<SeriesPoint>,
}

pub fn summarize(points: &[SeriesPoint]) -> SeriesSummary {
    let requests: i64 = points.iter().map(|p| p.requests).sum();
    let errors: i64 = points.iter().map(|p| p.errors).sum();
    let weighted_p50 = if requests > 0 {
        points.iter().map(|p| p.p50 * p.requests).sum::<i64>() as f64 / requests as f64
    } else {
        0.0
    };
    let p95 = points.iter().map(|p| p.p95).max().unwrap_or(0);
    SeriesSummary {
        requests,
        errors,
        error_rate: if requests > 0 { errors as f64 / requests as f64 } else { 0.0 },
        p50: weighted_p50.round() as i64,
        p95,
        tokens_in: points.iter().map(|p| p.tokens_in).sum(),
        tokens_out: points.iter().map(|p| p.tokens_out).sum(),
        last: points.last().cloned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_uses_utf16_imul() {
        // FNV-1a 32-bit sobre code units UTF-16 com wrapping_mul.
        assert_eq!(hash_string(""), 2166136261);
        // Verificação manual para "a": (2166136261 ^ 97) * 16777619 mod 2^32
        let h = (2166136261u32 ^ 97).wrapping_mul(16777619);
        assert_eq!(hash_string("a"), h);
        // Determinístico
        assert_eq!(hash_string("ag-atendimento"), hash_string("ag-atendimento"));
    }

    #[test]
    fn diurnal_weekend_factor() {
        // Segunda (1) ao meio-dia vs domingo (0)
        let mon = diurnal(12.0, 1);
        let sun = diurnal(12.0, 0);
        assert!((sun / mon - 0.6).abs() < 1e-9);
        // Madrugada: curva no mínimo
        assert!((diurnal(2.0, 1) - 0.35).abs() < 1e-9);
    }

    #[test]
    fn avg_diurnal_in_range() {
        let a = avg_diurnal();
        assert!(a > 0.4 && a < 0.8);
    }
}
