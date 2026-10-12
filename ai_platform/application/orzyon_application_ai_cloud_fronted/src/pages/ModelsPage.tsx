import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Building2, Cloud, Cpu, ExternalLink, Loader2, Server, ShieldAlert, Zap } from 'lucide-react'
import type { IntegrationStatus, ModelProfile } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { disableModelAccess, enableModelAccess } from '../services/api'
import { useToast } from '../components/Toast'
import { Badge, ConfirmDialog, CopyButton, EmptyState, Notice, PageHeader, Panel, Segmented, Tabs } from '../components/ui'
import { DeployModelDialog, DeploymentsTable, EngineStatusBadge } from '../components/workloads'
import { estimateModelMemory } from '../lib/capacity'
import { orgScope } from '../lib/selectors'
import { clientRates, orgTokenUsage } from '../lib/modelPricing'
import { fmtBRL, fmtCompact, fmtDate, fmtGiB, fmtInt, fmtNum } from '../lib/format'
import { INTEGRATION_STATUS } from '../lib/labels'

type Tab = 'catalogo' | 'acessos' | 'implantacoes' | 'motores'
const TABS: { value: Tab; label: string }[] = [
  { value: 'catalogo', label: 'Catálogo' },
  { value: 'acessos', label: 'Acesso por tokens' },
  { value: 'implantacoes', label: 'Implantações dedicadas' },
  { value: 'motores', label: 'Motores e runtimes' },
]

export const API_BASE = 'https://api.orzyon-cloud.example/v1'

export default function ModelsPage() {
  const { tab = 'catalogo' } = useParams()
  const navigate = useNavigate()
  const { data, org, cluster } = useOrg()
  const [deployOpen, setDeployOpen] = useState(false)
  const [deployModel, setDeployModel] = useState<string | undefined>()
  const [status, setStatus] = useState('')
  const scope = orgScope(data, org.id, cluster?.id)
  const current = (TABS.some((t) => t.value === tab) ? tab : 'catalogo') as Tab
  const deployments = scope.deployments.filter((d) => !status || d.status === status)

  const openDeploy = (modelId?: string) => {
    setDeployModel(modelId)
    setDeployOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Modelos"
        description="Catálogo de IA da Orzyon Cloud: modelos hospedados na infraestrutura Orzyon, modelos de provedores externos e implantações dedicadas nos clusters."
        crumbs={[{ label: org.name, to: '/' }, ...(cluster ? [{ label: cluster.name, to: `/clusters/${cluster.id}` }] : []), { label: 'Modelos' }]}
        actions={
          <button className="btn-primary" onClick={() => openDeploy()}>
            <Cpu className="size-4" /> Implantar no cluster
          </button>
        }
      />
      <Tabs tabs={TABS} value={current} onChange={(t) => navigate(t === 'catalogo' ? '/modelos' : `/modelos/${t}`)} />

      {current === 'catalogo' && <Catalog onDeploy={openDeploy} />}
      {current === 'acessos' && <Accesses />}

      {current === 'implantacoes' && (
        <Panel
          bodyClassName=""
          title={cluster ? `Implantações em ${cluster.name}` : 'Implantações dedicadas da organização'}
          description="Recursos reservados no cluster do cliente, cobrados pela capacidade contratada. Uma implantação pode atender vários agentes sem duplicar a memória dos pesos."
          actions={
            <select className="input w-auto py-1.5" aria-label="Filtrar por status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="preparando">Preparando</option>
              <option value="carregando">Carregando</option>
              <option value="disponivel">Disponível</option>
              <option value="pausado">Pausado</option>
              <option value="falha">Falha</option>
            </select>
          }
        >
          <DeploymentsTable deployments={deployments} showCluster={!cluster} />
        </Panel>
      )}

      {current === 'motores' && <Engines />}

      <DeployModelDialog open={deployOpen} onClose={() => setDeployOpen(false)} clusterId={cluster?.id} modelId={deployModel} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Catálogo

function OfferingSummary() {
  const items = [
    {
      icon: <Zap className="size-4" />,
      title: 'Inferência compartilhada Orzyon',
      body: 'Modelos hospedados na infraestrutura Orzyon. Paga apenas tokens; a infraestrutura está embutida na tarifa. Não exige cluster.',
    },
    {
      icon: <Server className="size-4" />,
      title: 'Cluster dedicado',
      body: 'Implantação em recursos reservados no cluster do cliente, cobrada pela capacidade contratada. Sem taxa por token nesta demonstração.',
    },
    {
      icon: <Cloud className="size-4" />,
      title: 'Modelos externos',
      body: 'Acesso por API a OpenAI, Anthropic, xAI e outros. Cobrança por tokens e recursos adicionais do provedor; conteúdo processado pelo fornecedor.',
    },
  ]
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((i) => (
        <div key={i.title} className="card p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="text-accent">{i.icon}</span> {i.title}
          </p>
          <p className="mt-1 text-xs text-muted">{i.body}</p>
        </div>
      ))}
    </div>
  )
}

type OfferingFilter = 'todos' | 'hosted' | 'external'

interface CatalogGroup {
  key: string
  title: string
  models: ModelProfile[]
}

interface CatalogSection {
  key: string
  title: string
  description: string
  groups: CatalogGroup[]
}

/** Agrupa os modelos pela chave, em ordem alfabética. */
function groupModels(models: ModelProfile[], keyOf: (m: ModelProfile) => string): CatalogGroup[] {
  const byKey = new Map<string, ModelProfile[]>()
  for (const m of models) byKey.set(keyOf(m), [...(byKey.get(keyOf(m)) ?? []), m])
  return [...byKey].sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).map(([key, ms]) => ({ key, title: key, models: ms }))
}

/**
 * Catálogo separado por onde o modelo executa: abertos (hospedados na Orzyon, por família) e
 * provedores externos (por provedor e família).
 */
function catalogSections(models: ModelProfile[]): CatalogSection[] {
  const hosted = models.filter((m) => m.offering === 'hosted')
  const external = models.filter((m) => m.offering === 'external')
  const sections: CatalogSection[] = []
  if (hosted.length) {
    sections.push({
      key: 'hosted',
      title: 'Modelos abertos',
      description: 'Executados pela Orzyon Cloud, em infraestrutura própria. Agrupados por família.',
      groups: groupModels(hosted, (m) => m.family),
    })
  }
  if (external.length) {
    sections.push({
      key: 'external',
      title: 'Provedores externos',
      description: 'Executados pelo fornecedor, com cobrança por tokens. Agrupados por provedor e família.',
      groups: groupModels(external, (m) => `${m.provider ?? 'Provedor não informado'} · ${m.family}`),
    })
  }
  return sections
}

function Catalog({ onDeploy }: { onDeploy: (modelId: string) => void }) {
  const { data, org } = useOrg()
  const [offering, setOffering] = useState<OfferingFilter>('todos')
  const [family, setFamily] = useState('')
  const [st, setSt] = useState('')
  const [ack, setAck] = useState<ModelProfile | null>(null)
  const [ackChecked, setAckChecked] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const toast = useToast()
  const families = [...new Set(data.models.map((m) => m.family))]
  const rows = data.models.filter((m) => (offering === 'todos' || m.offering === offering) && (!family || m.family === family) && (!st || m.status === st))
  const enabled = new Set(data.modelAccess.filter((a) => a.orgId === org.id).map((a) => a.modelId))

  const enable = async (m: ModelProfile, acknowledged = false) => {
    setBusy(m.id)
    try {
      await enableModelAccess(org.id, m.id, acknowledged)
      toast.success(`Acesso a ${m.name} habilitado.`)
      setAck(null)
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <OfferingSummary />
      <Notice>
        Candidatos de avaliação; não representam necessariamente as versões mais recentes nem compatibilidade confirmada com o hardware. Cada versão é habilitada conforme a
        integração e a capacidade disponível. Licença do modelo e local de execução são avaliados separadamente. Tarifas são demonstrativas.
      </Notice>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Onde executa"
          value={offering}
          onChange={setOffering}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'hosted', label: 'Hospedados na Orzyon' },
            { value: 'external', label: 'Provedores externos' },
          ]}
        />
        <select className="input w-auto py-1.5" aria-label="Família" value={family} onChange={(e) => setFamily(e.target.value)}>
          <option value="">Todas as famílias</option>
          {families.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select className="input w-auto py-1.5" aria-label="Estado" value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Todos os estados</option>
          {(Object.keys(INTEGRATION_STATUS) as IntegrationStatus[]).map((k) => (
            <option key={k} value={k}>
              {INTEGRATION_STATUS[k].label}
            </option>
          ))}
        </select>
      </div>
      {rows.length === 0 ? (
        <Panel>
          <EmptyState title="Nenhum modelo corresponde aos filtros" />
        </Panel>
      ) : (
        <div className="space-y-10">
          {catalogSections(rows).map((sec) => (
            <section key={sec.key} aria-labelledby={`catalogo-${sec.key}`} className="space-y-6">
              <div>
                <h2 id={`catalogo-${sec.key}`} className="text-sm font-semibold">
                  {sec.title}
                </h2>
                <p className="text-xs text-muted">{sec.description}</p>
              </div>
              {sec.groups.map((g) => (
                <div key={g.key} className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted uppercase">
                    {g.title}
                    <span className="num text-subtle normal-case">{g.models.length}</span>
                  </h3>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {g.models.map((m) => (
                      <ModelCard
                        key={m.id}
                        model={m}
                        enabled={enabled.has(m.id)}
                        busy={busy === m.id}
                        onUse={() => (m.offering === 'external' ? (setAckChecked(false), setAck(m)) : enable(m))}
                        onDeploy={() => onDeploy(m.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!ack}
        onClose={() => setAck(null)}
        title={`Habilitar acesso a ${ack?.name ?? ''}`}
        confirmLabel="Habilitar acesso"
        confirmDisabled={!ackChecked}
        busy={!!ack && busy === ack.id}
        onConfirm={() => ack && enable(ack, true)}
      >
        <div className="space-y-3 text-sm">
          <Notice tone="warn">
            Este modelo é executado pela {ack?.provider}. Prompts, arquivos e respostas enviados a ele serão processados na infraestrutura desse fornecedor, fora da Orzyon
            Cloud, conforme os termos do provedor.
          </Notice>
          {ack && <PriceRows model={ack} />}
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-0.5" checked={ackChecked} onChange={(e) => setAckChecked(e.target.checked)} />
            <span>Entendo que o conteúdo será processado por {ack?.provider} e que a cobrança é por tokens, conforme a tarifa acima.</span>
          </label>
        </div>
      </ConfirmDialog>
    </div>
  )
}

function PriceRows({ model }: { model: ModelProfile }) {
  const { data } = useOrg()
  const r = clientRates(model, data.commercial)
  if (!r) return <p className="text-xs text-subtle">Tarifa não cadastrada.</p>
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {[
        ['Entrada', r.input],
        ['Saída', r.output],
        ['Entrada em cache', r.cachedInput],
      ].map(([label, v]) => (
        <div key={label as string} className="rounded-lg border border-line bg-surface-2 px-2 py-2">
          <p className="text-[11px] text-subtle">{label}</p>
          <p className="num font-medium">{v === null ? '—' : fmtBRL(v as number)}</p>
          <p className="text-[10px] text-subtle">por 1 milhão de tokens</p>
        </div>
      ))}
    </div>
  )
}

function paramsText(m: ModelProfile) {
  if (m.paramsB === null) return 'Não divulgado'
  if (m.architecture === 'MoE' && m.activeParamsB) return `${fmtNum(m.paramsB, 1)} B totais · ${fmtNum(m.activeParamsB, 1)} B ativos (MoE)`
  return `${fmtNum(m.paramsB, 1)} B (denso)`
}

function ModelCard({ model: m, enabled, busy, onUse, onDeploy }: { model: ModelProfile; enabled: boolean; busy: boolean; onUse: () => void; onDeploy: () => void }) {
  const { data } = useOrg()
  const hosted = m.offering === 'hosted'
  const ready = m.status === 'homologada'
  const providerDoc = 'Conforme documentação do provedor'
  const engines = data.engines.filter((e) => e.quantizations.some((q) => m.quantizations.includes(q)) && Object.values(e.support).includes('homologada'))
  const minQuant = m.quantizations[m.quantizations.length - 1]
  const rows: [string, React.ReactNode][] = [
    [
      'Identificador',
      m.identifier ? <code className="font-mono text-xs break-all">{m.identifier}</code> : <span className="text-warn">Cadastrar identificador e versão exatos</span>,
    ],
    ['Fornecedor', m.vendor],
    ['Licença', m.license],
    ['Parâmetros', paramsText(m)],
    ['Contexto', m.maxContext ? `${fmtInt(m.maxContext)} tokens (versão homologada)` : providerDoc],
    ['Modalidades', m.modalities ? m.modalities.join(', ') : providerDoc],
    ['Quantização', hosted ? `Definida na implantação: ${m.quantizations.join(', ')}` : 'Gerenciada pelo provedor'],
    [
      'Memória',
      hosted && minQuant ? `A partir de ≈ ${fmtGiB(estimateModelMemory(m, minQuant, 8192).totalGiB)} (${minQuant}, 8 mil tokens) — estimativa` : 'Infraestrutura do provedor',
    ],
    ['Motor', hosted ? engines.map((e) => e.name).join(', ') || '—' : 'Gerenciado pelo provedor'],
    ['Processamento', hosted ? 'Orzyon Cloud' : `Provedor externo: ${m.provider}`],
  ]
  return (
    <section className="card flex min-w-0 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {m.name}
            <Badge tone="muted">{m.family}</Badge>
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {m.role} · <span className="text-subtle">{m.strategy}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hosted ? (
            <Badge tone="accent">
              <Building2 className="size-3" /> Hospedado na Orzyon
            </Badge>
          ) : (
            <Badge tone="violet">
              <ExternalLink className="size-3" /> API externa · {m.provider}
            </Badge>
          )}
          <EngineStatusBadge status={m.status} />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-4">
        <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-xs text-subtle">{k}</dt>
              <dd className="min-w-0 text-xs text-fg/90">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted">
            Preço {hosted ? '— inferência compartilhada' : ''}
            {m.providerCost?.demo && <Badge tone="warn">tarifa demonstrativa</Badge>}
          </p>
          <PriceRows model={m} />
          {hosted && <p className="mt-1 text-[11px] text-subtle">Infraestrutura embutida na tarifa. Em cluster dedicado, cobra-se a capacidade reservada.</p>}
        </div>
        {hosted && m.quantizations.length > 0 && (
          <details className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs">
            <summary className="cursor-pointer text-muted">Estimativa de memória por configuração</summary>
            <table className="mt-2 w-full">
              <thead>
                <tr className="text-subtle">
                  <th className="pb-1 text-left font-normal">Quantização</th>
                  <th className="pb-1 text-right font-normal">8 mil tokens</th>
                  <th className="pb-1 text-right font-normal">32 mil tokens</th>
                </tr>
              </thead>
              <tbody>
                {m.quantizations.map((q) => (
                  <tr key={q} className="border-t border-line/60">
                    <td className="py-1 font-mono">{q}</td>
                    <td className="num py-1 text-right">{fmtGiB(estimateModelMemory(m, q, 8192).totalGiB)}</td>
                    <td className="num py-1 text-right">{fmtGiB(estimateModelMemory(m, q, 32768).totalGiB)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1.5 text-subtle">
              Ilustrativo. A memória real depende de quantização, contexto, concorrência e motor, e deve ser calculada ou medida para cada configuração.
              {m.architecture === 'MoE' && ' Em MoE, o total de parâmetros define a memória dos pesos; os ativos influenciam parte do cálculo.'}
            </p>
          </details>
        )}
        {m.note && <p className="text-[11px] text-subtle">{m.note}</p>}
        {!hosted && (
          <p className="flex items-start gap-1.5 text-[11px] text-warn">
            <ShieldAlert className="mt-px size-3.5 shrink-0" /> Ao usar este modelo, o conteúdo é processado por {m.provider}.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        {!ready ? (
          <span className="text-xs text-subtle">{m.status === 'experimental' ? 'Em avaliação — disponível após homologação.' : 'Planejado — ainda não avaliado.'}</span>
        ) : enabled ? (
          <Link to="/modelos/acessos" className="btn-secondary btn-sm">
            Acesso habilitado · ver endpoint
          </Link>
        ) : (
          <button className="btn-primary btn-sm" disabled={busy} onClick={onUse}>
            {busy && <Loader2 className="size-3.5 animate-spin" />} {hosted ? 'Usar modelo' : 'Habilitar acesso'}
          </button>
        )}
        {hosted && ready && (
          <button className="btn-secondary btn-sm" onClick={onDeploy}>
            <Cpu className="size-3.5" /> Implantar no cluster
          </button>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Acessos por tokens

function Accesses() {
  const { data, org } = useOrg()
  const toast = useToast()
  const usage = orgTokenUsage(data, org.id)
  const [toDisable, setToDisable] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const target = usage.items.find((x) => x.access.id === toDisable)
  return (
    <div className="space-y-4">
      <Notice>
        Modelos habilitados para a organização, cobrados por tokens. Use o endpoint compatível com a API de chat e o identificador do modelo. As chaves e o saldo pré-pago
        ficam na página Acesso à API.
      </Notice>
      <Panel title="Acessos habilitados" description={`Consumo do mês corrente (ilustrativo) · ${org.name}`} bodyClassName="">
        {usage.items.length === 0 ? (
          <EmptyState
            title="Nenhum modelo habilitado"
            description="Habilite um modelo no catálogo para usá-lo por tokens, sem contratar um cluster."
            action={
              <Link to="/modelos" className="btn-primary">
                Abrir catálogo
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="th">Modelo</th>
                  <th className="th">Processamento</th>
                  <th className="th">Identificador na API</th>
                  <th className="th text-right">Entrada / saída (R$/1M)</th>
                  <th className="th text-right">Tokens no mês</th>
                  <th className="th text-right">Custo no mês</th>
                  <th className="th text-right">Projeção</th>
                  <th className="th">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {usage.items.map((u) => {
                  const apiId = u.model.identifier ?? u.model.id
                  return (
                    <tr key={u.access.id}>
                      <td className="td">
                        <p className="font-medium">{u.model.name}</p>
                        <p className="text-xs text-subtle">habilitado em {fmtDate(u.access.enabledAt)}</p>
                      </td>
                      <td className="td">
                        {u.model.offering === 'hosted' ? <Badge tone="accent">Orzyon Cloud</Badge> : <Badge tone="violet">{u.model.provider}</Badge>}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs">{apiId}</code>
                          <CopyButton text={apiId} label="Copiar" />
                        </div>
                      </td>
                      <td className="td num text-right text-xs whitespace-nowrap">
                        {fmtBRL(u.rates.input)} / {fmtBRL(u.rates.output)}
                      </td>
                      <td className="td num text-right text-xs whitespace-nowrap">
                        {fmtCompact(u.tokensIn)} entrada · {fmtCompact(u.tokensOut)} saída
                        <span className="block text-subtle">{fmtCompact(u.cachedIn)} em cache</span>
                      </td>
                      <td className="td num text-right">{fmtBRL(u.toDate)}</td>
                      <td className="td num text-right text-muted">{fmtBRL(u.projected)}</td>
                      <td className="td text-right">
                        <button className="btn-ghost btn-sm text-err hover:text-err" onClick={() => setToDisable(u.access.id)}>
                          Desabilitar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-line-strong font-medium">
                <tr>
                  <td className="td" colSpan={5}>
                    Total por tokens
                  </td>
                  <td className="td num text-right">{fmtBRL(usage.toDate)}</td>
                  <td className="td num text-right">{fmtBRL(usage.projected)}</td>
                  <td className="td" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {usage.items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line p-4 text-xs text-muted">
            Endpoint: <code className="font-mono text-fg">{API_BASE}/chat/completions</code>
            <CopyButton text={`${API_BASE}/chat/completions`} label="Copiar endpoint" />
          </div>
        )}
      </Panel>
      <ConfirmDialog
        open={!!toDisable}
        onClose={() => setToDisable(null)}
        title="Desabilitar acesso"
        description={`Requisições a ${target?.model.name ?? 'este modelo'} deixarão de ser aceitas para ${org.name}. O consumo já registrado no mês permanece.`}
        danger
        confirmLabel="Desabilitar"
        busy={busy}
        onConfirm={async () => {
          setBusy(true)
          try {
            await disableModelAccess(toDisable!)
            toast.success('Acesso desabilitado.')
            setToDisable(null)
          } catch (e) {
            toast.error(e)
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Motores

function Engines() {
  const { data, org, cluster } = useOrg()
  const scope = orgScope(data, org.id, cluster?.id)
  return (
    <div className="space-y-4">
      <Notice>
        MIT e Apache 2.0 permitem uso comercial, inclusive cobrar pela hospedagem e pela inferência, sem licença paga adicional. Elas exigem preservar avisos de copyright e de
        licença, principalmente na redistribuição, e não obrigam a abrir o código do painel ou do backend. A licença de cada modelo carregado é avaliada separadamente da licença do
        motor. Estados de integração são ilustrativos deste protótipo.
      </Notice>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        {(Object.keys(INTEGRATION_STATUS) as IntegrationStatus[]).reverse().map((k) => (
          <span key={k} className="flex items-center gap-2">
            <EngineStatusBadge status={k} /> {INTEGRATION_STATUS[k].description}
          </span>
        ))}
      </div>
      {(['motor', 'runtime'] as const).map((cat) => (
        <Panel
          key={cat}
          title={cat === 'motor' ? 'Motores de inferência' : 'Runtimes simplificados'}
          description={
            cat === 'motor'
              ? 'Software que executa os pesos do modelo e expõe a API de inferência.'
              : 'Camadas de execução e gerenciamento de modelos; não são a mesma categoria de um motor.'
          }
          bodyClassName=""
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="th">{cat === 'motor' ? 'Motor' : 'Runtime'}</th>
                  <th className="th">Licença</th>
                  <th className="th">AMD</th>
                  <th className="th">Papel na Orzyon Cloud</th>
                  <th className="th">Memória unificada</th>
                  <th className="th">GPU dedicada</th>
                  <th className="th">Execução</th>
                  <th className="th text-right">Implantações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.engines
                  .filter((e) => e.category === cat)
                  .map((e) => (
                    <tr key={e.id} className="align-top">
                      <td className="td">
                        <p className="font-medium">{e.name}</p>
                        <p className="text-xs text-subtle">{e.project}</p>
                      </td>
                      <td className="td whitespace-nowrap">
                        {e.license}
                        {e.permissive ? (
                          <span className="block text-[11px] text-ok">permite uso comercial</span>
                        ) : (
                          <span className="block text-[11px] text-warn">verificar termos comerciais</span>
                        )}
                      </td>
                      <td className="td max-w-56 text-xs text-muted">{e.amdSupport}</td>
                      <td className="td max-w-64 text-xs text-muted">
                        {e.role}
                        <span className="mt-1 block text-subtle">{e.description}</span>
                      </td>
                      <td className="td">
                        <EngineStatusBadge status={e.support.unified} />
                      </td>
                      <td className="td">
                        <EngineStatusBadge status={e.support.dedicated_gpu} />
                      </td>
                      <td className="td text-xs whitespace-nowrap">{e.devices.map((d) => d.toUpperCase()).join(' / ')}</td>
                      <td className="td num text-right">{scope.deployments.filter((d) => d.engineId === e.id).length}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
      <Panel title="Ordem de avaliação para memória unificada AMD" description="Prioridade de testes no equipamento escolhido">
        <ol className="space-y-3 text-sm">
          <li>
            <span className="font-medium">1. llama.cpp</span>
            <span className="block text-xs text-muted">Primeiro candidato, especialmente com modelos GGUF quantizados. Caminhos CPU, HIP e Vulkan oferecem alternativas de execução.</span>
          </li>
          <li>
            <span className="font-medium">2. MLC LLM</span>
            <span className="block text-xs text-muted">
              Explorar compilação e portabilidade entre GPUs. Exige avaliar o suporte a cada modelo e o processo de preparação para o hardware.
            </span>
          </li>
          <li>
            <span className="font-medium">3. SGLang</span>
            <span className="block text-xs text-muted">
              Para a oferta de maior escala com GPUs AMD Instinct. A documentação cita MI300X, MI325X, MI350X e MI355X, o que não comprova suporte equivalente à APU pretendida.
            </span>
          </li>
        </ol>
      </Panel>
    </div>
  )
}
