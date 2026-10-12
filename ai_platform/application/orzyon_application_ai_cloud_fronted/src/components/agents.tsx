import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, ChevronRight, Loader2, Minus, Pause, Play, Plus, Trash2 } from 'lucide-react'
import type { AgentDeployment, InferenceTarget } from '../domain/types'
import { useApp } from '../state/AppContext'
import {
  ApiError,
  applyAgentVersion,
  deleteAgentDeployment,
  deployAgent,
  planAgentDeployment,
  scaleAgentDeployment,
  setAgentDeploymentPaused,
} from '../services/api'
import { useToast } from './Toast'
import { Badge, ConfirmDialog, EmptyState, ExpandedCell, Field, IssueList, Modal, Notice, NumberSlider, StatusBadge } from './ui'
import { deploymentState, deploymentUsage, inferenceLabel } from '../lib/agentUsage'
import { diurnal, hashString, type SeriesWindow } from '../lib/metrics'
import { fmtBRL, fmtCompact, fmtInt, fmtNum } from '../lib/format'

/** Número abreviado (1,2 mi · 850 bi · 1 tri) com valor completo no tooltip. */
export function Tokens({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={`num ${className}`} title={`${fmtInt(n)} tokens`}>
      {fmtCompact(n)}
    </span>
  )
}

export function ClusterLinks({ clusters, empty = 'Sem execução ativa' }: { clusters: { id: string; name: string }[]; empty?: string }) {
  if (!clusters.length) return <span className="text-xs text-subtle">{empty}</span>
  const head = clusters.slice(0, 2)
  const rest = clusters.slice(2)
  return (
    <span className="flex flex-wrap items-center gap-1">
      {head.map((c) => (
        <Link key={c.id} to={`/clusters/${c.id}`} className="chip whitespace-nowrap hover:text-fg">
          {c.name}
        </Link>
      ))}
      {rest.length > 0 && (
        <details className="relative">
          <summary className="chip cursor-pointer list-none hover:text-fg">+{rest.length}</summary>
          <div className="absolute z-20 mt-1 flex w-56 flex-col gap-1 rounded-lg border border-line-strong bg-surface-2 p-2 shadow-xl">
            {rest.map((c) => (
              <Link key={c.id} to={`/clusters/${c.id}`} className="rounded px-2 py-1 text-xs hover:bg-surface-3">
                {c.name}
              </Link>
            ))}
          </div>
        </details>
      )}
    </span>
  )
}

const uptime = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} h ${m % 60} min`
  return `${Math.floor(h / 24)} d ${h % 24} h`
}

const REPLICA_TONE: Record<string, string> = { pronta: 'ativo', iniciando: 'carregando', pendente: 'aviso', falha: 'falha' }

export function ReplicasTable({ dep }: { dep: AgentDeployment }) {
  const { data } = useApp()
  const cluster = data.clusters.find((c) => c.id === dep.clusterId)
  if (!dep.replicas.length) return <p className="px-4 py-3 text-xs text-subtle">Nenhuma réplica em execução (implantação pausada).</p>
  const prefix = cluster?.modality === 'virtual' ? 'vn' : 'n'
  const load = 0.3 + 0.45 * diurnal(new Date())
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-subtle">
          <tr>
            <th className="px-3 py-1.5 text-left font-normal">Réplica</th>
            <th className="px-3 py-1.5 text-left font-normal">Pod (simulado)</th>
            <th className="px-3 py-1.5 text-left font-normal">Nó</th>
            <th className="px-3 py-1.5 text-left font-normal">Estado</th>
            <th className="px-3 py-1.5 text-right font-normal">Uptime</th>
            <th className="px-3 py-1.5 text-right font-normal">CPU observada</th>
            <th className="px-3 py-1.5 text-right font-normal">Memória observada</th>
            <th className="px-3 py-1.5 text-right font-normal">Reinícios</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {dep.replicas.map((r) => {
            const running = r.state === 'pronta'
            const f = 0.9 + (hashString(r.id) % 20) / 100
            return (
              <tr key={r.id}>
                <td className="px-3 py-1.5 font-mono">{r.id.split('-').pop()}</td>
                <td className="px-3 py-1.5 font-mono">{r.pod}</td>
                <td className="px-3 py-1.5 font-mono">{r.nodeIndex === null ? '—' : `${prefix}-${r.nodeIndex + 1}`}</td>
                <td className="px-3 py-1.5">
                  <StatusBadge status={REPLICA_TONE[r.state]} />
                  <span className="ml-1.5 text-muted">{r.state}</span>
                  {r.reason && <span className="block text-subtle">{r.reason}</span>}
                </td>
                <td className="num px-3 py-1.5 text-right">{running || r.state === 'iniciando' ? uptime(r.startedAt) : '—'}</td>
                <td className="num px-3 py-1.5 text-right">{running ? `${fmtNum(dep.runtime.vcpu * load * f, 2)} / ${fmtNum(dep.runtime.vcpu, 1)} vCPU` : '—'}</td>
                <td className="num px-3 py-1.5 text-right">
                  {running ? `${fmtNum(dep.runtime.memoryGiB * (0.55 + 0.2 * load) * f, 1)} / ${dep.runtime.memoryGiB} GiB` : '—'}
                </td>
                <td className="num px-3 py-1.5 text-right">{r.restarts}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ScaleControl({ dep }: { dep: AgentDeployment }) {
  const toast = useToast()
  const [n, setN] = useState(dep.desiredReplicas)
  const [busy, setBusy] = useState(false)
  useEffect(() => setN(dep.desiredReplicas), [dep.desiredReplicas])
  const apply = async () => {
    setBusy(true)
    try {
      await scaleAgentDeployment(dep.id, n)
      toast.success(`Implantação escalada para ${n} ${n > 1 ? 'réplicas' : 'réplica'}.`)
    } catch (e) {
      toast.error(e)
      setN(dep.desiredReplicas)
    } finally {
      setBusy(false)
    }
  }
  const disabled = dep.status !== 'ativo' || busy
  return (
    <span className="inline-flex items-center gap-1">
      <button className="btn-ghost btn-sm" aria-label="Diminuir réplicas" disabled={disabled || n <= 1} onClick={() => setN(n - 1)}>
        <Minus className="size-3" />
      </button>
      <span className="num w-5 text-center text-xs" aria-label="Réplicas desejadas">
        {n}
      </span>
      <button className="btn-ghost btn-sm" aria-label="Aumentar réplicas" disabled={disabled || n >= 20} onClick={() => setN(n + 1)}>
        <Plus className="size-3" />
      </button>
      {n !== dep.desiredReplicas && (
        <button className="btn-primary btn-sm" disabled={busy} onClick={apply}>
          {busy && <Loader2 className="size-3 animate-spin" />} Escalar
        </button>
      )}
    </span>
  )
}

/** Implantações de agente (uma linha por agente × cluster), com réplicas expansíveis. */
export function AgentDeploymentsTable({
  deployments,
  win,
  showAgent,
  showCluster = true,
}: {
  deployments: AgentDeployment[]
  win: SeriesWindow
  showAgent?: boolean
  showCluster?: boolean
}) {
  const { data } = useApp()
  const toast = useToast()
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<AgentDeployment | null>(null)
  const usage = useMemo(() => new Map(deployments.map((d) => [d.id, deploymentUsage(data, d, win)])), [data, deployments, win])

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key)
    try {
      await fn()
      toast.success(ok)
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(null)
    }
  }

  if (!deployments.length) return <EmptyState title="Nenhuma implantação" description="Implante o agente em um cluster para executá-lo." />
  const cols = 9 + (showAgent ? 1 : 0) + (showCluster ? 1 : 0)
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line">
            <tr>
              <th className="th w-8">
                <span className="sr-only">Expandir</span>
              </th>
              {showAgent && <th className="th">Agente</th>}
              {showCluster && <th className="th">Executa em</th>}
              <th className="th">Versão</th>
              <th className="th">Inferência via</th>
              <th className="th">Status</th>
              <th className="th">Réplicas</th>
              <th className="th text-right">Tokens</th>
              <th className="th text-right">Requisições</th>
              <th className="th text-right">Runtime (total)</th>
              <th className="th text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {deployments.map((d) => {
              const st = deploymentState(data, d)
              const u = usage.get(d.id)!
              const agent = data.agents.find((a) => a.id === d.agentId)
              const inf = inferenceLabel(data, d)
              const expanded = open.has(d.id)
              const outdated = agent && agent.version > d.appliedVersion
              const runningReplicas = d.replicas.filter((r) => r.state === 'pronta' || r.state === 'iniciando').length
              return (
                <Fragment key={d.id}>
                  <tr className="align-top hover:bg-surface-2/50">
                    <td className="td">
                      <button
                        className="btn-ghost btn-sm -ml-2"
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Recolher' : 'Ver'} réplicas`}
                        onClick={() => setOpen((s) => (s.has(d.id) ? (s.delete(d.id), new Set(s)) : new Set(s.add(d.id))))}
                      >
                        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                    </td>
                    {showAgent && (
                      <td className="td">
                        <Link to={`/agentes/${d.agentId}`} className="font-medium hover:text-accent">
                          {agent?.name}
                        </Link>
                      </td>
                    )}
                    {showCluster && (
                      <td className="td">
                        <Link to={`/clusters/${d.clusterId}`} className="hover:text-accent">
                          {st.cluster?.name}
                        </Link>
                        {st.cluster?.status !== 'ativo' && <span className="block text-xs text-warn">cluster {st.cluster?.status}</span>}
                      </td>
                    )}
                    <td className="td whitespace-nowrap">
                      <span className="font-mono text-xs">v{d.appliedVersion}</span>
                      {outdated && (
                        <button
                          className="mt-1 block text-[11px] text-accent hover:underline"
                          disabled={busy === `v-${d.id}`}
                          onClick={() => run(`v-${d.id}`, () => applyAgentVersion(d.id, agent!.version), `v${agent!.version} aplicada em ${st.cluster?.name}.`)}
                        >
                          {busy === `v-${d.id}` ? 'Aplicando…' : `Aplicar v${agent!.version}`}
                        </button>
                      )}
                    </td>
                    <td className="td max-w-56">
                      <span className="font-mono text-xs">{inf.label}</span>
                      <span className={`block text-[11px] ${inf.kind === 'indisponivel' ? 'text-err' : 'text-subtle'}`}>{inf.detail}</span>
                      {st.inference && !st.inference.available && inf.kind !== 'indisponivel' && <span className="block text-[11px] text-warn">destino indisponível</span>}
                    </td>
                    <td className="td">
                      <StatusBadge status={d.status === 'pausado' ? 'pausado' : st.executing ? 'ativo' : 'aviso'} />
                      {d.status === 'ativo' && !st.executing && <span className="block text-[11px] text-subtle">sem execução ativa</span>}
                    </td>
                    <td className="td whitespace-nowrap">
                      <span className="num text-xs">
                        {st.ready}/{st.desired} prontas
                      </span>
                      {st.existing !== st.ready && <span className="block text-[11px] text-subtle">{st.existing} existentes</span>}
                      <div className="mt-1">
                        <ScaleControl dep={d} />
                      </div>
                    </td>
                    <td className="td text-right text-xs whitespace-nowrap">
                      <Tokens n={u.tokensIn + u.tokensOut} className="text-sm" />
                      <span className="block text-subtle">
                        <Tokens n={u.tokensIn} /> entrada · <Tokens n={u.tokensOut} /> saída
                      </span>
                      {u.cost !== null && <span className="block text-subtle">{fmtBRL(u.cost)}</span>}
                    </td>
                    <td className="td num text-right text-xs">{fmtCompact(u.requests)}</td>
                    <td className="td num text-right text-xs whitespace-nowrap">
                      {fmtNum(d.runtime.vcpu * runningReplicas, 1)} vCPU · {fmtNum(d.runtime.memoryGiB * runningReplicas, 1)} GiB
                      <span className="block text-[11px] text-subtle">
                        {fmtNum(d.runtime.vcpu, 1)} vCPU · {d.runtime.memoryGiB} GiB por réplica
                      </span>
                      <span className="block text-[11px] text-subtle">
                        GPU: {inf.kind === 'externo' ? 'API externa' : inf.kind === 'compartilhado' ? 'modelo compartilhado' : 'na implantação do modelo'}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button
                          className="btn-ghost btn-sm"
                          disabled={busy === d.id}
                          onClick={() =>
                            run(d.id, () => setAgentDeploymentPaused(d.id, d.status === 'ativo'), d.status === 'ativo' ? 'Implantação pausada.' : 'Implantação retomada.')
                          }
                        >
                          {busy === d.id ? <Loader2 className="size-3.5 animate-spin" /> : d.status === 'ativo' ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                          {d.status === 'ativo' ? 'Pausar' : 'Retomar'}
                        </button>
                        <button className="btn-ghost btn-sm text-err hover:text-err" aria-label="Remover implantação" onClick={() => setToDelete(d)}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={cols} className="bg-surface-2/40 p-0">
                        <ExpandedCell>
                          <ReplicasTable dep={d} />
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
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Remover implantação do agente"
        description={
          toDelete
            ? `A implantação de "${data.agents.find((a) => a.id === toDelete.agentId)?.name}" em ${data.clusters.find((c) => c.id === toDelete.clusterId)?.name} será removida. O agente e as demais implantações não são afetados.`
            : ''
        }
        danger
        confirmLabel="Remover"
        busy={busy === 'del'}
        onConfirm={async () => {
          await run('del', () => deleteAgentDeployment(toDelete!.id), 'Implantação removida.')
          setToDelete(null)
        }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------

/** Opções de destino de inferência disponíveis para a organização. */
export function useInferenceOptions(orgId: string) {
  const { data } = useApp()
  const orgClusterIds = new Set(data.clusters.filter((c) => c.orgId === orgId).map((c) => c.id))
  const modelDeps = data.deployments.filter((d) => orgClusterIds.has(d.clusterId) && d.status !== 'falha')
  const accesses = data.modelAccess.filter((a) => a.orgId === orgId).map((a) => data.models.find((m) => m.id === a.modelId)!).filter(Boolean)
  return { modelDeps, shared: accesses.filter((m) => m.offering === 'hosted'), external: accesses.filter((m) => m.offering === 'external') }
}

export const targetKey = (t: InferenceTarget) => (t.kind === 'deployment' ? `deployment:${t.deploymentId}` : `${t.kind}:${t.modelId}`)
export function parseTarget(key: string): InferenceTarget {
  const [kind, id] = key.split(':')
  return kind === 'deployment' ? { kind: 'deployment', deploymentId: id } : { kind: kind as 'shared' | 'external', modelId: id }
}

export function InferenceSelect({ orgId, value, onChange, preferClusterId, id }: { orgId: string; value: string; onChange: (k: string) => void; preferClusterId?: string; id: string }) {
  const { data } = useApp()
  const opts = useInferenceOptions(orgId)
  const local = opts.modelDeps.filter((d) => d.clusterId === preferClusterId)
  const remote = opts.modelDeps.filter((d) => d.clusterId !== preferClusterId)
  const label = (d: (typeof opts.modelDeps)[number]) =>
    `${d.name} · ${data.models.find((m) => m.id === d.modelId)?.name ?? ''}${d.status !== 'disponivel' ? ` (${d.status})` : ''}`
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Selecione…</option>
      {local.length > 0 && (
        <optgroup label="Implantações de modelo neste cluster">
          {local.map((d) => (
            <option key={d.id} value={`deployment:${d.id}`}>
              {label(d)}
            </option>
          ))}
        </optgroup>
      )}
      {remote.length > 0 && (
        <optgroup label="Implantações de modelo em outros clusters">
          {remote.map((d) => (
            <option key={d.id} value={`deployment:${d.id}`}>
              {label(d)} · {data.clusters.find((c) => c.id === d.clusterId)?.name}
            </option>
          ))}
        </optgroup>
      )}
      {opts.shared.length > 0 && (
        <optgroup label="Modelos compartilhados Orzyon (por tokens)">
          {opts.shared.map((m) => (
            <option key={m.id} value={`shared:${m.id}`}>
              {m.name}
            </option>
          ))}
        </optgroup>
      )}
      {opts.external.length > 0 && (
        <optgroup label="APIs externas habilitadas">
          {opts.external.map((m) => (
            <option key={m.id} value={`external:${m.id}`}>
              {m.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}

export function DeployAgentDialog({ open, onClose, agentId, clusterId: initialCluster }: { open: boolean; onClose: () => void; agentId: string; clusterId?: string }) {
  const { data } = useApp()
  const toast = useToast()
  const agent = data.agents.find((a) => a.id === agentId)
  const orgId = agent?.orgId ?? ''
  const taken = new Set(data.agentDeployments.filter((d) => d.agentId === agentId).map((d) => d.clusterId))
  const candidates = data.clusters.filter((c) => c.orgId === orgId && !taken.has(c.id))
  const [clusterId, setClusterId] = useState('')
  const [version, setVersion] = useState(agent?.version ?? 1)
  const [target, setTarget] = useState('')
  const [replicas, setReplicas] = useState(1)
  const [vcpu, setVcpu] = useState(1)
  const [mem, setMem] = useState(2)
  const [busy, setBusy] = useState(false)
  const [serverIssues, setServerIssues] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    const c = initialCluster && !taken.has(initialCluster) ? initialCluster : (candidates[0]?.id ?? '')
    setClusterId(c)
    setVersion(agent?.version ?? 1)
    const local = data.deployments.find((d) => d.clusterId === c && d.status === 'disponivel')
    setTarget(local ? `deployment:${local.id}` : '')
    setReplicas(1)
    setServerIssues([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!agent) return null
  const input = { agentId, clusterId, version, inference: target ? parseTarget(target) : ({ kind: 'shared', modelId: '' } as InferenceTarget), replicas, runtime: { vcpu, memoryGiB: mem } }
  const issues = clusterId && target ? planAgentDeployment(data, input) : []
  const submit = async () => {
    setBusy(true)
    setServerIssues([])
    try {
      await deployAgent(input)
      toast.success(`"${agent.name}" implantado em ${data.clusters.find((c) => c.id === clusterId)?.name}.`)
      onClose()
    } catch (e) {
      if (e instanceof ApiError) setServerIssues(e.details.length ? e.details : [e.message])
      else toast.error(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Implantar "${agent.name}" em outro cluster`}
      description="Cria uma nova implantação deste agente. As implantações existentes não são alteradas."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={busy || !clusterId || !target || issues.length > 0} onClick={submit}>
            {busy && <Loader2 className="size-4 animate-spin" />} Implantar
          </button>
        </>
      }
    >
      {candidates.length === 0 ? (
        <Notice tone="warn">O agente já está implantado em todos os clusters da organização. Para mais capacidade, escale as réplicas de uma implantação.</Notice>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cluster de execução" htmlFor="da-cluster">
              <select
                id="da-cluster"
                className="input"
                value={clusterId}
                onChange={(e) => {
                  setClusterId(e.target.value)
                  const local = data.deployments.find((d) => d.clusterId === e.target.value && d.status === 'disponivel')
                  if (local) setTarget(`deployment:${local.id}`)
                }}
              >
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Versão" htmlFor="da-version">
              <select id="da-version" className="input" value={version} onChange={(e) => setVersion(Number(e.target.value))}>
                {[...agent.versions].reverse().map((v) => (
                  <option key={v.version} value={v.version}>
                    v{v.version}
                    {v.version === agent.version ? ' (atual)' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Inferência via" htmlFor="da-target" hint="Pode ser um modelo em outro cluster, compartilhado ou API externa.">
              <InferenceSelect id="da-target" orgId={orgId} value={target} onChange={setTarget} preferClusterId={clusterId} />
            </Field>
            <NumberSlider label="Réplicas" value={replicas} min={1} max={10} unit="réplicas" onChange={setReplicas} />
            <NumberSlider label="vCPU por réplica" value={vcpu} min={0.5} max={8} step={0.5} unit="vCPU" onChange={setVcpu} />
            <NumberSlider label="Memória por réplica" value={mem} min={1} max={32} unit="GiB" onChange={setMem} />
          </div>
          <p className="text-xs text-subtle">
            Reserva no cluster: {fmtNum(vcpu * replicas, 1)} vCPU e {fmtNum(mem * replicas, 1)} GiB para o runtime. A memória dos pesos do modelo pertence à implantação de modelo.
          </p>
          {target.startsWith('external:') && (
            <Notice tone="warn">Com API externa, o conteúdo das conversas deste agente será processado pelo provedor. Nenhuma GPU local é alocada.</Notice>
          )}
          <IssueList title="Não é possível implantar" issues={serverIssues.length ? serverIssues : issues} />
        </div>
      )}
    </Modal>
  )
}

export function VersionBadge({ applied, current }: { applied: number; current: number }) {
  return applied < current ? <Badge tone="warn">v{applied} · atual v{current}</Badge> : <Badge tone="muted">v{applied}</Badge>
}

