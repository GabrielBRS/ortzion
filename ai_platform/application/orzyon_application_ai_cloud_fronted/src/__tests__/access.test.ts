// Testes do acesso à API: chaves da organização, saldo pré-pago (recargas menos consumo) e migração v14 → v15.
import { beforeEach, describe, expect, it } from 'vitest'
import { createSeed } from '../mock/seed'
import { getData, resetData } from '../services/store'
import { ApiError, addCredits, createApiKey, revokeApiKey } from '../services/api'
import { migrateV14toV15 } from '../services/migrations'
import { KEY_PREFIX, generateApiKey } from '../lib/gateway'
import { creditBalance } from '../lib/credits'
import type { AppData } from '../domain/types'

beforeEach(() => resetData())

describe('chaves de API', () => {
  it('gera um segredo com o prefixo da plataforma e guarda só o prefixo e os últimos caracteres', async () => {
    const { key, record } = await createApiKey('org-orzyon', 'Aplicação de atendimento')
    expect(key.startsWith(KEY_PREFIX)).toBe(true)
    expect(key).toHaveLength(KEY_PREFIX.length + 40)
    expect(record.prefix).toBe(key.slice(0, KEY_PREFIX.length + 4))
    expect(record.last4).toBe(key.slice(-4))
    expect(JSON.stringify(getData().apiKeys)).not.toContain(key)
  })

  it('o segredo é diferente a cada geração', () => {
    expect(generateApiKey()).not.toBe(generateApiKey())
  })

  it('exige nome e limita o tamanho', async () => {
    await expect(createApiKey('org-orzyon', '   ')).rejects.toBeInstanceOf(ApiError)
    await expect(createApiKey('org-orzyon', 'x'.repeat(61))).rejects.toBeInstanceOf(ApiError)
  })

  it('revogar marca a data e pode ser repetido sem erro', async () => {
    const { record } = await createApiKey('org-orzyon', 'Teste')
    await revokeApiKey(record.id)
    const saved = getData().apiKeys.find((k) => k.id === record.id)!
    expect(saved.revokedAt).toBeTruthy()
    await expect(revokeApiKey(record.id)).resolves.toBeUndefined()
  })
})

describe('saldo pré-pago', () => {
  it('começa com a recarga de demonstração e soma novas recargas', async () => {
    const before = creditBalance(getData(), 'org-orzyon')
    expect(before.credited).toBe(10000)
    await addCredits('org-orzyon', 250.5)
    const after = creditBalance(getData(), 'org-orzyon')
    expect(after.credited).toBeCloseTo(10250.5)
    expect(after.balance).toBeCloseTo(after.credited - after.consumed)
  })

  it('recusa recargas fora da faixa', async () => {
    await expect(addCredits('org-orzyon', 49)).rejects.toBeInstanceOf(ApiError)
    await expect(addCredits('org-orzyon', 100001)).rejects.toBeInstanceOf(ApiError)
    await expect(addCredits('org-orzyon', Number.NaN)).rejects.toBeInstanceOf(ApiError)
  })

  it('sem recarga, o saldo é o próprio consumo negado', () => {
    const d = createSeed()
    d.credits = []
    const b = creditBalance(d, 'org-orzyon')
    expect(b.credited).toBe(0)
    expect(b.balance).toBeCloseTo(-b.consumed)
  })
})

describe('migração v14 → v15', () => {
  it('acrescenta chaves e recarga de demonstração, sem duplicar nada', () => {
    const v14 = structuredClone(createSeed()) as unknown as Record<string, unknown>
    delete v14.apiKeys
    delete v14.credits
    const once = migrateV14toV15(structuredClone(v14)) as unknown as AppData
    const twice = migrateV14toV15(structuredClone(once) as unknown as Record<string, unknown>) as unknown as AppData
    expect(once.apiKeys).toEqual([])
    expect(once.credits.filter((c) => c.orgId === 'org-orzyon')).toHaveLength(1)
    expect(twice.credits).toHaveLength(once.credits.length)
  })

  it('preserva créditos que já existem', () => {
    const v14 = structuredClone(createSeed()) as unknown as Record<string, unknown>
    v14.credits = [{ id: 'cr-x', orgId: 'org-orzyon', amount: 42, at: 'x', note: 'x' }]
    const migrated = migrateV14toV15(v14) as unknown as AppData
    expect(migrated.credits).toEqual([{ id: 'cr-x', orgId: 'org-orzyon', amount: 42, at: 'x', note: 'x' }])
  })
})
