// Dados demonstrativos do governo militar: uma instância por setor no cluster de vigilância e dois agentes
// nesse cluster, para que o painel do setor mostre instâncias, agentes e tokens. Todos fictícios.
// Usado pela semente inicial e pela migração do esquema v11 (por id, sem duplicar).
import type { Agent, AgentDeployment, AgentReplica, ModelAccess, Service } from '../domain/types'
import { slugify } from '../lib/format'
import { GOV_MILITAR_ORG } from './demoOrgs'
import { SECTOR_APP_DEFS } from './sectorApps'

const MIL = GOV_MILITAR_ORG.id
const CLUSTER_ID = 'cl-gov-vigilancia'
const MODEL_ID = 'mdl-qwen3-8b'

function replicas(depId: string, count: number, startedAt: string): AgentReplica[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${depId}-r${i + 1}`,
    pod: `${depId.replace(/^adep-/, 'agt-')}-r${i + 1}`,
    nodeIndex: 0,
    state: 'pronta',
    startedAt,
    restarts: 0,
  }))
}

const AGENT_DEFS = [
  { id: 'ag-mil-vigilancia', depId: 'adep-mil-vigilancia', name: 'Vigilância de área', description: 'Triagem de sinais de radar e sensores (demonstração).', replicas: 2, trafficBase: 40 },
  { id: 'ag-mil-comando', depId: 'adep-mil-comando', name: 'Apoio ao comando', description: 'Resumo de alertas e relatórios para o comando (demonstração).', replicas: 1, trafficBase: 25 },
]

/** Instâncias, agentes, implantações e acesso ao modelo do governo militar. */
export function militaryDemo(createdAt: string): { services: Service[]; agents: Agent[]; agentDeployments: AgentDeployment[]; modelAccess: ModelAccess[] } {
  const services: Service[] = SECTOR_APP_DEFS.filter((d) => d.orgId === MIL).map((d) => {
    const name = slugify(d.name)
    return {
      id: `svc-mil-${d.sector}`,
      applicationId: d.id,
      clusterId: CLUSTER_ID,
      name,
      status: 'ativo',
      replicas: 1,
      reservation: { vcpu: 2, memoryGiB: 4, gpus: 0, gpuMemoryGiB: 0 },
      endpoint: `https://${name}.vigilancia-demonstracao.orzyon-cloud.example`,
      logs: [{ ts: createdAt, level: 'info', message: 'Versão v1.0.0 ativa.' }],
      trafficBase: 20,
      createdAt,
    }
  })

  const agents: Agent[] = []
  const agentDeployments: AgentDeployment[] = []
  for (const def of AGENT_DEFS) {
    const config = {
      systemPrompt: `Você é o agente "${def.name}". Responda em português do Brasil, de forma objetiva.`,
      analysisProfile: 'Essencial' as const,
      temperature: 0.3,
      maxTokens: 1024,
      tools: ['Busca na base de conhecimento'],
      knowledge: [],
      routes: [],
      concurrency: 16,
    }
    agents.push({
      id: def.id,
      orgId: MIL,
      name: def.name,
      description: def.description,
      tags: ['demonstração'],
      version: 1,
      config,
      versions: [{ version: 1, savedAt: createdAt, config }],
      updatedAt: createdAt,
    })
    agentDeployments.push({
      id: def.depId,
      orgId: MIL,
      agentId: def.id,
      clusterId: CLUSTER_ID,
      appliedVersion: 1,
      config: structuredClone(config),
      inference: { kind: 'shared', modelId: MODEL_ID },
      status: 'ativo',
      desiredReplicas: def.replicas,
      replicas: replicas(def.depId, def.replicas, createdAt),
      runtime: { vcpu: 1, memoryGiB: 2 },
      trafficBase: def.trafficBase,
      createdAt,
      updatedAt: createdAt,
    })
  }

  const modelAccess: ModelAccess[] = [
    { id: 'acc-mil-qwen3-8b', orgId: MIL, modelId: MODEL_ID, enabledAt: createdAt, dailyTokensIn: 2e6, dailyTokensOut: 0.5e6, cachedShare: 0.2 },
  ]

  return { services, agents, agentDeployments, modelAccess }
}
