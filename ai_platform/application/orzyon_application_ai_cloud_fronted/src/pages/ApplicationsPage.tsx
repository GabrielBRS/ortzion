import { useState } from 'react'
import { Link } from 'react-router'
import { Package, Rocket, Search } from 'lucide-react'
import { useOrg } from '../state/AppContext'
import { EmptyState, PageHeader, Panel } from '../components/ui'
import { IntelligenceGauge } from '../components/IntelligenceGauge'
import { RUNTIME_LABEL } from '../mock/samples'
import { fmtRelative } from '../lib/format'
import { orgScope } from '../lib/selectors'
import { applicationIntelligence } from '../lib/intelligence'
import { agentNameOf, agentOptions } from '../lib/sectorAgents'

export default function ApplicationsPage() {
  const { data, org } = useOrg()
  const [q, setQ] = useState('')
  const [origin, setOrigin] = useState('')
  const [agent, setAgent] = useState('')
  const [clusterId, setClusterId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const scope = orgScope(data, org.id)
  const rows = scope.applications.filter(
    (a) =>
      (!q || a.name.toLowerCase().includes(q.trim().toLowerCase())) &&
      (!origin || (origin === 'image' ? a.kind === 'image' : a.runtime === origin)) &&
      (!agent || a.sector === agent) &&
      (!clusterId || scope.services.some((s) => s.applicationId === a.id && s.clusterId === clusterId)) &&
      (!serviceId || scope.services.some((s) => s.applicationId === a.id && s.id === serviceId)),
  )
  const agents = agentOptions(scope.applications)

  return (
    <>
      <PageHeader
        title="Aplicações"
        description="Código ou imagem que a organização sobe. Cada aplicação pode rodar em várias instâncias (serviços), em clusters diferentes."
        crumbs={[{ label: org.name, to: '/' }, { label: 'Aplicações' }]}
        actions={
          <>
            <Link to="/aplicacoes/novo" className="btn-primary">
              <Package className="size-4" /> Nova aplicação
            </Link>
            <Link to="/servicos/novo" className="btn-secondary">
              <Rocket className="size-4" /> Implantar serviço
            </Link>
          </>
        }
      />
      <Panel bodyClassName="">
        {scope.applications.length === 0 ? (
          <EmptyState
            title="Nenhuma aplicação nesta organização"
            description="Envie o código-fonte ou a referência da imagem. Depois, implante a aplicação como serviço em um cluster."
            action={
              <Link to="/aplicacoes/novo" className="btn-primary">
                <Package className="size-4" /> Nova aplicação
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:flex-wrap">
              <div className="relative min-w-48 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
                <input className="input pl-9" placeholder="Buscar por nome" aria-label="Buscar aplicações" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="input sm:w-52" aria-label="Filtrar por agente" value={agent} onChange={(e) => setAgent(e.target.value)}>
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
              <select className="input sm:w-52" aria-label="Filtrar por serviço" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Todos os serviços</option>
                {scope.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select className="input sm:w-44" aria-label="Filtrar por origem" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                <option value="">Todas as origens</option>
                <option value="python">Python</option>
                <option value="mojo">Mojo</option>
                <option value="python_mojo">Python + Mojo</option>
                <option value="image">Imagem de contêiner</option>
              </select>
            </div>
            {rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">Nenhuma aplicação corresponde aos filtros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line">
                    <tr>
                      <th className="th">Aplicação</th>
                      <th className="th">Agente</th>
                      <th className="th">Origem</th>
                      <th className="th">Versão</th>
                      <th className="th">Instâncias</th>
                      <th className="th">Clusters</th>
                      <th className="th">Inteligência</th>
                      <th className="th text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((a) => {
                      const instances = scope.services.filter((s) => s.applicationId === a.id)
                      const clusterIds = [...new Set(instances.map((s) => s.clusterId))]
                      const intel = applicationIntelligence(data, a)
                      return (
                        <tr key={a.id} className="hover:bg-surface-2/50">
                          <td className="td">
                            <Link to={`/aplicacoes/${a.id}`} className="font-medium hover:text-accent">
                              {a.name}
                            </Link>
                            <div className="max-w-xs truncate text-xs text-subtle">{a.description || `criada ${fmtRelative(a.createdAt)}`}</div>
                          </td>
                          <td className="td max-w-48 text-xs text-muted">{a.sector ? agentNameOf(scope.applications, a.sector) : '—'}</td>
                          <td className="td">{a.kind === 'source' ? `Código · ${RUNTIME_LABEL[a.runtime ?? 'python']}` : 'Imagem de contêiner'}</td>
                          <td className="td font-mono text-xs">{a.version}</td>
                          <td className="td num">
                            {instances.length} {instances.length === 1 ? 'instância' : 'instâncias'}
                            <div className="text-xs text-subtle">{instances.reduce((s, i) => s + i.replicas, 0)} réplicas</div>
                          </td>
                          <td className="td">
                            {clusterIds.length === 0 ? (
                              <span className="text-subtle">Não implantada</span>
                            ) : (
                              <div className="flex flex-wrap gap-x-2 gap-y-1">
                                {clusterIds.map((cid) => (
                                  <Link key={cid} to={`/clusters/${cid}`} className="text-xs hover:text-accent">
                                    {scope.clusters.find((c) => c.id === cid)?.name ?? cid}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="td">
                            <IntelligenceGauge score={intel?.score ?? null} size="sm" />
                          </td>
                          <td className="td">
                            <div className="flex justify-end gap-1">
                              <Link to={`/aplicacoes/${a.id}`} className="btn-ghost btn-sm">
                                Detalhes
                              </Link>
                              <Link to={`/servicos/novo?aplicacao=${a.id}`} className="btn-secondary btn-sm">
                                <Rocket className="size-3.5" /> Implantar
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Panel>
    </>
  )
}
