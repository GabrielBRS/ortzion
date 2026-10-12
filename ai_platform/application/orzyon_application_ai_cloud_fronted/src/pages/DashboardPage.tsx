import { useMemo, useState, type ComponentProps } from 'react'
import { Link, useParams } from 'react-router'
import { Activity, AlertTriangle, Bot, Boxes, CircleDollarSign, Package, Plus, Server, TrendingUp, XCircle } from 'lucide-react'
import type { Period } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { EmptyState, MeterLegend, MetricCard, MiniBar, PageHeader, Panel, ResourceMeter, Segmented, StatusBadge, Skeleton, useSimulatedLoading, type Crumb } from '../components/ui'
import { CHART_COLORS, TimeChart } from '../components/charts'
import { LiveTelemetry } from '../components/LiveTelemetry'
import { PERIODS, buildSeries, currentUsage, readyReplicas, summarize } from '../lib/metrics'
import { deploymentState } from '../lib/agentUsage'
import { clusterCost, orgCosts } from '../lib/costs'
import { clusterReserved, clusterTotals } from '../lib/capacity'
import { fmtBRL, fmtBRL0, fmtCompact, fmtGiB, fmtInt, fmtNum, fmtPct, fmtRelative } from '../lib/format'
import { orgAlerts, orgScope } from '../lib/selectors'
import { applicationsScope, contextAlerts, scopeCosts } from '../lib/context'
import { periodCostSeries } from '../lib/periodCost'
import { RUNTIME_LABEL } from '../mock/samples'
import { SECTOR_GROUPS } from '../mock/sectorApps'
import NotFoundPage from './NotFoundPage'
import { isSectorOrg, sectorAgents, sectorAgentsRunning } from '../lib/sectorAgents'

/** Indicador clicável: leva à seção que detalha o número. */
function LinkedMetric({ to, ...props }: ComponentProps<typeof MetricCard> & { to: string }) {
  return (
    <Link to={to} className="block min-w-0 rounded-xl transition-shadow hover:ring-1 hover:ring-accent/40">
      <MetricCard {...props} />
    </Link>
  )
}

/** Contexto do dashboard: a organização, um setor (soma dos subsetores) ou uma aplicação. */
interface DashboardCtx {
  key: string
  title: string
  description: string
  crumbs?: Crumb[]
  scope: ReturnType<typeof orgScope>
  costs: { toDate: number; projected: number }
  budget: number
  threshold: number
  alerts: ReturnType<typeof orgAlerts>
  notFound: boolean
}

/** Lê a rota: /setor/:sectorKey/dashboard, /aplicacoes/:applicationId/dashboard, ou /dashboard (organização). */
function useDashboardContext(): DashboardCtx {
  const { data, org } = useOrg()
  const { sectorKey, applicationId } = useParams()

  if (sectorKey) {
    const apps = data.applications.filter((a) => a.orgId === org.id && a.sector === sectorKey)
    const name = SECTOR_GROUPS[sectorKey]?.name ?? apps[0]?.name ?? sectorKey
    const scope = applicationsScope(data, org.id, apps)
    return {
      key: `setor:${sectorKey}`,
      title: `Dashboard · ${name}`,
      description: `Soma dos ${apps.length} subsetores: agentes, clusters, instâncias, tokens e gasto deste setor.`,
      crumbs: [{ label: org.name, to: '/' }, { label: name, to: `/setor/${sectorKey}` }, { label: 'Dashboard' }],
      scope,
      costs: scopeCosts(data, scope.clusters),
      budget: scope.clusters.reduce((acc, c) => acc + c.monthlyBudget, 0),
      threshold: org.alertThreshold,
      alerts: contextAlerts(orgAlerts(data, org), scope),
      notFound: apps.length === 0,
    }
  }

  if (applicationId) {
    const app = data.applications.find((a) => a.id === applicationId && a.orgId === org.id)
    const apps = app ? [app] : []
    const scope = applicationsScope(data, org.id, apps)
    const sectorApps = app?.sector ? data.applications.filter((a) => a.orgId === org.id && a.sector === app.sector) : []
    const parent = sectorApps.length > 1 ? { label: SECTOR_GROUPS[app!.sector!]?.name ?? app!.sector!, to: `/setor/${app!.sector}` } : { label: 'Aplicações', to: '/aplicacoes' }
    return {
      key: `aplicacao:${applicationId}`,
      title: `Dashboard · ${app?.name ?? 'Aplicação'}`,
      description: 'Agentes, clusters, instâncias, tokens e gasto desta aplicação.',
      crumbs: [{ label: org.name, to: '/' }, parent, { label: app?.name ?? 'Aplicação', to: `/aplicacoes/${applicationId}` }, { label: 'Dashboard' }],
      scope,
      costs: scopeCosts(data, scope.clusters),
      budget: scope.clusters.reduce((acc, c) => acc + c.monthlyBudget, 0),
      threshold: org.alertThreshold,
      alerts: contextAlerts(orgAlerts(data, org), scope),
      notFound: !app,
    }
  }

  const costs = orgCosts(data, org.id)
  return {
    key: org.id,
    title: 'Dashboard',
    description: `Métricas de ${org.name} em tempo real. Cada indicador e cada item da lista leva ao detalhe.`,
    scope: orgScope(data, org.id),
    costs,
    budget: org.monthlyBudget,
    threshold: org.alertThreshold,
    alerts: orgAlerts(data, org),
    notFound: false,
  }
}

export default function DashboardPage() {
  const ctx = useDashboardContext()
  const { data, org } = useOrg()
  // Organização de setores: o agente é o setor, e o contador mostra agentes fixos em execução.
  const sectorTile = isSectorOrg(org.segment) && ctx.key === org.id
  const [period, setPeriod] = useState<Period>('24h')
  const loading = useSimulatedLoading(300, [ctx.key])
  const scope = ctx.scope

  const series = useMemo(() => buildSeries(data, { clusterIds: scope.clusterIds }, period), [data, scope.clusterIds.join(), period])
  const sum = summarize(series)
  const costs = ctx.costs
  const costSeries = useMemo(() => periodCostSeries(data, scope.clusterIds, series, period), [data, scope.clusterIds.join(), series, period])
  const alerts = ctx.alerts
  if (ctx.notFound) return <NotFoundPage message="Setor ou aplicação não encontrado nesta organização" />

  const activeClusters = scope.clusters.filter((c) => c.status === 'ativo').length
  const runningAgents = new Set(scope.agentDeployments.filter((d) => deploymentState(data, d).executing).map((d) => d.agentId)).size
  const readyAgentReplicas = scope.agentDeployments.reduce((s, d) => s + readyReplicas(d), 0)
  const desiredAgentReplicas = scope.agentDeployments.reduce((s, d) => s + d.desiredReplicas, 0)

  // Instâncias (serviços): réplicas prontas só contam com serviço ativo em cluster ativo.
  const clusterById = new Map(scope.clusters.map((c) => [c.id, c]))
  const serviceReady = (s: (typeof scope.services)[number]) => (s.status === 'ativo' && clusterById.get(s.clusterId)?.status === 'ativo' ? s.replicas : 0)
  const runningServices = scope.services.filter((s) => s.status === 'ativo').length
  const readyServiceReplicas = scope.services.reduce((acc, s) => acc + serviceReady(s), 0)
  const desiredServiceReplicas = scope.services.reduce((acc, s) => acc + s.replicas, 0)

  // Agregado de recursos. A parcela de GPU da memória unificada faz parte do mesmo
  // total físico e não é somada novamente como capacidade independente.
  const agg = scope.clusters.reduce(
    (acc, c) => {
      const t = clusterTotals(c.profile, c.capacity)
      const r = clusterReserved(data, c.id)
      const u = c.status === 'ativo' ? currentUsage(data, c.id) : { cpuUsed: 0, memUsedGiB: 0, gpuMemUsedGiB: 0 }
      acc.vcpu.t += t.vcpu
      acc.vcpu.r += r.vcpu
      acc.vcpu.u += u.cpuUsed
      acc.mem.t += t.cpuMemoryGiB
      acc.mem.r += r.memoryGiB
      acc.mem.u += u.memUsedGiB
      acc.gmem.t += t.gpuMemoryGiB
      acc.gmem.r += r.gpuMemoryGiB
      acc.gmem.u += u.gpuMemUsedGiB
      acc.gpus.t += t.gpus
      acc.gpus.r += r.gpus
      return acc
    },
    { vcpu: { t: 0, r: 0, u: 0 }, mem: { t: 0, r: 0, u: 0 }, gmem: { t: 0, r: 0, u: 0 }, gpus: { t: 0, r: 0 } },
  )
  const hasUnified = scope.clusters.some((c) => c.profile === 'unified')
  const hasGpu = scope.clusters.some((c) => c.capacity.gpusPerNode > 0)
  const budgetRatio = ctx.budget ? costs.projected / ctx.budget : 0
  const errorAlerts = alerts.filter((a) => a.level === 'erro').length

  return (
    <>
      <PageHeader
        title={ctx.title}
        description={ctx.description}
        crumbs={ctx.crumbs}
        actions={
          <>
            <Link to="/clusters/novo" className="btn-primary">
              <Plus className="size-4" /> Criar cluster
            </Link>
            <Link to="/aplicacoes/novo" className="btn-secondary">
              <Package className="size-4" /> Criar aplicação
            </Link>
            <Link to="/servicos/novo" className="btn-secondary">
              <Boxes className="size-4" /> Implantar serviço
            </Link>
            {!isSectorOrg(org.segment) && (
              <Link to="/agentes/novo" className="btn-secondary">
                <Bot className="size-4" /> Criar agente
              </Link>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-subtle">Métricas do período selecionado · consumo e projeção referentes ao mês corrente</p>
        <Segmented label="Período" value={period} onChange={setPeriod} options={PERIODS} />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <LinkedMetric to="/clusters" label="Clusters ativos" value={`${activeClusters} / ${scope.clusters.length}`} icon={<Server className="size-4" />} hint="ativos / contratados" />
          <LinkedMetric
            to="/aplicacoes"
            label="Aplicações"
            value={scope.applications.length}
            icon={<Package className="size-4" />}
            hint={`${scope.services.length} ${scope.services.length === 1 ? 'instância' : 'instâncias'} publicadas`}
          />
          <LinkedMetric
            to="/servicos"
            label="Serviços ativos"
            value={`${runningServices} / ${scope.services.length}`}
            icon={<Boxes className="size-4" />}
            hint={`${readyServiceReplicas}/${desiredServiceReplicas} réplicas prontas`}
          />
          <LinkedMetric
            to="/agentes"
            label={sectorTile ? 'Agentes (setores) em execução' : 'Agentes em execução'}
            value={sectorTile ? `${sectorAgentsRunning(data, org.id)} / ${sectorAgents(data, org.id).length}` : `${runningAgents} / ${scope.agents.length}`}
            icon={<Bot className="size-4" />}
            hint={`${scope.agentDeployments.length} implantações · ${readyAgentReplicas}/${desiredAgentReplicas} réplicas prontas`}
          />
          <LinkedMetric
            to="/metricas"
            label={`Requisições (${PERIODS.find((p) => p.value === period)!.label})`}
            value={fmtCompact(sum.requests)}
            icon={<Activity className="size-4" />}
            hint={`Erro ${fmtPct(sum.errorRate, 2)} · p50 ${fmtInt(sum.p50)} ms`}
          />
          <LinkedMetric to="/custos" label="Consumo do mês" value={fmtBRL0(costs.toDate)} icon={<CircleDollarSign className="size-4" />} hint="acumulado estimado" />
          <LinkedMetric
            to="/custos"
            label="Projeção mensal"
            value={fmtBRL0(costs.projected)}
            icon={<TrendingUp className="size-4" />}
            tone={budgetRatio >= 1 ? 'err' : budgetRatio >= ctx.threshold ? 'warn' : undefined}
            hint={`${fmtPct(budgetRatio)} do orçamento de ${fmtBRL0(ctx.budget)}`}
          />
          <a href="#alertas" className="block min-w-0 rounded-xl transition-shadow hover:ring-1 hover:ring-accent/40">
            <MetricCard
              label="Alertas"
              value={alerts.length}
              icon={<AlertTriangle className="size-4" />}
              tone={errorAlerts ? 'err' : alerts.length ? 'warn' : undefined}
              hint={alerts.length ? `${errorAlerts} com erro · ver lista` : 'Nenhum alerta no momento'}
            />
          </a>
        </div>
      )}

      <Panel className="mt-4" title="Tempo real" description="Telemetria da organização, atualizada a cada segundo.">
        <LiveTelemetry scope={{ clusterIds: scope.clusterIds }} showGpu={hasGpu} />
      </Panel>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Requisições" description="Total por intervalo, todas as cargas da organização" className="xl:col-span-2">
          <TimeChart data={series} series={[{ key: 'requests', label: 'Requisições', color: CHART_COLORS.accent }]} unit="req" format={fmtInt} height={360} />
        </Panel>
        <Panel title="Recursos da organização" description="Soma dos clusters" actions={<MeterLegend />}>
          <div className="space-y-4">
            <ResourceMeter label="CPU" unit="vCPU" total={agg.vcpu.t} reserved={agg.vcpu.r} used={agg.vcpu.u} format={(v) => fmtNum(v, 0)} />
            <ResourceMeter
              label="Memória para CPU"
              unit="GiB"
              total={agg.mem.t}
              reserved={agg.mem.r}
              used={agg.mem.u}
              format={(v) => fmtNum(v, 0)}
              note={hasUnified ? 'RAM dos clusters de GPU dedicada + parcela de CPU da memória unificada.' : undefined}
            />
            <ResourceMeter
              label="Memória para GPU"
              unit="GiB"
              total={agg.gmem.t}
              reserved={agg.gmem.r}
              used={agg.gmem.u}
              format={(v) => fmtNum(v, 0)}
              note={hasUnified ? 'VRAM + parcela de GPU da memória unificada (sem dupla contagem).' : undefined}
            />
            <ResourceMeter label="GPU" unit="GPU" total={agg.gpus.t} reserved={agg.gpus.r} format={(v) => fmtNum(v, 0)} />
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Latência" description="p50 e p95 em milissegundos">
          <TimeChart
            type="line"
            data={series}
            series={[
              { key: 'p50', label: 'p50', color: CHART_COLORS.accent },
              { key: 'p95', label: 'p95', color: CHART_COLORS.violet },
            ]}
            unit="ms"
            format={fmtInt}
          />
        </Panel>
        <Panel title="Custos estimados no período" description="Capacidade reservada e consumo variável por intervalo (ilustrativo)">
          <TimeChart
            type="bar"
            stacked
            data={costSeries}
            series={[
              { key: 'reserved', label: 'Capacidade reservada', color: CHART_COLORS.blue },
              { key: 'variable', label: 'Consumo variável', color: CHART_COLORS.amber },
            ]}
            format={fmtBRL}
          />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Clusters" className="xl:col-span-2" bodyClassName="" actions={<Link to="/clusters" className="btn-ghost btn-sm">Ver todos</Link>}>
          {scope.clusters.length === 0 ? (
            <EmptyState
              title="Nenhum cluster nesta organização"
              action={
                <Link to="/clusters/novo" className="btn-primary">
                  Criar cluster
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line">
                  <tr>
                    <th className="th">Cluster</th>
                    <th className="th">Status</th>
                    <th className="th">Capacidade reservada</th>
                    <th className="th text-right">Gasto estimado (mês)</th>
                    <th className="th">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {scope.clusters.map((c) => {
                    const t = clusterTotals(c.profile, c.capacity)
                    const r = clusterReserved(data, c.id)
                    const gpuRatio = t.gpuMemoryGiB ? r.gpuMemoryGiB / t.gpuMemoryGiB : 0
                    const cpuRatio = t.vcpu ? r.vcpu / t.vcpu : 0
                    const cc = clusterCost(data, c)
                    return (
                      <tr key={c.id} className="hover:bg-surface-2/50">
                        <td className="td">
                          <Link to={`/clusters/${c.id}`} className="font-medium hover:text-accent">
                            {c.name}
                          </Link>
                          <div className="text-xs text-subtle">
                            {c.modality === 'dedicado' ? 'Dedicado' : 'Virtual'} · {c.profile === 'unified' ? 'Memória unificada' : 'GPU dedicada'}
                          </div>
                        </td>
                        <td className="td">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="td">
                          <div className="space-y-1 text-xs text-muted">
                            <div className="flex items-center gap-2">
                              <MiniBar value={cpuRatio} /> <span className="num">vCPU {fmtPct(cpuRatio)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MiniBar value={gpuRatio} tone={gpuRatio > 0.85 ? 'warn' : 'accent'} />{' '}
                              <span className="num">
                                {c.profile === 'unified' ? 'Mem. GPU' : 'VRAM'} {fmtPct(gpuRatio)} de {fmtGiB(t.gpuMemoryGiB)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="td num text-right">{fmtBRL0(cc.projected)}</td>
                        <td className="td text-right">
                          <Link to={`/clusters/${c.id}`} className="btn-ghost btn-sm">
                            Detalhes
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Aplicações" bodyClassName="" actions={<Link to="/aplicacoes" className="btn-ghost btn-sm">Ver todas</Link>}>
          {scope.applications.length === 0 ? (
            <EmptyState
              title="Nenhuma aplicação"
              action={
                <Link to="/aplicacoes/novo" className="btn-primary">
                  Criar aplicação
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {scope.applications.slice(0, 6).map((a) => {
                const instances = scope.services.filter((s) => s.applicationId === a.id)
                const replicas = instances.reduce((acc, s) => acc + s.replicas, 0)
                return (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1 text-sm">
                      <Link to={`/aplicacoes/${a.id}`} className="block truncate font-medium hover:text-accent">
                        {a.name}
                      </Link>
                      <p className="text-xs text-subtle">
                        {a.kind === 'source' ? `Código · ${RUNTIME_LABEL[a.runtime ?? 'python']}` : 'Imagem de contêiner'} · <span className="font-mono">{a.version}</span>
                      </p>
                    </div>
                    <p className="num text-right text-xs whitespace-nowrap text-muted">
                      {instances.length} {instances.length === 1 ? 'instância' : 'instâncias'}
                      <br />
                      {replicas} {replicas === 1 ? 'réplica' : 'réplicas'}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Serviços" className="xl:col-span-2" bodyClassName="" actions={<Link to="/servicos" className="btn-ghost btn-sm">Ver todos</Link>}>
          {scope.services.length === 0 ? (
            <EmptyState
              title="Nenhum serviço em execução"
              action={
                <Link to="/servicos/novo" className="btn-primary">
                  Implantar serviço
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line">
                  <tr>
                    <th className="th">Serviço</th>
                    <th className="th">Aplicação</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Réplicas prontas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {scope.services.slice(0, 8).map((s) => {
                    const app = scope.applications.find((a) => a.id === s.applicationId)
                    const cluster = clusterById.get(s.clusterId)
                    return (
                      <tr key={s.id} className="hover:bg-surface-2/50">
                        <td className="td">
                          <Link to={`/servicos/${s.id}`} className="font-mono text-[13px] font-medium hover:text-accent">
                            {s.name}
                          </Link>
                          <div className="text-xs text-subtle">
                            em{' '}
                            <Link to={`/clusters/${s.clusterId}`} className="hover:text-accent">
                              {cluster?.name}
                            </Link>
                          </div>
                        </td>
                        <td className="td">
                          {app ? (
                            <Link to={`/aplicacoes/${app.id}`} className="hover:text-accent">
                              {app.name}
                            </Link>
                          ) : (
                            <span className="text-subtle">—</span>
                          )}
                        </td>
                        <td className="td">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="td num text-right">
                          {serviceReady(s)}/{s.replicas}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div id="alertas" className="space-y-4 scroll-mt-20">
          <Panel title="Alertas" bodyClassName="divide-y divide-line">
            {alerts.length === 0 ? (
              <p className="p-4 text-sm text-muted">Nenhum alerta no momento.</p>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="flex gap-3 px-4 py-3">
                  {a.level === 'erro' ? <XCircle className="mt-0.5 size-4 shrink-0 text-err" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />}
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted">{a.description}</p>
                    {a.to && (
                      <Link to={a.to} className="mt-1 inline-block text-xs text-accent hover:underline">
                        Ver detalhes
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </Panel>
          <Panel title="Atividades recentes" bodyClassName="divide-y divide-line">
            {scope.events.slice(0, 6).map((e) => (
              <div key={e.id} className="flex gap-3 px-4 py-2.5">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${e.level === 'erro' ? 'bg-err' : e.level === 'aviso' ? 'bg-warn' : e.level === 'sucesso' ? 'bg-ok' : 'bg-info'}`}
                  aria-hidden
                />
                <div className="min-w-0 text-sm">
                  <p className="text-fg/90">
                    {e.clusterId ? (
                      <Link to={`/clusters/${e.clusterId}`} className="hover:text-accent">
                        {e.message}
                      </Link>
                    ) : (
                      e.message
                    )}
                  </p>
                  <p className="text-xs text-subtle">
                    {e.source} · {fmtRelative(e.ts)}
                  </p>
                </div>
              </div>
            ))}
            {scope.events.length === 0 && <p className="p-4 text-sm text-muted">Sem atividades.</p>}
          </Panel>
        </div>
      </div>
    </>
  )
}
