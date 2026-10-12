// Preço final ao cliente por modelo e consumo por tokens (inferência compartilhada e APIs externas).
import type { AppData, CommercialSettings, ModelAccess, ModelProfile, TokenRates } from '../domain/types'
import { monthWindow } from './costs'
import { agentTokenCostsMonth } from './agentUsage'

/** Preço final ao cliente, em R$ por 1 milhão de tokens. */
export function clientRates(model: ModelProfile, c: CommercialSettings): TokenRates | null {
  if (model.offering === 'hosted') return model.hostedPrice ?? null
  const cost = model.providerCost
  if (!cost) return null
  const k = c.externalMultiplier * c.usdBrl
  return { input: cost.input * k, output: cost.output * k, cachedInput: cost.cachedInput === null ? null : cost.cachedInput * k }
}

/** Custo do fornecedor convertido para R$ por 1 milhão (somente externos). */
export function providerRatesBRL(model: ModelProfile, c: CommercialSettings): TokenRates | null {
  const cost = model.providerCost
  if (!cost) return null
  return { input: cost.input * c.usdBrl, output: cost.output * c.usdBrl, cachedInput: cost.cachedInput === null ? null : cost.cachedInput * c.usdBrl }
}

export function callCost(rates: TokenRates, tokensIn: number, tokensOut: number, cachedIn = 0) {
  const fresh = tokensIn - cachedIn
  return (fresh * rates.input + cachedIn * (rates.cachedInput ?? rates.input) + tokensOut * rates.output) / 1e6
}

/** Markup e margem de um multiplicador, considerando somente o custo da API. */
export const multiplierEconomics = (m: number) => ({ markup: m - 1, margin: m > 0 ? 1 - 1 / m : 0 })

export interface AccessUsage {
  access: ModelAccess
  model: ModelProfile
  rates: TokenRates
  tokensIn: number
  tokensOut: number
  cachedIn: number
  toDate: number
  projected: number
  /** Somente externos: custo do fornecedor no mês (administração). */
  providerToDate: number
}

export function accessUsage(data: AppData, access: ModelAccess, now = new Date()): AccessUsage | null {
  const model = data.models.find((m) => m.id === access.modelId)
  if (!model) return null
  const rates = clientRates(model, data.commercial)
  if (!rates) return null
  const win = monthWindow(now)
  const from = Math.max(win.start.getTime(), new Date(access.enabledAt).getTime())
  const days = Math.max(0, (now.getTime() - from) / 86400000)
  const remainingDays = (win.end.getTime() - now.getTime()) / 86400000
  const tokensIn = access.dailyTokensIn * days
  const tokensOut = access.dailyTokensOut * days
  const cachedIn = tokensIn * access.cachedShare
  const toDate = callCost(rates, tokensIn, tokensOut, cachedIn)
  const perDay = callCost(rates, access.dailyTokensIn, access.dailyTokensOut, access.dailyTokensIn * access.cachedShare)
  const prov = providerRatesBRL(model, data.commercial)
  return {
    access,
    model,
    rates,
    tokensIn,
    tokensOut,
    cachedIn,
    toDate,
    projected: toDate + perDay * remainingDays,
    providerToDate: prov ? callCost(prov, tokensIn, tokensOut, cachedIn) : 0,
  }
}

export function orgTokenUsage(data: AppData, orgId: string, now = new Date()) {
  const items = data.modelAccess
    .filter((a) => a.orgId === orgId)
    .map((a) => accessUsage(data, a, now))
    .filter((x): x is AccessUsage => !!x)
  const sum = (f: (x: AccessUsage) => number, ext?: boolean) =>
    items.filter((x) => ext === undefined || (x.model.offering === 'external') === ext).reduce((s, x) => s + f(x), 0)
  // Consumo atribuído a agentes que usam modelo compartilhado ou API externa.
  const agents = agentTokenCostsMonth(data, orgId, now)
  return {
    items,
    hostedToDate: sum((x) => x.toDate, false),
    externalToDate: sum((x) => x.toDate, true),
    agentsToDate: agents.toDate,
    agentsProjected: agents.projected,
    toDate: sum((x) => x.toDate) + agents.toDate,
    projected: sum((x) => x.projected) + agents.projected,
  }
}
