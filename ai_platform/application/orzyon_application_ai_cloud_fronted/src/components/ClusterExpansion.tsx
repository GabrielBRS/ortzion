import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react'
import type { Cluster } from '../domain/types'
import { useApp } from '../state/AppContext'
import { clusterNodes, unscheduledReplicas, type ClusterNode } from '../lib/nodes'
import { clusterReserved, clusterTotals } from '../lib/capacity'
import { currentUsage, readyReplicas } from '../lib/metrics'
import { fmtGiB, fmtNum } from '../lib/format'
import { ExpandedCell, MeterLegend, MiniBar, Skeleton, StatusBadge } from './ui'
import { ResourceMeters } from './ClusterResources'
import { LiveTelemetry } from './LiveTelemetry'
import { reservationText } from './workloads'

const PAGE = 8

function NodeWorkloads({ node, cluster, cpuFactor }: { node: ClusterNode; cluster: Cluster; cpuFactor: number }) {
  const [limit, setLimit] = useState(PAGE)
  const unified = cluster.profile === 'unified'
  if (!node.workloads.length) return <p className="px-4 py-3 text-xs text-subtle">Nenhuma carga neste nó.</p>
  const shown = node.workloads.slice(0, limit)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-subtle">
          <tr>
            <th className="px-3 py-1.5 text-left font-normal">Tipo</th>
            <th className="px-3 py-1.5 text-left font-normal">Nome</th>
            <th className="px-3 py-1.5 text-left font-normal">Relacionado</th>
            <th className="px-3 py-1.5 text-left font-normal">Estado</th>
            <th className="px-3 py-1.5 text-left font-normal">Reserva</th>
            <th className="px-3 py-1.5 text-right font-normal">CPU observada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {shown.map((w) => {
            const idle = /pausad|falha|pendente|preparando|carregando|na_fila/.test(w.state)
            return (
              <tr key={w.id}>
                <td className="px-3 py-1.5 whitespace-nowrap text-muted">{w.kind}</td>
                <td className="px-3 py-1.5 font-mono">
                  <Link to={w.link} className="hover:text-accent">
                    {w.name}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-muted">{w.related}</td>
                <td className="px-3 py-1.5">
                  <StatusBadge status={w.state === 'pronta' ? 'ativo' : w.state === 'iniciando' ? 'carregando' : w.state} />
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-muted">{reservationText(w.reservation, unified)}</td>
                <td className="num px-3 py-1.5 text-right whitespace-nowrap">
                  {idle || cluster.status !== 'ativo' ? '—' : `${fmtNum(w.reservation.vcpu * cpuFactor, 2)} / ${fmtNum(w.reservation.vcpu, 1)} vCPU`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {node.workloads.length > limit && (
        <button className="btn-ghost btn-sm m-2" onClick={() => setLimit(limit + PAGE)}>
          Mostrar mais {Math.min(PAGE, node.workloads.length - limit)} de {node.workloads.length - limit} restantes
        </button>
      )}
    </div>
  )
}

/** Detalhes sob demanda de um cluster na listagem. */
export function ClusterExpansion({ cluster }: { cluster: Cluster }) {
  const { data } = useApp()
  const [loading, setLoading] = useState(true)
  const [openNodes, setOpenNodes] = useState<Set<number>>(new Set())
  useEffect(() => {
    // Detalhes de nós e réplicas são gerados só ao expandir (simula busca sob demanda).
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])
  const nodes = useMemo(() => (loading ? [] : clusterNodes(data, cluster)), [loading, data, cluster])
  const pending = useMemo(() => (loading ? [] : unscheduledReplicas(data, cluster)), [loading, data, cluster])
  const agentDeps = data.agentDeployments.filter((d) => d.clusterId === cluster.id)
  const ready = agentDeps.reduce((s, d) => s + readyReplicas(d), 0)
  const desired = agentDeps.reduce((s, d) => s + d.desiredReplicas, 0)
  const services = data.services.filter((s) => s.clusterId === cluster.id)
  const models = data.deployments.filter((d) => d.clusterId === cluster.id)
  const cap = cluster.capacity
  const unified = cluster.profile === 'unified'
  const t = clusterTotals(cluster.profile, cap)
  const r = clusterReserved(data, cluster.id)
  const usage = cluster.status === 'ativo' ? currentUsage(data, cluster.id) : null
  const cpuFactor = usage && r.vcpu ? usage.cpuUsed / r.vcpu : 0

  const summary: [string, string][] = [
    ['Nós prontos', cluster.status === 'provisionando' ? `0/${cap.nodes}` : `${nodes.length ? nodes.filter((n) => n.state === 'pronto').length : cap.nodes}/${cap.nodes}`],
    ['Agentes únicos', String(new Set(agentDeps.map((d) => d.agentId)).size)],
    ['Implantações de agentes', String(agentDeps.length)],
    ['Réplicas prontas', `${ready}/${desired}`],
    ['Serviços', String(services.length)],
    ['Modelos implantados', String(models.length)],
  ]

  return (
    <div className="space-y-4 border-l-2 border-accent/40 bg-surface-2/30 p-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {summary.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-surface px-3 py-2">
            <dt className="text-[11px] text-subtle">{k}</dt>
            <dd className="num text-base font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Capacidade do cluster</p>
            <MeterLegend />
          </div>
          <ResourceMeters cluster={cluster} compact />
          <p className="mt-3 text-[11px] text-subtle">
            Soma de {cap.nodes} {cap.nodes > 1 ? 'nós' : 'nó'}; cada carga cabe em um único nó. A memória de nós diferentes não forma um dispositivo único.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-3 text-sm font-medium">Telemetria</p>
          {cluster.status !== 'ativo' ? (
            <p className="text-xs text-subtle">Sem telemetria: cluster {cluster.status}.</p>
          ) : (
            <LiveTelemetry scope={{ clusterIds: [cluster.id] }} showGpu={cap.gpusPerNode > 0} />
          )}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <p className="text-sm font-medium">{cluster.modality === 'virtual' ? 'Nós virtuais atribuídos à organização' : 'Nós dedicados'}</p>
          <span className="text-[11px] text-subtle">
            Por nó: {cap.vcpuPerNode} vCPU · {unified ? `${fmtGiB(cap.memoryPerNodeGiB)} unificada (${fmtGiB(cap.gpuSharePerNodeGiB)} p/ GPU)` : `${fmtGiB(cap.memoryPerNodeGiB)} RAM · ${cap.gpusPerNode}× GPU ${cap.vramPerGpuGiB} GiB VRAM`}
          </span>
        </div>
        {loading ? (
          <div className="space-y-2 p-4" role="status" aria-label="Carregando nós">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="th w-8">
                    <span className="sr-only">Expandir</span>
                  </th>
                  <th className="th">Nó</th>
                  <th className="th">Estado</th>
                  <th className="th">CPU reservada</th>
                  <th className="th">{unified ? 'Memória unificada reservada' : 'RAM reservada'}</th>
                  <th className="th">{unified ? 'Parcela de GPU reservada' : 'VRAM reservada'}</th>
                  <th className="th">GPUs</th>
                  <th className="th text-right">Cargas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {nodes.map((n) => {
                  const open = openNodes.has(n.index)
                  const gpuMemNode = unified ? cap.gpuSharePerNodeGiB : cap.gpusPerNode * cap.vramPerGpuGiB
                  const cpuMemNode = unified ? cap.memoryPerNodeGiB - cap.gpuSharePerNodeGiB : cap.memoryPerNodeGiB
                  return (
                    <Fragment key={n.index}>
                      <tr className="hover:bg-surface-2/50">
                        <td className="td">
                          <button
                            className="btn-ghost btn-sm -ml-2"
                            aria-expanded={open}
                            aria-label={`${open ? 'Recolher' : 'Expandir'} cargas do nó ${n.name}`}
                            onClick={() => setOpenNodes((s) => (s.has(n.index) ? (s.delete(n.index), new Set(s)) : new Set(s.add(n.index))))}
                          >
                            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </button>
                        </td>
                        <td className="td font-mono text-xs">{n.name}</td>
                        <td className="td">
                          <StatusBadge status={cluster.status === 'ativo' ? 'saudavel' : cluster.status} />
                        </td>
                        <td className="td">
                          <div className="flex items-center gap-2 text-xs">
                            <MiniBar value={n.reserved.vcpu / cap.vcpuPerNode} />
                            <span className="num">
                              {fmtNum(n.reserved.vcpu, 1)} / {cap.vcpuPerNode} vCPU
                            </span>
                          </div>
                        </td>
                        <td className="td">
                          <div className="flex items-center gap-2 text-xs">
                            <MiniBar value={n.reserved.memoryGiB / Math.max(1, cpuMemNode)} />
                            <span className="num">
                              {fmtGiB(n.reserved.memoryGiB)} / {fmtGiB(cpuMemNode)}
                              {unified && <span className="text-subtle"> (CPU)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="td">
                          {gpuMemNode > 0 ? (
                            <div className="flex items-center gap-2 text-xs">
                              <MiniBar value={n.reserved.gpuMemoryGiB / gpuMemNode} tone={n.reserved.gpuMemoryGiB / gpuMemNode > 0.85 ? 'warn' : 'accent'} />
                              <span className="num">
                                {fmtGiB(n.reserved.gpuMemoryGiB)} / {fmtGiB(gpuMemNode)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-subtle">—</span>
                          )}
                        </td>
                        <td className="td num text-xs">
                          {n.reserved.gpus}/{cap.gpusPerNode}
                        </td>
                        <td className="td num text-right text-xs">{n.workloads.length}</td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={8} className="bg-surface-2/40 p-0">
                            <ExpandedCell>
                              <NodeWorkloads node={n} cluster={cluster} cpuFactor={cpuFactor} />
                            </ExpandedCell>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
            {pending.length > 0 && (
              <p className="border-t border-line px-4 py-2.5 text-xs text-warn">
                {pending.length} {pending.length > 1 ? 'réplicas pendentes' : 'réplica pendente'} sem nó:{' '}
                {pending.map(({ r, d }) => `${r.pod} (${data.agents.find((a) => a.id === d.agentId)?.name})`).join(', ')}.
              </p>
            )}
            {unified && (
              <p className="border-t border-line px-4 py-2.5 text-[11px] text-subtle">
                Memória unificada: CPU e GPU dividem o mesmo total físico de {fmtGiB(cap.memoryPerNodeGiB)} por nó; as colunas mostram cada parcela sem somá-las de novo.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Link to={`/clusters/${cluster.id}`} className="btn-secondary btn-sm">
          Abrir detalhes do cluster <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <span className="sr-only">
        Totais do cluster: {t.vcpu} vCPU, {fmtGiB(t.cpuMemoryGiB)} de memória para CPU, {fmtGiB(t.gpuMemoryGiB)} para GPU.
      </span>
    </div>
  )
}
