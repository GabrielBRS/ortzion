import { Fragment, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronDown, ChevronRight, MessagesSquare, Plus, Search, Server } from 'lucide-react'
import { useOrg } from '../state/AppContext'
import { SectorAgentsView } from '../components/AgentTree'
import { isSectorOrg } from '../lib/sectorAgents'
import { EmptyState, ExpandedCell, MetricCard, PageHeader, Panel, Segmented } from '../components/ui'
import { AgentDeploymentsTable, ClusterLinks, DeployAgentDialog, Tokens } from '../components/agents'
import { orgScope } from '../lib/selectors'
import { CONSOLIDATED_LABEL, agentRow, inferenceLabel, selectionWindow, type AgentRow, type PeriodSel } from '../lib/agentUsage'
import { PERIODS } from '../lib/metrics'
import { fmtBRL, fmtCompact, fmtInt, fmtNum } from '../lib/format'

const STATUS_TONE: Record<string, string> = {
  ativo: 'text-ok bg-ok/10 border-ok/25',
  parcial: 'text-warn bg-warn/10 border-warn/25',
  pausado: 'text-muted bg-surface-3 border-line-strong',
  sem_execucao: 'text-muted bg-surface-3 border-line-strong',
}

type Sort = 'tokens' | 'custo' | 'replicas' | 'nome'

export default function AgentsPage() {
  const { org } = useOrg()
  // Orzyon e governo: agentes fixos, um por setor. Clientes B2B mantêm a gestão de agentes.
  return isSectorOrg(org.segment) ? <SectorAgentsView /> : <LegacyAgentsPage />
}

function LegacyAgentsPage() {
  const { data, org, cluster, setCluster } = useOrg()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const status = params.get('status') ?? ''
  const modelo = params.get('modelo') ?? ''
  const period = (params.get('periodo') ?? '24h') as PeriodSel
  const from = params.get('de') ?? ''
  const to = params.get('ate') ?? ''
  const sort = (params.get('ordem') ?? 'tokens') as Sort
  const setParam = (k: string, v: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (v) n.set(k, v)
        else n.delete(k)
        return n
      },
      { replace: true },
    )

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [deployFor, setDeployFor] = useState<string | null>(null)
  const scope = orgScope(data, org.id, cluster?.id)
  const win = useMemo(() => selectionWindow(period, from, to), [period, from, to, Math.floor(Date.now() / 60000)])

  // Opções do filtro de modelo/provedor a partir dos destinos de inferência em uso.
  const modelOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of scope.agentDeployments) {
      const inf = inferenceLabel(data, d)
      const key = inf.kind === 'externo' ? `prov:${inf.detail.replace('API externa · ', '')}` : `model:${inf.label}`
      m.set(key, inf.kind === 'externo' ? `Provedor: ${inf.detail.replace('API externa · ', '')}` : inf.label)
    }
    return [...m.entries()]
  }, [data, scope.agentDeployments])

  const rows: AgentRow[] = useMemo(() => {
    return scope.agents
      .map((a) => {
        let deps = scope.agentDeployments.filter((d) => d.agentId === a.id)
        if (modelo) deps = deps.filter((d) => {
          const inf = inferenceLabel(data, d)
          return modelo.startsWith('prov:') ? inf.kind === 'externo' && inf.detail.endsWith(modelo.slice(5)) : inf.label === modelo.slice(6)
        })
        return { a, deps }
      })
      .filter(({ a, deps }) => (!modelo || deps.length) && (!q || `${a.name} ${a.description} ${a.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())))
      .map(({ a, deps }) => agentRow(data, a, deps, win))
      .filter((r) => !status || r.status === status)
      .sort((x, y) =>
        sort === 'nome' ? x.agent.name.localeCompare(y.agent.name) : sort === 'custo' ? y.cost - x.cost : sort === 'replicas' ? y.ready - x.ready : y.tokensIn + y.tokensOut - (x.tokensIn + x.tokensOut),
      )
  }, [data, scope.agents, scope.agentDeployments, q, status, modelo, win, sort])

  const totals = rows.reduce(
    (s, r) => ({
      deps: s.deps + r.deps.length,
      ready: s.ready + r.ready,
      desired: s.desired + r.desired,
      existing: s.existing + r.existing,
      tin: s.tin + r.tokensIn,
      tout: s.tout + r.tokensOut,
      req: s.req + r.requests,
      cost: s.cost + r.cost,
    }),
    { deps: 0, ready: 0, desired: 0, existing: 0, tin: 0, tout: 0, req: 0, cost: 0 },
  )
  const periodLabel = period === 'custom' ? (from && to ? `${from.split('-').reverse().join('/')} a ${to.split('-').reverse().join('/')}` : 'intervalo') : PERIODS.find((p) => p.value === period)?.label
  const toggle = (id: string) => setExpanded((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s.add(id))))

  return (
    <>
      <PageHeader
        title="Agentes"
        description={cluster ? `Agentes com implantação no cluster ${cluster.name}.` : 'Agentes da organização em todos os clusters.'}
        crumbs={[{ label: org.name, to: '/' }, ...(cluster ? [{ label: cluster.name, to: `/clusters/${cluster.id}` }] : []), { label: 'Agentes' }]}
        actions={
          <>
            <Link to="/playground" className="btn-secondary">
              <MessagesSquare className="size-4" /> Playground
            </Link>
            <Link to="/agentes/novo" className="btn-primary">
              <Plus className="size-4" /> Criar agente
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input w-auto" aria-label="Cluster" value={cluster?.id ?? ''} onChange={(e) => setCluster(e.target.value || null)}>
          <option value="">Todos os clusters</option>
          {scope.clusters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Segmented
          label="Período"
          value={period}
          onChange={(v) => setParam('periodo', v === '24h' ? '' : v)}
          options={[...PERIODS, { value: 'custom' as const, label: 'Personalizado' }]}
        />
        {period === 'custom' && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <input type="date" className="input w-auto py-1.5" aria-label="Data inicial" value={from} max={to || undefined} onChange={(e) => setParam('de', e.target.value)} />
            a
            <input type="date" className="input w-auto py-1.5" aria-label="Data final" value={to} min={from || undefined} onChange={(e) => setParam('ate', e.target.value)} />
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Agentes únicos" value={rows.length} hint="definições da organização" />
        <MetricCard label="Implantações de agentes" value={totals.deps} hint="agente × cluster" />
        <MetricCard label="Réplicas prontas" value={`${totals.ready} / ${totals.desired}`} hint={`desejadas · ${totals.existing} existentes`} />
        <MetricCard
          label={`Tokens (${periodLabel})`}
          value={<Tokens n={totals.tin + totals.tout} />}
          hint={
            <>
              <Tokens n={totals.tin} /> entrada · <Tokens n={totals.tout} /> saída
            </>
          }
        />
        <MetricCard label="Requisições" value={fmtCompact(totals.req)} hint={periodLabel} />
        <MetricCard label="Custo por tokens atribuído" value={fmtBRL(totals.cost)} hint="modelos compartilhados e APIs externas" />
      </div>

      <Panel className="mt-4" bodyClassName="">
        <div className="flex flex-col gap-2 border-b border-line p-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input className="input pl-9" placeholder="Buscar agente por nome, descrição ou tag" aria-label="Buscar agentes" value={q} onChange={(e) => setParam('q', e.target.value)} />
          </div>
          <select className="input lg:w-48" aria-label="Status" value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(CONSOLIDATED_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select className="input lg:w-56" aria-label="Modelo ou provedor" value={modelo} onChange={(e) => setParam('modelo', e.target.value)}>
            <option value="">Todos os modelos e provedores</option>
            {modelOptions.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select className="input lg:w-44" aria-label="Ordenar por" value={sort} onChange={(e) => setParam('ordem', e.target.value === 'tokens' ? '' : e.target.value)}>
            <option value="tokens">Mais tokens</option>
            <option value="custo">Maior custo</option>
            <option value="replicas">Mais réplicas</option>
            <option value="nome">Nome</option>
          </select>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            title={scope.agents.length ? 'Nenhum agente corresponde aos filtros' : 'Nenhum agente'}
            action={
              <Link to="/agentes/novo" className="btn-primary">
                Criar agente
              </Link>
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
                  <th className="th">Agente</th>
                  <th className="th">Clusters em execução</th>
                  <th className="th">Status</th>
                  <th className="th">Implantações / réplicas</th>
                  <th className="th text-right">Tokens no período</th>
                  <th className="th text-right">Taxa</th>
                  <th className="th text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const open = expanded.has(r.agent.id)
                  return (
                    <Fragment key={r.agent.id}>
                      <tr className="align-top hover:bg-surface-2/50">
                        <td className="td">
                          <button className="btn-ghost btn-sm -ml-2" aria-expanded={open} aria-label={`${open ? 'Recolher' : 'Expandir'} implantações de ${r.agent.name}`} onClick={() => toggle(r.agent.id)}>
                            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </button>
                        </td>
                        <td className="td max-w-64">
                          <Link to={`/agentes/${r.agent.id}`} className="font-medium hover:text-accent">
                            {r.agent.name}
                          </Link>
                          <span className="ml-1.5 font-mono text-[11px] text-subtle">v{r.agent.version}</span>
                          <p className="truncate text-xs text-subtle">{r.agent.description}</p>
                        </td>
                        <td className="td">
                          <ClusterLinks clusters={r.runningClusters} />
                          {r.runningClusters.length < r.deps.length && r.deps.length > 0 && (
                            <span className="mt-1 block text-[11px] text-subtle">
                              {r.deps.length - r.runningClusters.length} configurada{r.deps.length - r.runningClusters.length > 1 ? 's' : ''} sem execução
                            </span>
                          )}
                        </td>
                        <td className="td">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_TONE[r.status]}`}>{CONSOLIDATED_LABEL[r.status]}</span>
                        </td>
                        <td className="td text-xs whitespace-nowrap">
                          {r.deps.length} {r.deps.length === 1 ? 'implantação' : 'implantações'}
                          <span className="block text-muted">
                            {r.ready}/{r.desired} réplicas prontas
                          </span>
                        </td>
                        <td className="td text-right text-xs whitespace-nowrap">
                          <Tokens n={r.tokensIn + r.tokensOut} className="text-sm font-medium" />
                          <span className="block text-subtle">
                            <Tokens n={r.tokensIn} /> entrada · <Tokens n={r.tokensOut} /> saída
                          </span>
                          {r.hasTokenCost && <span className="block text-subtle">{fmtBRL(r.cost)}</span>}
                        </td>
                        <td className="td num text-right text-xs whitespace-nowrap" title={`${fmtInt(r.tokensPerSec)} tokens/s de saída, média dos últimos 5 minutos`}>
                          {fmtNum(r.tokensPerSec, 0)} tokens/s
                          <span className="block text-[11px] text-subtle">saída · últimos 5 min</span>
                        </td>
                        <td className="td">
                          <div className="flex justify-end gap-1">
                            <Link to={`/agentes/${r.agent.id}`} className="btn-ghost btn-sm">
                              Detalhes
                            </Link>
                            <button className="btn-ghost btn-sm" title="Implantar em outro cluster" aria-label={`Implantar ${r.agent.name} em outro cluster`} onClick={() => setDeployFor(r.agent.id)}>
                              <Server className="size-3.5" /> Implantar
                            </button>
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={8} className="bg-surface-2/40 p-0">
                            <ExpandedCell>
                              <div className="border-l-2 border-accent/40">
                                <AgentDeploymentsTable deployments={r.deps} win={win} />
                              </div>
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
        <p className="border-t border-line px-4 py-2.5 text-[11px] text-subtle">
          Consumo atribuído ao agente: tokens das requisições originadas por suas implantações. Serviços e playground têm consumo próprio. Taxa = média de tokens de saída nos
          últimos 5 minutos; totais seguem o período selecionado. Telemetria simulada.
        </p>
      </Panel>
      {deployFor && <DeployAgentDialog open={!!deployFor} onClose={() => setDeployFor(null)} agentId={deployFor} clusterId={cluster?.id} />}
    </>
  )
}
