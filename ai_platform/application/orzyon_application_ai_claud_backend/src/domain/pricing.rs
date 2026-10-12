//! Tabela de tarifas fictícias, portada de `src/mock/pricing.ts`.
//! Valores ilustrativos para demonstração; não representam oferta comercial.

use serde::Serialize;
use utoipa::ToSchema;

pub const HOURS_PER_MONTH: f64 = 730.0;

pub struct CapacityPricing {
    pub vcpu_hour: f64,
    pub ram_gi_b_hour: f64,
    pub dedicated_gpu_hour: f64,
    pub unified_memory_gi_b_hour: f64,
    pub unified_gpu_hour: f64,
    pub storage_gi_b_month: f64,
    /// Multiplicador sobre a computação quando os nós são exclusivos.
    pub dedicated_modality_multiplier: f64,
}

pub struct VariablePricing {
    pub gateway_per_million_requests: f64,
    pub egress_per_gi_b: f64,
    pub observability_per_gi_b: f64,
}

pub struct UsageFactors {
    pub egress_ki_b_per_request: f64,
    pub log_ki_b_per_request: f64,
}

pub struct Pricing {
    pub capacity: CapacityPricing,
    pub variable: VariablePricing,
    pub usage_factors: UsageFactors,
}

pub const PRICING: Pricing = Pricing {
    capacity: CapacityPricing {
        vcpu_hour: 0.18,
        ram_gi_b_hour: 0.025,
        dedicated_gpu_hour: 9.8,
        unified_memory_gi_b_hour: 0.045,
        unified_gpu_hour: 6.8,
        storage_gi_b_month: 0.55,
        dedicated_modality_multiplier: 1.25,
    },
    variable: VariablePricing {
        gateway_per_million_requests: 2.5,
        egress_per_gi_b: 0.4,
        observability_per_gi_b: 0.9,
    },
    usage_factors: UsageFactors {
        egress_ki_b_per_request: 24.0,
        log_ki_b_per_request: 2.0,
    },
};

pub const PRICING_VERSION: &str = "2024-01-demo";

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct PricingRow {
    pub category: String,
    pub item: String,
    pub unit: String,
    pub price: f64,
}

pub fn pricing_rows() -> Vec<PricingRow> {
    let c = &PRICING.capacity;
    let v = &PRICING.variable;
    vec![
        PricingRow { category: "Capacidade reservada".into(), item: "vCPU".into(), unit: "vCPU · hora".into(), price: c.vcpu_hour },
        PricingRow { category: "Capacidade reservada".into(), item: "Memória RAM (GPU dedicada)".into(), unit: "GiB · hora".into(), price: c.ram_gi_b_hour },
        PricingRow { category: "Capacidade reservada".into(), item: "GPU com memória dedicada".into(), unit: "GPU · hora".into(), price: c.dedicated_gpu_hour },
        PricingRow { category: "Capacidade reservada".into(), item: "Memória unificada AMD".into(), unit: "GiB · hora".into(), price: c.unified_memory_gi_b_hour },
        PricingRow { category: "Capacidade reservada".into(), item: "Unidade de GPU (memória unificada)".into(), unit: "GPU · hora".into(), price: c.unified_gpu_hour },
        PricingRow { category: "Capacidade reservada".into(), item: "Armazenamento".into(), unit: "GiB · mês".into(), price: c.storage_gi_b_month },
        PricingRow { category: "Consumo variável".into(), item: "Gateway de requisições".into(), unit: "milhão de requisições".into(), price: v.gateway_per_million_requests },
        PricingRow { category: "Consumo variável".into(), item: "Transferência de saída".into(), unit: "GiB".into(), price: v.egress_per_gi_b },
        PricingRow { category: "Consumo variável".into(), item: "Ingestão de logs e métricas".into(), unit: "GiB".into(), price: v.observability_per_gi_b },
    ]
}
