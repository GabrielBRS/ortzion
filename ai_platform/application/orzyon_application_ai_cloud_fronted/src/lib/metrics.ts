// Séries temporais determinísticas. Os valores dependem apenas do instante do bucket
// e do identificador da carga, então não mudam entre renders e são coerentes entre
// dashboard, cluster, métricas e custos.
import type { AgentDeployment, AppData, Period } from '../domain/types'
import { clusterReserved, clusterTotals } from './capacity'

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function noise(seed: number, i: number): number {
  const x = Math.sin(seed * 0.000127 + i * 12.9898) * 43758.5453
  return x - Math.floor(x) // 0..1
}

/** Curva diária: mais tráfego no horário comercial. */
export function diurnal(date: Date): number {
  const h = date.getHours() + date.getMinutes() / 60
  const day = date.getDay()
  const weekend = day === 0 || day === 6 ? 0.6 : 1
  const curve = 0.35 + 0.65 * Math.max(0, Math.sin((Math.PI * (h - 6)) / 16))
  return curve * weekend
}

export const AVG_DIURNAL = (() => {
  let sum = 0
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) sum += diurnal(new Date(2024, 0, 7 + d, h, 30))
  return sum / (7 * 24)
})()

export const PERIODS: { value: Period; label: string }[] = [
  { value: '1h', label: '1 hora' },
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
]

export interface Workload {
  /** Implantação de agente ou serviço. */
  id: string
  /** Agente de origem (somente implantações de agente). */
  agentId?: string
  clusterId: string
  /** Cluster cuja GPU atende a inferência (implantação de modelo local ou de outro cluster). */
  inferenceClusterId?: string
  inferenceKind?: 'deployment' | 'shared' | 'external'
  kind: 'agente' | 'serviço'
  name: string
  ratePerMin: number
  latencyMs: number
  tokensIn: number
  tokensOut: number
  concurrency: number
  /** Início da carga (ms): não há consumo antes da criação. */
  since: number
}

const LATENCY_BY_PARAMS = (paramsB: number) => 120 + paramsB * 9

export const readyReplicas = (d: { replicas: { state: string }[] }) => d.replicas.filter((r) => r.state === 'pronta').length

/** Resolve o destino de inferência de uma implantação de agente; null se indisponível. */
export function resolveInference(data: AppData, dep: AgentDeployment) {
  const t = dep.inference
  if (t.kind === 'deployment') {
    const md = data.deployments.find((d) => d.id === t.deploymentId)
    const cluster = md && data.clusters.find((c) => c.id === md.clusterId)
    if (!md || !cluster || cluster.orgId !== dep.orgId) return null
    const model = data.models.find((m) => m.id === md.modelId)
    return { kind: t.kind, model, modelDeployment: md, inferenceCluster: cluster, available: md.status === 'disponivel' && cluster.status === 'ativo' }
  }
  const model = data.models.find((m) => m.id === t.modelId)
  if (!model) return null
  const access = data.modelAccess.some((a) => a.orgId === dep.orgId && a.modelId === model.id)
  return { kind: t.kind, model, modelDeployment: undefined, inferenceCluster: undefined, available: access && model.status === 'homologada' }
}

/** Cargas que geram tráfego no momento. Pausadas, sem réplicas prontas ou sem inferência disponível não geram. */
export function activeWorkloads(data: AppData, clusterIds: string[]): Workload[] {
  const set = new Set(clusterIds)
  const out: Workload[] = []
  for (const d of data.agentDeployments) {
    if (!set.has(d.clusterId) || d.status !== 'ativo') continue
    const cluster = data.clusters.find((c) => c.id === d.clusterId)
    if (!cluster || cluster.status !== 'ativo') continue
    const ready = readyReplicas(d)
    if (!ready) continue
    const inf = resolveInference(data, d)
    if (!inf || !inf.available) continue
    const agent = data.agents.find((a) => a.id === d.agentId)
    const model = inf.model
    const profile = d.config.analysisProfile
    out.push({
      id: d.id,
      agentId: d.agentId,
      clusterId: d.clusterId,
      inferenceClusterId: inf.inferenceCluster?.id,
      inferenceKind: inf.kind,
      kind: 'agente',
      name: agent?.name ?? d.id,
      ratePerMin: d.trafficBase * ready,
      latencyMs:
        (inf.kind === 'external' ? 650 : LATENCY_BY_PARAMS(model?.activeParamsB ?? model?.paramsB ?? 8)) *
        (profile === 'Especializado' ? 1.35 : profile === 'Avançado' ? 1.15 : 1),
      tokensIn: 850,
      tokensOut: Math.min(d.config.maxTokens, 420),
      concurrency: d.config.concurrency * ready,
      since: new Date(d.createdAt).getTime(),
    })
  }
  for (const s of data.services) {
    if (!set.has(s.clusterId) || s.status !== 'ativo') continue
    const cluster = data.clusters.find((c) => c.id === s.clusterId)
    if (!cluster || cluster.status !== 'ativo') continue
    out.push({
      id: s.id,
      clusterId: s.clusterId,
      kind: 'serviço',
      name: s.name,
      ratePerMin: s.trafficBase * s.replicas,
      latencyMs: 35 + (hashString(s.id) % 40),
      tokensIn: 0,
      tokensOut: 0,
      concurrency: 16 * s.replicas,
      since: new Date(s.createdAt).getTime(),
    })
  }
  return out
}

export interface SeriesPoint {
  ts: number
  label: string
  requests: number
  requestsPerSec: number
  errors: number
  errorRate: number
  p50: number
  p95: number
  tokensIn: number
  tokensOut: number
  tokensPerSec: number
  cpuPct: number
  memPct: number
  gpuPct: number
  gpuMemPct: number
  cpuUsed: number
  memUsedGiB: number
  gpuMemUsedGiB: number
  queue: number
  concurrency: number
}

export interface SeriesScope {
  clusterIds: string[]
  /** Implantação de agente, agente (todas as implantações) ou serviço. */
  workloadId?: string | null
  /** Restringe a cargas de agentes (tokens atribuídos). */
  agentsOnly?: boolean
}

export interface SeriesWindow {
  /** Início do primeiro bucket (ms). */
  start: number
  points: number
  bucketMs: number
  label: (d: Date) => string
}

const fmtHM = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const fmtDM = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export function periodWindow(period: Period, now = Date.now()): SeriesWindow {
  const cfg = { '1h': [60, 1], '24h': [24, 60], '7d': [42, 240], '30d': [30, 1440] }[period]
  const bucketMs = cfg[1] * 60000
  const end = Math.floor(now / bucketMs) * bucketMs
  const label =
    period === '7d' ? (d: Date) => d.toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit' }).replace(',', '') : period === '30d' ? fmtDM : fmtHM
  return { start: end - (cfg[0] - 1) * bucketMs, points: cfg[0], bucketMs, label }
}

/** Intervalo personalizado (datas inclusivas). Buckets horários até 3 dias, diários acima. */
export function rangeWindow(fromIso: string, toIso: string): SeriesWindow | null {
  const from = new Date(`${fromIso}T00:00:00`).getTime()
  const to = Math.min(Date.now(), new Date(`${toIso}T23:59:59`).getTime())
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null
  const days = (to - from) / 86400000
  const bucketMs = days <= 3 ? 3600000 : 86400000
  const start = Math.floor(from / bucketMs) * bucketMs
  const points = Math.min(400, Math.floor((to - start) / bucketMs) + 1)
  return { start, points, bucketMs, label: bucketMs < 86400000 ? (d) => `${fmtDM(d)} ${fmtHM(d)}` : fmtDM }
}

/** Janela móvel de telemetria: 300 pontos de 1 s (cinco minutos). */
export function liveWindow(now = Date.now()): SeriesWindow {
  const end = Math.floor(now / 1000) * 1000
  return { start: end - 299000, points: 300, bucketMs: 1000, label: (d) => d.toLocaleTimeString('pt-BR') }
}

export function buildSeries(data: AppData, scope: SeriesScope, period: Period, now = Date.now()): SeriesPoint[] {
  return buildSeriesWindow(data, scope, periodWindow(period, now))
}

export function buildSeriesWindow(data: AppData, scope: SeriesScope, win: SeriesWindow): SeriesPoint[] {
  const bucketMs = win.bucketMs
  const bucketMin = bucketMs / 60000
  let workloads = activeWorkloads(data, scope.clusterIds)
  if (scope.workloadId) workloads = workloads.filter((w) => w.id === scope.workloadId || w.agentId === scope.workloadId)
  if (scope.agentsOnly) workloads = workloads.filter((w) => w.kind === 'agente')

  const clusters = data.clusters.filter((c) => scope.clusterIds.includes(c.id))
  const caps = clusters.map((c) => ({
    c,
    totals: clusterTotals(c.profile, c.capacity),
    reserved: clusterReserved(data, c.id),
    peak: Math.max(1, activeWorkloads(data, [c.id]).reduce((s, w) => s + w.ratePerMin, 0)),
  }))
  // Carga de GPU vem das cargas atendidas pelas implantações de modelo do cluster,
  // inclusive de agentes executando em outros clusters da organização.
  const allWorkloads = activeWorkloads(
    data,
    data.clusters.map((c) => c.id),
  )
  const gpuPeak = new Map(caps.map((x) => [x.c.id, Math.max(1, allWorkloads.filter((w) => w.inferenceClusterId === x.c.id).reduce((s, w) => s + w.ratePerMin, 0))]))
  const totalCpu = caps.reduce((s, x) => s + x.totals.vcpu, 0)
  const totalMem = caps.reduce((s, x) => s + x.totals.cpuMemoryGiB, 0)
  const totalGpu = caps.reduce((s, x) => s + x.totals.gpus, 0)
  const totalGpuMem = caps.reduce((s, x) => s + x.totals.gpuMemoryGiB, 0)

  const points: SeriesPoint[] = []
  for (let i = 0; i < win.points; i++) {
    const ts = win.start + i * bucketMs
    const date = new Date(ts)
    const bucketIdx = Math.floor(ts / bucketMs)
    // Buckets diários usam a média diária aproximada.
    const curve = bucketMs >= 86400000 ? AVG_DIURNAL * (date.getDay() === 0 || date.getDay() === 6 ? 0.6 : 1.12) : diurnal(new Date(ts + bucketMs / 2))

    let requests = 0
    let errors = 0
    let latWeighted = 0
    let tokensIn = 0
    let tokensOut = 0
    let concurrency = 0
    const loadByCluster = new Map<string, number>()
    const gpuLoadByCluster = new Map<string, number>()
    for (const w of workloads) {
      if (ts + bucketMs <= w.since) continue
      const n = noise(hashString(w.id), bucketIdx)
      const amp = bucketMs < 60000 ? 0.12 : 0.3
      const r = w.ratePerMin * bucketMin * curve * (1 - amp / 2 + amp * n)
      const errRate = 0.002 + 0.01 * noise(hashString(w.id) + 7, bucketIdx) * curve
      requests += r
      errors += r * errRate
      latWeighted += r * w.latencyMs * (0.9 + 0.35 * curve)
      tokensIn += r * w.tokensIn
      tokensOut += r * w.tokensOut
      concurrency += w.concurrency * curve * 0.55
      loadByCluster.set(w.clusterId, (loadByCluster.get(w.clusterId) ?? 0) + w.ratePerMin * curve)
    }
    for (const w of allWorkloads) {
      if (w.inferenceClusterId) gpuLoadByCluster.set(w.inferenceClusterId, (gpuLoadByCluster.get(w.inferenceClusterId) ?? 0) + w.ratePerMin * curve)
    }

    let cpuUsed = 0
    let memUsed = 0
    let gpuBusy = 0
    let gpuMemUsed = 0
    for (const x of caps) {
      if (x.c.status !== 'ativo') continue
      const load = Math.min(1, (loadByCluster.get(x.c.id) ?? 0) / x.peak)
      const gload = Math.min(1, (gpuLoadByCluster.get(x.c.id) ?? 0) / (gpuPeak.get(x.c.id) ?? 1))
      const n = noise(hashString(x.c.id), bucketIdx)
      cpuUsed += x.reserved.vcpu * (0.22 + 0.5 * load + 0.06 * n)
      memUsed += x.reserved.memoryGiB * (0.62 + 0.22 * load)
      gpuBusy += x.reserved.gpus * (0.18 + 0.62 * gload + 0.05 * n)
      gpuMemUsed += x.reserved.gpuMemoryGiB * (0.7 + 0.22 * gload)
    }

    const p50 = requests > 0 ? latWeighted / requests : 0
    const queue = workloads.length ? Math.round(Math.pow(curve, 3) * 4 * workloads.filter((w) => w.kind === 'agente').length) : 0
    points.push({
      ts,
      label: win.label(date),
      requests: bucketMs >= 60000 ? Math.round(requests) : requests,
      requestsPerSec: requests / (bucketMs / 1000),
      errors: Math.round(errors),
      errorRate: requests > 0 ? errors / requests : 0,
      p50: Math.round(p50),
      p95: Math.round(p50 * 2.3),
      tokensIn: Math.round(tokensIn),
      tokensOut: Math.round(tokensOut),
      tokensPerSec: tokensOut / (bucketMs / 1000),
      cpuPct: totalCpu ? (cpuUsed / totalCpu) * 100 : 0,
      memPct: totalMem ? (memUsed / totalMem) * 100 : 0,
      gpuPct: totalGpu ? (gpuBusy / totalGpu) * 100 : 0,
      gpuMemPct: totalGpuMem ? (gpuMemUsed / totalGpuMem) * 100 : 0,
      cpuUsed,
      memUsedGiB: memUsed,
      gpuMemUsedGiB: gpuMemUsed,
      queue,
      concurrency: Math.round(concurrency),
    })
  }
  return points
}

export function summarize(points: SeriesPoint[]) {
  const requests = points.reduce((s, p) => s + p.requests, 0)
  const errors = points.reduce((s, p) => s + p.errors, 0)
  const weightedP50 = requests ? points.reduce((s, p) => s + p.p50 * p.requests, 0) / requests : 0
  const p95 = points.length ? Math.max(...points.map((p) => p.p95)) : 0
  const last = points[points.length - 1]
  return {
    requests,
    errors,
    errorRate: requests ? errors / requests : 0,
    p50: Math.round(weightedP50),
    p95,
    tokensIn: points.reduce((s, p) => s + p.tokensIn, 0),
    tokensOut: points.reduce((s, p) => s + p.tokensOut, 0),
    last,
  }
}

/** Utilização instantânea (último ponto 24h) de um cluster. */
export function currentUsage(data: AppData, clusterId: string) {
  const pts = buildSeries(data, { clusterIds: [clusterId] }, '24h')
  const last = pts[pts.length - 1]
  return { cpuUsed: last.cpuUsed, memUsedGiB: last.memUsedGiB, gpuMemUsedGiB: last.gpuMemUsedGiB, gpuPct: last.gpuPct }
}

/** Taxa recente de tokens de saída: média dos últimos 5 minutos (buckets de 1 min). */
export function recentTokenRate(data: AppData, scope: SeriesScope, now = Date.now()) {
  const win: SeriesWindow = { start: Math.floor(now / 60000) * 60000 - 4 * 60000, points: 5, bucketMs: 60000, label: fmtHM }
  const pts = buildSeriesWindow(data, scope, win)
  return pts.reduce((s, p) => s + p.tokensOut, 0) / 300
}
