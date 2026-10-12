// Nós de um cluster e as cargas posicionadas em cada um. Em cluster virtual, os nós
// são as frações atribuídas à organização; cargas de outras organizações nunca aparecem.
import type { AppData, Cluster, Reservation } from '../domain/types'
import { EMPTY_RESERVATION, addRes, scaleRes } from './capacity'
import { slugify } from './format'
import { hashString } from './metrics'

export interface NodeWorkload {
  id: string
  kind: 'Modelo' | 'Serviço' | 'Réplica de agente'
  name: string
  related: string
  state: string
  reservation: Reservation
  link: string
}

export interface ClusterNode {
  index: number
  name: string
  state: 'pronto' | 'atenção'
  workloads: NodeWorkload[]
  reserved: Reservation
}

export function clusterNodes(data: AppData, cluster: Cluster): ClusterNode[] {
  const n = cluster.capacity.nodes
  const prefix = `${cluster.modality === 'virtual' ? 'vn' : 'n'}-${slugify(cluster.name).slice(0, 18)}`
  const nodes: ClusterNode[] = Array.from({ length: n }, (_, i) => ({ index: i, name: `${prefix}-${i + 1}`, state: 'pronto', workloads: [], reserved: EMPTY_RESERVATION }))
  const place = (i: number, w: NodeWorkload) => {
    const node = nodes[((i % n) + n) % n]
    node.workloads.push(w)
    if (!/pausad|falha|pendente/i.test(w.state)) node.reserved = addRes(node.reserved, w.reservation)
  }
  for (const d of data.deployments.filter((x) => x.clusterId === cluster.id)) {
    const model = data.models.find((m) => m.id === d.modelId)
    place(hashString(d.id), { id: d.id, kind: 'Modelo', name: d.name, related: model?.name ?? '', state: d.status, reservation: d.reservation, link: '/modelos/implantacoes' })
  }
  for (const s of data.services.filter((x) => x.clusterId === cluster.id)) {
    for (let r = 0; r < s.replicas; r++)
      place(hashString(s.id) + r, {
        id: `${s.id}-${r}`,
        kind: 'Serviço',
        name: s.replicas > 1 ? `${s.name} #${r + 1}` : s.name,
        related: data.applications.find((a) => a.id === s.applicationId)?.version ?? '',
        state: s.status,
        reservation: s.reservation,
        link: `/servicos/${s.id}`,
      })
  }
  for (const d of data.agentDeployments.filter((x) => x.clusterId === cluster.id)) {
    const agent = data.agents.find((a) => a.id === d.agentId)
    for (const r of d.replicas) {
      if (r.nodeIndex === null) continue
      place(r.nodeIndex, {
        id: r.id,
        kind: 'Réplica de agente',
        name: r.pod,
        related: `${agent?.name ?? ''} · v${d.appliedVersion}`,
        state: d.status === 'pausado' ? 'pausado' : r.state,
        reservation: scaleRes({ vcpu: d.runtime.vcpu, memoryGiB: d.runtime.memoryGiB, gpus: 0, gpuMemoryGiB: 0 }, 1),
        link: `/agentes/${d.agentId}`,
      })
    }
  }
  return nodes
}

/** Réplicas sem nó (pendentes de agendamento). */
export function unscheduledReplicas(data: AppData, cluster: Cluster) {
  return data.agentDeployments
    .filter((d) => d.clusterId === cluster.id)
    .flatMap((d) => d.replicas.filter((r) => r.nodeIndex === null).map((r) => ({ r, d })))
}
