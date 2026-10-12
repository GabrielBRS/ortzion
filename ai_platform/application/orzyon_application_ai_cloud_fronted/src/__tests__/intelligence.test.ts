// Testes da inteligência (medidor 0 a 100): fatores, aplicação, serviço, agente, troca de modelo e migração v13 → v14.
import { beforeEach, describe, expect, it } from 'vitest'
import { createSeed } from '../mock/seed'
import { getData, resetData } from '../services/store'
import { ApiError, setApplicationInference } from '../services/api'
import { migrateV13toV14 } from '../services/migrations'
import {
  RECOMMENDED_INTELLIGENCE,
  agentIntelligence,
  applicationIntelligence,
  engineFactor,
  intelligenceTone,
  modelFactor,
  resourceFactor,
  serviceIntelligence,
} from '../lib/intelligence'
import { sectorAgents } from '../lib/sectorAgents'
import type { AppData } from '../domain/types'

beforeEach(() => resetData())

const d = createSeed()
const engine = (id: string) => d.engines.find((e) => e.id === id)

describe('fatores da inteligência', () => {
  it('o modelo cresce com os parâmetros e fica entre 0 e 1', () => {
    expect(modelFactor(8)).toBeLessThan(modelFactor(70))
    expect(modelFactor(70)).toBeLessThan(modelFactor(405))
    expect(modelFactor(1000)).toBeCloseTo(1)
    expect(modelFactor(null)).toBe(0)
  })

  it('o motor vale pelo estado de homologação no perfil do cluster', () => {
    expect(engineFactor(engine('eng-vllm'), 'dedicated_gpu')).toBe(1)
    expect(engineFactor(engine('eng-vllm'), 'unified')).toBe(0.5)
    expect(engineFactor(engine('eng-mlc'), 'unified')).toBe(0.5)
    expect(engineFactor(undefined)).toBe(0)
  })

  it('o recurso cresce com a memória e para em 1', () => {
    expect(resourceFactor(0)).toBe(0)
    expect(resourceFactor(16)).toBeLessThan(resourceFactor(160))
    expect(resourceFactor(1_000_000)).toBe(1)
  })

  it('a cor do medidor segue a faixa da leitura', () => {
    expect(intelligenceTone(10)).toBe('err')
    expect(intelligenceTone(50)).toBe('warn')
    expect(intelligenceTone(69)).toBe('warn')
    expect(intelligenceTone(70)).toBe('ok')
    expect(intelligenceTone(80)).toBe('ok')
    expect(RECOMMENDED_INTELLIGENCE).toBe(70)
  })
})

describe('inteligência de aplicações, serviços e agentes', () => {
  it('uma aplicação sem modelo não tem leitura', () => {
    const app = { ...d.applications.find((a) => a.id === 'app-orzyon-medical')!, inference: undefined }
    expect(applicationIntelligence(d, app)).toBeNull()
  })

  it('a Superinteligência tem o maior nível entre as aplicações da Orzyon', () => {
    const scores = d.applications.filter((a) => a.orgId === 'org-orzyon').map((a) => applicationIntelligence(d, a)!.score)
    const sup = applicationIntelligence(d, d.applications.find((a) => a.id === 'app-orzyon-superintelligence')!)!
    expect(sup.score).toBe(Math.max(...scores))
  })

  it('o serviço usa a memória dele: mais réplicas, mais recurso, mesmo modelo', () => {
    const svc = d.services.find((s) => s.id === 'svc-orzyon-superintelligence')!
    const one = serviceIntelligence(d, { ...svc, replicas: 1 })!
    const two = serviceIntelligence(d, svc)!
    expect(two.resource).toBeGreaterThan(one.resource)
    expect(two.model).toBe(one.model)
  })

  it('o agente é a média das aplicações com modelo; sem nenhuma, não há leitura', () => {
    const [a, b] = d.applications.filter((x) => x.sector === 'investigacao').slice(0, 2)
    const sa = applicationIntelligence(d, a)!.score
    const sb = applicationIntelligence(d, b)!.score
    expect(agentIntelligence(d, [a, b])).toBe(Math.round((sa + sb) / 2))
    expect(agentIntelligence(d, [{ ...a, inference: undefined }])).toBeNull()
  })

  it('o agente da Superinteligência mostra a leitura da aplicação dele', () => {
    const agent = sectorAgents(d, 'org-orzyon').find((a) => a.key === 'superinteligencia')!
    expect(agentIntelligence(d, agent.apps)).toBe(applicationIntelligence(d, agent.apps[0])!.score)
  })
})

describe('trocar modelo e motor da aplicação', () => {
  it('aceita modelo homologado e grava na aplicação', async () => {
    await setApplicationInference('app-orzyon-medical', { modelId: 'mdl-qwen3-8b', engineId: 'eng-llamacpp' })
    const app = getData().applications.find((a) => a.id === 'app-orzyon-medical')!
    expect(app.inference).toEqual({ modelId: 'mdl-qwen3-8b', engineId: 'eng-llamacpp' })
  })

  it('recusa modelo que não está homologado', async () => {
    await expect(setApplicationInference('app-orzyon-medical', { modelId: 'mdl-kimi-k2', engineId: 'eng-vllm' })).rejects.toBeInstanceOf(ApiError)
  })
})

describe('migração v13 → v14', () => {
  it('põe modelo e motor nas aplicações e acrescenta a Superinteligência uma única vez', () => {
    const v13 = structuredClone(createSeed())
    v13.applications = v13.applications.filter((a) => a.id !== 'app-orzyon-superintelligence').map((a) => ({ ...a, inference: undefined }))
    v13.services = v13.services.filter((s) => s.id !== 'svc-orzyon-superintelligence')
    const once = migrateV13toV14(structuredClone(v13) as unknown as Record<string, unknown>) as unknown as AppData
    const twice = migrateV13toV14(structuredClone(once) as unknown as Record<string, unknown>) as unknown as AppData
    expect(once.applications.find((a) => a.id === 'app-orzyon-superintelligence')?.inference).toEqual({ modelId: 'mdl-gpt-oss-120b', engineId: 'eng-vllm' })
    expect(once.applications.find((a) => a.id === 'app-orzyon-medical')?.inference).toEqual({ modelId: 'mdl-qwen3-32b', engineId: 'eng-vllm' })
    expect(once.services.filter((s) => s.id === 'svc-orzyon-superintelligence')).toHaveLength(1)
    expect(twice.services).toHaveLength(once.services.length)
    expect(twice.applications).toHaveLength(once.applications.length)
  })
})
