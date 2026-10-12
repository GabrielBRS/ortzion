import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Bot, Boxes, Cpu, Loader2, Pause, Play, SlidersHorizontal, Trash2 } from 'lucide-react'
import type { Cluster, ClusterCapacity, LimitPolicy, Period } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { ApiError, clusterDependencies, deleteCluster, setClusterPaused, updateCluster, updateClusterCapacity } from '../services/api'
import { useToast } from '../components/Toast'
import {
  Badge,
  ConfirmDialog,
  Field,
  IssueList,
  MeterLegend,
  MetricCard,
  Modal,
  Notice,
  OptionCard,
  PageHeader,
  Panel,
  Segmented,
  StatusBadge,
  Tabs,
} from '../components/ui'
import { CapacityEditor, CapacitySummary } from '../components/CapacityEditor'
import { DeployModelDialog, DeploymentsTable, ServicesTable, reservationText } from '../components/workloads'
import { MetricsCharts, MetricsSummary } from '../components/MetricsCharts'
import { ResourceMeters } from '../components/ClusterResources'
import { LiveTelemetry } from '../components/LiveTelemetry'
import { AgentDeploymentsTable } from '../components/agents'
import { CHART_COLORS, DonutChart, TimeChart } from '../components/charts'
import { checkCapacityAgainstReservations, checkPoolFit, reservationItems } from '../lib/capacity'
import { clusterCost } from '../lib/costs'
import { PERIODS, buildSeries, periodWindow, readyReplicas, summarize } from '../lib/metrics'
import { periodCostSeries } from '../lib/periodCost'
import { fmtBRL, fmtBRL0, fmtCompact, fmtDate, fmtGiB, fmtInt, fmtPct, fmtRelative } from '../lib/format'
import { LIMIT_POLICIES, modalityLabel, policyLabel, profileLabel } from '../lib/labels'
import NotFoundPage from './NotFoundPage'

type Tab = 'visao-geral' | 'recursos' | 'agentes' | 'servicos' | 'modelos' | 'metricas' | 'custos' | 'configuracoes'
const TABS: { value: Tab; label: string }[] = [
  { value: 'visao-geral', label: 'Visão geral' },
  { value: 'recursos', label: 'Recursos' },
  { value: 'agentes', label: 'Agentes' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'modelos', label: 'Modelos' },
  { value: 'metricas', label: 'Métricas' },
  { value: 'custos', label: 'Custos' },
  { value: 'configuracoes', label: 'Configurações' },
]

export default function ClusterDetailPage() {
  const { clusterId, tab = 'visao-geral' } = useParams()
  const { data, org, setCluster } = useOrg()
  const navigate = useNavigate()
  const cluster = data.clusters.find((c) => c.id === clusterId && c.orgId === org.id)

  // Preserva o contexto do cluster ao navegar para agentes/serviços/modelos.
  useEffect(() => {
    if (cluster) setCluster(cluster.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster?.id])

  if (!cluster) return <NotFoundPage message="Cluster não encontrado nesta organização" />
  const current = (TABS.some((t) => t.value === tab) ? tab : 'visao-geral') as Tab

  return (
    <>
      <ClusterHeader cluster={cluster} />
      <Tabs tabs={TABS} value={current} onChange={(t) => navigate(`/clusters/${cluster.id}${t === 'visao-geral' ? '' : `/${t}`}`)} />
      {current === 'visao-geral' && <OverviewTab cluster={cluster} />}
      {current === 'recursos' && <ResourcesTab cluster={cluster} />}
      {current === 'agentes' && (
        <Panel
          title="Implantações de agentes neste cluster"
          description="Agentes da organização executando aqui. O mesmo agente pode ter implantações em outros clusters."
          bodyClassName=""
          actions={
            <Link to="/agentes/novo" className="btn-primary btn-sm">
              <Bot className="size-3.5" /> Criar agente
            </Link>
          }
        >
          <AgentDeploymentsTable deployments={data.agentDeployments.filter((a) => a.clusterId === cluster.id)} win={periodWindow('24h')} showAgent showCluster={false} />
        </Panel>
      )}
      {current === 'servicos' && (
        <Panel
          title="Serviços do cluster"
          bodyClassName=""
          actions={
            <Link to="/servicos/novo" className="btn-primary btn-sm">
              <Boxes className="size-3.5" /> Implantar serviço
            </Link>
          }
        >
          <ServicesTable services={data.services.filter((s) => s.clusterId === cluster.id)} />
        </Panel>
      )}
      {current === 'modelos' && <ModelsTab cluster={cluster} />}
      {current === 'metricas' && <MetricsTab cluster={cluster} />}
      {current === 'custos' && <CostsTab cluster={cluster} />}
      {current === 'configuracoes' && <SettingsTab cluster={cluster} />}
    </>
  )
}

function ClusterHeader({ cluster }: { cluster: Cluster }) {
  const { org } = useOrg()
  const toast = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const toggle = async () => {
    setBusy(true)
    try {
      await setClusterPaused(cluster.id, cluster.status !== 'pausado')
      toast.success(cluster.status === 'pausado' ? 'Cluster retomado.' : 'Cluster pausado. Cargas deixam de receber tráfego.')
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeader
        crumbs={[{ label: org.name, to: '/' }, { label: 'Clusters', to: '/clusters' }, { label: cluster.name }]}
        title={cluster.name}
        badge={<StatusBadge status={cluster.status} />}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{modalityLabel(cluster.modality)}</span>·<span>{profileLabel(cluster.profile)}</span>·
            <span>
              {cluster.capacity.nodes} {cluster.capacity.nodes > 1 ? 'nós' : 'nó'}
            </span>
            {cluster.purpose && <span className="w-full text-subtle">{cluster.purpose}</span>}
          </span>
        }
        actions={
          <>
            <button className="btn-secondary" onClick={() => setEditOpen(true)} disabled={cluster.status === 'provisionando'}>
              <SlidersHorizontal className="size-4" /> Editar capacidade
            </button>
            <button className="btn-secondary" onClick={toggle} disabled={busy || cluster.status === 'provisionando'}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : cluster.status === 'pausado' ? <Play className="size-4" /> : <Pause className="size-4" />}
              {cluster.status === 'pausado' ? 'Retomar' : 'Pausar'}
            </button>
          </>
        }
      />
      {cluster.status === 'provisionando' && (
        <div className="mb-4">
          <Notice>O cluster está sendo provisionado. Os recursos ficam disponíveis em alguns segundos.</Notice>
        </div>
      )}
      {cluster.status === 'pausado' && (
        <div className="mb-4">
          <Notice tone="warn">Cluster pausado: cargas não recebem tráfego e a computação não é cobrada. Armazenamento continua sendo cobrado.</Notice>
        </div>
      )}
      <EditCapacityDialog cluster={cluster} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  )
}

function EditCapacityDialog({ cluster, open, onClose }: { cluster: Cluster; open: boolean; onClose: () => void }) {
  const { data } = useOrg()
  const toast = useToast()
  const pool = data.pools.find((p) => p.id === cluster.poolId)!
  const [cap, setCap] = useState<ClusterCapacity>(cluster.capacity)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) setCap(cluster.capacity)
  }, [open, cluster.capacity])
  const issues = useMemo(() => [...checkCapacityAgainstReservations(data, cluster, cap), ...checkPoolFit(data, pool, cap, cluster.id)], [data, cluster, cap, pool])
  const changed = JSON.stringify(cap) !== JSON.stringify(cluster.capacity)
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Editar capacidade"
      description={`${cluster.name} · ${profileLabel(cluster.profile)} · ${modalityLabel(cluster.modality)}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={!changed || issues.length > 0 || busy}
            onClick={async () => {
              setBusy(true)
              try {
                await updateClusterCapacity(cluster.id, cap)
                toast.success('Capacidade atualizada. As estimativas foram recalculadas.')
                onClose()
              } catch (e) {
                toast.error(e)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Aplicar alterações
          </button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_240px]">
        <CapacityEditor pool={pool} modality={cluster.modality} value={cap} onChange={setCap} />
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted">Resumo das alterações</p>
          <CapacitySummary profile={cluster.profile} modality={cluster.modality} capacity={cap} compare={cluster.capacity} />
        </div>
      </div>
      <div className="mt-4">
        <IssueList title="Não é possível aplicar" issues={issues} />
      </div>
    </Modal>
  )
}

function OverviewTab({ cluster }: { cluster: Cluster }) {
  const { data } = useOrg()
  const series = useMemo(() => buildSeries(data, { clusterIds: [cluster.id] }, '24h'), [data, cluster.id])
  const s = summarize(series)
  const cc = clusterCost(data, cluster)
  const agentDeps = data.agentDeployments.filter((a) => a.clusterId === cluster.id)
  const ready = agentDeps.reduce((s, d) => s + readyReplicas(d), 0)
  const desired = agentDeps.reduce((s, d) => s + d.desiredReplicas, 0)
  const services = data.services.filter((x) => x.clusterId === cluster.id)
  const deps = data.deployments.filter((x) => x.clusterId === cluster.id)
  const events = data.events.filter((e) => e.clusterId === cluster.id).slice(0, 6)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Requisições (24 h)" value={fmtCompact(s.requests)} hint={`p50 ${fmtInt(s.p50)} ms · erro ${fmtPct(s.errorRate, 2)}`} />
        <MetricCard label="Agentes" value={`${new Set(agentDeps.map((d) => d.agentId)).size} agentes`} hint={`${ready}/${desired} réplicas prontas`} />
        <MetricCard label="Serviços e implantações" value={`${services.length} · ${deps.length}`} hint="serviços · modelos" />
        <MetricCard
          label="Projeção do mês"
          value={fmtBRL0(cc.projected)}
          hint={`Orçamento ${fmtBRL0(cluster.monthlyBudget)}`}
          tone={cc.projected > cluster.monthlyBudget ? 'warn' : undefined}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Requisições (24 h)" className="xl:col-span-2">
          <TimeChart data={series} series={[{ key: 'requests', label: 'Requisições', color: CHART_COLORS.accent }]} unit="req" format={fmtInt} />
        </Panel>
        <Panel title="Recursos" actions={<Link to={`/clusters/${cluster.id}/recursos`} className="btn-ghost btn-sm">Detalhes</Link>}>
          <ResourceMeters cluster={cluster} compact />
        </Panel>
      </div>
      <Panel title="Telemetria do cluster">
        <LiveTelemetry scope={{ clusterIds: [cluster.id] }} showGpu={cluster.capacity.gpusPerNode > 0} />
      </Panel>
      <Panel title="Atividades do cluster" bodyClassName="divide-y divide-line">
        {events.length === 0 && <p className="p-4 text-sm text-muted">Sem atividades registradas.</p>}
        {events.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2.5">
              <StatusBadge status={e.level} />
              <span className="truncate">{e.message}</span>
            </span>
            <span className="shrink-0 text-xs text-subtle">{fmtRelative(e.ts)}</span>
          </div>
        ))}
      </Panel>
    </div>
  )
}

function ResourcesTab({ cluster }: { cluster: Cluster }) {
  const { data } = useOrg()
  const pool = data.pools.find((p) => p.id === cluster.poolId)
  const items = reservationItems(data, cluster.id)
  const cap = cluster.capacity
  const unified = cluster.profile === 'unified'
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Panel title="Capacidade contratada, reservada e utilizada" actions={<MeterLegend />}>
        <ResourceMeters cluster={cluster} />
      </Panel>
      <div className="space-y-4">
        <Panel title="Por nó">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted">Nós</dt>
            <dd className="num text-right">{cap.nodes}</dd>
            <dt className="text-muted">vCPU por nó</dt>
            <dd className="num text-right">{cap.vcpuPerNode}</dd>
            {unified ? (
              <>
                <dt className="text-muted">Memória unificada por nó</dt>
                <dd className="num text-right">{fmtGiB(cap.memoryPerNodeGiB)}</dd>
                <dt className="text-muted">· destinada à GPU</dt>
                <dd className="num text-right">{fmtGiB(cap.gpuSharePerNodeGiB)}</dd>
                <dt className="text-muted">Unidades de GPU por nó</dt>
                <dd className="num text-right">{cap.gpusPerNode}</dd>
              </>
            ) : (
              <>
                <dt className="text-muted">RAM por nó</dt>
                <dd className="num text-right">{fmtGiB(cap.memoryPerNodeGiB)}</dd>
                <dt className="text-muted">GPUs por nó</dt>
                <dd className="num text-right">
                  {cap.gpusPerNode} × {cap.vramPerGpuGiB} GiB VRAM
                </dd>
              </>
            )}
            <dt className="text-muted">Pool</dt>
            <dd className="text-right">{pool?.name}</dd>
          </dl>
          <div className="mt-4">
            <Notice>
              A memória de nós diferentes não forma uma GPU única. Cada implantação precisa caber em um nó: até{' '}
              {unified ? `${fmtGiB(cap.gpuSharePerNodeGiB)} de memória destinada à GPU` : `${cap.gpusPerNode} GPU (${fmtGiB(cap.gpusPerNode * cap.vramPerGpuGiB)} de VRAM)`}.
            </Notice>
          </div>
        </Panel>
        <Panel title="Reservas ativas" description="Pausados e com falha liberam a reserva" bodyClassName="divide-y divide-line">
          {items.length === 0 && <p className="p-4 text-sm text-muted">Nenhuma reserva.</p>}
          {items.map((i) => (
            <div key={i.id} className="px-4 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{i.name}</span>
                <Badge tone={i.kind === 'implantação' ? 'violet' : i.kind === 'serviço' ? 'info' : 'accent'}>{i.kind}</Badge>
              </div>
              <p className="text-xs text-subtle">{reservationText(i.reservation, unified)}</p>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  )
}

function ModelsTab({ cluster }: { cluster: Cluster }) {
  const { data } = useOrg()
  const [open, setOpen] = useState(false)
  return (
    <Panel
      title="Implantações de modelo"
      description="A memória dos pesos pertence à implantação; agentes vinculados não a multiplicam."
      bodyClassName=""
      actions={
        <button className="btn-primary btn-sm" onClick={() => setOpen(true)}>
          <Cpu className="size-3.5" /> Implantar modelo
        </button>
      }
    >
      <DeploymentsTable deployments={data.deployments.filter((d) => d.clusterId === cluster.id)} />
      <DeployModelDialog open={open} onClose={() => setOpen(false)} clusterId={cluster.id} />
    </Panel>
  )
}

function MetricsTab({ cluster }: { cluster: Cluster }) {
  const { data } = useOrg()
  const [period, setPeriod] = useState<Period>('24h')
  const [workload, setWorkload] = useState('')
  const series = useMemo(() => buildSeries(data, { clusterIds: [cluster.id], workloadId: workload || null }, period), [data, cluster.id, workload, period])
  const agents = data.agentDeployments
    .filter((a) => a.clusterId === cluster.id)
    .map((d) => ({ id: d.id, name: data.agents.find((x) => x.id === d.agentId)?.name ?? d.id }))
  const services = data.services.filter((s) => s.clusterId === cluster.id)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" aria-label="Agente ou serviço" value={workload} onChange={(e) => setWorkload(e.target.value)}>
          <option value="">Todas as cargas</option>
          <optgroup label="Agentes">
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Serviços">
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        </select>
        <div className="ml-auto">
          <Segmented label="Período" value={period} onChange={setPeriod} options={PERIODS} />
        </div>
      </div>
      <MetricsSummary series={series} />
      <MetricsCharts series={series} showGpu={cluster.capacity.gpusPerNode > 0} />
      {workload && <p className="text-xs text-subtle">Recursos de CPU, memória e GPU são do cluster inteiro; tráfego e tokens referem-se à carga selecionada.</p>}
    </div>
  )
}

function CostsTab({ cluster }: { cluster: Cluster }) {
  const { data } = useOrg()
  const [period, setPeriod] = useState<Period>('30d')
  const cc = clusterCost(data, cluster)
  const series = useMemo(() => buildSeries(data, { clusterIds: [cluster.id] }, period), [data, cluster.id, period])
  const costSeries = useMemo(() => periodCostSeries(data, [cluster.id], series, period), [data, cluster.id, series, period])
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Acumulado no mês" value={fmtBRL0(cc.toDate)} />
        <MetricCard label="Projeção do mês" value={fmtBRL0(cc.projected)} tone={cc.projected > cluster.monthlyBudget ? 'warn' : undefined} />
        <MetricCard label="Orçamento do cluster" value={fmtBRL0(cluster.monthlyBudget)} hint={policyLabel(cluster.limitPolicy)} />
        <MetricCard label="Saldo estimado" value={fmtBRL0(cluster.monthlyBudget - cc.projected)} tone={cluster.monthlyBudget - cc.projected < 0 ? 'err' : undefined} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Panel title="Custo por intervalo" actions={<Segmented label="Período" value={period} onChange={setPeriod} options={PERIODS} />}>
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
        <Panel title="Capacidade reservada por recurso" description="Mensal, conforme capacidade contratada">
          <DonutChart
            data={[
              { name: 'vCPU', value: cc.capacity.vcpu },
              { name: 'Memória', value: cc.capacity.memory },
              { name: 'GPU', value: cc.capacity.gpu },
              { name: 'Armazenamento', value: cc.capacity.storage },
            ].filter((x) => x.value > 0)}
            format={fmtBRL0}
          />
          <p className="text-center text-xs text-subtle">Total {fmtBRL0(cc.capacity.total)}/mês</p>
        </Panel>
      </div>
      <p className="text-xs text-subtle">Valores ilustrativos para demonstração; não representam uma oferta comercial.</p>
    </div>
  )
}

function SettingsTab({ cluster }: { cluster: Cluster }) {
  const { data } = useOrg()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState(cluster.name)
  const [purpose, setPurpose] = useState(cluster.purpose)
  const [budget, setBudget] = useState(cluster.monthlyBudget)
  const [policy, setPolicy] = useState<LimitPolicy>(cluster.limitPolicy)
  const [busy, setBusy] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [cascade, setCascade] = useState(false)
  const [delIssues, setDelIssues] = useState<string[]>([])
  const deps = clusterDependencies(data, cluster.id)
  const depCount = deps.agents.length + deps.services.length + deps.deployments.length
  const cc = clusterCost(data, cluster)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Geral">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!name.trim()) return toast.push('erro', 'Informe o nome do cluster.')
            setBusy(true)
            try {
              await updateCluster(cluster.id, { name: name.trim(), purpose, monthlyBudget: budget, limitPolicy: policy })
              toast.success('Configurações do cluster salvas.')
            } catch (err) {
              toast.error(err)
            } finally {
              setBusy(false)
            }
          }}
        >
          <Field label="Nome" htmlFor="cs-name">
            <input id="cs-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Finalidade" htmlFor="cs-purpose">
            <textarea id="cs-purpose" className="input min-h-16" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </Field>
          <Field label="Orçamento mensal (R$)" htmlFor="cs-budget" hint={`Projeção atual: ${fmtBRL0(cc.projected)} (${fmtPct(cc.projected / Math.max(1, budget))} do orçamento).`}>
            <input id="cs-budget" type="number" min={0} step={1000} className="input num" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
          </Field>
          <fieldset>
            <legend className="label">Política ao atingir o limite</legend>
            <div className="grid gap-2">
              {LIMIT_POLICIES.map((p) => (
                <OptionCard key={p.value} name="cs-policy" selected={policy === p.value} onSelect={() => setPolicy(p.value)} title={p.label} description={p.description} />
              ))}
            </div>
          </fieldset>
          <button className="btn-primary" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Salvar
          </button>
        </form>
      </Panel>
      <div className="space-y-4">
        <Panel title="Informações">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted">Identificador</dt>
            <dd className="text-right font-mono text-xs">{cluster.id}</dd>
            <dt className="text-muted">Criado em</dt>
            <dd className="text-right">{fmtDate(cluster.createdAt)}</dd>
            <dt className="text-muted">Modalidade</dt>
            <dd className="text-right">{modalityLabel(cluster.modality)}</dd>
            <dt className="text-muted">Perfil</dt>
            <dd className="text-right">{profileLabel(cluster.profile)}</dd>
          </dl>
        </Panel>
        <Panel title="Zona de risco">
          <p className="mb-3 text-sm text-muted">
            Excluir o cluster libera toda a capacidade contratada.{' '}
            {depCount > 0 ? `Existem ${depCount} cargas de trabalho neste cluster.` : 'Não há cargas de trabalho neste cluster.'}
          </p>
          <button
            className="btn-danger"
            onClick={() => {
              setCascade(false)
              setDelIssues([])
              setDelOpen(true)
            }}
          >
            <Trash2 className="size-4" /> Excluir cluster
          </button>
        </Panel>
      </div>
      <ConfirmDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title={`Excluir ${cluster.name}`}
        danger
        confirmLabel={depCount > 0 ? 'Excluir cluster e cargas' : 'Excluir cluster'}
        confirmDisabled={depCount > 0 && !cascade}
        busy={busy}
        onConfirm={async () => {
          setBusy(true)
          try {
            await deleteCluster(cluster.id, cascade)
            toast.success('Cluster excluído.')
            navigate('/clusters')
          } catch (e) {
            if (e instanceof ApiError) setDelIssues(e.details)
            toast.error(e)
            setBusy(false)
          }
        }}
      >
        {depCount > 0 ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted">A exclusão está bloqueada enquanto houver cargas. Remova-as individualmente ou confirme a remoção em cascata:</p>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line bg-surface-2 p-3 text-xs">
              {deps.agents.map((a) => (
                <li key={a.id}>Agente · {a.name}</li>
              ))}
              {deps.services.map((s) => (
                <li key={s.id}>Serviço · {s.name}</li>
              ))}
              {deps.deployments.map((d) => (
                <li key={d.id}>Implantação · {d.name}</li>
              ))}
            </ul>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5" checked={cascade} onChange={(e) => setCascade(e.target.checked)} />
              <span>Entendo que {depCount} cargas de trabalho serão removidas permanentemente junto com o cluster.</span>
            </label>
            <IssueList title="Dependências" issues={delIssues} />
          </div>
        ) : (
          <p className="text-sm text-muted">Esta ação não pode ser desfeita na demonstração (exceto com “Restaurar demonstração”).</p>
        )}
      </ConfirmDialog>
    </div>
  )
}
