import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Bot, Eraser, Loader2, Send, UserRound } from 'lucide-react'
import { useOrg } from '../state/AppContext'
import { Badge, EmptyState, Notice, PageHeader, Panel, StatusBadge } from '../components/ui'
import { cannedReply } from '../mock/samples'
import { orgScope } from '../lib/selectors'
import { fmtInt, fmtTime } from '../lib/format'
import { hashString } from '../lib/metrics'
import { deploymentState, inferenceLabel } from '../lib/agentUsage'

interface Msg {
  id: string
  role: 'user' | 'agent'
  text: string
  ts: string
  tokensIn?: number
  tokensOut?: number
  latencyMs?: number
}

const estimateTokens = (s: string) => Math.max(1, Math.round(s.length / 3.6))

export default function PlaygroundPage() {
  const { data, org, cluster } = useOrg()
  const [params, setParams] = useSearchParams()
  const scope = orgScope(data, org.id, cluster?.id)
  const agentId = params.get('agente') ?? scope.agents[0]?.id ?? ''
  const agent = scope.agents.find((a) => a.id === agentId)
  // Implantação explícita: evita execução ambígua quando o agente roda em vários clusters.
  const agentDeps = agent ? scope.agentDeployments.filter((d) => d.agentId === agent.id) : []
  const execId = params.get('implantacao')
  const exec = agentDeps.find((d) => d.id === execId) ?? agentDeps.find((d) => deploymentState(data, d).executing) ?? agentDeps[0]
  const execState = exec ? deploymentState(data, exec) : undefined
  const inf = exec ? inferenceLabel(data, exec) : undefined
  const model = execState?.inference?.model
  const agentCluster = execState?.cluster
  const cfg = exec?.config

  const [histories, setHistories] = useState<Record<string, Msg[]>>({})
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const histKey = exec?.id ?? ''
  const history = exec ? (histories[histKey] ?? []) : []

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [history.length, pending])
  useEffect(() => {
    // Troca de agente cancela a resposta em andamento.
    if (timer.current) clearTimeout(timer.current)
    setPending(false)
  }, [agentId, exec?.id])

  const unavailable = !agent
    ? 'Selecione um agente.'
    : !exec
      ? 'O agente não tem implantações. Implante-o em um cluster para testar.'
      : exec.status !== 'ativo'
        ? `A implantação em ${agentCluster?.name} está pausada.`
        : agentCluster?.status !== 'ativo'
          ? `O cluster ${agentCluster?.name} não está ativo.`
          : !execState?.ready
            ? `Nenhuma réplica pronta em ${agentCluster?.name}.`
            : !execState?.inference?.available
              ? `O destino de inferência (${inf?.label}) não está disponível.`
              : null

  const send = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!agent || !exec || !cfg || !text.trim() || pending || unavailable) return
    const q = text.trim()
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text: q, ts: new Date().toISOString() }
    setHistories((h) => ({ ...h, [histKey]: [...(h[histKey] ?? []), userMsg] }))
    setText('')
    setPending(true)
    const reply = cannedReply(agent.name, agent.description, agent.tags, q)
    const base = inf?.kind === 'externo' ? 900 : 300 + (model?.activeParamsB ?? model?.paramsB ?? 8) * 14
    const profileMult = cfg.analysisProfile === 'Especializado' ? 1.6 : cfg.analysisProfile === 'Avançado' ? 1.25 : 1
    const latency = Math.round(base * profileMult + (hashString(q) % 400))
    const tokensIn = estimateTokens(cfg.systemPrompt) + estimateTokens(q) + history.reduce((s, m) => s + estimateTokens(m.text), 0)
    const tokensOut = Math.min(cfg.maxTokens, estimateTokens(reply))
    const id = histKey
    timer.current = setTimeout(() => {
      setHistories((h) => ({
        ...h,
        [id]: [...(h[id] ?? []), { id: crypto.randomUUID(), role: 'agent', text: reply, ts: new Date().toISOString(), tokensIn, tokensOut, latencyMs: latency }],
      }))
      setPending(false)
    }, Math.min(latency, 2200))
  }

  const totals = history.reduce((s, m) => ({ in: s.in + (m.tokensIn ?? 0), out: s.out + (m.tokensOut ?? 0) }), { in: 0, out: 0 })

  return (
    <>
      <PageHeader
        title="Playground"
        description="Teste conversas com agentes. As respostas são simuladas e predefinidas conforme a finalidade de cada agente."
        crumbs={[{ label: org.name, to: '/' }, { label: 'Agentes', to: '/agentes' }, { label: 'Playground' }]}
      />
      {scope.agents.length === 0 ? (
        <Panel>
          <EmptyState
            title="Nenhum agente disponível"
            action={
              <Link to="/agentes/novo" className="btn-primary">
                Criar agente
              </Link>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Panel
            bodyClassName="flex h-[min(620px,calc(100vh-260px))] min-h-[420px] flex-col"
            title={
              <span className="flex items-center gap-2">
                <label htmlFor="pg-agent" className="sr-only">
                  Agente
                </label>
                <select
                  id="pg-agent"
                  className="input w-auto max-w-[16rem] py-1.5"
                  value={agent?.id ?? ''}
                  onChange={(e) => setParams({ agente: e.target.value })}
                >
                  {scope.agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {agentDeps.length > 1 && (
                  <>
                    <label htmlFor="pg-exec" className="sr-only">
                      Implantação
                    </label>
                    <select id="pg-exec" className="input w-auto max-w-[18rem] py-1.5" value={exec?.id ?? ''} onChange={(e) => setParams({ agente: agentId, implantacao: e.target.value })}>
                      {agentDeps.map((d) => (
                        <option key={d.id} value={d.id}>
                          {data.clusters.find((c) => c.id === d.clusterId)?.name} · v{d.appliedVersion}
                          {deploymentState(data, d).executing ? '' : ' (sem execução)'}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </span>
            }
            actions={
              <button
                className="btn-ghost btn-sm"
                disabled={!history.length}
                onClick={() => exec && setHistories((h) => ({ ...h, [histKey]: [] }))}
              >
                <Eraser className="size-3.5" /> Limpar conversa
              </button>
            }
          >
            <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
              {history.length === 0 && !pending && (
                <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted">
                  <Bot className="mb-2 size-8 text-subtle" />
                  <p>Envie uma mensagem para testar {agent?.name ?? 'o agente'}.</p>
                </div>
              )}
              {history.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${m.role === 'user' ? 'bg-surface-3' : 'bg-accent/15 text-accent'}`}>
                    {m.role === 'user' ? <UserRound className="size-4" /> : <Bot className="size-4" />}
                  </span>
                  <div className={`max-w-[80%] min-w-0 ${m.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block rounded-xl px-3.5 py-2.5 text-left text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-accent/15 text-fg' : 'border border-line bg-surface-2'}`}
                    >
                      {m.text}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-subtle">
                      {fmtTime(m.ts)}
                      {m.role === 'agent' && (
                        <>
                          <Badge tone="warn">Resposta simulada</Badge>
                          <span className="num">
                            {fmtInt(m.tokensIn!)} tokens entrada · {fmtInt(m.tokensOut!)} saída (ilustrativos)
                          </span>
                          <span className="num">latência simulada {fmtInt(m.latencyMs!)} ms</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {pending && (
                <div className="flex items-center gap-3 text-sm text-muted">
                  <span className="flex size-7 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Bot className="size-4" />
                  </span>
                  <Loader2 className="size-4 animate-spin" /> Gerando resposta simulada…
                </div>
              )}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="border-t border-line p-3">
              {unavailable && agent && (
                <div className="mb-2">
                  <Notice tone="warn">{unavailable}</Notice>
                </div>
              )}
              <div className="flex gap-2">
                <label htmlFor="pg-msg" className="sr-only">
                  Mensagem
                </label>
                <textarea
                  id="pg-msg"
                  className="input min-h-11 resize-none"
                  rows={1}
                  value={text}
                  disabled={!!unavailable}
                  placeholder="Digite uma mensagem…"
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) send(e)
                  }}
                />
                <button className="btn-primary" disabled={!text.trim() || pending || !!unavailable} aria-label="Enviar mensagem">
                  <Send className="size-4" />
                </button>
              </div>
            </form>
          </Panel>

          {agent && (
            <div className="space-y-4">
              <Panel title="Configuração do agente" actions={<Link to={`/agentes/${agent.id}`} className="btn-ghost btn-sm">Editar</Link>}>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Status</dt>
                    <dd>
                      <StatusBadge status={execState?.executing ? 'ativo' : exec?.status === 'pausado' ? 'pausado' : 'aviso'} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Executa em</dt>
                    <dd className="text-right">
                      {agentCluster?.name ?? '—'} {exec && <span className="font-mono text-xs text-subtle">v{exec.appliedVersion}</span>}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Inferência via</dt>
                    <dd className="text-right font-mono text-xs">
                      {inf?.label ?? '—'}
                      {inf && <span className="block font-sans text-[11px] text-subtle">{inf.detail}</span>}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Modelo</dt>
                    <dd className="text-right">{model?.name ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Perfil de análise</dt>
                    <dd>{cfg?.analysisProfile ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Temperatura · tokens</dt>
                    <dd className="num">
                      {cfg ? `${cfg.temperature} · ${fmtInt(cfg.maxTokens)}` : '—'}
                    </dd>
                  </div>
                </dl>
              </Panel>
              <Panel title="Rotas ativas">
                {!cfg || cfg.routes.length === 0 ? (
                  <p className="text-sm text-muted">Sem rotas.</p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {cfg.routes.map((r) => (
                      <li key={r.id} className="rounded-lg border border-line bg-surface-2 p-2.5">
                        <p className="font-mono text-fg">{r.condition || '(sem condição)'}</p>
                        <p className="mt-1 text-muted">
                          → {r.target || '—'} <span className="text-subtle">· fallback: {r.fallback || '—'}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel title="Sessão de teste">
                <p className="num text-sm">
                  {history.filter((m) => m.role === 'user').length} {history.filter((m) => m.role === 'user').length === 1 ? 'mensagem' : 'mensagens'} · {fmtInt(totals.in)} tokens de entrada · {fmtInt(totals.out)} de saída
                </p>
                <p className="mt-1 text-[11px] text-subtle">Contagem ilustrativa. Nenhuma inferência real é executada.</p>
              </Panel>
            </div>
          )}
        </div>
      )}
    </>
  )
}
