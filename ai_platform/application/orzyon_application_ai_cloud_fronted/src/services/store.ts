// Armazenamento local da demonstração. Ponto único de leitura/escrita do estado mock.
// Quando houver backend, este módulo é substituído por cache de requisições (ex.: React Query)
// e `api.ts` passa a chamar os endpoints reais.
import { useSyncExternalStore } from 'react'
import type { AppData, Session } from '../domain/types'
import { createSeed } from '../mock/seed'
import { migrateV5toV6, migrateV6toV7, migrateV7toV8, migrateV8toV9, migrateV9toV10, migrateV10toV11, migrateV11toV12, migrateV12toV13, migrateV13toV14, migrateV14toV15 } from './migrations'

const DATA_KEY = 'orzyon-cloud:data'
const SESSION_KEY = 'orzyon-cloud:session'
export const SCHEMA_VERSION = 15

interface Persisted {
  schemaVersion: number
  savedAt: string
  data: AppData
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted
      if (parsed.schemaVersion === SCHEMA_VERSION && parsed.data) return parsed.data
      // Migrações encadeadas. v5 → v6: agentes com clusterId viram definição + implantação.
      // v6 → v7: organizações ganham tipo, governo é separado em civil/militar e serviços viram instâncias de aplicações.
      // v7 → v8: aplicações ganham setor e os setores de governo passam a ser aplicações.
      // v8 → v9: setores de governo viram grupos, com subsetores.
      if (parsed.schemaVersion >= 5 && parsed.schemaVersion < SCHEMA_VERSION && parsed.data) {
        let legacy = parsed.data as unknown as Record<string, unknown>
        if (parsed.schemaVersion === 5) legacy = migrateV5toV6(legacy)
        if (parsed.schemaVersion <= 6) legacy = migrateV6toV7(legacy)
        if (parsed.schemaVersion <= 7) legacy = migrateV7toV8(legacy)
        legacy = migrateV8toV9(legacy)
        legacy = migrateV9toV10(legacy)
        legacy = migrateV10toV11(legacy)
        legacy = migrateV11toV12(legacy)
        legacy = migrateV12toV13(legacy)
        legacy = migrateV13toV14(legacy)
        legacy = migrateV14toV15(legacy)
        const migrated = legacy as unknown as AppData
        persist(migrated)
        return migrated
      }
    }
  } catch {
    // Estado corrompido ou armazenamento indisponível: volta ao estado inicial.
  }
  return createSeed()
}

function persist(data: AppData) {
  try {
    const payload: Persisted = { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), data }
    localStorage.setItem(DATA_KEY, JSON.stringify(payload))
  } catch {
    // Sem armazenamento: a demonstração segue em memória.
  }
}

let state: AppData = load()
const listeners = new Set<() => void>()

export function getData(): AppData {
  return state
}

export function setData(updater: (draft: AppData) => AppData) {
  state = updater(state)
  persist(state)
  listeners.forEach((l) => l())
}

export function resetData() {
  state = createSeed()
  persist(state)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData)
}

// ---------------------------------------------------------------------------
// Sessão fictícia (somente sessionStorage). Nunca contém senha.

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    // Sessões anteriores à v7 apontavam para "Governo — Demonstração", agora "Governo — Civil".
    return s.orgId === 'org-gov' ? { ...s, orgId: 'org-gov-civil' } : s
  } catch {
    return null
  }
}

export function saveSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignorado
  }
}
