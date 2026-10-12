// Migração do modelo antigo (agente com clusterId) para agente + implantação + réplicas.
// Cada vínculo agente → cluster anterior vira uma implantação inicial, preservando IDs.
import type {
  ActivityEvent,
  Agent,
  AgentDeployment,
  AgentReplica,
  AnalysisProfile,
  AgentRoute,
  Application,
  Cluster,
  EnvVar,
  ModelAccess,
  Organization,
  ReplicaState,
  Service,
  ServiceKind,
  SourceRuntime,
} from '../domain/types'
import { hashString } from '../lib/metrics'
import { slugify } from '../lib/format'
import { GOV_CIVIL_ORG, GOV_MILITAR_ORG, ORZYON_ORG, demoCredits, demoMilitarCluster } from '../mock/demoOrgs'
import { defaultInference, orzyonSuperintelligenceService, sectorApplications, sectorServices } from '../mock/sectorApps'
import { militaryDemo } from '../mock/militaryDemo'

/** Formato de agente anterior à v6 do esquema. */
export interface LegacyAgent {
  id: string
  clusterId: string
  name: string
  description: string
  status: 'ativo' | 'pausado'
  tags: string[]
  systemPrompt: string
  deploymentId: string | null
  analysisProfile: AnalysisProfile
  temperature: number
  maxTokens: number
  tools: string[]
  knowledge: string[]
  routes: AgentRoute[]
  concurrency: number
  runtime: { vcpu: number; memoryGiB: number }
  trafficBase: number
  updatedAt: string
}

export const replicaPod = (depId: string, i: number) => `${depId.replace(/^adep-/, 'agt-')}-${(hashString(depId + i) % 0xfffff).toString(16).padStart(5, '0')}`

export function makeReplicas(depId: string, count: number, nodes: number, startedAt: string, states: ReplicaState[] = []): AgentReplica[] {
  return Array.from({ length: count }, (_, i) => {
    const state = states[i] ?? 'pronta'
    return {
      id: `${depId}-r${i + 1}`,
      pod: replicaPod(depId, i),
      nodeIndex: state === 'pendente' ? null : (hashString(depId) + i) % Math.max(1, nodes),
      state,
      startedAt,
      restarts: hashString(depId + 'rs' + i) % 3 === 0 ? 1 : 0,
      reason: state === 'pendente' ? 'Aguardando capacidade livre no cluster.' : undefined,
    }
  })
}

export function migrateLegacyAgents(legacy: LegacyAgent[], clusters: Cluster[]): { agents: Agent[]; agentDeployments: AgentDeployment[] } {
  const agents: Agent[] = []
  const agentDeployments: AgentDeployment[] = []
  for (const a of legacy) {
    const cluster = clusters.find((c) => c.id === a.clusterId)
    if (!cluster) continue
    const config = {
      systemPrompt: a.systemPrompt,
      analysisProfile: a.analysisProfile,
      temperature: a.temperature,
      maxTokens: a.maxTokens,
      tools: a.tools,
      knowledge: a.knowledge,
      routes: a.routes,
      concurrency: a.concurrency,
    }
    agents.push({
      id: a.id,
      orgId: cluster.orgId,
      name: a.name,
      description: a.description,
      tags: a.tags,
      version: 1,
      config,
      versions: [{ version: 1, savedAt: a.updatedAt, config }],
      updatedAt: a.updatedAt,
    })
    const depId = `adep-${a.id.replace(/^ag-/, '')}-${cluster.id.replace(/^cl-/, '')}`
    agentDeployments.push({
      id: depId,
      orgId: cluster.orgId,
      agentId: a.id,
      clusterId: cluster.id,
      appliedVersion: 1,
      config: structuredClone(config),
      inference: a.deploymentId ? { kind: 'deployment', deploymentId: a.deploymentId } : { kind: 'shared', modelId: '' },
      status: a.status,
      desiredReplicas: 1,
      replicas: a.status === 'ativo' ? makeReplicas(depId, 1, cluster.capacity.nodes, a.updatedAt) : [],
      runtime: a.runtime,
      trafficBase: a.trafficBase,
      createdAt: a.updatedAt,
      updatedAt: a.updatedAt,
    })
  }
  return { agents, agentDeployments }
}

/** Converte dados persistidos v5 (agentes com clusterId) para v6. */
export function migrateV5toV6(raw: Record<string, unknown>): Record<string, unknown> {
  const clusters = (raw.clusters ?? []) as Cluster[]
  const legacy = (raw.agents ?? []) as LegacyAgent[]
  const { agents, agentDeployments } = migrateLegacyAgents(legacy, clusters)
  const services = ((raw.services ?? []) as Record<string, unknown>[]).map((s) => ({ replicas: 1, ...s }))
  return { ...raw, agents, agentDeployments, services }
}

/** Serviço no formato anterior à v7: código, imagem e runtime ficavam dentro da própria instância. */
interface LegacyServiceV6 extends Omit<Service, 'applicationId'> {
  kind: ServiceKind
  runtime?: SourceRuntime
  fileName?: string
  code?: string
  image?: string
  command: string
  env: EnvVar[]
  version: string
}

const remapOrgId = (id: string) => (id === 'org-gov' ? GOV_CIVIL_ORG.id : id)
const remapOrgs = <T extends { orgId: string }>(items: unknown) => ((items ?? []) as T[]).map((x) => ({ ...x, orgId: remapOrgId(x.orgId) }))

/**
 * Converte dados v6 para v7:
 * - "Governo — Demonstração" passa a ser "Governo — Civil", e a organização militar é acrescentada;
 * - cada organização recebe o tipo (segmento) usado no seletor e na página inicial;
 * - cada serviço antigo vira uma instância de uma aplicação com o mesmo nome, preservando
 *   código, comando, variáveis, versão, réplicas e reserva.
 */
export function migrateV6toV7(raw: Record<string, unknown>): Record<string, unknown> {
  const hadGov = ((raw.orgs ?? []) as { id: string }[]).some((o) => o.id === 'org-gov')
  const orgs = ((raw.orgs ?? []) as (Organization & { id: string })[]).map((o) =>
    o.id === 'org-gov'
      ? { ...o, id: GOV_CIVIL_ORG.id, name: GOV_CIVIL_ORG.name, slug: GOV_CIVIL_ORG.slug, segment: GOV_CIVIL_ORG.segment }
      : { ...o, segment: o.id === ORZYON_ORG.id ? ORZYON_ORG.segment : 'b2b' as const },
  )
  if (hadGov && !orgs.some((o) => o.id === GOV_MILITAR_ORG.id)) orgs.push(structuredClone(GOV_MILITAR_ORG))

  const clusters = remapOrgs<Cluster>(raw.clusters)
  if (hadGov && !clusters.some((c) => c.id === 'cl-gov-vigilancia')) clusters.push(demoMilitarCluster(new Date().toISOString()))

  const applications: Application[] = []
  const services: Service[] = []
  for (const s of (raw.services ?? []) as LegacyServiceV6[]) {
    const { kind, runtime, fileName, code, image, command, env, version, ...instance } = s
    const cluster = clusters.find((c) => c.id === s.clusterId)
    const applicationId = `app-${s.id}`
    applications.push({
      id: applicationId,
      orgId: cluster?.orgId ?? ORZYON_ORG.id,
      name: s.name,
      slug: slugify(s.name),
      description: '',
      kind,
      runtime,
      fileName,
      code,
      image,
      command,
      env,
      version,
      createdAt: s.createdAt,
    })
    services.push({ ...instance, applicationId, replicas: instance.replicas ?? 1 })
  }

  return {
    ...raw,
    orgs,
    clusters,
    agents: remapOrgs<Agent>(raw.agents),
    agentDeployments: remapOrgs<AgentDeployment>(raw.agentDeployments),
    events: remapOrgs<ActivityEvent>(raw.events),
    modelAccess: remapOrgs<ModelAccess>(raw.modelAccess),
    applications,
    services,
  }
}

/** Ids que a migração v6 → v7 gerou para os serviços de governo, trocados pelos ids dos setores. */
const LEGACY_SECTOR_APP_IDS: Record<string, string> = {
  'app-svc-ingestao': 'app-rf-ingestao',
  'app-svc-indexador': 'app-mj-indexador',
  'app-svc-etl': 'app-me-etl',
}

/** Chave de setor das aplicações da Orzyon, para dados salvos antes da v8. */
const ORZYON_APP_SECTORS: Record<string, string> = {
  'app-orzyon-medical': 'medicos',
  'app-orzyon-financial': 'financeiros',
  'app-osais-security': 'seguranca',
}

/**
 * Converte dados v7 para v8: cada aplicação recebe o setor usado na página inicial, e os setores
 * de governo passam a existir como aplicações (sem duplicar as que já estavam cadastradas).
 */
/**
 * Atualiza por id as aplicações dos setores de governo e acrescenta as que faltam.
 * Os cadastros de setor são demonstrativos: nome, descrição e setor são substituídos; o restante
 * (instâncias, versão, código) é preservado.
 */
function withSectorApplications(raw: Record<string, unknown>): Record<string, unknown> {
  const orgIds = new Set(((raw.orgs ?? []) as { id: string }[]).map((o) => o.id))
  const apps: Application[] = [...((raw.applications ?? []) as Application[])]
  for (const def of sectorApplications(new Date().toISOString())) {
    if (!orgIds.has(def.orgId)) continue
    const i = apps.findIndex((a) => a.id === def.id)
    if (i >= 0) apps[i] = { ...apps[i], name: def.name, slug: def.slug, description: def.description, sector: def.sector }
    else apps.push(def)
  }
  return { ...raw, applications: apps }
}

/** Converte dados v7 para v8: aplicações ganham setor e os setores de governo viram aplicações. */
export function migrateV7toV8(raw: Record<string, unknown>): Record<string, unknown> {
  const sectorOf = (id: string): string | undefined => ORZYON_APP_SECTORS[id]
  const apps: Application[] = ((raw.applications ?? []) as Application[]).map((a): Application => {
    const id = LEGACY_SECTOR_APP_IDS[a.id] ?? a.id
    return { ...a, id, sector: a.sector ?? sectorOf(id) }
  })
  const services = ((raw.services ?? []) as Service[]).map((s) => ({ ...s, applicationId: LEGACY_SECTOR_APP_IDS[s.applicationId] ?? s.applicationId }))
  return withSectorApplications({ ...raw, applications: apps, services })
}

/** Converte dados v8 para v9: setores de governo em grupos com subsetores (ver `SECTOR_GROUPS`). */
export function migrateV8toV9(raw: Record<string, unknown>): Record<string, unknown> {
  return withSectorApplications(raw)
}

/** Converte dados v9 para v10: os subsetores financeiros ganham instâncias demonstrativas (por id, sem duplicar). */
export function migrateV9toV10(raw: Record<string, unknown>): Record<string, unknown> {
  const services = [...((raw.services ?? []) as Service[])]
  const appIds = new Set(((raw.applications ?? []) as { id: string }[]).map((a) => a.id))
  const clusterIds = new Set(((raw.clusters ?? []) as { id: string }[]).map((c) => c.id))
  for (const s of sectorServices(new Date().toISOString())) {
    if (!appIds.has(s.applicationId) || !clusterIds.has(s.clusterId)) continue
    if (!services.some((x) => x.id === s.id)) services.push(s)
  }
  return { ...raw, services }
}

/** Aplicações retiradas do catálogo. Só saem se não tiverem instâncias. */
const RETIRED_APP_IDS = ['app-gov-investigacao']

/** Converte dados v10 para v11: a investigação vira um setor com subsetores por tipo de crime. */
export function migrateV10toV11(raw: Record<string, unknown>): Record<string, unknown> {
  const services = (raw.services ?? []) as Service[]
  const apps = ((raw.applications ?? []) as Application[]).filter((a) => !(RETIRED_APP_IDS.includes(a.id) && !services.some((s) => s.applicationId === a.id)))
  return withSectorApplications({ ...raw, applications: apps })
}

/** Converte dados v11 para v12: o governo militar ganha instâncias, agentes e acesso ao modelo (por id, sem duplicar). */
export function migrateV11toV12(raw: Record<string, unknown>): Record<string, unknown> {
  const mil = militaryDemo(new Date().toISOString())
  const orgIds = new Set(((raw.orgs ?? []) as { id: string }[]).map((o) => o.id))
  const clusterIds = new Set(((raw.clusters ?? []) as { id: string }[]).map((c) => c.id))
  const appIds = new Set(((raw.applications ?? []) as { id: string }[]).map((a) => a.id))
  const add = <T extends { id: string }>(list: unknown, items: T[]): T[] => {
    const current = [...((list ?? []) as T[])]
    for (const item of items) if (!current.some((x) => x.id === item.id)) current.push(item)
    return current
  }
  const services = mil.services.filter((s) => appIds.has(s.applicationId) && clusterIds.has(s.clusterId))
  const agents = mil.agents.filter(() => orgIds.has(GOV_MILITAR_ORG.id))
  return {
    ...raw,
    services: add(raw.services, services),
    agents: add(raw.agents, agents),
    agentDeployments: add(raw.agentDeployments, mil.agentDeployments.filter(() => orgIds.has(GOV_MILITAR_ORG.id))),
    modelAccess: add(raw.modelAccess, mil.modelAccess.filter(() => orgIds.has(GOV_MILITAR_ORG.id))),
  }
}

/** Converte dados v12 para v13: a Osais passa a ser Orzyon Security; habilidades viram aplicações com instâncias. */
export function migrateV12toV13(raw: Record<string, unknown>): Record<string, unknown> {
  const apps = ((raw.applications ?? []) as Application[]).map((a) =>
    a.id === 'app-osais-security' ? { ...a, name: 'Orzyon Security AI Services', slug: 'orzyon-security-ai-services' } : a,
  )
  const services = ((raw.services ?? []) as Service[]).map((s) =>
    s.id === 'svc-osais-lab'
      ? { ...s, name: 'orzyon-security-ai-services', endpoint: 'https://orzyon-security-ai-services.orzyon-laboratorio.orzyon-cloud.example' }
      : s,
  )
  const withApps = withSectorApplications({ ...raw, applications: apps, services })
  const appIds = new Set(((withApps.applications ?? []) as { id: string }[]).map((a) => a.id))
  const clusterIds = new Set(((raw.clusters ?? []) as { id: string }[]).map((c) => c.id))
  const current = [...((withApps.services ?? []) as Service[])]
  for (const s of sectorServices(new Date().toISOString())) {
    if (!appIds.has(s.applicationId) || !clusterIds.has(s.clusterId)) continue
    if (!current.some((x) => x.id === s.id)) current.push(s)
  }
  return { ...withApps, services: current }
}

/**
 * Converte dados v13 para v14: aplicações ganham modelo e motor (base da inteligência), e a Orzyon
 * ganha a Superinteligência (aplicação e instância). Não duplica o que já existe.
 */
export function migrateV13toV14(raw: Record<string, unknown>): Record<string, unknown> {
  const withApps = withSectorApplications(raw)
  const apps = ((withApps.applications ?? []) as Application[]).map((a): Application => (a.inference ? a : { ...a, inference: defaultInference(a.id) }))
  const appIds = new Set(apps.map((a) => a.id))
  const clusterIds = new Set(((raw.clusters ?? []) as { id: string }[]).map((c) => c.id))
  const services = [...((withApps.services ?? []) as Service[])]
  const sup = orzyonSuperintelligenceService(new Date().toISOString())
  if (appIds.has(sup.applicationId) && clusterIds.has(sup.clusterId) && !services.some((s) => s.id === sup.id)) services.push(sup)
  return { ...withApps, applications: apps, services }
}

/** Converte dados v14 para v15: chaves de API e saldo pré-pago. Quem já tem créditos mantém o que tem. */
export function migrateV14toV15(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    apiKeys: raw.apiKeys ?? [],
    credits: raw.credits ?? demoCredits(new Date().toISOString()),
  }
}
