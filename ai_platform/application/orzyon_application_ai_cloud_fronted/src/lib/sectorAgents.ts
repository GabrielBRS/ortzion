// Agentes fixos: em Orzyon e governo, cada setor é um agente. As habilidades do agente são as
// aplicações do setor; os clusters e serviços vêm das instâncias dessas aplicações.
import type { AppData, Application, OrgSegment, Service } from '../domain/types'
import { SECTOR_GROUPS } from '../mock/sectorApps'

/** Orzyon e governo usam agentes fixos (um por setor). Clientes B2B criam os próprios agentes. */
export const isSectorOrg = (segment: OrgSegment) => segment !== 'b2b'

/** Nome do agente de um setor. Sem nome próprio do setor, usa o nome da aplicação de referência. */
export function sectorAgentName(key: string, fallback: string): string {
  return `Agente de ${SECTOR_GROUPS[key]?.name ?? fallback}`
}

/** Nome do agente de um setor, pela aplicação de referência (a primeira do setor). Cópias de aplicação não mudam o agente. */
export function agentNameOf(apps: Application[], key: string): string {
  const ref = apps.find((a) => a.sector === key)
  return sectorAgentName(key, ref?.name ?? key)
}

/** Agentes (setores) presentes nas aplicações: opções dos filtros. */
export function agentOptions(apps: Application[]): { key: string; name: string }[] {
  const byKey = new Map<string, string>()
  for (const a of apps) if (a.sector && !byKey.has(a.sector)) byKey.set(a.sector, sectorAgentName(a.sector, a.name))
  return [...byKey].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export interface SectorAgent {
  key: string
  name: string
  description: string
  /** Habilidades: aplicações do setor. */
  apps: Application[]
  /** Serviços (instâncias) das habilidades. */
  services: Service[]
  clusterIds: string[]
}

export function sectorAgents(data: AppData, orgId: string): SectorAgent[] {
  const apps = data.applications.filter((a) => a.orgId === orgId && a.sector)
  const keys = [...new Set(apps.map((a) => a.sector as string))]
  return keys
    .map((key): SectorAgent => {
      const sectorApps = apps.filter((a) => a.sector === key)
      const services = data.services.filter((s) => sectorApps.some((a) => a.id === s.applicationId))
      return {
        key,
        name: sectorAgentName(key, sectorApps[0].name),
        description: SECTOR_GROUPS[key]?.description ?? sectorApps[0].description,
        apps: sectorApps,
        services,
        clusterIds: [...new Set(services.map((s) => s.clusterId))],
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/** Agentes com ao menos um serviço ativo em cluster ativo. */
export function sectorAgentsRunning(data: AppData, orgId: string): number {
  return sectorAgents(data, orgId).filter((a) =>
    a.services.some((s) => s.status === 'ativo' && data.clusters.find((c) => c.id === s.clusterId)?.status === 'ativo'),
  ).length
}
