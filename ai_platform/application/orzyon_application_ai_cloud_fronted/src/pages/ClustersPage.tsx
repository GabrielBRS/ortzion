import { Fragment, useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, ChevronRight, Pause, Play, Plus, Search } from 'lucide-react'
import { ClusterExpansion } from '../components/ClusterExpansion'
import { readyReplicas } from '../lib/metrics'
import { useOrg } from '../state/AppContext'
import { EmptyState, ExpandedCell, PageHeader, Panel, StatusBadge } from '../components/ui'
import { useToast } from '../components/Toast'
import { clusterTotals } from '../lib/capacity'
import { clusterCost } from '../lib/costs'
import { fmtBRL0, fmtGiB } from '../lib/format'
import { orgScope } from '../lib/selectors'
import { agentOptions, sectorAgentName } from '../lib/sectorAgents'
import { setClusterPaused } from '../services/api'
import type { Cluster } from '../domain/types'

export default function ClustersPage() {
  const { data, org, orgClusters } = useOrg()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [modality, setModality] = useState('')
  const [agent, setAgent] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [applicationId, setApplicationId] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setExpanded((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s.add(id))))

  const scope = orgScope(data, org.id)
  const appById = new Map(scope.applications.map((a) => [a.id, a]))
  const agentNameByKey = new Map(agentOptions(scope.applications).map((a) => [a.key, a.name]))
  const servicesOf = (clusterId: string) => scope.services.filter((s) => s.clusterId === clusterId)
  const agentKeysOf = (clusterId: string) => servicesOf(clusterId).map((s) => appById.get(s.applicationId)?.sector)

  const rows = orgClusters.filter((c) => {
    const services = servicesOf(c.id)
    return (
      (!q || c.name.toLowerCase().includes(q.toLowerCase())) &&
      (!status || c.status === status) &&
      (!modality || c.modality === modality) &&
      (!agent || agentKeysOf(c.id).includes(agent)) &&
      (!serviceId || services.some((s) => s.id === serviceId)) &&
      (!applicationId || services.some((s) => s.applicationId === applicationId))
    )
  })
  const agents = agentOptions(scope.applications)

  return (
    <>
      <PageHeader
        title="Clusters"
        description="Ambientes contratados da organização, com capacidade e limites próprios."
        crumbs={[{ label: org.name, to: '/' }, { label: 'Clusters' }]}
        actions={
          <Link to="/clusters/novo" className="btn-primary">
            <Plus className="size-4" /> Criar cluster
          </Link>
        }
      />
      <Panel bodyClassName="">
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:flex-wrap">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input className="input pl-9" placeholder="Buscar por nome" aria-label="Buscar clusters" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input sm:w-44" aria-label="Filtrar por status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="provisionando">Provisionando</option>
            <option value="pausado">Pausado</option>
          </select>
          <select className="input sm:w-44" aria-label="Filtrar por modalidade" value={modality} onChange={(e) => setModality(e.target.value)}>
            <option value="">Todas as modalidades</option>
            <option value="virtual">Virtual</option>
            <option value="dedicado">Dedicado</option>
          </select>
          <select className="input sm:w-56" aria-label="Filtrar por agente" value={agent} onChange={(e) => setAgent(e.target.value)}>
            <option value="">Todos os agentes</option>
            {agents.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>
          <select className="input sm:w-56" aria-label="Filtrar por serviço" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Todos os serviços</option>
            {scope.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className="input sm:w-56" aria-label="Filtrar por aplicação" value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
            <option value="">Todas as aplicações</option>
            {scope.applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            title={orgClusters.length ? 'Nenhum cluster corresponde aos filtros' : 'Nenhum cluster nesta organização'}
            action={
              orgClusters.length ? (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setQ('')
                    setStatus('')
                    setModality('')
                    setAgent('')
                    setServiceId('')
                    setApplicationId('')
                  }}
                >
                  Limpar filtros
                </button>
              ) : (
                <Link to="/clusters/novo" className="btn-primary">
                  Criar cluster
                </Link>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="th w-8">
                    <span className="sr-only">Expandir</span>
                  </th>
                  <th className="th">Nome</th>
                  <th className="th">Status</th>
                  <th className="th">Modalidade e memória</th>
                  <th className="th">Recursos</th>
                  <th className="th">Agentes</th>
                  <th className="th">Serviços</th>
                  <th className="th text-right">Custo estimado/mês</th>
                  <th className="th text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => {
                  const t = clusterTotals(c.profile, c.capacity)
                  const agentDeps = data.agentDeployments.filter((a) => a.clusterId === c.id)
                  const uniqueAgents = new Set(agentDeps.map((d) => d.agentId)).size
                  const services = servicesOf(c.id)
                  const sectorNames = [...new Set(agentKeysOf(c.id).filter((k): k is string => !!k))].map((k) => agentNameByKey.get(k) ?? sectorAgentName(k, k))
                  const ready = agentDeps.reduce((s, d) => s + readyReplicas(d), 0) + services.reduce((s, x) => s + (x.status === 'ativo' ? x.replicas : 0), 0)
                  const open = expanded.has(c.id)
                  return (
                    <Fragment key={c.id}>
                      <tr className="align-top hover:bg-surface-2/50">
                        <td className="td">
                          <button
                            className="btn-ghost btn-sm -ml-2"
                            aria-expanded={open}
                            aria-controls={`exp-${c.id}`}
                            aria-label={`${open ? 'Recolher' : 'Expandir'} detalhes de ${c.name}`}
                            onClick={() => toggle(c.id)}
                          >
                            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </button>
                        </td>
                        <td className="td">
                          <Link to={`/clusters/${c.id}`} className="font-medium hover:text-accent">
                            {c.name}
                          </Link>
                          <div className="max-w-56 truncate text-xs text-subtle" title={c.purpose}>
                            {c.purpose}
                          </div>
                        </td>
                        <td className="td">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="td whitespace-nowrap">
                          <span className="block">{c.modality === 'dedicado' ? 'Dedicado' : 'Virtual'}</span>
                          <span className="block text-xs text-muted" title={c.profile === 'unified' ? 'Memória unificada AMD' : 'GPU com memória dedicada'}>
                            {c.profile === 'unified' ? 'Unificada AMD' : 'GPU dedicada'}
                          </span>
                        </td>
                        <td className="td num text-xs text-muted">
                          {c.capacity.nodes} {c.capacity.nodes > 1 ? 'nós' : 'nó'} · {t.vcpu} vCPU
                          <br />
                          {c.profile === 'unified'
                            ? `${fmtGiB(t.physicalMemoryGiB)} unificada (${fmtGiB(t.gpuMemoryGiB)} p/ GPU)`
                            : `${fmtGiB(t.cpuMemoryGiB)} RAM · ${t.gpus}× GPU ${c.capacity.vramPerGpuGiB} GiB`}
                        </td>
                        <td className="td text-xs">
                          {sectorNames.length > 0 ? (
                            <span className="block max-w-56 text-fg">{sectorNames.join(', ')}</span>
                          ) : uniqueAgents > 0 ? (
                            <span className="block whitespace-nowrap">
                              {uniqueAgents} {uniqueAgents === 1 ? 'agente' : 'agentes'}
                            </span>
                          ) : (
                            <span className="block text-subtle">Sem agente</span>
                          )}
                        </td>
                        <td className="td text-xs whitespace-nowrap">
                          <span className="block">
                            {services.length} {services.length === 1 ? 'serviço' : 'serviços'}
                          </span>
                          <span className="block text-muted">
                            {ready} {ready === 1 ? 'réplica pronta' : 'réplicas prontas'}
                          </span>
                        </td>
                        <td className="td num text-right">{fmtBRL0(clusterCost(data, c).projected)}</td>
                        <td className="td">
                          <div className="flex justify-end">
                            <PauseClusterButton cluster={c} />
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr id={`exp-${c.id}`}>
                          <td colSpan={9} className="p-0">
                            <ExpandedCell>
                              <ClusterExpansion cluster={c} />
                            </ExpandedCell>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}

/** Pausar ou retomar o cluster. Pausado, o vínculo com os agentes fica suspenso. */
function PauseClusterButton({ cluster }: { cluster: Cluster }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const paused = cluster.status === 'pausado'
  const toggle = async () => {
    setBusy(true)
    try {
      await setClusterPaused(cluster.id, !paused)
      toast.success(paused ? 'Cluster retomado.' : 'Cluster pausado.')
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <button className="btn-secondary btn-sm whitespace-nowrap" disabled={busy || cluster.status === 'provisionando'} onClick={toggle} aria-label={`${paused ? 'Retomar' : 'Pausar'} ${cluster.name}`}>
      {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
      {paused ? 'Retomar' : 'Pausar'}
    </button>
  )
}
