// Inteligência (0 a 100) de aplicações, serviços e agentes. É a média simples de três fatores, cada um de 0 a 1:
// - modelo: escala logarítmica dos parâmetros (1 bilhão ≈ 0; 1 trilhão = 1);
// - motor: homologação do motor no perfil do cluster (homologada 1, experimental 0,5, planejada 0,25);
// - recurso: memória reservada (RAM ou VRAM por réplica, vezes as réplicas), em escala logarítmica até 1024 GiB.
// A quantidade de tokens (contexto) não entra na conta.
import type { AppData, Application, ComputeProfile, InferenceEngine, IntegrationStatus, Service } from '../domain/types'

/** Memória (GiB) em que o fator de recurso chega a 1. */
export const RESOURCE_REF_GIB = 1024

const ENGINE_LEVEL: Record<IntegrationStatus, number> = { homologada: 1, experimental: 0.5, planejada: 0.25 }
const PROFILES: ComputeProfile[] = ['dedicated_gpu', 'unified']

export interface IntelligenceReading {
  /** 0 a 100. */
  score: number
  model: number
  engine: number
  resource: number
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Fator do modelo pelos parâmetros (bilhões). Sem parâmetros divulgados, 0. */
export function modelFactor(paramsB: number | null | undefined): number {
  if (!paramsB) return 0
  return clamp01(Math.log10(1 + paramsB) / Math.log10(1 + 1000))
}

/** Fator do motor no perfil dado; sem perfil, o melhor perfil em que o motor é suportado. */
export function engineFactor(engine: InferenceEngine | undefined, profile?: ComputeProfile): number {
  if (!engine) return 0
  const levels = (profile ? [profile] : PROFILES).map((p) => {
    const status = engine.support[p]
    return status ? ENGINE_LEVEL[status] : 0
  })
  return Math.max(0, ...levels)
}

/** Fator de recurso pela memória reservada, em GiB. */
export function resourceFactor(memoryGiB: number): number {
  return clamp01(Math.log2(1 + Math.max(0, memoryGiB)) / Math.log2(1 + RESOURCE_REF_GIB))
}

function reading(model: number, engine: number, resource: number): IntelligenceReading {
  return { score: Math.round(((model + engine + resource) / 3) * 100), model, engine, resource }
}

/** Memória reservada por um serviço: RAM e VRAM por réplica, vezes as réplicas. */
const reservedMemory = (s: Service) => (s.reservation.memoryGiB + s.reservation.gpuMemoryGiB) * s.replicas

function profileOf(data: AppData, s: Service): ComputeProfile | undefined {
  return data.clusters.find((c) => c.id === s.clusterId)?.profile
}

/**
 * Inteligência de uma aplicação. O motor é a média dos seus serviços (cada um no perfil do cluster);
 * sem serviços, vale o melhor perfil. A memória é a soma de todos os serviços.
 */
export function applicationIntelligence(data: AppData, app: Application): IntelligenceReading | null {
  if (!app.inference) return null
  const { modelId, engineId } = app.inference
  const model = data.models.find((m) => m.id === modelId)
  const engine = data.engines.find((e) => e.id === engineId)
  const instances = data.services.filter((s) => s.applicationId === app.id)
  const engines = instances.length ? instances.map((s) => engineFactor(engine, profileOf(data, s))) : [engineFactor(engine)]
  const resource = resourceFactor(instances.reduce((acc, s) => acc + reservedMemory(s), 0))
  return reading(modelFactor(model?.paramsB), mean(engines), resource)
}

/** Inteligência de um serviço: o modelo e o motor da sua aplicação, com a memória reservada por este serviço. */
export function serviceIntelligence(data: AppData, s: Service): IntelligenceReading | null {
  const app = data.applications.find((a) => a.id === s.applicationId)
  if (!app?.inference) return null
  const { modelId, engineId } = app.inference
  const model = data.models.find((m) => m.id === modelId)
  const engine = data.engines.find((e) => e.id === engineId)
  return reading(modelFactor(model?.paramsB), engineFactor(engine, profileOf(data, s)), resourceFactor(reservedMemory(s)))
}

/** Inteligência de um agente (setor): média simples das aplicações dele que têm modelo configurado. */
export function agentIntelligence(data: AppData, apps: Application[]): number | null {
  const scores = apps.map((a) => applicationIntelligence(data, a)).filter((r): r is IntelligenceReading => r !== null).map((r) => r.score)
  return scores.length ? Math.round(mean(scores)) : null
}

/** Mínimo recomendado pela Orzyon para o agente. Abaixo disso, o medidor fica em alerta. */
export const RECOMMENDED_INTELLIGENCE = 70

/** Cor do medidor: muito baixa (vermelho), abaixo do recomendado (âmbar) ou no mínimo recomendado ou acima (verde). */
export function intelligenceTone(score: number): 'err' | 'warn' | 'ok' {
  if (score < 40) return 'err'
  if (score < RECOMMENDED_INTELLIGENCE) return 'warn'
  return 'ok'
}
