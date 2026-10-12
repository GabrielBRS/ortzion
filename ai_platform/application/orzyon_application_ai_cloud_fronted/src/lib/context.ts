// Escopo de dashboards de contexto: um setor (soma dos seus subsetores) ou uma aplicação.
// O escopo tem a mesma forma do escopo da organização, para que o dashboard o use sem mudanças.
import type { AppData, Application, Cluster } from '../domain/types'
import { clusterCost } from './costs'
import { orgScope, type Alert } from './selectors'

/** Recursos de um conjunto de aplicações: as instâncias delas, os clusters onde rodam e os agentes desses clusters. */
export function applicationsScope(data: AppData, orgId: string, apps: Application[]): ReturnType<typeof orgScope> {
  const appIds = new Set(apps.map((a) => a.id))
  const services = data.services.filter((s) => appIds.has(s.applicationId))
  const clusterIds = [...new Set(services.map((s) => s.clusterId))]
  const ids = new Set(clusterIds)
  const agentDeployments = data.agentDeployments.filter((d) => d.orgId === orgId && ids.has(d.clusterId))
  const agentIds = new Set(agentDeployments.map((d) => d.agentId))
  const clusters = data.clusters.filter((c) => ids.has(c.id))
  return {
    clusters,
    scopedClusters: clusters,
    clusterIds,
    agentDeployments,
    agents: data.agents.filter((a) => agentIds.has(a.id)),
    applications: apps,
    services,
    deployments: data.deployments.filter((d) => ids.has(d.clusterId)),
    events: data.events.filter((e) => e.orgId === orgId && !!e.clusterId && ids.has(e.clusterId)),
  }
}

/** Custo estimado (reservado + variável) dos clusters do contexto, no mês. */
export function scopeCosts(data: AppData, clusters: Cluster[]) {
  return clusters.reduce(
    (acc, c) => {
      const cc = clusterCost(data, c)
      return { toDate: acc.toDate + cc.toDate, projected: acc.projected + cc.projected }
    },
    { toDate: 0, projected: 0 },
  )
}

/** Mantém só os alertas dos clusters e implantações do contexto (sem o alerta de orçamento da organização). */
export function contextAlerts(alerts: Alert[], scope: ReturnType<typeof orgScope>): Alert[] {
  return alerts.filter((a) => {
    if (a.id === 'org-budget') return false
    if (a.id.startsWith('df-')) return scope.deployments.some((d) => a.id === `df-${d.id}`)
    return scope.clusterIds.some((cid) => a.id.endsWith(cid))
  })
}
