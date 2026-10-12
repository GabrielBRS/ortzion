// Aba Agentes das organizações de setor: árvore agente → cluster → serviço → aplicação → pods.
// Cada nível tem as próprias ações (o agente também clona clusters). O serviço só cria aplicação; pausar e
// desativar aplicação ficam na própria aplicação. Pods ficam dentro da aplicação. O vínculo agente–cluster
// é automático: pausado, o vínculo fica suspenso; desativado, o cluster sai da árvore.
import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Boxes, ChevronDown, ChevronRight, Copy, Layers, Package, Pause, Play, Plus, Power, Repeat, Server } from 'lucide-react'
import type { Application, Cluster, Service } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { ConfirmDialog, MetricCard, PageHeader, Panel, StatusBadge } from './ui'
import { SECTOR_ICON } from './SectorIcons'
import { reservationText } from './workloads'
import { ActionButton, CloneClusterDialog, CreateApplicationDialog, CreateClusterDialog, CreateServiceDialog, useRun } from './AgentDialogs'
import { clusterTotals, scaleRes } from '../lib/capacity'
import { buildSeries, summarize } from '../lib/metrics'
import { fmtCompact, fmtGiB, fmtNum } from '../lib/format'
import { cloneApplication, deleteApplication, deleteCluster, deleteService, replicateService, setClusterPaused, setServicePaused } from '../services/api'
import { sectorAgents, type SectorAgent } from '../lib/sectorAgents'
import { agentIntelligence, applicationIntelligence, serviceIntelligence } from '../lib/intelligence'
import { IntelligenceGauge } from './IntelligenceGauge'
import { RUNTIME_LABEL } from '../mock/samples'

type Icon = ComponentType<{ className?: string }>
type Level = 'Agente' | 'Cluster' | 'Serviço' | 'Aplicação' | 'Pods'

/** Cor de cada nível: o bullet e o rótulo mudam de cor para separar os níveis. */
const LEVEL_TONE: Record<Level, string> = {
  Agente: 'text-accent',
  Cluster: 'text-info',
  Serviço: 'text-ok',
  Aplicação: 'text-violet',
  Pods: 'text-subtle',
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const sumReserved = (services: Service[]) =>
  services.reduce(
    (acc, s) => ({ vcpu: acc.vcpu + s.reservation.vcpu * s.replicas, memoryGiB: acc.memoryGiB + s.reservation.memoryGiB * s.replicas }),
    { vcpu: 0, memoryGiB: 0 },
  )

/** Linha de um nível: a seta expande; bullet e rótulo do nível; ações à direita, numa linha só. */
function NodeRow({
  level,
  icon: NodeIcon,
  title,
  titleTo,
  meta,
  aside,
  actions,
  children,
}: {
  level: Level
  icon?: Icon
  title: string
  titleTo?: string
  meta?: ReactNode
  /** Medidor ou outro indicador exibido antes das ações. */
  aside?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const tone = LEVEL_TONE[level]
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        <button type="button" aria-expanded={open} aria-label={`${open ? 'Recolher' : 'Expandir'} ${title}`} onClick={() => setOpen((v) => !v)} className="shrink-0 text-subtle hover:text-fg">
          {open ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
        </button>
        <div className="min-w-64 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line-strong px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${tone}`}>
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              {level}
            </span>
            {NodeIcon && (
              // Caixa 16×16: ícones customizados trazem altura fixa própria, então o SVG é forçado a esse tamanho.
              <span className={`inline-flex size-4 shrink-0 items-center justify-center [&>*]:size-4! ${tone}`} aria-hidden>
                <NodeIcon />
              </span>
            )}
            {titleTo ? (
              <Link to={titleTo} className="min-w-0 truncate text-sm font-medium hover:text-accent">
                {title}
              </Link>
            ) : (
              <p className="min-w-0 truncate text-sm font-medium">{title}</p>
            )}
          </div>
          {meta && <div className="mt-0.5 truncate text-xs text-muted">{meta}</div>}
        </div>
        {(aside || actions) && (
          <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center gap-2">
            {aside}
            {actions}
          </div>
        )}
      </div>
      {open && children && <div className="space-y-3 border-t border-line p-3">{children}</div>}
    </div>
  )
}

/** Criar filho (serviço no cluster, aplicação no serviço): botão de destaque no topo da lista de filhos. */
function CreateChildButton({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn btn-sm whitespace-nowrap border border-accent/40 bg-accent-soft text-accent hover:border-accent hover:bg-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  )
}

/** Ações de uma aplicação: pausar (todas as instâncias) e desativar (instâncias e definição). */
function useAppControls(app?: Application) {
  const { data } = useOrg()
  const { busy, run } = useRun()
  const instances = app ? data.services.filter((s) => s.applicationId === app.id) : []
  const allPaused = instances.length > 0 && instances.every((s) => s.status === 'pausado')
  const toggle = () => {
    const target = !allPaused
    run(
      () => Promise.all(instances.filter((s) => (s.status === 'pausado') !== target).map((s) => setServicePaused(s.id, target))),
      target ? 'Aplicação pausada.' : 'Aplicação retomada.',
      () => undefined,
    )
  }
  const deactivate = (done: () => void) => {
    if (!app) return
    run(
      async () => {
        for (const s of instances) await deleteService(s.id)
        await deleteApplication(app.id)
      },
      'Aplicação desativada.',
      done,
    )
  }
  return { instances, allPaused, busy, toggle, deactivate }
}

export function SectorAgentsView() {
  const { data, org } = useOrg()
  const agents = useMemo(() => sectorAgents(data, org.id), [data, org.id])
  const clusterIds = [...new Set(agents.flatMap((a) => a.clusterIds))]
  const services = agents.flatMap((a) => a.services)
  const readyPods = services.reduce((acc, s) => acc + (s.status === 'ativo' ? s.replicas : 0), 0)
  const sum = summarize(buildSeries(data, { clusterIds }, '24h'))

  return (
    <>
      <PageHeader
        title="Agentes"
        description="Cada setor é um agente fixo. Expanda o agente para ver os clusters onde ele roda, os serviços de cada cluster e as aplicações (habilidades) de cada serviço."
        crumbs={[{ label: org.name, to: '/' }, { label: 'Agentes' }]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Agentes" value={agents.length} hint="um por setor" icon={<Boxes className="size-4" />} />
        <MetricCard label="Clusters" value={clusterIds.length} hint="onde os agentes rodam" icon={<Server className="size-4" />} />
        <MetricCard label="Instâncias" value={services.length} hint="serviços dos agentes" icon={<Boxes className="size-4" />} />
        <MetricCard label="Pods prontos" value={readyPods} hint="réplicas de serviços ativos" icon={<Package className="size-4" />} />
        <MetricCard label="Tokens 24 h" value={fmtCompact(sum.tokensOut)} hint="tokens de saída nos clusters" />
      </div>

      <Panel className="mt-4" title="Agentes por setor" description="Clique na seta para expandir. Os nomes levam ao detalhe de cada item." bodyClassName="p-2">
        {agents.length === 0 ? (
          <p className="p-4 text-sm text-muted">Nenhum setor nesta organização.</p>
        ) : (
          <ul className="space-y-2">
            {agents.map((a) => (
              <li key={a.key}>
                <AgentRow agent={a} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}

/** Agente: pausar o agente e criar cluster. */
function AgentRow({ agent }: { agent: SectorAgent }) {
  const { data, org } = useOrg()
  const { busy, run } = useRun()
  const [dialog, setDialog] = useState<'cluster-novo' | 'clonar' | null>(null)
  const linked = data.clusters.filter((c) => c.orgId === org.id && agent.clusterIds.includes(c.id))
  const services = agent.services
  const allPaused = services.length > 0 && services.every((s) => s.status === 'pausado')
  const reserved = sumReserved(services)
  const toggleAgent = () => {
    const target = !allPaused
    run(
      () => Promise.all(services.filter((s) => (s.status === 'pausado') !== target).map((s) => setServicePaused(s.id, target))),
      target ? 'Agente pausado.' : 'Agente retomado.',
      () => undefined,
    )
  }
  return (
    <>
      <NodeRow
        level="Agente"
        icon={SECTOR_ICON[agent.key]}
        aside={<IntelligenceGauge score={agentIntelligence(data, agent.apps)} size="sm" explain />}
        title={agent.name}
        meta={`${agent.description} · ${plural(linked.length, 'cluster', 'clusters')} · ${plural(services.length, 'serviço', 'serviços')} · ${plural(agent.apps.length, 'aplicação', 'aplicações')} · ${fmtNum(reserved.vcpu, 0)} vCPU · ${fmtGiB(reserved.memoryGiB)} reservados`}
        actions={
          <>
            <ActionButton
              icon={allPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              label={allPaused ? 'Retomar agente' : 'Pausar agente'}
              onClick={toggleAgent}
              disabled={busy || !services.length}
            />
            <ActionButton icon={<Plus className="size-3.5" />} label="Criar cluster" onClick={() => setDialog('cluster-novo')} />
            <ActionButton icon={<Copy className="size-3.5" />} label="Clonar cluster" onClick={() => setDialog('clonar')} disabled={!linked.length} />
          </>
        }
      >
        {linked.length === 0 ? (
          <p className="text-sm text-muted">Sem clusters ainda. Use “Criar cluster” para o agente ganhar o primeiro.</p>
        ) : (
          linked.map((c) => <ClusterRow key={c.id} cluster={c} agent={agent} />)
        )}
      </NodeRow>
      {dialog === 'cluster-novo' && <CreateClusterDialog apps={agent.apps} sectorName={agent.name} onClose={() => setDialog(null)} />}
      {dialog === 'clonar' && <CloneClusterDialog clusters={linked} onClose={() => setDialog(null)} />}
    </>
  )
}

/** Cluster: clonar, pausar e desativar o cluster; criar serviço nele. Pausado, o vínculo com o agente fica suspenso. */
function ClusterRow({ cluster, agent }: { cluster: Cluster; agent: SectorAgent }) {
  const { data } = useOrg()
  const { busy, run } = useRun()
  const [dialog, setDialog] = useState<'servico' | 'clonar' | 'desativar' | null>(null)
  const services = agent.services.filter((s) => s.clusterId === cluster.id)
  const reserved = sumReserved(services)
  const totals = clusterTotals(cluster.profile, cluster.capacity)
  const tokens = summarize(buildSeries(data, { clusterIds: [cluster.id] }, '24h')).tokensOut
  const paused = cluster.status === 'pausado'
  return (
    <>
      <NodeRow
        level="Cluster"
        icon={Server}
        title={cluster.name}
        titleTo={`/clusters/${cluster.id}`}
        meta={`${paused ? 'Pausado: vínculo com o agente suspenso · ' : ''}${plural(services.length, 'serviço', 'serviços')} · ${fmtCompact(tokens)} tokens de saída em 24 h · ${fmtNum(reserved.vcpu, 1)} de ${totals.vcpu} vCPU e ${fmtGiB(reserved.memoryGiB)} de ${fmtGiB(totals.cpuMemoryGiB)} de memória reservados pelo agente`}
        actions={
          <>
            <ActionButton icon={<Copy className="size-3.5" />} label="Clonar cluster" onClick={() => setDialog('clonar')} />
            <ActionButton
              icon={paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              label={paused ? 'Retomar cluster' : 'Pausar cluster'}
              onClick={() => run(() => setClusterPaused(cluster.id, !paused), paused ? 'Cluster retomado.' : 'Cluster pausado.', () => undefined)}
              disabled={busy}
            />
            <ActionButton icon={<Power className="size-3.5" />} label="Desativar cluster" onClick={() => setDialog('desativar')} />
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <CreateChildButton icon={<Boxes className="size-3.5" />} label="Criar serviço neste cluster" onClick={() => setDialog('servico')} disabled={!agent.apps.length} />
        </div>
        {services.length === 0 ? (
          <p className="text-sm text-muted">Sem serviços deste agente neste cluster.</p>
        ) : (
          services.map((s) => <ServiceRow key={s.id} service={s} cluster={cluster} />)
        )}
      </NodeRow>
      {dialog === 'servico' && (
        <CreateServiceDialog title={`Criar serviço em ${cluster.name}`} apps={agent.apps} clusters={[cluster]} lockedCluster={cluster} onClose={() => setDialog(null)} />
      )}
      {dialog === 'clonar' && <CloneClusterDialog clusters={[cluster]} onClose={() => setDialog(null)} />}
      {dialog === 'desativar' && (
        <ConfirmDialog
          open
          onClose={() => setDialog(null)}
          title="Desativar cluster"
          description={
            <>
              O cluster <span className="font-medium text-fg">{cluster.name}</span> será removido, com {services.length} {services.length === 1 ? 'serviço' : 'serviços'} e suas reservas. O vínculo com o agente acaba junto. Esta ação não pode ser desfeita.
            </>
          }
          danger
          confirmLabel="Desativar"
          busy={busy}
          onConfirm={() => run(() => deleteCluster(cluster.id, true), 'Cluster desativado.', () => setDialog(null))}
        />
      )}
    </>
  )
}

/** Serviço: clonar, criar, pausar e desativar o serviço; criar aplicação nele. */
function ServiceRow({ service, cluster }: { service: Service; cluster: Cluster }) {
  const { data, org } = useOrg()
  const { busy, run } = useRun()
  const [dialog, setDialog] = useState<'aplicacao' | 'desativar' | null>(null)
  const app = data.applications.find((a) => a.id === service.applicationId)
  const unified = cluster.profile === 'unified'
  const paused = service.status === 'pausado'
  return (
    <>
      <NodeRow
        level="Serviço"
        aside={<IntelligenceGauge score={serviceIntelligence(data, service)?.score ?? null} size="sm" />}
        icon={Boxes}
        title={service.name}
        titleTo={`/servicos/${service.id}`}
        meta={
          <>
            {app ? app.name : 'Aplicação removida'} · {service.replicas} {service.replicas === 1 ? 'réplica' : 'réplicas'} · {reservationText(scaleRes(service.reservation, service.replicas), unified)} · <StatusBadge status={service.status} />
          </>
        }
        actions={
          <>
            <ActionButton icon={<Repeat className="size-3.5" />} label="Clonar serviço" disabled={busy} onClick={() => run(() => replicateService(service.id), 'Serviço clonado no mesmo cluster.', () => undefined)} />
            <ActionButton
              icon={paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              label={paused ? 'Retomar serviço' : 'Pausar serviço'}
              disabled={busy}
              onClick={() => run(() => setServicePaused(service.id, !paused), paused ? 'Serviço retomado.' : 'Serviço pausado.', () => undefined)}
            />
            <ActionButton icon={<Power className="size-3.5" />} label="Desativar serviço" onClick={() => setDialog('desativar')} />
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <CreateChildButton icon={<Package className="size-3.5" />} label="Criar aplicação neste serviço" onClick={() => setDialog('aplicacao')} disabled={!app?.sector} />
        </div>
        {app && <AppRow app={app} service={service} />}
      </NodeRow>
      {dialog === 'aplicacao' && app?.sector && <CreateApplicationDialog orgId={org.id} sector={app.sector} onClose={() => setDialog(null)} />}
      {dialog === 'desativar' && (
        <ConfirmDialog
          open
          onClose={() => setDialog(null)}
          title="Desativar serviço"
          description={
            <>
              O serviço <span className="font-mono text-fg">{service.name}</span> será removido deste cluster e a reserva liberada. A aplicação continua cadastrada.
            </>
          }
          danger
          confirmLabel="Desativar"
          busy={busy}
          onConfirm={() => run(() => deleteService(service.id), 'Serviço desativado.', () => setDialog(null))}
        />
      )}
    </>
  )
}

/** Aplicação (habilidade): clonar, criar, pausar e desativar a aplicação; vincular a serviço. Pods ficam dentro dela. */
function AppRow({ app, service }: { app: Application; service: Service }) {
  const { data, org } = useOrg()
  const { busy, run } = useRun()
  const [dialog, setDialog] = useState<'vincular' | 'desativar' | null>(null)
  const ctl = useAppControls(app)
  const orgClusters = data.clusters.filter((c) => c.orgId === org.id)
  const clusterNames = [...new Set(ctl.instances.map((s) => data.clusters.find((c) => c.id === s.clusterId)?.name ?? ''))].filter(Boolean)
  const origin = app.kind === 'source' ? `Código · ${RUNTIME_LABEL[app.runtime ?? 'python']}` : 'Imagem de contêiner'
  return (
    <>
      <NodeRow
        level="Aplicação"
        aside={<IntelligenceGauge score={applicationIntelligence(data, app)?.score ?? null} size="sm" />}
        icon={Package}
        title={app.name}
        titleTo={`/aplicacoes/${app.id}`}
        meta={`Habilidade · ${origin} · ${app.version}`}
        actions={
          <>
            <ActionButton icon={<Copy className="size-3.5" />} label="Clonar aplicação" disabled={busy} onClick={() => run(() => cloneApplication(app.id), 'Aplicação clonada no setor.', () => undefined)} />
            <ActionButton
              icon={ctl.allPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              label={ctl.allPaused ? 'Retomar aplicação' : 'Pausar aplicação'}
              onClick={ctl.toggle}
              disabled={ctl.busy || !ctl.instances.length}
            />
            <ActionButton icon={<Power className="size-3.5" />} label="Desativar aplicação" onClick={() => setDialog('desativar')} />
            <ActionButton icon={<Layers className="size-3.5" />} label="Vincular a serviço" onClick={() => setDialog('vincular')} disabled={!orgClusters.length} />
          </>
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-subtle">Descrição</dt>
            <dd>{app.description || 'Sem descrição.'}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Comando</dt>
            <dd className="font-mono text-xs">{app.command || '(padrão da imagem)'}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Instâncias</dt>
            <dd>
              {ctl.instances.length} {ctl.instances.length === 1 ? 'instância' : 'instâncias'} em {clusterNames.length} {clusterNames.length === 1 ? 'cluster' : 'clusters'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Variáveis de ambiente</dt>
            <dd>{app.env.length ? app.env.map((e) => e.key).join(', ') : 'Nenhuma'}</dd>
          </div>
        </dl>
        <PodGroup service={service} app={app} />
      </NodeRow>
      {dialog === 'vincular' && (
        <CreateServiceDialog title={`Vincular ${app.name} a um serviço`} apps={[app]} clusters={orgClusters} lockedApp={app} onClose={() => setDialog(null)} />
      )}
      {dialog === 'desativar' && (
        <ConfirmDialog
          open
          onClose={() => setDialog(null)}
          title="Desativar aplicação"
          description={
            <>
              A aplicação <span className="font-medium text-fg">{app.name}</span> será removida do setor, com todas as {ctl.instances.length} instâncias dela. Esta ação não pode ser desfeita.
            </>
          }
          danger
          confirmLabel="Desativar"
          busy={ctl.busy}
          onConfirm={() => ctl.deactivate(() => setDialog(null))}
        />
      )}
    </>
  )
}

/** Pods: grupo expansível dentro da aplicação. Cada pod é uma réplica desta instância; clicar leva ao serviço. */
function PodGroup({ service, app }: { service: Service; app: Application }) {
  return (
    <NodeRow
      level="Pods"
      icon={Package}
      title={`${service.replicas} ${service.replicas === 1 ? 'pod' : 'pods'}`}
      meta={`Réplicas desta instância em ${service.name}. Expanda para ver cada pod.`}
    >
      <ul className="space-y-1">
        {Array.from({ length: service.replicas }, (_, i) => (
          <li key={i}>
            <Link to={`/servicos/${service.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-surface-2">
              <Package className="size-3.5 shrink-0 text-subtle" aria-hidden />
              <span className="font-mono">{`${app.slug}-${i + 1}`}</span>
              <span className="text-subtle">· {service.status === 'ativo' ? 'pronta' : service.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </NodeRow>
  )
}
