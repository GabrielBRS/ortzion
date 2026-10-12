import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AppData, Cluster, Organization, Session, UserRole } from '../domain/types'
import { loadSession, saveSession, useData } from '../services/store'

interface AppContextValue {
  data: AppData
  session: Session | null
  org: Organization | null
  orgClusters: Cluster[]
  /** Cluster em foco no cabeçalho, ou null para "todos". */
  cluster: Cluster | null
  login: () => void
  logout: () => void
  setOrg: (orgId: string) => void
  setCluster: (clusterId: string | null) => void
  setRole: (role: UserRole) => void
}

const Ctx = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const data = useData()
  const [session, setSessionState] = useState<Session | null>(() => loadSession())

  const update = useCallback((s: Session | null) => {
    saveSession(s)
    setSessionState(s)
  }, [])

  const login = useCallback(() => {
    update({
      userName: 'Usuário Demonstração',
      email: 'demo@orzyon-cloud.example',
      role: 'cliente',
      orgId: data.orgs[0]?.id ?? '',
      clusterId: null,
      startedAt: new Date().toISOString(),
    })
  }, [data.orgs, update])

  const logout = useCallback(() => update(null), [update])

  const org = useMemo(() => {
    if (!session) return null
    return data.orgs.find((o) => o.id === session.orgId) ?? data.orgs[0] ?? null
  }, [data.orgs, session])

  const orgClusters = useMemo(() => (org ? data.clusters.filter((c) => c.orgId === org.id) : []), [data.clusters, org])
  const cluster = useMemo(() => orgClusters.find((c) => c.id === session?.clusterId) ?? null, [orgClusters, session?.clusterId])

  const value: AppContextValue = {
    data,
    session,
    org,
    orgClusters,
    cluster,
    login,
    logout,
    setOrg: (orgId) => session && update({ ...session, orgId, clusterId: null }),
    setCluster: (clusterId) => session && update({ ...session, clusterId }),
    setRole: (role) => session && update({ ...session, role }),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fora do AppProvider')
  return v
}

/** Para telas autenticadas: garante org não nula. */
export function useOrg() {
  const v = useApp()
  if (!v.org || !v.session) throw new Error('Sessão ausente')
  return { ...v, org: v.org, session: v.session }
}
