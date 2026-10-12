import { Link, useParams } from 'react-router'
import { Bot, Boxes, CircleDollarSign, LayoutDashboard, Package, Server, Zap } from 'lucide-react'
import { useOrg } from '../state/AppContext'
import { MetricCard, PageHeader, Panel } from '../components/ui'
import { SECTOR_ICON, SUBSECTOR_ICON } from '../components/SectorIcons'
import { applicationsScope, scopeCosts } from '../lib/context'
import { buildSeries, summarize } from '../lib/metrics'
import { fmtBRL0, fmtCompact } from '../lib/format'
import { SECTOR_GROUPS } from '../mock/sectorApps'
import NotFoundPage from './NotFoundPage'

/** Painel de um setor com vários subsetores. Mostra só o setor: a página inicial não aparece aqui. */
export default function SectorPage() {
  const { sectorKey = '' } = useParams()
  const { data, org } = useOrg()
  const apps = data.applications.filter((a) => a.orgId === org.id && a.sector === sectorKey)
  if (!apps.length) return <NotFoundPage message="Setor não encontrado nesta organização" />

  const info = SECTOR_GROUPS[sectorKey]
  const name = info?.name ?? apps[0].name
  const scope = applicationsScope(data, org.id, apps)
  const costs = scopeCosts(data, scope.clusters)
  const sum = summarize(buildSeries(data, { clusterIds: scope.clusterIds }, '24h'))
  const Icon = SECTOR_ICON[sectorKey]

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <Icon className="size-6 text-accent" aria-hidden />
            {name}
          </span>
        }
        description={info?.description ?? apps[0].description}
        crumbs={[{ label: org.name, to: '/' }, { label: name }]}
        actions={
          <Link to={`/setor/${sectorKey}/dashboard`} className="btn-primary">
            <LayoutDashboard className="size-4" /> Ver dashboard completo
          </Link>
        }
      />

      <Panel title="Visão prévia" description={`${apps.length === 1 ? 'Soma de 1 aplicação' : `Soma dos ${apps.length} subsetores`}. Para os detalhes, abra o dashboard completo.`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Aplicações" value={apps.length} icon={<Package className="size-4" />} hint="subsetores do setor" />
          <MetricCard label="Instâncias" value={scope.services.length} icon={<Boxes className="size-4" />} hint="serviços das aplicações" />
          <MetricCard label="Agentes" value={scope.agents.length} icon={<Bot className="size-4" />} hint="nos clusters do setor" />
          <MetricCard label="Clusters" value={scope.clusters.length} icon={<Server className="size-4" />} hint="onde o setor executa" />
          <MetricCard label="Tokens 24 h" value={fmtCompact(sum.tokensOut)} icon={<Zap className="size-4" />} hint="tokens de saída" />
          <MetricCard label="Gasto do mês" value={fmtBRL0(costs.projected)} icon={<CircleDollarSign className="size-4" />} hint="infraestrutura dos clusters" />
        </div>
      </Panel>

      <section aria-labelledby="subsetores" className="mt-6">
        <h2 id="subsetores" className="mb-3 text-sm font-semibold text-fg">
          Subsetores
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((a) => {
            const SubIcon = SUBSECTOR_ICON[a.id] ?? Icon
            const instances = scope.services.filter((s) => s.applicationId === a.id).length
            return (
              <li key={a.id}>
                <Link to={`/aplicacoes/${a.id}/dashboard`} className="card flex h-full items-start gap-3 p-4 hover:border-line-strong">
                  <SubIcon className="mt-0.5 size-7 shrink-0 text-accent" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="mt-1 text-xs text-muted">{a.description}</p>
                    <p className="mt-2 text-[11px] text-subtle">
                      {instances === 0 ? 'Sem instâncias' : `${instances} ${instances === 1 ? 'instância' : 'instâncias'}`}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
