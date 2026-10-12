import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Check, Cpu, Loader2, MemoryStick, Server, Share2 } from 'lucide-react'
import type { ClusterCapacity, ComputeProfile, LimitPolicy, Modality } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { createCluster } from '../services/api'
import { useToast } from '../components/Toast'
import { Badge, Field, IssueList, OptionCard, PageHeader, Panel } from '../components/ui'
import { CapacityEditor, CapacitySummary, defaultCapacity } from '../components/CapacityEditor'
import { checkPoolFit } from '../lib/capacity'
import { capacityMonthlyCost } from '../lib/costs'
import { fmtBRL0 } from '../lib/format'
import { LIMIT_POLICIES } from '../lib/labels'

const STEPS = ['Nome e finalidade', 'Modalidade', 'Perfil de computação', 'Capacidade', 'Orçamento', 'Resumo']

export default function ClusterCreatePage() {
  const { data, org, setCluster } = useOrg()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [modality, setModality] = useState<Modality>('virtual')
  const [profile, setProfile] = useState<ComputeProfile>('unified')
  const poolsForProfile = data.pools.filter((p) => p.profile === profile)
  const [poolId, setPoolId] = useState(poolsForProfile[0]?.id ?? '')
  const pool = data.pools.find((p) => p.id === poolId) ?? poolsForProfile[0]
  const [capacity, setCapacity] = useState<ClusterCapacity>(() => defaultCapacity(pool, modality))
  const [budget, setBudget] = useState<number | ''>('')
  const [policy, setPolicy] = useState<LimitPolicy>('alertar')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string[]>([])

  const cost = capacityMonthlyCost(profile, modality, capacity)
  const effectiveBudget = budget === '' ? Math.ceil((cost.total * 1.2) / 1000) * 1000 : budget
  const poolIssues = useMemo(() => (pool ? checkPoolFit(data, pool, capacity) : ['Selecione um pool.']), [data, pool, capacity])

  const changeModality = (m: Modality) => {
    setModality(m)
    if (pool) setCapacity(defaultCapacity(pool, m))
  }
  const changeProfile = (p: ComputeProfile) => {
    setProfile(p)
    const first = data.pools.find((x) => x.profile === p)!
    setPoolId(first.id)
    setCapacity(defaultCapacity(first, modality))
  }

  const stepError = (): string | null => {
    if (step === 0 && !name.trim()) return 'Informe o nome do cluster.'
    if (step === 0 && data.clusters.some((c) => c.orgId === org.id && c.name.toLowerCase() === name.trim().toLowerCase()))
      return 'Já existe um cluster com esse nome nesta organização.'
    if (step === 3 && poolIssues.length) return 'Ajuste a capacidade para caber no pool.'
    if (step === 4 && (!effectiveBudget || effectiveBudget <= 0)) return 'Informe um orçamento mensal válido.'
    return null
  }
  const err = stepError()

  const submit = async () => {
    setBusy(true)
    setError([])
    try {
      const c = await createCluster({ orgId: org.id, name, purpose, modality, profile, poolId: pool.id, capacity, monthlyBudget: effectiveBudget, limitPolicy: policy })
      toast.success(`Cluster "${c.name}" em provisionamento.`)
      setCluster(null)
      navigate(`/clusters/${c.id}`)
    } catch (e) {
      const ex = e as { message: string; details?: string[] }
      setError([ex.message, ...(ex.details ?? [])])
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Criar cluster" crumbs={[{ label: org.name, to: '/' }, { label: 'Clusters', to: '/clusters' }, { label: 'Novo' }]} />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr_300px]">
        <ol className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Etapas">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={i === step ? 'step' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm whitespace-nowrap ${i === step ? 'bg-surface-2 text-fg' : i < step ? 'text-muted hover:text-fg' : 'text-subtle'}`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ${i < step ? 'bg-accent text-bg' : i === step ? 'border border-accent text-accent' : 'border border-line-strong'}`}
                >
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                {s}
              </button>
            </li>
          ))}
        </ol>

        <Panel title={`${step + 1}. ${STEPS[step]}`}>
          <div className="space-y-4">
            {step === 0 && (
              <>
                <Field label="Nome do cluster" htmlFor="cl-name">
                  <input id="cl-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Orzyon — Homologação" autoFocus />
                </Field>
                <Field label="Finalidade" htmlFor="cl-purpose" hint="Descrição curta para identificar o uso do cluster.">
                  <textarea id="cl-purpose" className="input min-h-20" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Ex.: Testes de agentes antes da produção." />
                </Field>
              </>
            )}
            {step === 1 && (
              <div className="grid gap-3 md:grid-cols-2">
                <OptionCard
                  name="modality"
                  selected={modality === 'virtual'}
                  onSelect={() => changeModality('virtual')}
                  icon={<Share2 className="size-5" />}
                  title="Virtual"
                  description="Fração de nós compartilhados do pool, com isolamento lógico. Capacidade ajustável por nó."
                />
                <OptionCard
                  name="modality"
                  selected={modality === 'dedicado'}
                  onSelect={() => changeModality('dedicado')}
                  icon={<Server className="size-5" />}
                  title="Dedicado"
                  description="Nós físicos inteiros e exclusivos da organização. Contratação por nó completo."
                />
              </div>
            )}
            {step === 2 && (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <OptionCard
                    name="profile"
                    selected={profile === 'unified'}
                    onSelect={() => changeProfile('unified')}
                    icon={<MemoryStick className="size-5" />}
                    title="Memória unificada AMD"
                    badge={<Badge>demonstrativo</Badge>}
                    description="CPU e GPU compartilham um único total físico de memória. Uma parcela é destinada à GPU."
                  />
                  <OptionCard
                    name="profile"
                    selected={profile === 'dedicated_gpu'}
                    onSelect={() => changeProfile('dedicated_gpu')}
                    icon={<Cpu className="size-5" />}
                    title="GPU com memória dedicada"
                    badge={<Badge>demonstrativo</Badge>}
                    description="RAM do host e VRAM de cada GPU são memórias separadas."
                  />
                </div>
                <Field label="Pool de computação" htmlFor="cl-pool" hint="Infraestrutura operada pela Orzyon Cloud que fornecerá os nós.">
                  <select
                    id="cl-pool"
                    className="input"
                    value={pool?.id}
                    onChange={(e) => {
                      setPoolId(e.target.value)
                      const p = data.pools.find((x) => x.id === e.target.value)!
                      setCapacity(defaultCapacity(p, modality))
                    }}
                  >
                    {poolsForProfile.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.region}
                      </option>
                    ))}
                  </select>
                </Field>
                {pool && <p className="text-xs text-muted">{pool.hardware}</p>}
              </>
            )}
            {step === 3 && pool && (
              <>
                <CapacityEditor pool={pool} modality={modality} value={capacity} onChange={setCapacity} />
                <IssueList title="Capacidade indisponível" issues={poolIssues} />
              </>
            )}
            {step === 4 && (
              <>
                <Field label="Orçamento mensal (R$)" htmlFor="cl-budget" hint={`Capacidade estimada: ${fmtBRL0(cost.total)}/mês. Deixe em branco para usar ${fmtBRL0(Math.ceil((cost.total * 1.2) / 1000) * 1000)}.`}>
                  <input
                    id="cl-budget"
                    type="number"
                    min={0}
                    step={1000}
                    className="input num"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={String(Math.ceil((cost.total * 1.2) / 1000) * 1000)}
                  />
                </Field>
                <fieldset>
                  <legend className="label">Ao atingir o limite</legend>
                  <div className="grid gap-2">
                    {LIMIT_POLICIES.map((p) => (
                      <OptionCard key={p.value} name="policy" selected={policy === p.value} onSelect={() => setPolicy(p.value)} title={p.label} description={p.description} />
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            {step === 5 && (
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-subtle">Nome</dt>
                  <dd>{name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-subtle">Organização</dt>
                  <dd>{org.name}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-subtle">Finalidade</dt>
                  <dd className="text-muted">{purpose || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-subtle">Modalidade</dt>
                  <dd>{modality === 'dedicado' ? 'Dedicado' : 'Virtual'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-subtle">Perfil</dt>
                  <dd>{profile === 'unified' ? 'Memória unificada AMD' : 'GPU com memória dedicada'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-subtle">Pool</dt>
                  <dd>{pool?.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-subtle">Orçamento e política</dt>
                  <dd>
                    {fmtBRL0(effectiveBudget)}/mês · {LIMIT_POLICIES.find((p) => p.value === policy)!.label}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <IssueList title="Não foi possível criar o cluster" issues={error} />
                </div>
              </dl>
            )}
            {err && step !== 3 && <p className="text-xs text-err" role="alert">{err}</p>}
          </div>
          <div className="mt-6 flex justify-between gap-2 border-t border-line pt-4">
            <button className="btn-secondary" onClick={() => (step === 0 ? navigate('/clusters') : setStep(step - 1))}>
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn-primary" disabled={!!err} onClick={() => setStep(step + 1)}>
                Avançar
              </button>
            ) : (
              <button className="btn-primary" disabled={busy || poolIssues.length > 0} onClick={submit}>
                {busy && <Loader2 className="size-4 animate-spin" />} Criar cluster
              </button>
            )}
          </div>
        </Panel>

        <Panel title="Estimativa" description="Valores ilustrativos" className="h-fit lg:sticky lg:top-20">
          <CapacitySummary profile={profile} modality={modality} capacity={capacity} />
        </Panel>
      </div>
    </>
  )
}
