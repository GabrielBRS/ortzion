import type { AppData, Cluster, Organization } from '../domain/types'
import { clusterReserved, clusterTotals } from './capacity'
import { clusterCost, orgCosts } from './costs'
import { fmtBRL0, fmtPct } from './format'

export function orgScope(data: AppData, orgId: string, clusterId?: string | null) {
  const clusters = data.clusters.filter((c) => c.orgId === orgId)
  const scopedClusters = clusterId ? clusters.filter((c) => c.id === clusterId) : clusters
  const ids = new Set(scopedClusters.map((c) => c.id))
  return {
    clusters,
    scopedClusters,
    clusterIds: [...ids],
    /** Implantações de agentes nos clusters do escopo. */
    agentDeployments: data.agentDeployments.filter((d) => d.orgId === orgId && ids.has(d.clusterId)),
    /** Agentes da organização; com cluster selecionado, só os que têm implantação nele. */
    agents: data.agents.filter(
      (a) => a.orgId === orgId && (!clusterId || data.agentDeployments.some((d) => d.agentId === a.id && d.clusterId === clusterId)),
    ),
    /** Aplicações da organização (código ou imagem), independentes do cluster onde rodam. */
    applications: data.applications.filter((a) => a.orgId === orgId),
    services: data.services.filter((s) => ids.has(s.clusterId)),
    deployments: data.deployments.filter((d) => ids.has(d.clusterId)),
    events: data.events.filter((e) => e.orgId === orgId && (!clusterId || e.clusterId === clusterId)),
  }
}

export interface Alert {
  id: string
  level: 'aviso' | 'erro'
  title: string
  description: string
  to?: string
}

export function clusterFreeRatios(data: AppData, c: Cluster) {
  const t = clusterTotals(c.profile, c.capacity)
  const r = clusterReserved(data, c.id)
  const ratio = (total: number, used: number) => (total > 0 ? (total - used) / total : 1)
  return { cpuMem: ratio(t.cpuMemoryGiB, r.memoryGiB), gpuMem: ratio(t.gpuMemoryGiB, r.gpuMemoryGiB), vcpu: ratio(t.vcpu, r.vcpu) }
}

export function orgAlerts(data: AppData, org: Organization): Alert[] {
  const alerts: Alert[] = []
  const costs = orgCosts(data, org.id)
  const ratio = costs.projected / org.monthlyBudget
  if (ratio >= 1)
    alerts.push({
      id: 'org-budget',
      level: 'erro',
      title: 'Orçamento mensal será excedido',
      description: `Projeção de ${fmtBRL0(costs.projected)} para orçamento de ${fmtBRL0(org.monthlyBudget)} (${fmtPct(ratio)}).`,
      to: '/custos',
    })
  else if (ratio >= org.alertThreshold)
    alerts.push({
      id: 'org-budget',
      level: 'aviso',
      title: 'Limite de orçamento próximo',
      description: `Projeção em ${fmtPct(ratio)} do orçamento mensal (${fmtBRL0(org.monthlyBudget)}).`,
      to: '/custos',
    })
  for (const c of data.clusters.filter((x) => x.orgId === org.id)) {
    const cc = clusterCost(data, c)
    if (cc.projected > c.monthlyBudget)
      alerts.push({
        id: `cb-${c.id}`,
        level: 'aviso',
        title: `Orçamento do cluster ${c.name}`,
        description: `Projeção de ${fmtBRL0(cc.projected)} acima do orçamento de ${fmtBRL0(c.monthlyBudget)}.`,
        to: `/clusters/${c.id}/custos`,
      })
    const free = clusterFreeRatios(data, c)
    const label = c.profile === 'unified' ? 'memória destinada à GPU' : 'VRAM'
    if (free.gpuMem < 0.15 && c.capacity.gpusPerNode > 0)
      alerts.push({
        id: `gm-${c.id}`,
        level: 'aviso',
        title: 'Memória disponível baixa',
        description: `${c.name}: apenas ${fmtPct(free.gpuMem)} de ${label} livre para novas implantações.`,
        to: `/clusters/${c.id}/recursos`,
      })
    if (free.cpuMem < 0.15)
      alerts.push({
        id: `cm-${c.id}`,
        level: 'aviso',
        title: 'Memória disponível baixa',
        description: `${c.name}: apenas ${fmtPct(free.cpuMem)} de memória para CPU livre.`,
        to: `/clusters/${c.id}/recursos`,
      })
  }
  for (const d of data.deployments) {
    const c = data.clusters.find((x) => x.id === d.clusterId)
    if (c?.orgId === org.id && d.status === 'falha')
      alerts.push({ id: `df-${d.id}`, level: 'erro', title: 'Implantação com falha', description: `${d.name} em ${c.name}.`, to: '/modelos/implantacoes' })
  }
  return alerts
}
