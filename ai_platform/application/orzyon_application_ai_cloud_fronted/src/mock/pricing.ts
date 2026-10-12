// Tabela de tarifas fictícias. Fonte única para todas as estimativas da interface.
// Valores ilustrativos para demonstração; não representam uma oferta comercial.

export const HOURS_PER_MONTH = 730

export const PRICING = {
  capacity: {
    vcpuHour: 0.18,
    ramGiBHour: 0.025,
    dedicatedGpuHour: 9.8,
    unifiedMemoryGiBHour: 0.045,
    unifiedGpuHour: 6.8,
    storageGiBMonth: 0.55,
    /** Multiplicador sobre a computação quando os nós são exclusivos. */
    dedicatedModalityMultiplier: 1.25,
  },
  variable: {
    gatewayPerMillionRequests: 2.5,
    egressPerGiB: 0.4,
    observabilityPerGiB: 0.9,
  },
  /** Fatores ilustrativos usados para estimar o consumo variável a partir das requisições. */
  usageFactors: {
    egressKiBPerRequest: 24,
    logKiBPerRequest: 2,
  },
} as const

export const PRICING_ROWS: { category: string; item: string; unit: string; price: number }[] = [
  { category: 'Capacidade reservada', item: 'vCPU', unit: 'vCPU · hora', price: PRICING.capacity.vcpuHour },
  { category: 'Capacidade reservada', item: 'Memória RAM (GPU dedicada)', unit: 'GiB · hora', price: PRICING.capacity.ramGiBHour },
  { category: 'Capacidade reservada', item: 'GPU com memória dedicada', unit: 'GPU · hora', price: PRICING.capacity.dedicatedGpuHour },
  { category: 'Capacidade reservada', item: 'Memória unificada AMD', unit: 'GiB · hora', price: PRICING.capacity.unifiedMemoryGiBHour },
  { category: 'Capacidade reservada', item: 'Unidade de GPU (memória unificada)', unit: 'GPU · hora', price: PRICING.capacity.unifiedGpuHour },
  { category: 'Capacidade reservada', item: 'Armazenamento', unit: 'GiB · mês', price: PRICING.capacity.storageGiBMonth },
  { category: 'Consumo variável', item: 'Gateway de requisições', unit: 'milhão de requisições', price: PRICING.variable.gatewayPerMillionRequests },
  { category: 'Consumo variável', item: 'Transferência de saída', unit: 'GiB', price: PRICING.variable.egressPerGiB },
  { category: 'Consumo variável', item: 'Ingestão de logs e métricas', unit: 'GiB', price: PRICING.variable.observabilityPerGiB },
]
