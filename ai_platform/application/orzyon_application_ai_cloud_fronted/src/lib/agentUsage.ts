// Agregações de agentes, implantações e réplicas, e consumo de tokens atribuído.
// Os tokens vêm da mesma fonte determinística das métricas (lib/metrics), por
// implantação de agente; somar por agente ou cluster nunca duplica eventos.
import type { Agent, AgentDeployment, AppData, Period } from '../domain/types'
import { buildSeriesWindow, periodWindow, rangeWindow, readyReplicas, recentTokenRate, resolveInference, summarize, type SeriesWindow } from './metrics'
import { clientRates } from './modelPricing'

export type ConsolidatedStatus = 'ativo' | 'parcial' | 'pausado' | 'sem_execucao'

export const CONSOLIDATED_LABEL: Record<ConsolidatedStatus, string> = {
  ativo: 'Ativo',
  parcial: 'Parcialmente ativo',
  pausado: 'Pausado',
  sem_execucao: 'Sem execução ativa',
}

export function deploymentState(data: AppData, d: AgentDeployment) {
  const ready = readyReplicas(d)
  const cluster = data.clusters.find((c) => c.id === d.clusterId)
  const inf = resolveInference(data, d)
  const executing = d.status === 'ativo' && ready > 0 && cluster?.status === 'ativo' && !!inf?.available
  return { ready, desired: d.desiredReplicas, existing: d.replicas.length, executing, cluster, inference: inf }
}

export function consolidatedStatus(data: AppData, deps: AgentDeployment[]): ConsolidatedStatus {
  if (!deps.length) return 'sem_execucao'
  const states = deps.map((d) => deploymentState(data, d))
  const executing = states.filter((s) => s.executing).length
  const fullyReady = states.every((s, i) => deps[i].status === 'ativo' && s.executing && s.ready >= s.desired)
  if (fullyReady) return 'ativo'
  if (executing > 0) return 'parcial'
  if (deps.every((d) => d.status === 'pausado')) return 'pausado'
  return 'sem_execucao'
}

/** "Inferência via": onde o modelo roda, separado de onde o agente executa. */
export function inferenceLabel(data: AppData, d: AgentDeployment): { label: string; detail: string; kind: 'local' | 'remoto' | 'compartilhado' | 'externo' | 'indisponivel' } {
  const inf = resolveInference(data, d)
  if (!inf) return { label: 'Destino indisponível', detail: 'A implantação de modelo ou o modelo foi removido.', kind: 'indisponivel' }
  if (inf.kind === 'deployment') {
    const same = inf.inferenceCluster?.id === d.clusterId
    return {
      label: inf.modelDeployment!.name,
      detail: `${inf.model?.name ?? 'modelo'} · ${same ? 'no mesmo cluster' : `em ${inf.inferenceCluster?.name}`}`,
      kind: same ? 'local' : 'remoto',
    }
  }
  if (inf.kind === 'shared') return { label: inf.model!.name, detail: 'Modelo compartilhado Orzyon (por tokens)', kind: 'compartilhado' }
  return { label: inf.model!.name, detail: `API externa · ${inf.model?.provider}`, kind: 'externo' }
}

export type PeriodSel = Period | 'custom'

export function selectionWindow(period: PeriodSel, from?: string, to?: string, now = Date.now()): SeriesWindow {
  if (period === 'custom' && from && to) return rangeWindow(from, to) ?? periodWindow('24h', now)
  return periodWindow(period === 'custom' ? '24h' : period, now)
}

export interface DeploymentUsage {
  dep: AgentDeployment
  tokensIn: number
  tokensOut: number
  requests: number
  /** Custo por tokens atribuído (shared/external). Em implantação de modelo dedicada, coberto pela capacidade. */
  cost: number | null
  tokensPerSec: number
}

const CACHED_SHARE = 0.25

export function deploymentUsage(data: AppData, dep: AgentDeployment, win: SeriesWindow, now = Date.now()): DeploymentUsage {
  const scope = { clusterIds: [dep.clusterId], workloadId: dep.id, agentsOnly: true }
  const s = summarize(buildSeriesWindow(data, scope, win))
  let cost: number | null = null
  if (dep.inference.kind !== 'deployment') {
    const model = data.models.find((m) => m.id === (dep.inference as { modelId: string }).modelId)
    const r = model && clientRates(model, data.commercial)
    if (r) {
      const cached = s.tokensIn * CACHED_SHARE
      cost = ((s.tokensIn - cached) * r.input + cached * (r.cachedInput ?? r.input) + s.tokensOut * r.output) / 1e6
    }
  }
  return { dep, tokensIn: s.tokensIn, tokensOut: s.tokensOut, requests: s.requests, cost, tokensPerSec: recentTokenRate(data, scope, now) }
}

export interface AgentRow {
  agent: Agent
  deps: AgentDeployment[]
  usage: DeploymentUsage[]
  status: ConsolidatedStatus
  runningClusters: { id: string; name: string }[]
  ready: number
  desired: number
  existing: number
  tokensIn: number
  tokensOut: number
  requests: number
  cost: number
  hasTokenCost: boolean
  tokensPerSec: number
}

export function agentRow(data: AppData, agent: Agent, deps: AgentDeployment[], win: SeriesWindow): AgentRow {
  const usage = deps.map((d) => deploymentUsage(data, d, win))
  const states = deps.map((d) => deploymentState(data, d))
  const sum = (f: (u: DeploymentUsage) => number) => usage.reduce((s, u) => s + f(u), 0)
  return {
    agent,
    deps,
    usage,
    status: consolidatedStatus(data, deps),
    runningClusters: deps.flatMap((d, i) => (states[i].executing ? [{ id: d.clusterId, name: states[i].cluster?.name ?? d.clusterId }] : [])),
    ready: states.reduce((s, x) => s + x.ready, 0),
    desired: states.reduce((s, x) => s + x.desired, 0),
    existing: states.reduce((s, x) => s + x.existing, 0),
    tokensIn: sum((u) => u.tokensIn),
    tokensOut: sum((u) => u.tokensOut),
    requests: sum((u) => u.requests),
    cost: sum((u) => u.cost ?? 0),
    hasTokenCost: usage.some((u) => u.cost !== null),
    tokensPerSec: sum((u) => u.tokensPerSec),
  }
}

/** Custo por tokens de agentes (shared/external) no mês corrente, para os totais da organização. */
export function agentTokenCostsMonth(data: AppData, orgId: string, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
  const bucketMs = 86400000
  const points = Math.max(1, Math.ceil((now.getTime() - start) / bucketMs))
  const win: SeriesWindow = { start, points, bucketMs, label: (d) => d.toLocaleDateString('pt-BR') }
  let toDate = 0
  for (const d of data.agentDeployments) {
    if (d.orgId !== orgId || d.inference.kind === 'deployment') continue
    toDate += deploymentUsage(data, d, win, now.getTime()).cost ?? 0
  }
  const elapsed = Math.max(1, now.getTime() - start)
  return { toDate, projected: (toDate / elapsed) * (end - start) }
}
