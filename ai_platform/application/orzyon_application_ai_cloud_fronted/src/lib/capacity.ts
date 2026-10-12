import type {
  AppData,
  Cluster,
  ClusterCapacity,
  ComputePool,
  ComputeProfile,
  Device,
  ModelProfile,
  Quantization,
  Reservation,
} from '../domain/types'
import { fmtGiB, fmtNum } from './format'

export const EMPTY_RESERVATION: Reservation = { vcpu: 0, memoryGiB: 0, gpus: 0, gpuMemoryGiB: 0 }

export interface ClusterTotals {
  vcpu: number
  /** RAM do host (GPU dedicada) ou parcela de CPU da memória unificada. */
  cpuMemoryGiB: number
  gpus: number
  /** VRAM total (GPU dedicada) ou parcela destinada à GPU (memória unificada). */
  gpuMemoryGiB: number
  /** Somente memória unificada: total físico. Em GPU dedicada, igual a cpuMemoryGiB (RAM). */
  physicalMemoryGiB: number
  storageGiB: number
}

export function clusterTotals(profile: ComputeProfile, c: ClusterCapacity): ClusterTotals {
  const vcpu = c.nodes * c.vcpuPerNode
  const gpus = c.nodes * c.gpusPerNode
  if (profile === 'unified') {
    const physical = c.nodes * c.memoryPerNodeGiB
    const gpuShare = c.nodes * c.gpuSharePerNodeGiB
    return { vcpu, gpus, physicalMemoryGiB: physical, gpuMemoryGiB: gpuShare, cpuMemoryGiB: physical - gpuShare, storageGiB: c.storageGiB }
  }
  const ram = c.nodes * c.memoryPerNodeGiB
  return { vcpu, gpus, cpuMemoryGiB: ram, physicalMemoryGiB: ram, gpuMemoryGiB: gpus * c.vramPerGpuGiB, storageGiB: c.storageGiB }
}

export const addRes = (a: Reservation, b: Reservation): Reservation => ({
  vcpu: a.vcpu + b.vcpu,
  memoryGiB: a.memoryGiB + b.memoryGiB,
  gpus: a.gpus + b.gpus,
  gpuMemoryGiB: a.gpuMemoryGiB + b.gpuMemoryGiB,
})

export const scaleRes = (r: Reservation, n: number): Reservation => ({ vcpu: r.vcpu * n, memoryGiB: r.memoryGiB * n, gpus: r.gpus * n, gpuMemoryGiB: r.gpuMemoryGiB * n })

export interface ReservationItem {
  id: string
  kind: 'implantação' | 'serviço' | 'agente'
  name: string
  reservation: Reservation
}

/** Itens que mantêm reserva ativa no cluster. Pausados e com falha liberam a reserva. */
export function reservationItems(data: AppData, clusterId: string): ReservationItem[] {
  const items: ReservationItem[] = []
  for (const d of data.deployments) {
    if (d.clusterId !== clusterId || d.status === 'pausado' || d.status === 'falha') continue
    items.push({ id: d.id, kind: 'implantação', name: d.name, reservation: d.reservation })
  }
  for (const s of data.services) {
    if (s.clusterId !== clusterId || s.status === 'pausado' || s.status === 'falha') continue
    const n = s.replicas
    items.push({ id: s.id, kind: 'serviço', name: n > 1 ? `${s.name} (${n} réplicas)` : s.name, reservation: scaleRes(s.reservation, n) })
  }
  // Runtime do agente: reservado por réplica em execução (pronta ou iniciando). Pendentes
  // não têm capacidade alocada; a GPU do modelo pertence à implantação de modelo.
  for (const d of data.agentDeployments) {
    if (d.clusterId !== clusterId || d.status !== 'ativo') continue
    const n = d.replicas.filter((r) => r.state === 'pronta' || r.state === 'iniciando').length
    if (!n) continue
    const name = data.agents.find((a) => a.id === d.agentId)?.name ?? d.id
    items.push({
      id: d.id,
      kind: 'agente',
      name: `${name} (${n} ${n > 1 ? 'réplicas' : 'réplica'})`,
      reservation: { vcpu: d.runtime.vcpu * n, memoryGiB: d.runtime.memoryGiB * n, gpus: 0, gpuMemoryGiB: 0 },
    })
  }
  return items
}

export function clusterReserved(data: AppData, clusterId: string, excludeId?: string): Reservation {
  return reservationItems(data, clusterId)
    .filter((i) => i.id !== excludeId)
    .reduce((acc, i) => addRes(acc, i.reservation), EMPTY_RESERVATION)
}

/**
 * Verifica se uma reserva cabe no cluster. Retorna mensagens claras em português
 * para cada recurso insuficiente. Lista vazia significa que cabe.
 */
export function checkFit(data: AppData, cluster: Cluster, req: Reservation, excludeId?: string): string[] {
  const issues: string[] = []
  if (cluster.status === 'pausado') issues.push('O cluster está pausado. Retome o cluster antes de alocar novos recursos.')
  const t = clusterTotals(cluster.profile, cluster.capacity)
  const r = clusterReserved(data, cluster.id, excludeId)
  const cap = cluster.capacity
  const unified = cluster.profile === 'unified'
  const memLabel = unified ? 'Memória unificada (parcela de CPU)' : 'Memória RAM'
  const gpuMemLabel = unified ? 'Memória destinada à GPU' : 'VRAM'

  const free = (total: number, used: number) => Math.max(0, total - used)
  if (req.vcpu > free(t.vcpu, r.vcpu))
    issues.push(`vCPU insuficiente: solicitado ${fmtNum(req.vcpu, 1)} vCPU, disponível ${fmtNum(free(t.vcpu, r.vcpu), 1)} de ${t.vcpu} vCPU contratados.`)
  if (req.memoryGiB > free(t.cpuMemoryGiB, r.memoryGiB))
    issues.push(`${memLabel} insuficiente: solicitado ${fmtGiB(req.memoryGiB)}, disponível ${fmtGiB(free(t.cpuMemoryGiB, r.memoryGiB))} de ${fmtGiB(t.cpuMemoryGiB)}.`)
  if (req.gpus > free(t.gpus, r.gpus))
    issues.push(`GPU insuficiente: solicitado ${req.gpus} GPU, disponível ${free(t.gpus, r.gpus)} de ${t.gpus}.`)
  if (req.gpuMemoryGiB > free(t.gpuMemoryGiB, r.gpuMemoryGiB))
    issues.push(`${gpuMemLabel} insuficiente: solicitado ${fmtGiB(req.gpuMemoryGiB)}, disponível ${fmtGiB(free(t.gpuMemoryGiB, r.gpuMemoryGiB))} de ${fmtGiB(t.gpuMemoryGiB)}.`)

  // Restrições por nó: uma carga não se espalha automaticamente entre máquinas.
  if (req.vcpu > cap.vcpuPerNode) issues.push(`Uma única carga não pode usar mais que ${cap.vcpuPerNode} vCPU (capacidade de um nó).`)
  if (req.gpus > cap.gpusPerNode) issues.push(`Uma única implantação não pode usar mais que ${cap.gpusPerNode} GPU, pois todas precisam estar no mesmo nó.`)
  const gpuMemPerNode = unified ? cap.gpuSharePerNodeGiB : cap.gpusPerNode * cap.vramPerGpuGiB
  if (req.gpuMemoryGiB > gpuMemPerNode)
    issues.push(
      `${gpuMemLabel} exigida (${fmtGiB(req.gpuMemoryGiB)}) excede o que um único nó oferece (${fmtGiB(gpuMemPerNode)}). A memória de nós diferentes não forma uma GPU única.`,
    )
  return issues
}

// ---------------------------------------------------------------------------
// Estimativa ilustrativa de memória de implantações de modelo

export const BYTES_PER_PARAM: Record<Quantization, number> = { FP16: 2, FP8: 1, INT8: 1, INT4: 0.5 }

export interface MemoryEstimate {
  weightsGiB: number
  kvCacheGiB: number
  overheadGiB: number
  totalGiB: number
}

export function estimateModelMemory(model: ModelProfile, quant: Quantization, contextLength: number): MemoryEstimate {
  const total = model.paramsB ?? 0
  // Pesos dependem dos parâmetros totais; em MoE o cache de contexto acompanha a
  // largura do modelo, aproximada aqui pelos parâmetros ativos (estimativa ilustrativa).
  const kvBase = model.architecture === 'MoE' && model.activeParamsB ? Math.min(total, model.activeParamsB * 4) : total
  const weightsGiB = (total * 1e9 * BYTES_PER_PARAM[quant]) / 2 ** 30
  const kvCacheGiB = kvBase * (contextLength / 1000) * 0.0045
  const overheadGiB = 1.5 + weightsGiB * 0.05
  const totalGiB = weightsGiB + kvCacheGiB + overheadGiB
  return { weightsGiB, kvCacheGiB, overheadGiB, totalGiB }
}

/** Reserva sugerida para uma implantação, conforme perfil do cluster e dispositivo de execução. */
export function deploymentReservation(cluster: Cluster, device: Device, est: MemoryEstimate): Reservation {
  if (device === 'cpu') {
    return { vcpu: 8, memoryGiB: Math.ceil(est.totalGiB + 4), gpus: 0, gpuMemoryGiB: 0 }
  }
  if (cluster.profile === 'unified') {
    return {
      vcpu: 4,
      memoryGiB: Math.ceil(4 + est.weightsGiB * 0.05),
      gpus: 1,
      gpuMemoryGiB: Math.ceil(est.totalGiB / 8) * 8,
    }
  }
  const vram = cluster.capacity.vramPerGpuGiB || 80
  const gpus = Math.max(1, Math.ceil(est.totalGiB / vram))
  return { vcpu: 4 + gpus * 2, memoryGiB: Math.ceil(8 + est.weightsGiB * 0.25), gpus, gpuMemoryGiB: gpus * vram }
}

// ---------------------------------------------------------------------------
// Pools

export interface PoolUsage {
  totalNodes: number
  vcpu: { total: number; allocated: number }
  memory: { total: number; allocated: number }
  gpus: { total: number; allocated: number }
  clusters: Cluster[]
}

export function poolUsage(data: AppData, pool: ComputePool): PoolUsage {
  const clusters = data.clusters.filter((c) => c.poolId === pool.id)
  const alloc = clusters.reduce(
    (acc, c) => {
      const cap = c.capacity
      acc.vcpu += cap.nodes * cap.vcpuPerNode
      acc.memory += cap.nodes * cap.memoryPerNodeGiB
      acc.gpus += cap.nodes * cap.gpusPerNode
      return acc
    },
    { vcpu: 0, memory: 0, gpus: 0 },
  )
  return {
    totalNodes: pool.nodes,
    vcpu: { total: pool.nodes * pool.perNode.vcpu, allocated: alloc.vcpu },
    memory: { total: pool.nodes * pool.perNode.memoryGiB, allocated: alloc.memory },
    gpus: { total: pool.nodes * pool.perNode.gpus, allocated: alloc.gpus },
    clusters,
  }
}

/** Verifica se a capacidade contratada cabe no pool, descontando o próprio cluster quando editado. */
export function checkPoolFit(data: AppData, pool: ComputePool, cap: ClusterCapacity, excludeClusterId?: string): string[] {
  const issues: string[] = []
  const others = data.clusters.filter((c) => c.poolId === pool.id && c.id !== excludeClusterId)
  const used = others.reduce(
    (acc, c) => ({
      vcpu: acc.vcpu + c.capacity.nodes * c.capacity.vcpuPerNode,
      mem: acc.mem + c.capacity.nodes * c.capacity.memoryPerNodeGiB,
      gpus: acc.gpus + c.capacity.nodes * c.capacity.gpusPerNode,
    }),
    { vcpu: 0, mem: 0, gpus: 0 },
  )
  const n = pool.nodes
  const p = pool.perNode
  if (cap.vcpuPerNode > p.vcpu || cap.memoryPerNodeGiB > p.memoryGiB || cap.gpusPerNode > p.gpus)
    issues.push('A capacidade por nó excede o hardware de um nó deste pool.')
  if (used.vcpu + cap.nodes * cap.vcpuPerNode > n * p.vcpu) issues.push('O pool não possui vCPU disponível suficiente para esta capacidade.')
  if (used.mem + cap.nodes * cap.memoryPerNodeGiB > n * p.memoryGiB) issues.push('O pool não possui memória disponível suficiente para esta capacidade.')
  if (used.gpus + cap.nodes * cap.gpusPerNode > n * p.gpus) issues.push('O pool não possui GPUs disponíveis suficientes para esta capacidade.')
  return issues
}

/** A nova capacidade não pode ficar abaixo do que já está reservado no cluster. */
export function checkCapacityAgainstReservations(data: AppData, cluster: Cluster, cap: ClusterCapacity): string[] {
  const t = clusterTotals(cluster.profile, cap)
  const r = clusterReserved(data, cluster.id)
  const issues: string[] = []
  const unified = cluster.profile === 'unified'
  if (t.vcpu < r.vcpu) issues.push(`Há ${fmtNum(r.vcpu, 1)} vCPU reservados; a capacidade não pode ser menor que isso.`)
  if (t.cpuMemoryGiB < r.memoryGiB)
    issues.push(`Há ${fmtGiB(r.memoryGiB)} de ${unified ? 'memória da parcela de CPU' : 'RAM'} reservados; reduza as cargas antes de diminuir.`)
  if (t.gpus < r.gpus) issues.push(`Há ${r.gpus} GPU reservadas por implantações.`)
  if (t.gpuMemoryGiB < r.gpuMemoryGiB)
    issues.push(`Há ${fmtGiB(r.gpuMemoryGiB)} de ${unified ? 'memória destinada à GPU' : 'VRAM'} reservados por implantações.`)
  if (unified && cap.gpuSharePerNodeGiB > cap.memoryPerNodeGiB - 16)
    issues.push('Na memória unificada, mantenha ao menos 16 GiB por nó para o sistema e a CPU.')
  return issues
}
