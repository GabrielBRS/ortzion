// Estimativas de custo derivadas da tabela de tarifas fictícias (mock/pricing.ts).
import type { AppData, Cluster, ClusterCapacity, ComputeProfile, Modality } from '../domain/types'
import { HOURS_PER_MONTH, PRICING } from '../mock/pricing'
import { AVG_DIURNAL, activeWorkloads } from './metrics'
import { orgTokenUsage } from './modelPricing'

export interface CapacityCostBreakdown {
  vcpu: number
  memory: number
  gpu: number
  storage: number
  computeTotal: number
  total: number
}

/** Custo mensal da capacidade reservada (independe do uso). */
export function capacityMonthlyCost(profile: ComputeProfile, modality: Modality, cap: ClusterCapacity): CapacityCostBreakdown {
  const p = PRICING.capacity
  const mult = modality === 'dedicado' ? p.dedicatedModalityMultiplier : 1
  const vcpu = cap.nodes * cap.vcpuPerNode * p.vcpuHour * HOURS_PER_MONTH * mult
  const memRate = profile === 'unified' ? p.unifiedMemoryGiBHour : p.ramGiBHour
  const memory = cap.nodes * cap.memoryPerNodeGiB * memRate * HOURS_PER_MONTH * mult
  const gpuRate = profile === 'unified' ? p.unifiedGpuHour : p.dedicatedGpuHour
  const gpu = cap.nodes * cap.gpusPerNode * gpuRate * HOURS_PER_MONTH * mult
  const storage = cap.storageGiB * p.storageGiBMonth
  const computeTotal = vcpu + memory + gpu
  return { vcpu, memory, gpu, storage, computeTotal, total: computeTotal + storage }
}

export function monthWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const totalH = (end.getTime() - start.getTime()) / 3600000
  const elapsedH = (now.getTime() - start.getTime()) / 3600000
  return { start, end, totalH, elapsedH, fraction: elapsedH / totalH }
}

export interface ClusterCost {
  cluster: Cluster
  capacity: CapacityCostBreakdown
  /** Capacidade: custo mensal efetivo considerando status (pausado cobra só armazenamento). */
  reservedMonthly: number
  reservedToDate: number
  /** Capacidade acumulada no mês por recurso (soma = reservedToDate). */
  reservedByResource: { vcpu: number; memory: number; gpu: number; storage: number }
  variableToDate: number
  variableProjected: number
  requestsToDate: number
  toDate: number
  projected: number
  variable: { gateway: number; egress: number; observability: number }
}

export function clusterCost(data: AppData, cluster: Cluster, now = new Date()): ClusterCost {
  const capacity = capacityMonthlyCost(cluster.profile, cluster.modality, cluster.capacity)
  const win = monthWindow(now)
  const created = new Date(cluster.createdAt)
  const activeFrom = created > win.start ? created : win.start
  const activeH = Math.max(0, (now.getTime() - activeFrom.getTime()) / 3600000)
  const remainingH = win.totalH - win.elapsedH
  const running = cluster.status !== 'pausado'
  const hourlyCompute = capacity.computeTotal / HOURS_PER_MONTH
  const hourlyStorage = capacity.storage / win.totalH
  const reservedToDate = (running ? hourlyCompute : 0) * activeH + hourlyStorage * activeH
  const computeH = (running ? 1 : 0) * activeH / HOURS_PER_MONTH
  const reservedByResource = {
    vcpu: capacity.vcpu * computeH,
    memory: capacity.memory * computeH,
    gpu: capacity.gpu * computeH,
    storage: hourlyStorage * activeH,
  }
  const reservedMonthly = reservedToDate + ((running ? hourlyCompute : 0) + hourlyStorage) * remainingH

  const ratePerMin = activeWorkloads(data, [cluster.id]).reduce((s, w) => s + w.ratePerMin, 0)
  const reqPerHour = ratePerMin * 60 * AVG_DIURNAL
  const requestsToDate = reqPerHour * activeH
  const variableFor = (req: number) => {
    const f = PRICING.usageFactors
    const v = PRICING.variable
    const gateway = (req / 1e6) * v.gatewayPerMillionRequests
    const egress = ((req * f.egressKiBPerRequest) / 2 ** 20) * v.egressPerGiB
    const observability = ((req * f.logKiBPerRequest) / 2 ** 20) * v.observabilityPerGiB
    return { gateway, egress, observability, total: gateway + egress + observability }
  }
  const vToDate = variableFor(requestsToDate)
  const vProjected = variableFor(requestsToDate + reqPerHour * remainingH)
  return {
    cluster,
    capacity,
    reservedMonthly,
    reservedToDate,
    reservedByResource,
    variableToDate: vToDate.total,
    variableProjected: vProjected.total,
    requestsToDate,
    toDate: reservedToDate + vToDate.total,
    projected: reservedMonthly + vProjected.total,
    variable: { gateway: vToDate.gateway, egress: vToDate.egress, observability: vToDate.observability },
  }
}

export function orgCosts(data: AppData, orgId: string, now = new Date()) {
  const clusters = data.clusters.filter((c) => c.orgId === orgId)
  const items = clusters.map((c) => clusterCost(data, c, now))
  const sum = (f: (x: ClusterCost) => number) => items.reduce((s, x) => s + f(x), 0)
  const tokens = orgTokenUsage(data, orgId, now)
  return {
    items,
    tokens,
    toDate: sum((x) => x.toDate) + tokens.toDate,
    projected: sum((x) => x.projected) + tokens.projected,
    reservedToDate: sum((x) => x.reservedToDate),
    variableToDate: sum((x) => x.variableToDate),
    reservedProjected: sum((x) => x.reservedMonthly),
    variableProjected: sum((x) => x.variableProjected),
  }
}
