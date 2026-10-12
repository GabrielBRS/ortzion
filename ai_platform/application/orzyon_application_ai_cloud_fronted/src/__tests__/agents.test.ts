// Testes de agregação e integridade das relações organização → cluster → implantação → réplica.
import { beforeEach, describe, expect, it } from 'vitest'
import { createSeed } from '../mock/seed'
import { getData, resetData } from '../services/store'
import { scaleAgentDeployment, setAgentDeploymentPaused, updateAgent, deployAgent } from '../services/api'
import { migrateV5toV6, type LegacyAgent } from '../services/migrations'
import { clusterReserved, clusterTotals } from '../lib/capacity'
import { agentRow, deploymentUsage } from '../lib/agentUsage'
import { buildSeriesWindow, periodWindow, readyReplicas, summarize } from '../lib/metrics'
import { orgScope } from '../lib/selectors'

beforeEach(() => resetData())

describe('integridade do seed', () => {
  const d = createSeed()
  it('implantações de agente referenciam agente e cluster da mesma organização', () => {
    for (const dep of d.agentDeployments) {
      const agent = d.agents.find((a) => a.id === dep.agentId)
      const cluster = d.clusters.find((c) => c.id === dep.clusterId)
      expect(agent, dep.id).toBeTruthy()
      expect(cluster?.orgId).toBe(agent?.orgId)
      expect(dep.orgId).toBe(agent?.orgId)
      if (dep.inference.kind === 'deployment') {
        const md = d.deployments.find((m) => m.id === (dep.inference as { deploymentId: string }).deploymentId)
        expect(d.clusters.find((c) => c.id === md?.clusterId)?.orgId).toBe(dep.orgId)
      } else {
        const modelId = (dep.inference as { modelId: string }).modelId
        expect(d.modelAccess.some((a) => a.orgId === dep.orgId && a.modelId === modelId), `${dep.id} sem acesso`).toBe(true)
      }
    }
  })
  it('reservas iniciais cabem na capacidade de cada cluster', () => {
    for (const c of d.clusters) {
      const t = clusterTotals(c.profile, c.capacity)
      const r = clusterReserved(d, c.id)
      expect(r.vcpu).toBeLessThanOrEqual(t.vcpu)
      expect(r.memoryGiB).toBeLessThanOrEqual(t.cpuMemoryGiB)
      expect(r.gpuMemoryGiB).toBeLessThanOrEqual(t.gpuMemoryGiB)
    }
  })
  it('memória unificada não é contada duas vezes', () => {
    for (const c of d.clusters.filter((x) => x.profile === 'unified')) {
      const t = clusterTotals(c.profile, c.capacity)
      expect(t.cpuMemoryGiB + t.gpuMemoryGiB).toBe(t.physicalMemoryGiB)
    }
  })
})

describe('contagens de agentes, implantações e réplicas', () => {
  it('Atendimento ao cliente: 1 agente, 2 implantações, 4 réplicas', () => {
    const d = getData()
    const scope = orgScope(d, 'org-orzyon')
    const deps = scope.agentDeployments.filter((x) => x.agentId === 'ag-atendimento')
    expect(scope.agents.filter((a) => a.id === 'ag-atendimento')).toHaveLength(1)
    expect(deps).toHaveLength(2)
    expect(deps.reduce((s, x) => s + readyReplicas(x), 0)).toBe(4)
    const row = agentRow(d, scope.agents.find((a) => a.id === 'ag-atendimento')!, deps, periodWindow('24h'))
    expect(row.runningClusters.map((c) => c.id).sort()).toEqual(['cl-orz-lab', 'cl-orz-prod'])
  })
  it('filtro de cluster mantém o agente único e só a implantação do cluster', () => {
    const scope = orgScope(getData(), 'org-orzyon', 'cl-orz-lab')
    expect(scope.agents.some((a) => a.id === 'ag-atendimento')).toBe(true)
    expect(scope.agentDeployments.every((x) => x.clusterId === 'cl-orz-lab')).toBe(true)
  })
  it('tokens globais = soma dos tokens por implantação (sem duplicar)', () => {
    const d = getData()
    const win = periodWindow('24h')
    const org = orgScope(d, 'org-orzyon')
    const global = summarize(buildSeriesWindow(d, { clusterIds: org.clusterIds, agentsOnly: true }, win))
    const perDep = org.agentDeployments.map((x) => deploymentUsage(d, x, win))
    const sumIn = perDep.reduce((s, u) => s + u.tokensIn, 0)
    expect(Math.abs(global.tokensIn - sumIn)).toBeLessThanOrEqual(perDep.length * win.points)
  })
})

describe('operações isoladas por implantação', () => {
  it('escalar produção não altera o laboratório e respeita a capacidade', async () => {
    await scaleAgentDeployment('adep-atendimento-orz-prod', 5)
    const d = getData()
    expect(d.agentDeployments.find((x) => x.id === 'adep-atendimento-orz-prod')!.desiredReplicas).toBe(5)
    expect(d.agentDeployments.find((x) => x.id === 'adep-atendimento-orz-lab')!.desiredReplicas).toBe(1)
    await expect(scaleAgentDeployment('adep-atendimento-orz-lab', 20)).rejects.toThrow()
  })
  it('pausar libera a reserva só daquela implantação', async () => {
    const before = clusterReserved(getData(), 'cl-orz-prod').vcpu
    await setAgentDeploymentPaused('adep-atendimento-orz-lab', true)
    expect(clusterReserved(getData(), 'cl-orz-prod').vcpu).toBe(before)
    expect(readyReplicas(getData().agentDeployments.find((x) => x.id === 'adep-atendimento-orz-prod')!)).toBe(3)
  })
  it('salvar o agente cria nova versão sem alterar implantações', async () => {
    const a = getData().agents.find((x) => x.id === 'ag-codigo')!
    await updateAgent(a.id, { name: a.name, description: a.description, tags: a.tags, config: { ...a.config, temperature: 0.9 } })
    const d = getData()
    expect(d.agents.find((x) => x.id === a.id)!.version).toBe(a.version + 1)
    expect(d.agentDeployments.filter((x) => x.agentId === a.id).every((x) => x.appliedVersion === a.version)).toBe(true)
  })
  it('não permite implantar em cluster de outra organização', async () => {
    await expect(
      deployAgent({ agentId: 'ag-codigo', clusterId: 'cl-gov-receita', version: 1, inference: { kind: 'deployment', deploymentId: 'dep-rf-32b' }, replicas: 1, runtime: { vcpu: 1, memoryGiB: 2 } }),
    ).rejects.toThrow()
  })
  it('runtime do agente não reserva GPU', () => {
    const d = getData()
    const withAgents = clusterReserved(d, 'cl-orz-prod')
    const noAgents = clusterReserved({ ...d, agentDeployments: [] }, 'cl-orz-prod')
    expect(withAgents.gpus).toBe(noAgents.gpus)
    expect(withAgents.gpuMemoryGiB).toBe(noAgents.gpuMemoryGiB)
  })
})

describe('migração v5 → v6', () => {
  it('cada agente com clusterId vira definição + implantação, preservando IDs', () => {
    const seed = createSeed()
    const legacy: LegacyAgent = {
      id: 'ag-antigo',
      clusterId: 'cl-orz-lab',
      name: 'Agente antigo',
      description: '',
      status: 'ativo',
      tags: [],
      systemPrompt: 'x',
      deploymentId: 'dep-lab-4b',
      analysisProfile: 'Essencial',
      temperature: 0.2,
      maxTokens: 512,
      tools: [],
      knowledge: [],
      routes: [],
      concurrency: 4,
      runtime: { vcpu: 1, memoryGiB: 2 },
      trafficBase: 5,
      updatedAt: new Date().toISOString(),
    }
    const out = migrateV5toV6({ ...seed, agents: [legacy], agentDeployments: undefined }) as unknown as typeof seed
    expect(out.agents).toHaveLength(1)
    expect(out.agents[0].id).toBe('ag-antigo')
    expect(out.agentDeployments).toHaveLength(1)
    expect(out.agentDeployments[0]).toMatchObject({ agentId: 'ag-antigo', clusterId: 'cl-orz-lab', inference: { kind: 'deployment', deploymentId: 'dep-lab-4b' } })
  })
})
