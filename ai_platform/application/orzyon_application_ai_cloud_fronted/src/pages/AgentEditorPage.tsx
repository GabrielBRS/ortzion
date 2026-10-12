import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FlaskConical, Loader2, Plus, Save, Server, Trash2, X } from 'lucide-react'
import type { Agent, AgentConfig, AgentRoute, AnalysisProfile } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { ApiError, createAgent, deleteAgent, planAgentDeployment, updateAgent, type AgentDefInput } from '../services/api'
import { useToast } from '../components/Toast'
import { ConfirmDialog, Field, IssueList, Notice, NumberSlider, OptionCard, PageHeader, Panel, Toggle } from '../components/ui'
import { AgentDeploymentsTable, DeployAgentDialog, InferenceSelect, parseTarget } from '../components/agents'
import { KNOWLEDGE_CATALOG, TOOL_CATALOG } from '../mock/seed'
import { ANALYSIS_PROFILES } from '../lib/labels'
import { CONSOLIDATED_LABEL, consolidatedStatus, selectionWindow } from '../lib/agentUsage'
import { fmtDateTime, fmtNum, uid } from '../lib/format'
import NotFoundPage from './NotFoundPage'

const BLANK_CONFIG: AgentConfig = {
  systemPrompt: 'Você é um assistente da organização. Responda em português do Brasil, com objetividade, e indique quando não souber a resposta.',
  analysisProfile: 'Essencial',
  temperature: 0.3,
  maxTokens: 1024,
  tools: ['Busca na base de conhecimento'],
  knowledge: [],
  routes: [],
  concurrency: 16,
}

const toDef = (a?: Agent): AgentDefInput =>
  a ? { name: a.name, description: a.description, tags: a.tags, config: structuredClone(a.config) } : { name: '', description: '', tags: [], config: structuredClone(BLANK_CONFIG) }

export default function AgentEditorPage() {
  const { agentId } = useParams()
  const { data, org, orgClusters, cluster: ctxCluster } = useOrg()
  const navigate = useNavigate()
  const toast = useToast()
  const existing = agentId ? data.agents.find((a) => a.id === agentId && a.orgId === org.id) : undefined
  const isNew = !agentId
  const initial = useMemo(() => toDef(existing), [agentId, existing?.updatedAt])
  const [form, setForm] = useState<AgentDefInput>(initial)
  const [tagsText, setTagsText] = useState(initial.tags.join(', '))
  const [busy, setBusy] = useState<string | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [delOpen, setDelOpen] = useState(false)
  const [deployOpen, setDeployOpen] = useState(false)

  // Primeira implantação (somente na criação).
  const firstCluster = ctxCluster ?? orgClusters.find((c) => c.status === 'ativo') ?? orgClusters[0]
  const [withDeploy, setWithDeploy] = useState(true)
  const [depCluster, setDepCluster] = useState(firstCluster?.id ?? '')
  const localDep = data.deployments.find((d) => d.clusterId === depCluster && d.status === 'disponivel')
  const [target, setTarget] = useState(localDep ? `deployment:${localDep.id}` : '')
  const [replicas, setReplicas] = useState(1)
  const [vcpu, setVcpu] = useState(1)
  const [mem, setMem] = useState(2)

  useEffect(() => {
    setForm(initial)
    setTagsText(initial.tags.join(', '))
  }, [initial])

  const deps = existing ? data.agentDeployments.filter((d) => d.agentId === existing.id) : []
  const win = useMemo(() => selectionWindow('24h'), [Math.floor(Date.now() / 60000)])

  if (agentId && !existing) return <NotFoundPage message="Agente não encontrado nesta organização" />

  const setCfg = <K extends keyof AgentConfig>(k: K, v: AgentConfig[K]) => setForm((f) => ({ ...f, config: { ...f.config, [k]: v } }))
  const cfg = form.config
  const payload = (): AgentDefInput => ({ ...form, tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean) })
  const dirty = JSON.stringify(payload()) !== JSON.stringify(initial)
  const configChanged = existing && JSON.stringify(cfg) !== JSON.stringify(existing.config)
  const firstInput = { clusterId: depCluster, inference: target ? parseTarget(target) : ({ kind: 'shared', modelId: '' } as const), replicas, runtime: { vcpu, memoryGiB: mem } }
  const firstIssues =
    isNew && withDeploy && depCluster && target
      ? planAgentDeployment(
          { ...data, agents: [...data.agents, { id: '__new', orgId: org.id, name: '__new', description: '', tags: [], version: 1, config: cfg, versions: [{ version: 1, savedAt: '', config: cfg }], updatedAt: '' }] },
          { ...firstInput, agentId: '__new', version: 1 },
        )
      : []

  const save = async (): Promise<Agent | null> => {
    setIssues([])
    setBusy('save')
    try {
      const a = isNew ? await createAgent(org.id, payload(), withDeploy ? firstInput : undefined) : await updateAgent(existing!.id, payload())
      toast.success(isNew ? `Agente "${a.name}" criado.` : configChanged ? `Salvo como v${a.version}. Aplique a nova versão nas implantações desejadas.` : 'Agente salvo.')
      if (isNew) navigate(`/agentes/${a.id}`, { replace: true })
      return a
    } catch (e) {
      if (e instanceof ApiError) setIssues([e.message, ...e.details])
      toast.error(e)
      return null
    } finally {
      setBusy(null)
    }
  }

  const updateRoute = (id: string, patch: Partial<AgentRoute>) => setCfg('routes', cfg.routes.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const status = consolidatedStatus(data, deps)

  return (
    <>
      <PageHeader
        crumbs={[{ label: org.name, to: '/' }, { label: 'Agentes', to: '/agentes' }, { label: isNew ? 'Novo' : existing!.name }]}
        title={isNew ? 'Criar agente' : existing!.name}
        badge={!isNew && <span className="rounded-md border border-line-strong px-1.5 py-0.5 font-mono text-xs text-muted">v{existing!.version}</span>}
        description={
          isNew
            ? 'O agente é uma definição reutilizável da organização; ele executa por meio de implantações em clusters.'
            : `${CONSOLIDATED_LABEL[status]} · ${deps.length} ${deps.length === 1 ? 'implantação' : 'implantações'} · última alteração em ${fmtDateTime(existing!.updatedAt)}`
        }
        actions={
          <>
            {!isNew && (
              <>
                <button className="btn-secondary" onClick={() => setDeployOpen(true)}>
                  <Server className="size-4" /> Implantar em outro cluster
                </button>
                <button
                  className="btn-secondary"
                  disabled={!!busy}
                  onClick={async () => {
                    if (dirty && !(await save())) return
                    navigate(`/playground?agente=${existing!.id}`)
                  }}
                >
                  <FlaskConical className="size-4" /> Testar
                </button>
              </>
            )}
            <button className="btn-primary" disabled={!!busy || (!dirty && !isNew) || firstIssues.length > 0} onClick={() => save()}>
              {busy === 'save' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{' '}
              {isNew ? 'Criar agente' : configChanged ? `Salvar como v${existing!.version + 1}` : 'Salvar'}
            </button>
          </>
        }
      />
      {issues.length > 0 && (
        <div className="mb-4">
          <IssueList title={issues[0]} issues={issues.slice(1)} />
        </div>
      )}

      {!isNew && (
        <Panel
          title="Implantações"
          description="Onde este agente executa. Cada implantação mantém a versão aplicada até você aplicar outra; pausar ou escalar não afeta as demais."
          className="mb-4"
          bodyClassName=""
          actions={
            <button className="btn-secondary btn-sm" onClick={() => setDeployOpen(true)}>
              <Server className="size-3.5" /> Implantar em outro cluster
            </button>
          }
        >
          <AgentDeploymentsTable deployments={deps} win={win} />
          {configChanged && (
            <div className="border-t border-line p-3">
              <Notice>Há alterações de configuração não salvas. Ao salvar, será criada a v{existing!.version + 1}; as implantações continuam na versão atual até a aplicação.</Notice>
            </div>
          )}
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Identificação">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome" htmlFor="ag-name">
                <input id="ag-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Atendimento de pedidos" />
              </Field>
              <Field label="Tags" htmlFor="ag-tags" hint="Separadas por vírgula.">
                <input id="ag-tags" className="input" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="atendimento, produção" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Descrição" htmlFor="ag-desc">
                  <input id="ag-desc" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title="Prompt de sistema" description="Faz parte da configuração versionada.">
            <label htmlFor="ag-prompt" className="sr-only">
              Prompt de sistema
            </label>
            <textarea id="ag-prompt" className="input min-h-40 font-mono text-[13px] leading-relaxed" value={cfg.systemPrompt} onChange={(e) => setCfg('systemPrompt', e.target.value)} />
            <p className="mt-1 text-right text-[11px] text-subtle">{cfg.systemPrompt.length} caracteres</p>
          </Panel>

          <Panel
            title="Rotas"
            description="Quando a condição for atendida, a conversa segue para o destino; se o destino falhar, usa o fallback."
            actions={
              <button className="btn-secondary btn-sm" onClick={() => setCfg('routes', [...cfg.routes, { id: uid('r'), condition: '', target: '', fallback: '' }])}>
                <Plus className="size-3.5" /> Adicionar rota
              </button>
            }
          >
            {cfg.routes.length === 0 ? (
              <p className="text-sm text-muted">Sem rotas. Todas as mensagens são respondidas por este agente.</p>
            ) : (
              <ol className="space-y-3">
                {cfg.routes.map((r, i) => (
                  <li key={r.id} className="rounded-lg border border-line bg-surface-2 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted">Rota {i + 1}</span>
                      <button className="btn-ghost btn-sm" aria-label={`Remover rota ${i + 1}`} onClick={() => setCfg('routes', cfg.routes.filter((x) => x.id !== r.id))}>
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <Field label="Condição" htmlFor={`rc-${r.id}`}>
                        <input id={`rc-${r.id}`} className="input font-mono text-xs" value={r.condition} onChange={(e) => updateRoute(r.id, { condition: e.target.value })} placeholder='intenção = "suporte"' />
                      </Field>
                      <Field label="Destino" htmlFor={`rt-${r.id}`}>
                        <input id={`rt-${r.id}`} className="input text-xs" value={r.target} onChange={(e) => updateRoute(r.id, { target: e.target.value })} placeholder="Agente ou fila" />
                      </Field>
                      <Field label="Fallback" htmlFor={`rf-${r.id}`}>
                        <input id={`rf-${r.id}`} className="input text-xs" value={r.fallback} onChange={(e) => updateRoute(r.id, { fallback: e.target.value })} placeholder="Resposta padrão" />
                      </Field>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Ferramentas e fontes de conhecimento" description="Integrações demonstrativas; nenhuma chamada externa é feita.">
            <div className="grid gap-6 md:grid-cols-2">
              {(
                [
                  ['Ferramentas', TOOL_CATALOG, 'tools'],
                  ['Fontes de conhecimento', KNOWLEDGE_CATALOG, 'knowledge'],
                ] as const
              ).map(([legend, list, key]) => (
                <fieldset key={key}>
                  <legend className="label">{legend}</legend>
                  <div className="space-y-2">
                    {list.map((t) => (
                      <label key={t} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                        {t}
                        <Toggle label={t} checked={cfg[key].includes(t)} onChange={() => setCfg(key, toggleIn(cfg[key], t))} />
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          {isNew && (
            <Panel
              title="Primeira implantação"
              description="Onde o agente começa a executar. Outras podem ser criadas depois."
              actions={<Toggle label="Implantar ao criar" checked={withDeploy} onChange={setWithDeploy} />}
            >
              {withDeploy ? (
                orgClusters.length === 0 ? (
                  <Notice tone="warn">
                    Crie um cluster antes.{' '}
                    <Link className="text-accent underline" to="/clusters/novo">
                      Criar cluster
                    </Link>
                  </Notice>
                ) : (
                  <div className="space-y-4">
                    <Field label="Cluster de execução" htmlFor="fd-cluster">
                      <select
                        id="fd-cluster"
                        className="input"
                        value={depCluster}
                        onChange={(e) => {
                          setDepCluster(e.target.value)
                          const l = data.deployments.find((d) => d.clusterId === e.target.value && d.status === 'disponivel')
                          if (l) setTarget(`deployment:${l.id}`)
                        }}
                      >
                        {orgClusters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Inferência via" htmlFor="fd-target">
                      <InferenceSelect id="fd-target" orgId={org.id} value={target} onChange={setTarget} preferClusterId={depCluster} />
                    </Field>
                    <NumberSlider label="Réplicas" value={replicas} min={1} max={10} unit="réplicas" onChange={setReplicas} />
                    <NumberSlider label="vCPU por réplica" value={vcpu} min={0.5} max={8} step={0.5} unit="vCPU" onChange={setVcpu} />
                    <NumberSlider label="Memória por réplica" value={mem} min={1} max={32} unit="GiB" onChange={setMem} />
                    <p className="text-[11px] text-subtle">
                      Reserva de {fmtNum(vcpu * replicas, 1)} vCPU e {fmtNum(mem * replicas, 1)} GiB para o runtime. A memória do modelo pertence à implantação de modelo.
                    </p>
                    {!target && <p className="text-xs text-warn">Selecione o destino de inferência.</p>}
                    <IssueList issues={firstIssues} />
                  </div>
                )
              ) : (
                <p className="text-sm text-muted">O agente será criado sem execução. Implante-o depois em um cluster.</p>
              )}
            </Panel>
          )}

          <Panel title="Perfil de análise">
            <div className="space-y-2">
              {ANALYSIS_PROFILES.map((p) => (
                <OptionCard
                  key={p.value}
                  name="profile"
                  selected={cfg.analysisProfile === p.value}
                  onSelect={() => setCfg('analysisProfile', p.value as AnalysisProfile)}
                  title={p.value}
                  description={p.description}
                />
              ))}
            </div>
            <p className="mt-3 text-[11px] text-subtle">
              Configuração ilustrativa que associa modelo e orçamento de execução por requisição. Não mede inteligência e é independente da concorrência e das réplicas.
            </p>
          </Panel>

          <Panel title="Geração e concorrência">
            <div className="space-y-5">
              <NumberSlider
                label="Temperatura"
                value={cfg.temperature}
                min={0}
                max={1}
                step={0.05}
                unit=""
                onChange={(v) => setCfg('temperature', Number(v.toFixed(2)))}
                hint="Valores baixos deixam as respostas mais consistentes; valores altos, mais variadas."
              />
              <NumberSlider label="Limite de tokens de saída" value={cfg.maxTokens} min={64} max={8192} step={64} unit="tokens" onChange={(v) => setCfg('maxTokens', v)} hint="Tamanho máximo de cada resposta." />
              <NumberSlider
                label="Concorrência por réplica"
                value={cfg.concurrency}
                min={1}
                max={128}
                unit="req"
                onChange={(v) => setCfg('concurrency', v)}
                hint="Requisições simultâneas por réplica. Réplicas e recursos do runtime são definidos em cada implantação."
              />
            </div>
          </Panel>

          {!isNew && (
            <Panel title="Versões">
              <ol className="space-y-1.5 text-sm">
                {[...existing!.versions].reverse().map((v) => {
                  const using = deps.filter((d) => d.appliedVersion === v.version)
                  return (
                    <li key={v.version} className="flex items-baseline justify-between gap-2">
                      <span>
                        <span className="font-mono">v{v.version}</span>
                        {v.version === existing!.version && <span className="ml-1.5 text-xs text-accent">atual</span>}
                        <span className="ml-2 text-xs text-subtle">{fmtDateTime(v.savedAt)}</span>
                      </span>
                      <span className="text-xs text-muted">
                        {using.length ? using.map((d) => data.clusters.find((c) => c.id === d.clusterId)?.name).join(', ') : 'sem implantações'}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </Panel>
          )}

          {!isNew && (
            <Panel title="Remover agente">
              <button className="btn-danger" onClick={() => setDelOpen(true)}>
                <Trash2 className="size-4" /> Remover agente
              </button>
            </Panel>
          )}
        </div>
      </div>

      {!isNew && <DeployAgentDialog open={deployOpen} onClose={() => setDeployOpen(false)} agentId={existing!.id} />}
      <ConfirmDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title="Remover agente"
        description={
          deps.length
            ? `O agente "${existing?.name}" e suas ${deps.length} implantações (${deps.map((d) => data.clusters.find((c) => c.id === d.clusterId)?.name).join(', ')}) serão removidos. As implantações de modelo permanecem.`
            : `O agente "${existing?.name}" será removido.`
        }
        danger
        confirmLabel={deps.length ? 'Remover agente e implantações' : 'Remover'}
        busy={busy === 'del'}
        onConfirm={async () => {
          setBusy('del')
          try {
            await deleteAgent(existing!.id)
            toast.success('Agente removido.')
            navigate('/agentes')
          } catch (e) {
            toast.error(e)
            setBusy(null)
          }
        }}
      />
    </>
  )
}
