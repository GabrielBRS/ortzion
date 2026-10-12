import type { AppData, Period } from '../domain/types'
import { HOURS_PER_MONTH, PRICING } from '../mock/pricing'
import { capacityMonthlyCost } from './costs'
import type { SeriesPoint } from './metrics'

export const BUCKET_HOURS: Record<Period, number> = { '1h': 1 / 60, '24h': 1, '7d': 4, '30d': 24 }

/** Custo variável por requisição, derivado da tabela de tarifas. */
export function variableCostPerRequest() {
  const v = PRICING.variable
  const f = PRICING.usageFactors
  return v.gatewayPerMillionRequests / 1e6 + (f.egressKiBPerRequest / 2 ** 20) * v.egressPerGiB + (f.logKiBPerRequest / 2 ** 20) * v.observabilityPerGiB
}

/** Custo por intervalo do gráfico: capacidade reservada (fixa por hora) + consumo variável. */
export function periodCostSeries(data: AppData, clusterIds: string[], series: SeriesPoint[], period: Period) {
  const hourly = data.clusters
    .filter((c) => clusterIds.includes(c.id))
    .reduce((s, c) => {
      const cap = capacityMonthlyCost(c.profile, c.modality, c.capacity)
      return s + (c.status === 'pausado' ? 0 : cap.computeTotal / HOURS_PER_MONTH) + cap.storage / HOURS_PER_MONTH
    }, 0)
  const h = BUCKET_HOURS[period]
  const perReq = variableCostPerRequest()
  return series.map((p) => ({ label: p.label, reserved: +(hourly * h).toFixed(2), variable: +(p.requests * perReq).toFixed(2) }))
}
