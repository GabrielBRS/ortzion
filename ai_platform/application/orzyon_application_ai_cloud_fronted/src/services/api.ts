// Serviços mock assíncronos. As telas só alteram dados por aqui, então trocar por
// chamadas HTTP reais não exige reescrever as páginas.
import type {
  ActivityEvent,
  Agent,
  ApiKey,
  AppData,
  AppInference,
  Application,
  Cluster,
  ClusterCapacity,
  CreditEntry,
  EventLevel,
  LimitPolicy,
  LogLine,
  ModelDeployment,
  Organization,
  Quantization,
  Reservation,
  Service,
  ServiceKind,
  Simulation,
  SimulationStep,
  SourceRuntime,
  EnvVar,
  Device,
  CommercialSettings,
  AgentConfig,
  AgentDeployment,
  AgentReplica,
  InferenceTarget,
} from '../domain/types'
import { makeReplicas } from './migrations'
import { KEY_PREFIX, generateApiKey } from '../lib/gateway'
import { integrationLabel, profileLabel } from '../lib/labels'
import {
  checkCapacityAgainstReservations,
  checkFit,
  checkPoolFit,
  deploymentReservation,
  estimateModelMemory,
  scaleRes,
} from '../lib/capacity'
import { slugify, uid } from '../lib/format'
import { getData, resetData, setData } from './store'

export class ApiError extends Error {
  details: string[]
  constructor(message: string, details: string[] = []) {
    super(message)
    this.details = details
  }
}

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms))

function event(orgId: string, level: EventLevel, source: string, message: string, clusterId?: string): ActivityEvent {
  return { id: uid('ev'), orgId, clusterId, ts: new Date().toISOString(), level, source, message }
}

function withEvent(d: AppData, e: ActivityEvent): AppData {
  return { ...d, events: [e, ...d.events].slice(0, 300) }
}

const orgOfCluster = (d: AppData, clusterId: string) => d.clusters.find((c) => c.id === clusterId)?.orgId ?? ''

function requireCluster(clusterId: string): Cluster {
  const c = getData().clusters.find((x) => x.id === clusterId)
  if (!c) throw new ApiError('Cluster não encontrado.')
  return c
}

const sim = (steps: SimulationStep[]): Simulation => ({ startedAt: Date.now(), steps, applied: 0 })

const SECRET_RE = /secret|token|senha|password|key/i

/** Variáveis demonstrativas: sem nome vazio; valores de nomes sensíveis não são persistidos. */
function cleanEnv(env: EnvVar[]): EnvVar[] {
  return env.filter((e) => e.key.trim()).map((e) => ({ key: e.key.trim(), value: SECRET_RE.test(e.key) ? '' : e.value }))
}

// ---------------------------------------------------------------------------
// Organização

export async function updateOrganization(orgId: string, patch: Partial<Omit<Organization, 'id'>>) {
  await delay()
  setData((d) =>
    withEvent(
      { ...d, orgs: d.orgs.map((o) => (o.id === orgId ? { ...o, ...patch } : o)) },
      event(orgId, 'info', 'Organização', 'Configurações da organização atualizadas.'),
    ),
  )
}

export interface CreateOrganizationInput {
  name: string
  monthlyBudget: number
  owner: { name: string; email: string }
}

/** Nova organização de cliente (B2B), criada dentro da plataforma com o responsável como proprietário. */
export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
  await delay(400)
  const d = getData()
  const name = input.name.trim()
  const slug = slugify(name)
  if (!slug) throw new ApiError('Informe um nome com letras ou números.')
  if (d.orgs.some((o) => o.slug === slug)) throw new ApiError('Já existe uma organização com esse nome.')
  if (!(input.monthlyBudget > 0)) throw new ApiError('Informe um orçamento mensal maior que zero.')
  if (!/^\S+@\S+\.\S+$/.test(input.owner.email.trim())) throw new ApiError('Informe um e-mail válido para o responsável.')
  const org: Organization = {
    id: uid('org'),
    name,
    slug,
    segment: 'b2b',
    monthlyBudget: input.monthlyBudget,
    limitPolicy: 'alertar',
    alertThreshold: 0.85,
    members: [{ id: uid('m'), name: input.owner.name.trim() || 'Responsável', email: input.owner.email.trim(), role: 'Proprietário' }],
  }
  setData((s) => withEvent({ ...s, orgs: [...s.orgs, org] }, event(org.id, 'sucesso', 'Organização', `Organização "${name}" criada.`)))
  return org
}

// ---------------------------------------------------------------------------
// Clusters

export interface CreateClusterInput {
  orgId: string
  name: string
  purpose: string
  modality: Cluster['modality']
  profile: Cluster['profile']
  poolId: string
  capacity: ClusterCapacity
  monthlyBudget: number
  limitPolicy: LimitPolicy
}

export async function createCluster(input: CreateClusterInput): Promise<Cluster> {
  await delay(500)
  const d = getData()
  if (!input.name.trim()) throw new ApiError('Informe um nome para o cluster.')
  if (d.clusters.some((c) => c.orgId === input.orgId && c.name.toLowerCase() === input.name.trim().toLowerCase()))
    throw new ApiError('Já existe um cluster com esse nome nesta organização.')
  const pool = d.pools.find((p) => p.id === input.poolId)
  if (!pool) throw new ApiError('Pool de computação indisponível.')
  const issues = checkPoolFit(d, pool, input.capacity)
  if (issues.length) throw new ApiError('Capacidade indisponível no pool selecionado.', issues)
  const cluster: Cluster = {
    id: uid('cl'),
    ...input,
    name: input.name.trim(),
    status: 'provisionando',
    createdAt: new Date().toISOString(),
    simulation: sim([
      { afterMs: 0, status: 'provisionando', log: 'Reservando nós no pool.' },
      { afterMs: 6000, status: 'ativo', log: 'Cluster provisionado e ativo.' },
    ]),
  }
  setData((s) =>
    withEvent({ ...s, clusters: [...s.clusters, cluster] }, event(input.orgId, 'info', 'Cluster', `Provisionamento do cluster "${cluster.name}" iniciado.`, cluster.id)),
  )
  return cluster
}

export async function updateClusterCapacity(clusterId: string, capacity: ClusterCapacity) {
  await delay(500)
  const d = getData()
  const cluster = requireCluster(clusterId)
  const pool = d.pools.find((p) => p.id === cluster.poolId)!
  const issues = [...checkCapacityAgainstReservations(d, cluster, capacity), ...checkPoolFit(d, pool, capacity, clusterId)]
  if (issues.length) throw new ApiError('Não foi possível aplicar a nova capacidade.', issues)
  setData((s) =>
    withEvent(
      { ...s, clusters: s.clusters.map((c) => (c.id === clusterId ? { ...c, capacity } : c)) },
      event(cluster.orgId, 'info', 'Cluster', `Capacidade do cluster "${cluster.name}" alterada.`, clusterId),
    ),
  )
}

export async function updateCluster(clusterId: string, patch: Partial<Pick<Cluster, 'name' | 'purpose' | 'monthlyBudget' | 'limitPolicy'>>) {
  await delay()
  const cluster = requireCluster(clusterId)
  setData((s) =>
    withEvent(
      { ...s, clusters: s.clusters.map((c) => (c.id === clusterId ? { ...c, ...patch } : c)) },
      event(cluster.orgId, 'info', 'Cluster', `Configurações do cluster "${patch.name ?? cluster.name}" atualizadas.`, clusterId),
    ),
  )
}

export async function setClusterPaused(clusterId: string, paused: boolean) {
  await delay(500)
  const cluster = requireCluster(clusterId)
  if (cluster.status === 'provisionando') throw new ApiError('Aguarde o término do provisionamento.')
  setData((s) =>
    withEvent(
      { ...s, clusters: s.clusters.map((c) => (c.id === clusterId ? { ...c, status: paused ? 'pausado' : 'ativo' } : c)) },
      event(cluster.orgId, paused ? 'aviso' : 'sucesso', 'Cluster', `Cluster "${cluster.name}" ${paused ? 'pausado' : 'retomado'}.`, clusterId),
    ),
  )
}

export function clusterDependencies(d: AppData, clusterId: string) {
  return {
    agents: d.agentDeployments
      .filter((a) => a.clusterId === clusterId)
      .map((a) => ({ id: a.id, name: d.agents.find((x) => x.id === a.agentId)?.name ?? a.id })),
    services: d.services.filter((s) => s.clusterId === clusterId),
    deployments: d.deployments.filter((x) => x.clusterId === clusterId),
  }
}

export async function deleteCluster(clusterId: string, cascade: boolean) {
  await delay(500)
  const d = getData()
  const cluster = requireCluster(clusterId)
  const deps = clusterDependencies(d, clusterId)
  const count = deps.agents.length + deps.services.length + deps.deployments.length
  // Implantações de modelo deste cluster usadas por agentes de outros clusters bloqueiam a exclusão.
  const localModels = new Set(deps.deployments.map((x) => x.id))
  const external = d.agentDeployments.filter((a) => a.clusterId !== clusterId && a.inference.kind === 'deployment' && localModels.has(a.inference.deploymentId))
  if (external.length)
    throw new ApiError('Agentes de outros clusters usam modelos implantados aqui. Altere o destino de inferência deles primeiro:', [
      ...external.map((a) => `${d.agents.find((x) => x.id === a.agentId)?.name} em ${d.clusters.find((c) => c.id === a.clusterId)?.name}`),
    ])
  if (count > 0 && !cascade)
    throw new ApiError('O cluster possui cargas de trabalho. Remova-as ou confirme a remoção em cascata.', [
      ...deps.agents.map((a) => `Implantação do agente: ${a.name}`),
      ...deps.services.map((s) => `Serviço: ${s.name}`),
      ...deps.deployments.map((x) => `Implantação: ${x.name}`),
    ])
  setData((s) =>
    withEvent(
      {
        ...s,
        clusters: s.clusters.filter((c) => c.id !== clusterId),
        agentDeployments: s.agentDeployments.filter((a) => a.clusterId !== clusterId),
        services: s.services.filter((x) => x.clusterId !== clusterId),
        deployments: s.deployments.filter((x) => x.clusterId !== clusterId),
      },
      event(cluster.orgId, 'aviso', 'Cluster', `Cluster "${cluster.name}" excluído${count ? ` com ${count} cargas removidas` : ''}.`),
    ),
  )
}

// ---------------------------------------------------------------------------
// Implantações de modelo

export interface CreateDeploymentInput {
  clusterId: string
  modelId: string
  engineId: string
  device: Device
  quantization: Quantization
  contextLength: number
  name?: string
}

export function planDeployment(d: AppData, input: CreateDeploymentInput) {
  const cluster = d.clusters.find((c) => c.id === input.clusterId)
  const model = d.models.find((m) => m.id === input.modelId)
  const engine = d.engines.find((e) => e.id === input.engineId)
  if (!cluster || !model || !engine) return null
  const estimate = estimateModelMemory(model, input.quantization, input.contextLength)
  const reservation = deploymentReservation(cluster, input.device, estimate)
  const integration = engine.support[cluster.profile]

  // Bloqueios de integração: só combinações homologadas podem ser implantadas.
  const blockers: string[] = []
  const profile = profileLabel(cluster.profile)
  if (model.offering === 'external')
    blockers.push(`${model.name} é executado na infraestrutura do provedor e não pode ser implantado em um cluster.`)
  else if (model.status !== 'homologada')
    blockers.push(`${model.name} está ${integrationLabel(model.status).toLowerCase()} no catálogo; só versões homologadas podem ser implantadas.`)
  if (!integration) blockers.push(`O ${engine.name} não tem integração prevista para ${profile}.`)
  else if (integration !== 'homologada')
    blockers.push(
      `A integração ${engine.name} + ${profile} está ${integrationLabel(integration).toLowerCase()}. No protótipo, só combinações homologadas de motor, modelo e hardware podem ser implantadas.`,
    )
  if (!engine.devices.includes(input.device)) blockers.push(`O ${engine.name} não executa em ${input.device === 'cpu' ? 'CPU' : 'GPU'}.`)
  if (!engine.quantizations.includes(input.quantization)) blockers.push(`O ${engine.name} não oferece a quantização ${input.quantization} neste catálogo.`)
  if (input.device === 'cpu' && (model.paramsB ?? 0) > 10) blockers.push('Execução em CPU aceita apenas modelos de até 10B parâmetros neste cenário demonstrativo.')
  if (model.maxContext && input.contextLength > model.maxContext)
    blockers.push(`O contexto homologado do ${model.name} é ${model.maxContext.toLocaleString('pt-BR')} tokens.`)

  const issues = checkFit(d, cluster, reservation)
  return { cluster, model, engine, integration, estimate, reservation, blockers, issues }
}

export async function createDeployment(input: CreateDeploymentInput): Promise<ModelDeployment> {
  await delay(500)
  const d = getData()
  const plan = planDeployment(d, input)
  if (!plan) throw new ApiError('Selecione cluster, modelo e motor.')
  if (plan.blockers.length) throw new ApiError('Combinação não disponível para implantação.', plan.blockers)
  if (plan.issues.length) throw new ApiError('Recursos insuficientes para esta implantação.', plan.issues)
  const name =
    input.name?.trim() ||
    `${slugify(plan.model.name)}-${input.quantization.toLowerCase()}-${Math.random().toString(36).slice(2, 5)}`
  const dep: ModelDeployment = {
    id: uid('dep'),
    clusterId: input.clusterId,
    name,
    modelId: input.modelId,
    engineId: input.engineId,
    device: input.device,
    quantization: input.quantization,
    contextLength: input.contextLength,
    status: 'preparando',
    reservation: plan.reservation,
    createdAt: new Date().toISOString(),
    simulation: sim([
      { afterMs: 0, status: 'preparando' },
      { afterMs: 3000, status: 'carregando' },
      { afterMs: 8000, status: 'disponivel' },
    ]),
  }
  setData((s) =>
    withEvent(
      { ...s, deployments: [...s.deployments, dep] },
      event(plan.cluster.orgId, 'info', 'Modelo', `Implantação "${name}" (${plan.model.name} · ${plan.engine.name}) iniciada.`, input.clusterId),
    ),
  )
  return dep
}

export async function setDeploymentPaused(id: string, paused: boolean) {
  await delay()
  const d = getData()
  const dep = d.deployments.find((x) => x.id === id)
  if (!dep) throw new ApiError('Implantação não encontrada.')
  if (!paused) {
    const cluster = requireCluster(dep.clusterId)
    const issues = checkFit(d, cluster, dep.reservation, dep.id)
    if (issues.length) throw new ApiError('Não há recursos livres para retomar a implantação.', issues)
  }
  setData((s) =>
    withEvent(
      {
        ...s,
        deployments: s.deployments.map((x) =>
          x.id === id
            ? paused
              ? { ...x, status: 'pausado', simulation: undefined }
              : { ...x, status: 'carregando', failureReason: undefined, simulation: sim([{ afterMs: 0, status: 'carregando' }, { afterMs: 5000, status: 'disponivel' }]) }
            : x,
        ),
      },
      event(orgOfCluster(s, dep.clusterId), 'info', 'Modelo', `Implantação "${dep.name}" ${paused ? 'pausada' : 'retomada'}.`, dep.clusterId),
    ),
  )
}

export async function retryDeployment(id: string) {
  return setDeploymentPaused(id, false)
}

export async function deleteDeployment(id: string) {
  await delay()
  const d = getData()
  const dep = d.deployments.find((x) => x.id === id)
  if (!dep) throw new ApiError('Implantação não encontrada.')
  const users = d.agentDeployments.filter((a) => a.inference.kind === 'deployment' && a.inference.deploymentId === id)
  if (users.length)
    throw new ApiError(
      'A implantação está em uso e não pode ser removida. Altere o destino de inferência destas implantações de agente primeiro:',
      users.map((a) => `${d.agents.find((x) => x.id === a.agentId)?.name} em ${d.clusters.find((c) => c.id === a.clusterId)?.name}`),
    )
  setData((s) =>
    withEvent(
      { ...s, deployments: s.deployments.filter((x) => x.id !== id) },
      event(orgOfCluster(s, dep.clusterId), 'aviso', 'Modelo', `Implantação "${dep.name}" removida.`, dep.clusterId),
    ),
  )
}

// ---------------------------------------------------------------------------
// Agentes (definições da organização) e implantações de agentes (execução por cluster)

export interface AgentDefInput {
  name: string
  description: string
  tags: string[]
  config: AgentConfig
}

export interface DeployAgentInput {
  agentId: string
  clusterId: string
  version: number
  inference: InferenceTarget
  replicas: number
  runtime: { vcpu: number; memoryGiB: number }
}

const sameConfig = (a: AgentConfig, b: AgentConfig) => JSON.stringify(a) === JSON.stringify(b)

function validateDef(d: AppData, orgId: string, a: AgentDefInput, existingId?: string) {
  if (!a.name.trim()) throw new ApiError('Informe o nome do agente.')
  if (d.agents.some((x) => x.orgId === orgId && x.id !== existingId && x.name.toLowerCase() === a.name.trim().toLowerCase()))
    throw new ApiError('Já existe um agente com esse nome nesta organização.')
  if (a.config.concurrency < 1) throw new ApiError('O limite de concorrência deve ser pelo menos 1.')
}

/** Valida uma nova implantação de agente. Retorna as pendências em linguagem clara. */
export function planAgentDeployment(d: AppData, input: DeployAgentInput, excludeDeploymentId?: string): string[] {
  const issues: string[] = []
  const agent = d.agents.find((a) => a.id === input.agentId)
  const cluster = d.clusters.find((c) => c.id === input.clusterId)
  if (!agent) return ['Agente não encontrado.']
  if (!cluster) return ['Selecione um cluster.']
  if (cluster.orgId !== agent.orgId) return ['O cluster pertence a outra organização.']
  if (!agent.versions.some((v) => v.version === input.version)) issues.push(`A versão v${input.version} não existe.`)
  if (d.agentDeployments.some((x) => x.agentId === agent.id && x.clusterId === cluster.id && x.id !== excludeDeploymentId))
    issues.push(`O agente já possui uma implantação em ${cluster.name}; escale as réplicas dessa implantação.`)
  if (input.replicas < 1 || input.replicas > 20) issues.push('Informe entre 1 e 20 réplicas.')
  const t = input.inference
  if (t.kind === 'deployment') {
    const md = d.deployments.find((x) => x.id === t.deploymentId)
    const mdCluster = md && d.clusters.find((c) => c.id === md.clusterId)
    if (!md || !mdCluster || mdCluster.orgId !== agent.orgId) issues.push('Selecione uma implantação de modelo da mesma organização.')
    else if (md.status === 'falha') issues.push(`A implantação de modelo ${md.name} está com falha.`)
  } else {
    const model = d.models.find((m) => m.id === t.modelId)
    if (!model) issues.push('Selecione um modelo.')
    else if (!d.modelAccess.some((a) => a.orgId === agent.orgId && a.modelId === model.id))
      issues.push(`Habilite o acesso por tokens a ${model.name} em Modelos antes de usá-lo.`)
  }
  const n = input.replicas
  issues.push(...checkFit(d, cluster, { vcpu: input.runtime.vcpu * n, memoryGiB: input.runtime.memoryGiB * n, gpus: 0, gpuMemoryGiB: 0 }))
  return issues
}

function newReplicas(depId: string, from: number, count: number, nodes: number): AgentReplica[] {
  const now = new Date().toISOString()
  return makeReplicas(depId, from + count, nodes, now)
    .slice(from)
    .map((r) => ({ ...r, id: `${depId}-r${uid('').slice(1, 6)}`, state: 'iniciando' as const, startedAt: now, restarts: 0 }))
}

export async function createAgent(orgId: string, input: AgentDefInput, first?: Omit<DeployAgentInput, 'agentId' | 'version'>): Promise<Agent> {
  await delay()
  const d = getData()
  validateDef(d, orgId, input)
  const now = new Date().toISOString()
  const agent: Agent = {
    id: uid('ag'),
    orgId,
    name: input.name.trim(),
    description: input.description,
    tags: input.tags,
    version: 1,
    config: input.config,
    versions: [{ version: 1, savedAt: now, config: input.config }],
    updatedAt: now,
  }
  let dep: AgentDeployment | null = null
  if (first) {
    const draft = { ...d, agents: [...d.agents, agent] }
    const issues = planAgentDeployment(draft, { ...first, agentId: agent.id, version: 1 })
    if (issues.length) throw new ApiError('Não foi possível criar a primeira implantação.', issues)
    dep = buildDeployment(draft, { ...first, agentId: agent.id, version: 1 })
  }
  setData((s) =>
    withEvent(
      { ...s, agents: [...s.agents, agent], agentDeployments: dep ? [...s.agentDeployments, dep] : s.agentDeployments },
      event(orgId, 'sucesso', 'Agente', `Agente "${agent.name}" criado${dep ? ` e implantado em ${d.clusters.find((c) => c.id === dep!.clusterId)?.name}` : ''}.`, dep?.clusterId),
    ),
  )
  return agent
}

/** Salva a definição. Mudanças de configuração geram nova versão, sem alterar implantações existentes. */
export async function updateAgent(id: string, input: AgentDefInput): Promise<Agent> {
  await delay()
  const d = getData()
  const current = d.agents.find((a) => a.id === id)
  if (!current) throw new ApiError('Agente não encontrado.')
  validateDef(d, current.orgId, input, id)
  const now = new Date().toISOString()
  const bump = !sameConfig(current.config, input.config)
  const version = bump ? current.version + 1 : current.version
  const agent: Agent = {
    ...current,
    name: input.name.trim(),
    description: input.description,
    tags: input.tags,
    config: input.config,
    version,
    versions: bump ? [...current.versions, { version, savedAt: now, config: input.config }] : current.versions,
    updatedAt: now,
  }
  setData((s) =>
    withEvent(
      { ...s, agents: s.agents.map((a) => (a.id === id ? agent : a)) },
      event(agent.orgId, 'sucesso', 'Agente', bump ? `Agente "${agent.name}" salvo como v${version}; implantações mantêm a versão aplicada.` : `Agente "${agent.name}" atualizado.`),
    ),
  )
  return agent
}

export async function deleteAgent(id: string) {
  await delay()
  const d = getData()
  const a = d.agents.find((x) => x.id === id)
  if (!a) throw new ApiError('Agente não encontrado.')
  const deps = d.agentDeployments.filter((x) => x.agentId === id)
  setData((s) =>
    withEvent(
      { ...s, agents: s.agents.filter((x) => x.id !== id), agentDeployments: s.agentDeployments.filter((x) => x.agentId !== id) },
      event(a.orgId, 'aviso', 'Agente', `Agente "${a.name}" removido${deps.length ? ` com ${deps.length} implantações` : ''}.`),
    ),
  )
}

function buildDeployment(d: AppData, input: DeployAgentInput): AgentDeployment {
  const agent = d.agents.find((a) => a.id === input.agentId)!
  const cluster = d.clusters.find((c) => c.id === input.clusterId)!
  const config = agent.versions.find((v) => v.version === input.version)!.config
  const id = `adep-${uid('').slice(1)}`
  const now = new Date().toISOString()
  return {
    id,
    orgId: agent.orgId,
    agentId: agent.id,
    clusterId: cluster.id,
    appliedVersion: input.version,
    config: structuredClone(config),
    inference: input.inference,
    status: 'ativo',
    desiredReplicas: input.replicas,
    replicas: newReplicas(id, 0, input.replicas, cluster.capacity.nodes),
    runtime: input.runtime,
    trafficBase: 8 + Math.round(Math.random() * 20),
    createdAt: now,
    updatedAt: now,
  }
}

export async function deployAgent(input: DeployAgentInput): Promise<AgentDeployment> {
  await delay(500)
  const d = getData()
  const issues = planAgentDeployment(d, input)
  if (issues.length) throw new ApiError('Não foi possível implantar o agente.', issues)
  const dep = buildDeployment(d, input)
  const agent = d.agents.find((a) => a.id === input.agentId)!
  const cluster = d.clusters.find((c) => c.id === input.clusterId)!
  setData((s) =>
    withEvent(
      { ...s, agentDeployments: [...s.agentDeployments, dep] },
      event(agent.orgId, 'info', 'Agente', `"${agent.name}" v${input.version} implantado em ${cluster.name} com ${input.replicas} ${input.replicas > 1 ? 'réplicas' : 'réplica'}.`, cluster.id),
    ),
  )
  return dep
}

function requireAgentDeployment(id: string) {
  const d = getData()
  const dep = d.agentDeployments.find((x) => x.id === id)
  if (!dep) throw new ApiError('Implantação do agente não encontrada.')
  const cluster = d.clusters.find((c) => c.id === dep.clusterId)!
  const agent = d.agents.find((a) => a.id === dep.agentId)!
  return { d, dep, cluster, agent }
}

function updateDep(id: string, patch: (x: AgentDeployment) => AgentDeployment, e: ActivityEvent) {
  setData((s) => withEvent({ ...s, agentDeployments: s.agentDeployments.map((x) => (x.id === id ? { ...patch(x), updatedAt: new Date().toISOString() } : x)) }, e))
}

/** Pausar ou retomar afeta somente esta implantação. */
export async function setAgentDeploymentPaused(id: string, paused: boolean) {
  await delay()
  const { d, dep, cluster, agent } = requireAgentDeployment(id)
  if (!paused) {
    const n = dep.desiredReplicas
    const issues = checkFit(d, cluster, { vcpu: dep.runtime.vcpu * n, memoryGiB: dep.runtime.memoryGiB * n, gpus: 0, gpuMemoryGiB: 0 }, dep.id)
    if (issues.length) throw new ApiError('Não há recursos livres para retomar a implantação.', issues)
  }
  updateDep(
    id,
    (x) => ({ ...x, status: paused ? 'pausado' : 'ativo', replicas: paused ? [] : newReplicas(x.id, 0, x.desiredReplicas, cluster.capacity.nodes) }),
    event(agent.orgId, paused ? 'aviso' : 'sucesso', 'Agente', `Implantação de "${agent.name}" em ${cluster.name} ${paused ? 'pausada' : 'retomada'}.`, cluster.id),
  )
}

/** Escala as réplicas desta implantação, validando a capacidade do cluster. */
export async function scaleAgentDeployment(id: string, replicas: number) {
  await delay()
  const { d, dep, cluster, agent } = requireAgentDeployment(id)
  if (replicas < 1 || replicas > 20) throw new ApiError('Informe entre 1 e 20 réplicas.')
  if (dep.status !== 'ativo') throw new ApiError('Retome a implantação antes de escalar.')
  const running = dep.replicas.filter((r) => r.state !== 'pendente')
  const extra = replicas - running.length
  if (extra > 0) {
    const issues = checkFit(d, cluster, { vcpu: dep.runtime.vcpu * extra, memoryGiB: dep.runtime.memoryGiB * extra, gpus: 0, gpuMemoryGiB: 0 })
    if (issues.length) throw new ApiError(`Não há capacidade para ${extra} ${extra > 1 ? 'réplicas adicionais' : 'réplica adicional'}.`, issues)
  }
  updateDep(
    id,
    (x) => {
      const keep = x.replicas.filter((r) => r.state !== 'pendente').slice(0, replicas)
      return { ...x, desiredReplicas: replicas, replicas: extra > 0 ? [...keep, ...newReplicas(x.id, keep.length, extra, cluster.capacity.nodes)] : keep }
    },
    event(agent.orgId, 'info', 'Agente', `"${agent.name}" em ${cluster.name} escalado para ${replicas} ${replicas > 1 ? 'réplicas' : 'réplica'}.`, cluster.id),
  )
}

/** Aplica explicitamente uma versão do agente a esta implantação (reinício gradual das réplicas). */
export async function applyAgentVersion(id: string, version: number) {
  await delay()
  const { dep, cluster, agent } = requireAgentDeployment(id)
  const v = agent.versions.find((x) => x.version === version)
  if (!v) throw new ApiError('Versão não encontrada.')
  const now = new Date().toISOString()
  updateDep(
    id,
    (x) => ({
      ...x,
      appliedVersion: version,
      config: structuredClone(v.config),
      replicas: x.replicas.map((r) => (r.state === 'pendente' ? r : { ...r, state: 'iniciando', startedAt: now })),
    }),
    event(agent.orgId, 'info', 'Agente', `v${version} de "${agent.name}" aplicada em ${cluster.name} (antes v${dep.appliedVersion}).`, cluster.id),
  )
}

export async function deleteAgentDeployment(id: string) {
  await delay()
  const { cluster, agent } = requireAgentDeployment(id)
  setData((s) =>
    withEvent(
      { ...s, agentDeployments: s.agentDeployments.filter((x) => x.id !== id) },
      event(agent.orgId, 'aviso', 'Agente', `Implantação de "${agent.name}" em ${cluster.name} removida.`, cluster.id),
    ),
  )
}

// ---------------------------------------------------------------------------
// Aplicações (código ou imagem). A execução acontece em instâncias, que são os serviços.

export interface CreateApplicationInput {
  orgId: string
  /** Setor do agente, quando a aplicação é uma habilidade de um setor. */
  sector?: string
  name: string
  description: string
  kind: ServiceKind
  runtime?: SourceRuntime
  fileName?: string
  code?: string
  image?: string
  command: string
  env: EnvVar[]
  version: string
}

export async function createApplication(input: CreateApplicationInput): Promise<Application> {
  await delay(400)
  const d = getData()
  if (!d.orgs.some((o) => o.id === input.orgId)) throw new ApiError('Organização não encontrada.')
  const name = input.name.trim()
  const slug = slugify(name)
  if (!slug) throw new ApiError('Informe um nome válido para a aplicação.')
  if (d.applications.some((a) => a.orgId === input.orgId && a.slug === slug)) throw new ApiError('Já existe uma aplicação com esse nome nesta organização.')
  if (input.kind === 'source' && !input.code?.trim()) throw new ApiError('Informe o código-fonte da aplicação.')
  if (input.kind === 'image' && !input.image?.trim()) throw new ApiError('Informe a referência da imagem de contêiner.')
  const app: Application = {
    id: uid('app'),
    orgId: input.orgId,
    name,
    slug,
    description: input.description.trim(),
    sector: input.sector,
    kind: input.kind,
    runtime: input.kind === 'source' ? input.runtime : undefined,
    fileName: input.kind === 'source' ? input.fileName : undefined,
    code: input.kind === 'source' ? input.code : undefined,
    image: input.kind === 'image' ? input.image?.trim() : undefined,
    command: input.command,
    env: cleanEnv(input.env),
    version: input.version.trim() || 'v1.0.0',
    createdAt: new Date().toISOString(),
  }
  setData((s) => withEvent({ ...s, applications: [...s.applications, app] }, event(input.orgId, 'sucesso', 'Aplicação', `Aplicação "${name}" criada (${app.version}).`)))
  return app
}

export async function deleteApplication(id: string) {
  await delay()
  const d = getData()
  const app = d.applications.find((a) => a.id === id)
  if (!app) throw new ApiError('Aplicação não encontrada.')
  const instances = d.services.filter((s) => s.applicationId === id)
  if (instances.length) throw new ApiError('Remova as instâncias desta aplicação antes de excluí-la.', instances.map((s) => `Serviço: ${s.name}`))
  setData((s) => withEvent({ ...s, applications: s.applications.filter((a) => a.id !== id) }, event(app.orgId, 'aviso', 'Aplicação', `Aplicação "${app.name}" removida.`)))
}

/** Clona uma aplicação: mesma definição e mesmo setor, sem instâncias. O nome ganha "(cópia)". */
export async function cloneApplication(id: string): Promise<Application> {
  await delay(300)
  const app = getData().applications.find((a) => a.id === id)
  if (!app) throw new ApiError('Aplicação não encontrada.')
  const suffix = uid('c').slice(-4)
  const copy: Application = { ...app, id: uid('app'), name: `${app.name} (cópia)`, slug: `${app.slug}-copia-${suffix}`, createdAt: new Date().toISOString() }
  setData((s) => withEvent({ ...s, applications: [...s.applications, copy] }, event(app.orgId, 'sucesso', 'Aplicação', `Aplicação "${copy.name}" criada a partir de "${app.name}".`)))
  return copy
}

// ---------------------------------------------------------------------------
// Serviços (instâncias de uma aplicação em um cluster)

export interface CreateServiceInput {
  applicationId: string
  clusterId: string
  name: string
  /** Réplicas desejadas (1 a 10). */
  replicas: number
  /** Reserva por réplica. */
  reservation: Reservation
}

const now = () => new Date().toISOString()

export async function createService(input: CreateServiceInput): Promise<Service> {
  await delay(500)
  const d = getData()
  const app = d.applications.find((a) => a.id === input.applicationId)
  if (!app) throw new ApiError('Selecione uma aplicação existente.')
  const cluster = requireCluster(input.clusterId)
  if (cluster.orgId !== app.orgId) throw new ApiError('A aplicação e o cluster precisam pertencer à mesma organização.')
  const name = slugify(input.name)
  if (!name) throw new ApiError('Informe um nome válido para o serviço.')
  if (d.services.some((s) => s.clusterId === cluster.id && s.name === name)) throw new ApiError('Já existe um serviço com esse nome neste cluster.')
  const replicas = Math.max(1, Math.min(10, input.replicas))
  const issues = checkFit(d, cluster, scaleRes(input.reservation, replicas))
  if (issues.length) throw new ApiError('Recursos insuficientes para o serviço.', issues)

  const runtimeLabel = app.runtime === 'mojo' ? 'Mojo' : app.runtime === 'python_mojo' ? 'Python + Mojo' : 'Python'
  const steps: SimulationStep[] =
    app.kind === 'source'
      ? [
          { afterMs: 0, status: 'na_fila', log: `Código-fonte recebido localmente (${app.fileName ?? 'arquivo'}, runtime ${runtimeLabel}).` },
          { afterMs: 1500, status: 'construindo', log: 'Construção simulada iniciada.' },
          { afterMs: 3000, status: 'construindo', log: 'Resolvendo dependências declaradas…' },
          ...(app.runtime !== 'python'
            ? [{ afterMs: 4500, status: 'construindo', log: 'Compilando módulos Mojo (simulado).' }]
            : []),
          { afterMs: 6000, status: 'implantando', log: 'Imagem demonstrativa gerada. Alocando recursos reservados.' },
          { afterMs: 8000, status: 'implantando', log: 'Verificação de saúde respondeu 200 OK.' },
          { afterMs: 9000, status: 'ativo', log: `Versão ${app.version} ativa.` },
        ]
      : [
          { afterMs: 0, status: 'na_fila', log: `Referência de imagem registrada: ${app.image}. O conteúdo não é baixado nem executado.` },
          { afterMs: 2000, status: 'implantando', log: 'Alocando recursos reservados.' },
          { afterMs: 4000, status: 'implantando', log: 'Verificação de saúde respondeu 200 OK.' },
          { afterMs: 5000, status: 'ativo', log: `Versão ${app.version} ativa.` },
        ]

  const service: Service = {
    id: uid('svc'),
    applicationId: app.id,
    clusterId: cluster.id,
    name,
    status: 'na_fila',
    replicas,
    reservation: input.reservation,
    endpoint: `https://${name}.${slugify(cluster.name)}.orzyon-cloud.example`,
    logs: [],
    trafficBase: 10 + Math.round(Math.random() * 30),
    createdAt: now(),
    simulation: sim(steps),
  }
  setData((s) =>
    withEvent({ ...s, services: [...s.services, service] }, event(cluster.orgId, 'info', 'Serviço', `Implantação de "${name}" (${app.name}) iniciada.`, cluster.id)),
  )
  return service
}

const log = (level: LogLine['level'], message: string): LogLine => ({ ts: now(), level, message })

/**
 * Cria uma chave de API da organização. O segredo completo volta só nesta resposta; o estado guarda
 * apenas o prefixo e os últimos caracteres.
 */
export async function createApiKey(orgId: string, name: string): Promise<{ key: string; record: ApiKey }> {
  await delay()
  const label = name.trim()
  if (!label) throw new ApiError('Dê um nome para a chave.')
  if (label.length > 60) throw new ApiError('O nome da chave pode ter até 60 caracteres.')
  if (!getData().orgs.some((o) => o.id === orgId)) throw new ApiError('Organização não encontrada.')
  const key = generateApiKey()
  const record: ApiKey = { id: uid('key'), orgId, name: label, prefix: key.slice(0, KEY_PREFIX.length + 4), last4: key.slice(-4), createdAt: now() }
  setData((s) => withEvent({ ...s, apiKeys: [...s.apiKeys, record] }, event(orgId, 'sucesso', 'Acesso', `Chave de API "${label}" criada.`)))
  return { key, record }
}

/** Revoga uma chave. As chamadas que a usam passam a ser recusadas. */
export async function revokeApiKey(id: string) {
  await delay()
  const k = getData().apiKeys.find((x) => x.id === id)
  if (!k) throw new ApiError('Chave não encontrada.')
  if (k.revokedAt) return
  setData((s) =>
    withEvent({ ...s, apiKeys: s.apiKeys.map((x) => (x.id === id ? { ...x, revokedAt: now() } : x)) }, event(k.orgId, 'aviso', 'Acesso', `Chave de API "${k.name}" revogada.`)),
  )
}

/** Adiciona créditos ao saldo pré-pago. Demonstração: não cobra nada e não recebe dados de pagamento. */
export async function addCredits(orgId: string, amount: number): Promise<CreditEntry> {
  await delay()
  if (!Number.isFinite(amount) || amount < 50 || amount > 100000) throw new ApiError('A recarga deve ficar entre R$ 50 e R$ 100.000.')
  if (!getData().orgs.some((o) => o.id === orgId)) throw new ApiError('Organização não encontrada.')
  const entry: CreditEntry = { id: uid('cr'), orgId, amount: Math.round(amount * 100) / 100, at: now(), note: 'Recarga (demonstração)' }
  setData((s) => withEvent({ ...s, credits: [...s.credits, entry] }, event(orgId, 'sucesso', 'Créditos', `Recarga de R$ ${entry.amount.toFixed(2)} registrada.`)))
  return entry
}

/** Define o modelo e o motor da aplicação. Só modelos homologados entram; a inteligência é recalculada pela tela. */
export async function setApplicationInference(id: string, inference: AppInference) {
  await delay()
  const d = getData()
  if (!d.applications.some((a) => a.id === id)) throw new ApiError('Aplicação não encontrada.')
  const model = d.models.find((m) => m.id === inference.modelId)
  if (!model) throw new ApiError('Modelo não encontrado no catálogo.')
  if (model.status !== 'homologada') throw new ApiError('Só modelos homologados podem ser usados em aplicações.')
  if (!d.engines.some((e) => e.id === inference.engineId)) throw new ApiError('Motor de inferência não encontrado.')
  setData((s) => ({ ...s, applications: s.applications.map((a) => (a.id === id ? { ...a, inference } : a)) }))
}

export async function setServicePaused(id: string, paused: boolean) {
  await delay()
  const d = getData()
  const svc = d.services.find((s) => s.id === id)
  if (!svc) throw new ApiError('Serviço não encontrado.')
  if (!paused) {
    const issues = checkFit(d, requireCluster(svc.clusterId), scaleRes(svc.reservation, svc.replicas), svc.id)
    if (issues.length) throw new ApiError('Não há recursos livres para retomar o serviço.', issues)
  }
  setData((s) =>
    withEvent(
      {
        ...s,
        services: s.services.map((x) =>
          x.id === id
            ? {
                ...x,
                status: paused ? 'pausado' : 'ativo',
                simulation: undefined,
                logs: [...x.logs, log('info', paused ? 'Serviço pausado pelo usuário; reserva liberada.' : 'Serviço retomado; recursos reservados novamente.')],
              }
            : x,
        ),
      },
      event(orgOfCluster(s, svc.clusterId), 'info', 'Serviço', `Serviço "${svc.name}" ${paused ? 'pausado' : 'retomado'}.`, svc.clusterId),
    ),
  )
}

export async function deleteService(id: string) {
  await delay()
  const svc = getData().services.find((s) => s.id === id)
  if (!svc) throw new ApiError('Serviço não encontrado.')
  setData((s) =>
    withEvent({ ...s, services: s.services.filter((x) => x.id !== id) }, event(orgOfCluster(s, svc.clusterId), 'aviso', 'Serviço', `Serviço "${svc.name}" removido.`, svc.clusterId)),
  )
}

/** Replica um serviço no mesmo cluster: nova instância da mesma aplicação, com nome livre. */
export async function replicateService(id: string): Promise<Service> {
  const svc = getData().services.find((x) => x.id === id)
  if (!svc) throw new ApiError('Serviço não encontrado.')
  let n = 2
  while (getData().services.some((x) => x.clusterId === svc.clusterId && x.name === `${svc.name}-${n}`)) n++
  return createService({
    applicationId: svc.applicationId,
    clusterId: svc.clusterId,
    name: `${svc.name}-${n}`,
    replicas: svc.replicas,
    reservation: svc.reservation,
  })
}

/** Clona um cluster: cria outro com a mesma capacidade e copia os serviços e as aplicações dele. */
export async function cloneCluster(clusterId: string, name: string): Promise<Cluster> {
  const src = requireCluster(clusterId)
  const cluster = await createCluster({
    orgId: src.orgId,
    name,
    purpose: `Cópia de ${src.name}.`,
    modality: src.modality,
    profile: src.profile,
    poolId: src.poolId,
    capacity: src.capacity,
    monthlyBudget: src.monthlyBudget,
    limitPolicy: src.limitPolicy,
  })
  const apps: Application[] = []
  const services: Service[] = []
  for (const s of getData().services.filter((x) => x.clusterId === src.id)) {
    const app = getData().applications.find((a) => a.id === s.applicationId)
    if (!app) continue
    const suffix = uid('c').slice(-4)
    const copiedApp: Application = { ...app, id: uid('app'), name: `${app.name} (cópia)`, slug: `${app.slug}-copia-${suffix}`, createdAt: now() }
    apps.push(copiedApp)
    services.push({
      ...s,
      id: uid('svc'),
      applicationId: copiedApp.id,
      clusterId: cluster.id,
      name: `${s.name}-copia`,
      endpoint: `https://${s.name}-copia.${slugify(cluster.name)}.orzyon-cloud.example`,
      status: s.status === 'pausado' ? 'pausado' : 'ativo',
      logs: [log('info', `Serviço copiado do cluster ${src.name}.`)],
      simulation: undefined,
    })
  }
  setData((d) =>
    withEvent(
      { ...d, applications: [...d.applications, ...apps], services: [...d.services, ...services] },
      event(src.orgId, 'sucesso', 'Cluster', `Cluster "${cluster.name}" clonado de "${src.name}" com ${services.length} serviço(s).`, cluster.id),
    ),
  )
  return cluster
}

// ---------------------------------------------------------------------------
// Simulações (provisionamento, carregamento de modelos, builds)

function advance<T extends { simulation?: Simulation; status: string }>(item: T, t: number, onStep?: (step: SimulationStep, item: T) => T): T {
  const s = item.simulation
  if (!s) return item
  let next = item
  let applied = s.applied
  while (applied < s.steps.length && s.startedAt + s.steps[applied].afterMs <= t) {
    const step = s.steps[applied]
    next = { ...next, status: step.status }
    if (onStep) next = onStep(step, next)
    applied++
  }
  if (applied === s.applied) return item
  return { ...next, simulation: applied >= s.steps.length ? undefined : { ...s, applied } }
}

/** Avança as simulações pendentes. Retorna true se algo mudou. */
export function tickSimulations(t = Date.now()): boolean {
  const d = getData()
  // Réplicas de agente: "iniciando" passa a "pronta" após alguns segundos.
  const starting = d.agentDeployments.some((x) => x.replicas.some((r) => r.state === 'iniciando' && t - new Date(r.startedAt).getTime() >= 4000))
  if (starting)
    setData((s) => ({
      ...s,
      agentDeployments: s.agentDeployments.map((x) =>
        x.replicas.some((r) => r.state === 'iniciando' && t - new Date(r.startedAt).getTime() >= 4000)
          ? { ...x, replicas: x.replicas.map((r) => (r.state === 'iniciando' && t - new Date(r.startedAt).getTime() >= 4000 ? { ...r, state: 'pronta' } : r)) }
          : x,
      ),
    }))
  const pending = d.clusters.some((c) => c.simulation) || d.deployments.some((x) => x.simulation) || d.services.some((x) => x.simulation)
  if (!pending) return starting
  let changed = false
  const newEvents: ActivityEvent[] = []
  const clusters = d.clusters.map((c) => {
    const n = advance(c, t)
    if (n !== c) {
      changed = true
      if (n.status === 'ativo' && c.status !== 'ativo') newEvents.push(event(c.orgId, 'sucesso', 'Cluster', `Cluster "${c.name}" ativo.`, c.id))
    }
    return n
  })
  const deployments = d.deployments.map((x) => {
    const n = advance(x, t)
    if (n !== x) {
      changed = true
      if (n.status === 'disponivel' && x.status !== 'disponivel')
        newEvents.push(event(orgOfCluster(d, x.clusterId), 'sucesso', 'Modelo', `Implantação "${x.name}" disponível.`, x.clusterId))
    }
    return n
  })
  const services = d.services.map((x) => {
    const n = advance(x, t, (step, item) => (step.log ? { ...item, logs: [...item.logs, log('info', step.log)] } : item))
    if (n !== x) {
      changed = true
      if (n.status === 'ativo' && x.status !== 'ativo')
        newEvents.push(event(orgOfCluster(d, x.clusterId), 'sucesso', 'Serviço', `Serviço "${x.name}" ativo em ${x.endpoint}.`, x.clusterId))
    }
    return n
  })
  if (changed) {
    setData((s) => ({ ...s, clusters, deployments, services, events: [...newEvents, ...s.events].slice(0, 300) }))
  }
  return changed
}

// ---------------------------------------------------------------------------
// Acesso a modelos por tokens (inferência compartilhada Orzyon e APIs externas)

export async function enableModelAccess(orgId: string, modelId: string, acknowledgeExternal = false) {
  await delay()
  const d = getData()
  const model = d.models.find((m) => m.id === modelId)
  if (!model) throw new ApiError('Modelo não encontrado.')
  if (model.status !== 'homologada')
    throw new ApiError(`${model.name} está ${integrationLabel(model.status).toLowerCase()} e ainda não pode ser habilitado.`)
  if (model.offering === 'external' && !acknowledgeExternal)
    throw new ApiError(`Confirme que o conteúdo será processado por ${model.provider}.`)
  if (d.modelAccess.some((a) => a.orgId === orgId && a.modelId === modelId)) throw new ApiError('O acesso a este modelo já está habilitado.')
  setData((s) =>
    withEvent(
      {
        ...s,
        modelAccess: [
          ...s.modelAccess,
          {
            id: uid('acc'),
            orgId,
            modelId,
            enabledAt: new Date().toISOString(),
            dailyTokensIn: (2 + Math.round(Math.random() * 6)) * 1e6,
            dailyTokensOut: (0.5 + Math.round(Math.random() * 15) / 10) * 1e6,
            cachedShare: 0.25,
            externalAcknowledged: model.offering === 'external' ? true : undefined,
          },
        ],
      },
      event(orgId, 'sucesso', 'Modelo', `Acesso por tokens a ${model.name} habilitado${model.offering === 'external' ? ` (processado por ${model.provider})` : ''}.`),
    ),
  )
}

export async function disableModelAccess(accessId: string) {
  await delay()
  const d = getData()
  const acc = d.modelAccess.find((a) => a.id === accessId)
  if (!acc) throw new ApiError('Acesso não encontrado.')
  const model = d.models.find((m) => m.id === acc.modelId)
  const users = d.agentDeployments.filter((a) => a.orgId === acc.orgId && a.inference.kind !== 'deployment' && a.inference.modelId === acc.modelId)
  if (users.length)
    throw new ApiError(
      'Implantações de agente usam este modelo. Altere o destino de inferência delas primeiro:',
      users.map((a) => `${d.agents.find((x) => x.id === a.agentId)?.name} em ${d.clusters.find((c) => c.id === a.clusterId)?.name}`),
    )
  setData((s) =>
    withEvent({ ...s, modelAccess: s.modelAccess.filter((a) => a.id !== accessId) }, event(acc.orgId, 'aviso', 'Modelo', `Acesso por tokens a ${model?.name ?? 'modelo'} desabilitado.`)),
  )
}

/** Administração da Orzyon: multiplicador e câmbio de referência das APIs externas. */
export async function updateCommercialSettings(patch: Partial<CommercialSettings>) {
  await delay()
  if (patch.externalMultiplier !== undefined && patch.externalMultiplier < 1) throw new ApiError('O multiplicador deve ser pelo menos 1.')
  if (patch.usdBrl !== undefined && patch.usdBrl <= 0) throw new ApiError('Informe um câmbio válido.')
  setData((s) => ({ ...s, commercial: { ...s.commercial, ...patch } }))
}

// ---------------------------------------------------------------------------

export async function restoreDemo() {
  await delay(400)
  resetData()
}
