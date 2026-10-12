// Saldo pré-pago de uma organização: recargas menos o consumo dos modelos no mês corrente.
import type { AppData } from '../domain/types'
import { accessUsage } from './modelPricing'

export function creditBalance(data: AppData, orgId: string, now = new Date()) {
  const credited = data.credits.filter((c) => c.orgId === orgId).reduce((s, c) => s + c.amount, 0)
  const consumed = data.modelAccess.filter((a) => a.orgId === orgId).reduce((s, a) => s + (accessUsage(data, a, now)?.toDate ?? 0), 0)
  return { credited, consumed, balance: credited - consumed }
}
