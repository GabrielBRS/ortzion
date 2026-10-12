// Tipos de domínio da Orzyon Cloud. Compartilhados entre telas, serviços mock e,
// futuramente, os contratos das APIs reais.

export type ID = string

export type MemberRole = 'Proprietário' | 'Administrador' | 'Desenvolvedor' | 'Leitura'

export interface Member {
  id: ID
  name: string
  email: string
  role: MemberRole
}

export type LimitPolicy = 'alertar' | 'bloquear_alocacoes' | 'pausar_lote'

/**
 * Tipo da organização. Define o grupo no seletor (Orzyon, Governo, Clientes B2B)
 * e a ambientação da página inicial.
 */
export type OrgSegment = 'orzyon' | 'governo_civil' | 'governo_militar' | 'b2b'

export interface Organization {
  id: ID
  name: string
  slug: string
  segment: OrgSegment
  monthlyBudget: number // BRL
  limitPolicy: LimitPolicy
  alertThreshold: number // 0..1
  members: Member[]
}

export type Modality = 'virtual' | 'dedicado'
/** unified = memória unificada AMD (CPU e GPU compartilham o mesmo orçamento físico). */
export type ComputeProfile = 'unified' | 'dedicated_gpu'

export type ClusterStatus = 'provisionando' | 'ativo' | 'pausado'

/** Capacidade contratada. Valores por nó, multiplicados por `nodes`. */
export interface ClusterCapacity {
  nodes: number
  vcpuPerNode: number
  /** dedicated_gpu: RAM do host. unified: total físico da memória unificada. */
  memoryPerNodeGiB: number
  gpusPerNode: number
  /** Somente dedicated_gpu: VRAM de cada GPU. */
  vramPerGpuGiB: number
  /** Somente unified: parcela da memória unificada destinada à GPU, por nó. */
  gpuSharePerNodeGiB: number
  storageGiB: number
}

export interface SimulationStep {
  afterMs: number
  status: string
  log?: string
}

export interface Simulation {
  startedAt: number
  steps: SimulationStep[]
  applied: number
}

export interface Cluster {
  id: ID
  orgId: ID
  poolId: ID
  name: string
  purpose: string
  modality: Modality
  profile: ComputeProfile
  status: ClusterStatus
  capacity: ClusterCapacity
  monthlyBudget: number
  limitPolicy: LimitPolicy
  createdAt: string
  simulation?: Simulation
}

export interface Reservation {
  vcpu: number
  memoryGiB: number // RAM do host (ou parcela de CPU da memória unificada)
  gpus: number // GPUs inteiras (dedicated_gpu)
  gpuMemoryGiB: number // VRAM reservada (dedicated) ou parcela de GPU (unified)
}

export type Quantization = 'FP16' | 'FP8' | 'INT8' | 'INT4'

/** Onde o modelo executa — independente da licença dos pesos. */
export type ModelOffering = 'hosted' | 'external'

export interface TokenRates {
  input: number
  output: number
  /** Entrada em cache; null quando não há tarifa de cache. */
  cachedInput: number | null
}

export interface ModelProfile {
  id: ID
  family: string
  name: string
  /** Identificador exato (ex.: repositório dos pesos ou id da API). null = cadastrar. */
  identifier: string | null
  /** Quem publica o modelo. */
  vendor: string
  offering: ModelOffering
  /** Somente external: provedor que processa as requisições. */
  provider?: string
  /** Licença dos pesos ou termos do provedor — campo separado do local de execução. */
  license: string
  architecture: 'denso' | 'MoE' | null
  /** Parâmetros totais em bilhões; null = não divulgado. */
  paramsB: number | null
  /** Parâmetros ativos por token (MoE). */
  activeParamsB: number | null
  /** Contexto da versão homologada; null = conforme documentação do provedor. */
  maxContext: number | null
  modalities: string[] | null
  /** Somente hosted: quantizações oferecidas nas implantações. */
  quantizations: Quantization[]
  role: string
  strategy: string
  /** Habilitação no catálogo: só "homologada" pode ser usada ou implantada. */
  status: IntegrationStatus
  note?: string
  /** hosted: preço Orzyon em R$/1M tokens. */
  hostedPrice?: TokenRates
  /** external: custo do fornecedor em US$/1M tokens (visível só na administração). */
  providerCost?: TokenRates & { effectiveFrom: string; demo: boolean }
}

/** Acesso de uma organização a um modelo por tokens (inferência compartilhada ou API externa). */
export interface ModelAccess {
  id: ID
  orgId: ID
  modelId: ID
  enabledAt: string
  /** Média diária demonstrativa de consumo. */
  dailyTokensIn: number
  dailyTokensOut: number
  cachedShare: number
  /** Ciência de que o conteúdo é processado pelo provedor externo. */
  externalAcknowledged?: boolean
}

export interface CommercialSettings {
  externalMultiplier: number
  usdBrl: number
  ratesEffectiveFrom: string
}

export type EngineCategory = 'motor' | 'runtime'
/** Estado da integração de um motor com um perfil de hardware na Orzyon Cloud. */
export type IntegrationStatus = 'planejada' | 'experimental' | 'homologada'
export type Device = 'gpu' | 'cpu'

export interface InferenceEngine {
  id: ID
  name: string
  /** Projeto ou mantenedor. */
  project: string
  category: EngineCategory
  license: string
  /** Licença permissiva que permite uso comercial (MIT, Apache 2.0). */
  permissive: boolean
  amdSupport: string
  role: string
  description: string
  /** Estado por perfil de computação; ausente = não suportado. */
  support: Partial<Record<ComputeProfile, IntegrationStatus>>
  devices: Device[]
  quantizations: Quantization[]
  /** Nome do formato/quantização no ecossistema do motor, quando diferente. */
  quantLabels?: Partial<Record<Quantization, string>>
}

export type DeploymentStatus = 'preparando' | 'carregando' | 'disponivel' | 'pausado' | 'falha'

export interface ModelDeployment {
  id: ID
  clusterId: ID
  name: string
  modelId: ID
  engineId: ID
  device: Device
  quantization: Quantization
  contextLength: number
  status: DeploymentStatus
  reservation: Reservation
  failureReason?: string
  createdAt: string
  simulation?: Simulation
}

export type AnalysisProfile = 'Essencial' | 'Avançado' | 'Especializado'

export interface AgentRoute {
  id: ID
  condition: string
  target: string
  fallback: string
}

/** Configuração versionada de um agente. */
export interface AgentConfig {
  systemPrompt: string
  analysisProfile: AnalysisProfile
  temperature: number
  maxTokens: number
  tools: string[]
  knowledge: string[]
  routes: AgentRoute[]
  /** Requisições simultâneas por réplica. */
  concurrency: number
}

export interface AgentVersion {
  version: number
  savedAt: string
  config: AgentConfig
}

/** Agente: definição reutilizável pertencente à organização. Não executa sozinho. */
export interface Agent {
  id: ID
  orgId: ID
  name: string
  description: string
  tags: string[]
  version: number
  config: AgentConfig
  versions: AgentVersion[]
  updatedAt: string
}

/** Destino de inferência de uma implantação de agente. */
export type InferenceTarget =
  | { kind: 'deployment'; deploymentId: ID }
  | { kind: 'shared'; modelId: ID }
  | { kind: 'external'; modelId: ID }

export type AgentDeploymentStatus = 'ativo' | 'pausado'
export type ReplicaState = 'pronta' | 'iniciando' | 'pendente' | 'falha'

/** Instância de execução de uma implantação de agente. */
export interface AgentReplica {
  id: ID
  /** Identificador de pod simulado. */
  pod: string
  nodeIndex: number | null
  state: ReplicaState
  startedAt: string
  restarts: number
  reason?: string
}

/** Execução de uma versão do agente em exatamente um cluster. */
export interface AgentDeployment {
  id: ID
  orgId: ID
  agentId: ID
  clusterId: ID
  appliedVersion: number
  /** Snapshot da configuração aplicada nesta implantação. */
  config: AgentConfig
  inference: InferenceTarget
  status: AgentDeploymentStatus
  desiredReplicas: number
  replicas: AgentReplica[]
  /** Recursos do runtime por réplica (sem os pesos do modelo). */
  runtime: { vcpu: number; memoryGiB: number }
  /** Tráfego demonstrativo por réplica pronta (requisições/min). */
  trafficBase: number
  createdAt: string
  updatedAt: string
}

/** Modelo e motor que a aplicação usa. Com eles, a inteligência (0 a 100) pode ser calculada. */
export interface AppInference {
  modelId: ID
  engineId: ID
}

export type ServiceKind = 'source' | 'image'
export type SourceRuntime = 'python' | 'mojo' | 'python_mojo'
export type ServiceStatus = 'na_fila' | 'construindo' | 'implantando' | 'ativo' | 'pausado' | 'falha'

export interface EnvVar {
  key: string
  value: string
}

export interface LogLine {
  ts: string
  level: 'info' | 'aviso' | 'erro'
  message: string
}

/**
 * Aplicação: o código-fonte ou a imagem que a organização sobe. Não executa sozinha;
 * cada execução é uma instância (serviço) em um cluster.
 */
export interface Application {
  id: ID
  orgId: ID
  /** Nome de exibição. */
  name: string
  /** Base dos nomes e endpoints das instâncias. */
  slug: string
  description: string
  /** Setor tecnológico exibido na página inicial da organização (ex.: "aviacao"). */
  sector?: string
  kind: ServiceKind
  runtime?: SourceRuntime
  fileName?: string
  code?: string
  image?: string
  command: string
  env: EnvVar[]
  version: string
  /** Modelo e motor. Ausente = inteligência não calculada. */
  inference?: AppInference
  createdAt: string
}

/**
 * Serviço: instância de uma aplicação em um cluster. Carrega réplicas, reserva de
 * recursos (CPU, memória e GPU por réplica), estado e endpoint.
 */
export interface Service {
  id: ID
  applicationId: ID
  clusterId: ID
  name: string
  status: ServiceStatus
  /** Réplicas desejadas; a reserva é por réplica. */
  replicas: number
  reservation: Reservation
  endpoint: string
  logs: LogLine[]
  trafficBase: number
  createdAt: string
  simulation?: Simulation
}

export type PoolHealth = 'saudavel' | 'atencao' | 'degradado'

export interface ComputePool {
  id: ID
  name: string
  region: string
  profile: ComputeProfile
  hardware: string
  nodes: number
  perNode: {
    vcpu: number
    memoryGiB: number
    gpus: number
    vramPerGpuGiB: number // 0 em memória unificada
  }
  health: PoolHealth
  nodesDegraded: number
}

export type EventLevel = 'info' | 'sucesso' | 'aviso' | 'erro'

export interface ActivityEvent {
  id: ID
  orgId: ID
  clusterId?: ID
  ts: string
  level: EventLevel
  source: string
  message: string
}

/**
 * Chave de API da organização (não de uma pessoa). Só o prefixo e os últimos caracteres ficam guardados;
 * o segredo completo é mostrado uma vez, na criação.
 */
export interface ApiKey {
  id: ID
  orgId: ID
  name: string
  prefix: string
  last4: string
  createdAt: string
  revokedAt?: string
}

/** Recarga do saldo pré-pago, em reais. O saldo é o total de recargas menos o consumo dos modelos. */
export interface CreditEntry {
  id: ID
  orgId: ID
  amount: number
  at: string
  note: string
}

export interface AppData {
  orgs: Organization[]
  pools: ComputePool[]
  clusters: Cluster[]
  models: ModelProfile[]
  engines: InferenceEngine[]
  deployments: ModelDeployment[]
  agents: Agent[]
  agentDeployments: AgentDeployment[]
  applications: Application[]
  services: Service[]
  events: ActivityEvent[]
  modelAccess: ModelAccess[]
  commercial: CommercialSettings
  apiKeys: ApiKey[]
  credits: CreditEntry[]
}

export type UserRole = 'cliente' | 'operador'

export interface Session {
  userName: string
  email: string
  role: UserRole
  orgId: ID
  clusterId: ID | null
  startedAt: string
}

export type Period = '1h' | '24h' | '7d' | '30d'
