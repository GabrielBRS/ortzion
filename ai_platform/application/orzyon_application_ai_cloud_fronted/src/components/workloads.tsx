import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Loader2, Pause, Play, RotateCw, Trash2 } from 'lucide-react'
import type { ComputeProfile, Device, InferenceEngine, IntegrationStatus, ModelDeployment, Quantization, Service } from '../domain/types'
import { INTEGRATION_STATUS, integrationLabel, profileLabel } from '../lib/labels'
import { useApp } from '../state/AppContext'
import {
  deleteDeployment,
  deleteService,
  planDeployment,
  createDeployment,
  setDeploymentPaused,
  setServicePaused,
  ApiError,
} from '../services/api'
import { useToast } from './Toast'
import { Badge, ConfirmDialog, EmptyState, Field, IssueList, Modal, Notice, StatusBadge } from './ui'
import { fmtGiB, fmtInt, fmtNum, fmtRelative } from '../lib/format'
import { RUNTIME_LABEL } from '../mock/samples'
import { scaleRes } from '../lib/capacity'
import { serviceIntelligence } from '../lib/intelligence'
import { agentNameOf } from '../lib/sectorAgents'
import { IntelligenceGauge } from './IntelligenceGauge'

function useAction() {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key)
    try {
      await fn()
      if (ok) toast.success(ok)
      return true
    } catch (e) {
      toast.error(e)
      return false
    } finally {
      setBusy(null)
    }
  }
  return { busy, run }
}

export function reservationText(r: { vcpu: number; memoryGiB: number; gpus: number; gpuMemoryGiB: number }, unified: boolean) {
  const parts = [`${fmtNum(r.vcpu, 1)} vCPU`, `${fmtGiB(r.memoryGiB)} ${unified ? 'mem. CPU' : 'RAM'}`]
  if (r.gpus) parts.push(`${r.gpus} GPU`)
  if (r.gpuMemoryGiB) parts.push(`${fmtGiB(r.gpuMemoryGiB)} ${unified ? 'mem. GPU' : 'VRAM'}`)
  return parts.join(' · ')
}

// ---------------------------------------------------------------------------

export function DeploymentsTable({ deployments, showCluster }: { deployments: ModelDeployment[]; showCluster?: boolean }) {
  const { data } = useApp()
  const { busy, run } = useAction()
  const [toDelete, setToDelete] = useState<ModelDeployment | null>(null)
  const users = toDelete ? data.agentDeployments.filter((a) => a.inference.kind === 'deployment' && a.inference.deploymentId === toDelete.id) : []
  const agentLabel = (a: { agentId: string; clusterId: string }) => `${data.agents.find((x) => x.id === a.agentId)?.name} em ${data.clusters.find((c) => c.id === a.clusterId)?.name}`

  if (!deployments.length) return <EmptyState title="Nenhuma implantação de modelo" description="Implante um modelo para que agentes possam utilizá-lo." />
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Implantação</th>
              {showCluster && <th className="th">Cluster</th>}
              <th className="th">Status</th>
              <th className="th">Modelo · motor</th>
              <th className="th">Reserva</th>
              <th className="th">Agentes vinculados</th>
              <th className="th text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {deployments.map((d) => {
              const model = data.models.find((m) => m.id === d.modelId)
              const engine = data.engines.find((e) => e.id === d.engineId)
              const cluster = data.clusters.find((c) => c.id === d.clusterId)
              const linked = data.agentDeployments.filter((a) => a.inference.kind === 'deployment' && a.inference.deploymentId === d.id)
              const unified = cluster?.profile === 'unified'
              return (
                <tr key={d.id} className="align-top hover:bg-surface-2/50">
                  <td className="td">
                    <div className="font-mono text-[13px]">{d.name}</div>
                    <div className="text-xs text-subtle">
                      {d.quantization} · contexto {fmtInt(d.contextLength)} tokens
                    </div>
                    {d.status === 'falha' && d.failureReason && <p className="mt-1 max-w-sm text-xs text-err">{d.failureReason}</p>}
                  </td>
                  {showCluster && (
                    <td className="td">
                      <Link to={`/clusters/${cluster?.id}/modelos`} className="hover:text-accent">
                        {cluster?.name}
                      </Link>
                    </td>
                  )}
                  <td className="td">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="td">
                    <div>{model?.name}</div>
                    <div className="flex items-center gap-1.5 text-xs text-subtle">
                      {engine?.name} · {d.device === 'cpu' ? 'CPU' : 'GPU'} {cluster && <EngineStatusBadge status={engine?.support[cluster.profile]} />}
                    </div>
                  </td>
                  <td className="td text-xs whitespace-nowrap text-muted">
                    {d.status === 'pausado' || d.status === 'falha' ? <span className="text-subtle">Liberada</span> : reservationText(d.reservation, unified)}
                  </td>
                  <td className="td">
                    {linked.length === 0 ? (
                      <span className="text-xs text-subtle">Nenhum</span>
                    ) : (
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {linked.map((a) => (
                          <Link key={a.id} to={`/agentes/${a.agentId}`} className="chip hover:text-fg" title={agentLabel(a)}>
                            {data.agents.find((x) => x.id === a.agentId)?.name}
                            {a.clusterId !== d.clusterId && <span className="text-subtle"> · {data.clusters.find((c) => c.id === a.clusterId)?.name}</span>}
                          </Link>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      {d.status === 'disponivel' && (
                        <button className="btn-ghost btn-sm" disabled={busy === d.id} onClick={() => run(d.id, () => setDeploymentPaused(d.id, true), 'Implantação pausada.')}>
                          <Pause className="size-3.5" /> Pausar
                        </button>
                      )}
                      {d.status === 'pausado' && (
                        <button className="btn-ghost btn-sm" disabled={busy === d.id} onClick={() => run(d.id, () => setDeploymentPaused(d.id, false), 'Implantação retomada.')}>
                          <Play className="size-3.5" /> Retomar
                        </button>
                      )}
                      {d.status === 'falha' && (
                        <button className="btn-ghost btn-sm" disabled={busy === d.id} onClick={() => run(d.id, () => setDeploymentPaused(d.id, false), 'Nova tentativa iniciada.')}>
                          <RotateCw className="size-3.5" /> Tentar novamente
                        </button>
                      )}
                      <button className="btn-ghost btn-sm text-err hover:text-err" aria-label={`Remover ${d.name}`} onClick={() => setToDelete(d)}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={users.length ? 'Implantação em uso' : 'Remover implantação'}
        danger
        confirmLabel="Remover"
        confirmDisabled={users.length > 0}
        busy={busy === 'del'}
        onConfirm={async () => {
          if (await run('del', () => deleteDeployment(toDelete!.id), 'Implantação removida.')) setToDelete(null)
        }}
      >
        {users.length ? (
          <IssueList
            title="Não é possível remover. Altere o destino de inferência destas implantações de agente primeiro:"
            issues={users.map(agentLabel)}
          />
        ) : (
          <p className="text-sm text-muted">
            A implantação <span className="font-mono text-fg">{toDelete?.name}</span> será removida e sua reserva liberada.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

export function ServicesTable({ services, showCluster = true }: { services: Service[]; showCluster?: boolean }) {
  const { data } = useApp()
  const { busy, run } = useAction()
  const [toDelete, setToDelete] = useState<Service | null>(null)
  if (!services.length)
    return (
      <EmptyState
        title="Nenhum serviço"
        action={
          <Link to="/servicos/novo" className="btn-primary">
            Implantar serviço
          </Link>
        }
      />
    )
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line">
            <tr>
              <th className="th">Serviço</th>
              <th className="th">Aplicação</th>
              <th className="th">Agente</th>
              {showCluster && <th className="th">Executa em</th>}
              <th className="th">Status</th>
              <th className="th">Réplicas</th>
              <th className="th">Reserva</th>
              <th className="th">Inteligência</th>
              <th className="th text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {services.map((s) => {
              const cluster = data.clusters.find((c) => c.id === s.clusterId)
              const app = data.applications.find((a) => a.id === s.applicationId)
              const transitioning = !!s.simulation
              const intel = serviceIntelligence(data, s)
              return (
                <tr key={s.id} className="hover:bg-surface-2/50">
                  <td className="td">
                    <Link to={`/servicos/${s.id}`} className="font-mono text-[13px] font-medium hover:text-accent">
                      {s.name}
                    </Link>
                    <div className="text-xs text-subtle">criado {fmtRelative(s.createdAt)}</div>
                  </td>
                  <td className="td">
                    {app ? (
                      <>
                        <Link to={`/aplicacoes/${app.id}`} className="hover:text-accent">
                          {app.name}
                        </Link>
                        <div className="text-xs text-subtle">
                          {app.kind === 'source' ? `Código · ${RUNTIME_LABEL[app.runtime ?? 'python']}` : 'Imagem de contêiner'} · <span className="font-mono">{app.version}</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-subtle">Aplicação removida</span>
                    )}
                  </td>
                  <td className="td max-w-48 text-xs text-muted">{app?.sector ? agentNameOf(data.applications, app.sector) : '—'}</td>
                  {showCluster && (
                    <td className="td">
                      <Link to={`/clusters/${cluster?.id}/servicos`} className="hover:text-accent">
                        {cluster?.name}
                      </Link>
                    </td>
                  )}
                  <td className="td">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="td num text-xs whitespace-nowrap">
                    {s.status === 'ativo' && cluster?.status === 'ativo' ? s.replicas : 0}/{s.replicas} prontas
                  </td>
                  <td className="td text-xs whitespace-nowrap text-muted">
                    {s.status === 'pausado' ? <span className="text-subtle">Liberada</span> : reservationText(scaleRes(s.reservation, s.replicas), cluster?.profile === 'unified')}
                  </td>
                  <td className="td">
                    <IntelligenceGauge score={intel?.score ?? null} size="sm" />
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      {s.status === 'ativo' && (
                        <button className="btn-ghost btn-sm" disabled={busy === s.id} onClick={() => run(s.id, () => setServicePaused(s.id, true), 'Serviço pausado.')}>
                          <Pause className="size-3.5" /> Pausar
                        </button>
                      )}
                      {s.status === 'pausado' && (
                        <button className="btn-ghost btn-sm" disabled={busy === s.id} onClick={() => run(s.id, () => setServicePaused(s.id, false), 'Serviço retomado.')}>
                          <Play className="size-3.5" /> Retomar
                        </button>
                      )}
                      <button className="btn-ghost btn-sm text-err hover:text-err" disabled={transitioning} aria-label={`Remover ${s.name}`} onClick={() => setToDelete(s)}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Remover serviço"
        description={
          <>
            O serviço <span className="font-mono text-fg">{toDelete?.name}</span> será removido e sua reserva liberada. A aplicação continua cadastrada.
          </>
        }
        danger
        confirmLabel="Remover"
        busy={busy === 'del'}
        onConfirm={async () => {
          if (await run('del', () => deleteService(toDelete!.id), 'Serviço removido.')) setToDelete(null)
        }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------

export function EngineStatusBadge({ status }: { status?: IntegrationStatus }) {
  if (!status) return <Badge tone="muted">Não suportado</Badge>
  const st = INTEGRATION_STATUS[status]
  return <Badge tone={st.tone}>{st.label}</Badge>
}

/** Primeiro motor homologado para o perfil (ordem do catálogo). */
function defaultEngine(engines: InferenceEngine[], profile?: ComputeProfile) {
  return engines.find((e) => profile && e.support[profile] === 'homologada') ?? engines[0]
}

export function DeployModelDialog({
  open,
  onClose,
  clusterId: initialCluster,
  modelId: initialModel,
}: {
  open: boolean
  onClose: () => void
  clusterId?: string
  modelId?: string
}) {
  const { data, orgClusters } = useApp()
  const toast = useToast()
  const [clusterId, setClusterId] = useState(initialCluster ?? orgClusters[0]?.id ?? '')
  const profileOf = (id: string) => data.clusters.find((c) => c.id === id)?.profile
  // Somente modelos hospedados podem ser implantados em cluster.
  const hostedModels = data.models.filter((m) => m.offering === 'hosted')
  const firstHomologated = hostedModels.find((m) => m.status === 'homologada') ?? hostedModels[0]
  const [modelId, setModelId] = useState(initialModel ?? firstHomologated.id)
  const [engineId, setEngineId] = useState(() => defaultEngine(data.engines, profileOf(clusterId)).id)
  const [device, setDevice] = useState<Device>('gpu')
  const model = data.models.find((m) => m.id === modelId)!
  const engine = data.engines.find((e) => e.id === engineId) ?? data.engines[0]
  const [quantization, setQuantization] = useState<Quantization>('INT8')
  const [contextLength, setContextLength] = useState(16384)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [serverIssues, setServerIssues] = useState<string[]>([])
  const quants = model.quantizations.filter((q) => engine.quantizations.includes(q))
  const maxCtx = model.maxContext ?? 131072

  const pickCluster = (id: string) => {
    setClusterId(id)
    const p = profileOf(id)
    if (p && engine.support[p] !== 'homologada') setEngineId(defaultEngine(data.engines, p).id)
  }

  useEffect(() => {
    if (open) {
      const id = initialCluster ?? orgClusters[0]?.id ?? ''
      setClusterId(id)
      setEngineId(defaultEngine(data.engines, profileOf(id)).id)
      if (initialModel) setModelId(initialModel)
      setServerIssues([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCluster, initialModel])
  useEffect(() => {
    if (!engine.devices.includes(device)) setDevice(engine.devices[0])
  }, [engine, device])
  useEffect(() => {
    if (quants.length && !quants.includes(quantization)) setQuantization(quants.includes('INT8') ? 'INT8' : quants[0])
    if (contextLength > maxCtx) setContextLength(maxCtx)
  }, [quants.join(), quantization, contextLength, maxCtx])

  const plan = useMemo(
    () => planDeployment(data, { clusterId, modelId, engineId, device, quantization, contextLength }),
    [data, clusterId, modelId, engineId, device, quantization, contextLength],
  )
  const cluster = plan?.cluster
  const unified = cluster?.profile === 'unified'
  const blocked = !plan || plan.blockers.length > 0 || plan.issues.length > 0

  const submit = async () => {
    setBusy(true)
    setServerIssues([])
    try {
      const d = await createDeployment({ clusterId, modelId, engineId, device, quantization, contextLength, name })
      toast.success(`Implantação "${d.name}" iniciada.`)
      setName('')
      onClose()
    } catch (e) {
      if (e instanceof ApiError) setServerIssues(e.details.length ? e.details : [e.message])
      else toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  const contexts = [4096, 8192, 16384, 32768, 65536, 131072].filter((c) => c <= maxCtx)
  const engineOption = (e: InferenceEngine) => {
    const st = cluster ? e.support[cluster.profile] : undefined
    return (
      <option key={e.id} value={e.id}>
        {e.name} — {st ? integrationLabel(st) : 'não suportado'}
      </option>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Implantar modelo"
      description="Carrega um modelo em um motor de inferência no cluster. A implantação pode ser compartilhada por vários agentes."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy || blocked}>
            {busy && <Loader2 className="size-4 animate-spin" />} Implantar
          </button>
        </>
      }
    >
      {orgClusters.length === 0 ? (
        <Notice tone="warn">Crie um cluster antes de implantar modelos.</Notice>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cluster" htmlFor="dp-cluster" hint={cluster ? profileLabel(cluster.profile) : undefined}>
              <select id="dp-cluster" className="input" value={clusterId} onChange={(e) => pickCluster(e.target.value)}>
                {orgClusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nome (opcional)" htmlFor="dp-name">
              <input id="dp-name" className="input font-mono" value={name} onChange={(e) => setName(e.target.value)} placeholder="gerado automaticamente" />
            </Field>
            <Field label="Modelo" htmlFor="dp-model">
              <select id="dp-model" className="input" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                {hostedModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.architecture === 'MoE' ? `${fmtNum(m.paramsB ?? 0, 1)} B (${fmtNum(m.activeParamsB ?? 0, 1)} B ativos)` : `${fmtNum(m.paramsB ?? 0, 1)} B`}
                    {m.status !== 'homologada' ? ` — ${integrationLabel(m.status)}` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Motor de inferência" htmlFor="dp-engine" hint="Estado da integração para o perfil deste cluster.">
              <select id="dp-engine" className="input" value={engineId} onChange={(e) => setEngineId(e.target.value)}>
                <optgroup label="Motores de inferência">{data.engines.filter((e) => e.category === 'motor').map(engineOption)}</optgroup>
                <optgroup label="Runtimes simplificados">{data.engines.filter((e) => e.category === 'runtime').map(engineOption)}</optgroup>
              </select>
            </Field>
            <Field label="Quantização" htmlFor="dp-quant">
              <select id="dp-quant" className="input" value={quantization} onChange={(e) => setQuantization(e.target.value as Quantization)}>
                {quants.map((q) => (
                  <option key={q} value={q}>
                    {q}
                    {engine.quantLabels?.[q] ? ` (${engine.quantLabels[q]})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Contexto configurado" htmlFor="dp-ctx" hint="Contextos maiores aumentam a memória de cache.">
              <select id="dp-ctx" className="input" value={contextLength} onChange={(e) => setContextLength(Number(e.target.value))}>
                {contexts.map((c) => (
                  <option key={c} value={c}>
                    {fmtInt(c)} tokens
                  </option>
                ))}
              </select>
            </Field>
            {engine.devices.length > 1 && (
              <Field label="Execução" htmlFor="dp-device" hint="CPU não reserva GPU; indicada para modelos pequenos.">
                <select id="dp-device" className="input" value={device} onChange={(e) => setDevice(e.target.value as Device)}>
                  <option value="gpu">GPU</option>
                  <option value="cpu">CPU</option>
                </select>
              </Field>
            )}
          </div>

          <div className="rounded-lg border border-line bg-surface-2 p-3 text-xs">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="font-medium text-fg">{engine.name}</span>
              <span className="text-subtle">{engine.project}</span>
              {engine.category === 'runtime' && <Badge tone="info">runtime gerenciado</Badge>}
              <EngineStatusBadge status={cluster ? engine.support[cluster.profile] : undefined} />
            </div>
            <p className="text-muted">{engine.role}</p>
            <dl className="mt-2 grid gap-x-4 gap-y-0.5 text-muted sm:grid-cols-[auto_1fr]">
              <dt className="text-subtle">Licença do motor</dt>
              <dd>{engine.license}</dd>
              <dt className="text-subtle">AMD</dt>
              <dd>{engine.amdSupport}</dd>
              <dt className="text-subtle">Licença do modelo</dt>
              <dd>{model.license} — verificada separadamente da licença do motor</dd>
            </dl>
          </div>

          {plan && plan.blockers.length === 0 && (
            <div className="grid gap-3 rounded-lg border border-line bg-surface-2 p-3 text-xs sm:grid-cols-2">
              <div>
                <p className="mb-1.5 font-medium text-fg">Estimativa ilustrativa de memória</p>
                <dl className="grid grid-cols-2 gap-y-0.5 text-muted">
                  <dt>Pesos</dt>
                  <dd className="num text-right">{fmtGiB(plan.estimate.weightsGiB)}</dd>
                  <dt>Cache de contexto</dt>
                  <dd className="num text-right">{fmtGiB(plan.estimate.kvCacheGiB)}</dd>
                  <dt>Sobrecarga do motor</dt>
                  <dd className="num text-right">{fmtGiB(plan.estimate.overheadGiB)}</dd>
                  <dt className="font-medium text-fg">Total</dt>
                  <dd className="num text-right font-medium text-fg">{fmtGiB(plan.estimate.totalGiB)}</dd>
                </dl>
              </div>
              <div>
                <p className="mb-1.5 font-medium text-fg">Reserva no cluster</p>
                <p className="text-muted">{reservationText(plan.reservation, unified)}</p>
                <p className="mt-2 text-subtle">
                  {device === 'cpu'
                    ? 'Execução em CPU: usa memória de CPU, sem GPU.'
                    : unified
                      ? 'Reservado da parcela de memória destinada à GPU.'
                      : 'GPUs inteiras no mesmo nó; VRAM = GPUs × VRAM por GPU.'}
                </p>
              </div>
            </div>
          )}
          <IssueList title="Combinação não disponível para implantação" issues={plan?.blockers ?? []} />
          <IssueList title="Configuração inviável" issues={serverIssues.length ? serverIssues : (plan?.blockers.length ? [] : (plan?.issues ?? []))} />
        </div>
      )}
    </Modal>
  )
}
