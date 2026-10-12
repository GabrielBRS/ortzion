import { useState } from 'react'
import { Link } from 'react-router'
import { Boxes, Search } from 'lucide-react'
import { useOrg } from '../state/AppContext'
import { EmptyState, PageHeader, Panel } from '../components/ui'
import { ServicesTable } from '../components/workloads'
import { orgScope } from '../lib/selectors'
import { agentOptions } from '../lib/sectorAgents'

export default function ServicesPage() {
  const { data, org, cluster } = useOrg()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [applicationId, setApplicationId] = useState('')
  const [agent, setAgent] = useState('')
  const [clusterId, setClusterId] = useState('')
  const scope = orgScope(data, org.id, cluster?.id)
  const appById = new Map(scope.applications.map((a) => [a.id, a]))
  const rows = scope.services.filter(
    (s) =>
      (!q || s.name.includes(q.toLowerCase())) &&
      (!status || s.status === status) &&
      (!applicationId || s.applicationId === applicationId) &&
      (!agent || appById.get(s.applicationId)?.sector === agent) &&
      (!clusterId || s.clusterId === clusterId),
  )
  const agents = agentOptions(scope.applications)

  return (
    <>
      <PageHeader
        title="Serviços"
        description={
          cluster
            ? `Instâncias de aplicações executando no cluster ${cluster.name}.`
            : 'Instâncias das aplicações da organização, em todos os clusters. Cada serviço tem réplicas e reserva próprias.'
        }
        crumbs={[{ label: org.name, to: '/' }, ...(cluster ? [{ label: cluster.name, to: `/clusters/${cluster.id}` }] : []), { label: 'Serviços' }]}
        actions={
          <Link to="/servicos/novo" className="btn-primary">
            <Boxes className="size-4" /> Implantar serviço
          </Link>
        }
      />
      <Panel bodyClassName="">
        {scope.services.length === 0 ? (
          <EmptyState
            title="Nenhum serviço"
            description="Um serviço é uma aplicação em execução em um cluster."
            action={
              <Link to="/servicos/novo" className="btn-primary">
                Implantar serviço
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:flex-wrap">
              <div className="relative min-w-48 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
                <input className="input pl-9" placeholder="Buscar por nome" aria-label="Buscar serviços" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="input sm:w-40" aria-label="Filtrar por status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todos os status</option>
                <option value="ativo">Ativo</option>
                <option value="construindo">Construindo</option>
                <option value="implantando">Implantando</option>
                <option value="pausado">Pausado</option>
              </select>
              <select className="input sm:w-56" aria-label="Filtrar por agente" value={agent} onChange={(e) => setAgent(e.target.value)}>
                <option value="">Todos os agentes</option>
                {agents.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select className="input sm:w-48" aria-label="Filtrar por cluster" value={clusterId} onChange={(e) => setClusterId(e.target.value)}>
                <option value="">Todos os clusters</option>
                {scope.clusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
              <p className="p-6 text-center text-sm text-muted">Nenhum serviço corresponde aos filtros.</p>
            ) : (
              <ServicesTable services={rows} />
            )}
          </>
        )}
      </Panel>
    </>
  )
}
