import { useState, type ComponentType } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BarChart3, Bot, Boxes, Building2, ChevronDown, CircleDollarSign, Cpu, LayoutDashboard, MessagesSquare, Package, Plus, Server } from 'lucide-react'
import type { Application, OrgSegment } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { EmptyState, Panel } from '../components/ui'
import { CivilArt, MilitaryArt, NetworkArt } from '../components/ThemeArt'
import { SECTOR_ICON, type Icon } from '../components/SectorIcons'
import { orgCosts } from '../lib/costs'
import { fmtBRL0 } from '../lib/format'
import { orgScope } from '../lib/selectors'
import { RUNTIME_LABEL } from '../mock/samples'
import { SECTOR_GROUPS } from '../mock/sectorApps'
import { isSectorOrg, sectorAgents } from '../lib/sectorAgents'

interface Theme {
  kicker: string
  tagline: string
  art: ComponentType<{ className?: string }>
  /** Classes de cor do cenário (texto e borda). */
  accent: string
  frame: string
  /** Título da seção de setores. Ausente quando a organização não tem setores. */
  sectionTitle?: string
  /**
   * Setores em ordem de exibição (chaves). Cada setor é um grupo de aplicações da organização:
   * com uma aplicação, o tile leva direto a ela; com vários subsetores, leva ao painel do setor.
   */
  sectors?: string[]
  /** Quantos setores ficam visíveis; o restante aparece em "Ver mais". Ausente = todos visíveis. */
  collapsedAfter?: number
}

const THEMES: Record<OrgSegment, Theme> = {
  orzyon: {
    kicker: 'Plataforma Orzyon',
    tagline: 'Clusters, aplicações e agentes da própria Orzyon. O dashboard mostra consumo, alertas e instâncias em tempo real.',
    art: NetworkArt,
    accent: 'text-accent',
    frame: 'border-accent/25',
    sectionTitle: 'Setores Tecnológicos Orzyon',
    sectors: ['financeiros', 'medicos', 'seguranca', 'superinteligencia'],
  },
  governo_civil: {
    kicker: 'Governo civil',
    tagline: 'Economia, segurança, estradas e serviços ao cidadão. Ambiente de demonstração com dados fictícios.',
    art: CivilArt,
    accent: 'text-info',
    frame: 'border-info/25',
    sectionTitle: 'Setores Tecnológicos Governamentais Civis',
    // Os dez primeiros ficam visíveis; os demais aparecem em "Ver mais".
    sectors: [
      'saude',
      'planejamento',
      'previdencia',
      'fazenda-federal',
      'educacao',
      'justica',
      'desenvolvimento-economico',
      'comunicacoes',
      'controle-integridade',
      'investigacao',
      'seguranca-publica',
      'trabalho',
      'ciencia-tecnologia',
      'seguranca-alimentar',
      'urbanismo',
      'cultura',
      'esporte',
      'meio-ambiente',
      'minas-energia',
      'mobilidade',
      'turismo',
      'relacoes-exteriores',
      'financeiro-federal',
    ],
    collapsedAfter: 10,
  },
  governo_militar: {
    kicker: 'Governo militar',
    tagline: 'Aviação, drones, blindados e marinha. Ambiente tático de demonstração com dados fictícios.',
    art: MilitaryArt,
    accent: 'text-[#a3b87c]',
    frame: 'border-[#a3b87c]/30',
    sectionTitle: 'Setores Tecnológicos Governamentais Militares',
    sectors: ['aviacao', 'drones', 'blindados', 'vigilancia', 'comando', 'teatro', 'infantaria', 'naval'],
  },
  b2b: {
    kicker: 'Cliente B2B',
    tagline: 'Organização de cliente dentro da plataforma Orzyon Cloud. Comece criando um cluster ou uma aplicação.',
    art: NetworkArt,
    accent: 'text-violet',
    frame: 'border-violet/25',
  },
}

export default function HomePage() {
  const { data, org } = useOrg()
  const [showAll, setShowAll] = useState(false)
  const theme = THEMES[org.segment]
  const scope = orgScope(data, org.id)
  const costs = orgCosts(data, org.id)
  const agentCount = isSectorOrg(org.segment) ? sectorAgents(data, org.id).length : scope.agents.length
  const Art = theme.art
  const apps = [...scope.applications].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const instancesOf = (applicationId: string) => scope.services.filter((s) => s.applicationId === applicationId).length
  const sectorTiles = (theme.sectors ?? []).flatMap((key) => {
    const sectorApps = scope.applications.filter((a) => a.sector === key)
    return sectorApps.length ? [{ key, apps: sectorApps }] : []
  })
  const collapsible = theme.collapsedAfter !== undefined && sectorTiles.length > theme.collapsedAfter
  const visibleTiles = collapsible && !showAll ? sectorTiles.slice(0, theme.collapsedAfter) : sectorTiles
  const hiddenCount = sectorTiles.length - (theme.collapsedAfter ?? sectorTiles.length)

  const sections: { to: string; label: string; hint: string; icon: Icon }[] = [
    { to: '/agentes', label: 'Agentes', hint: `${agentCount} agentes`, icon: Bot },
    { to: '/clusters', label: 'Clusters', hint: `${scope.clusters.length} contratados`, icon: Server },
    { to: '/servicos', label: 'Serviços', hint: `${scope.services.length} instâncias`, icon: Boxes },
    { to: '/aplicacoes', label: 'Aplicações', hint: `${apps.length} cadastradas`, icon: Package },
    { to: '/modelos', label: 'Modelos', hint: `${scope.deployments.length} implantações`, icon: Cpu },
    { to: '/playground', label: 'Playground', hint: 'conversas simuladas', icon: MessagesSquare },
    { to: '/metricas', label: 'Métricas', hint: 'requisições e latência', icon: BarChart3 },
    { to: '/custos', label: 'Custos', hint: `${fmtBRL0(costs.projected)} projetado`, icon: CircleDollarSign },
    { to: '/organizacao', label: 'Organização', hint: `${org.members.length} membros`, icon: Building2 },
  ]

  return (
    <>
      <section className={`relative isolate overflow-hidden rounded-2xl border bg-surface p-6 md:p-10 ${theme.frame}`}>
        {/* A ilustração fica à direita e se apaga em direção ao texto. */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ maskImage: 'linear-gradient(to right, transparent 30%, black 75%)', WebkitMaskImage: 'linear-gradient(to right, transparent 30%, black 75%)' }}
        >
          <Art className={`h-full w-full opacity-30 ${theme.accent}`} />
        </div>
        <div className="relative max-w-xl">
          <p className={`text-xs font-medium tracking-[0.18em] uppercase ${theme.accent}`}>{theme.kicker}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{org.name}</h1>
          <p className="mt-2 text-sm text-muted">{theme.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/dashboard" className="btn-primary">
              <LayoutDashboard className="size-4" /> Abrir dashboard
            </Link>
            <Link to="/aplicacoes/novo" className="btn-secondary">
              <Package className="size-4" /> Criar aplicação
            </Link>
            <Link to="/clusters/novo" className="btn-secondary">
              <Server className="size-4" /> Criar cluster
            </Link>
          </div>
        </div>
      </section>

      {theme.sectionTitle && sectorTiles.length > 0 && (
        <section aria-labelledby="home-setores" className="mt-6">
          <h2 id="home-setores" className="mb-3 text-sm font-semibold text-fg">
            {theme.sectionTitle}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {visibleTiles.map(({ key, apps: sectorApps }) => (
              <li key={key}>
                <SectorGroupTile groupKey={key} apps={sectorApps} accent={theme.accent} />
              </li>
            ))}
          </ul>
          {collapsible && (
            <div className="mt-3 flex justify-center">
              <button type="button" className="btn-secondary btn-sm" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                <ChevronDown className={`size-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} aria-hidden />
                {showAll ? 'Ver menos' : `Ver mais (${hiddenCount})`}
              </button>
            </div>
          )}
        </section>
      )}

      <Panel
        className="mt-6"
        title="Aplicações"
        description="Código ou imagem que esta organização sobe. Cada aplicação pode rodar em várias instâncias."
        actions={
          <Link to="/aplicacoes" className="btn-ghost btn-sm">
            Ver todas <ArrowRight className="size-3.5" />
          </Link>
        }
        bodyClassName="p-4"
      >
        {apps.length === 0 ? (
          <EmptyState
            title="Nenhuma aplicação nesta organização"
            description="Envie o código-fonte ou a referência da imagem para começar."
            action={
              <Link to="/aplicacoes/novo" className="btn-primary">
                <Plus className="size-4" /> Criar aplicação
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {apps.map((a) => (
              <li key={a.id}>
                <AppCard app={a} instances={instancesOf(a.id)} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="mt-6" title="Seções da organização" bodyClassName="p-4">
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((s) => (
            <li key={s.to}>
              <Link to={s.to} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-3 hover:border-line-strong">
                <s.icon className="size-4 shrink-0 text-accent" aria-hidden />
                <span className="flex-1 text-sm font-medium">{s.label}</span>
                <span className="num truncate text-xs text-muted">{s.hint}</span>
                <ArrowRight className="size-3.5 shrink-0 text-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}

/** Setor (com uma ou vários subsetores): leva ao painel do setor, com a visão prévia e os subsetores. */
function SectorGroupTile({ groupKey, apps, accent }: { groupKey: string; apps: Application[]; accent: string }) {
  const info = SECTOR_GROUPS[groupKey]
  const Icon = SECTOR_ICON[groupKey]
  return (
    <Link to={`/setor/${groupKey}`} className="card flex h-full flex-col gap-3 p-4 hover:border-line-strong">
      <div className="flex items-start justify-between gap-2">
        <Icon className={`size-8 ${accent}`} />
        <ArrowRight className="size-3.5 shrink-0 text-subtle" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{info?.name ?? apps[0].name}</p>
        <p className="mt-1 text-xs text-muted">{info?.description ?? apps[0].description}</p>
        <p className="mt-2 text-[11px] text-subtle">{apps.length === 1 ? '1 aplicação' : `${apps.length} subsetores`}</p>
      </div>
    </Link>
  )
}

/** Aplicação na lista da página inicial. */
function AppCard({ app, instances }: { app: Application; instances: number }) {
  return (
    <Link to={`/aplicacoes/${app.id}`} className="card block h-full p-4 hover:border-line-strong">
      <p className="truncate text-sm font-medium">{app.name}</p>
      <p className="mt-1 line-clamp-2 min-h-8 text-xs text-muted">{app.description || 'Sem descrição.'}</p>
      <p className="mt-3 flex flex-wrap gap-x-2 text-[11px] text-subtle">
        <span>{app.kind === 'source' ? `Código · ${RUNTIME_LABEL[app.runtime ?? 'python']}` : 'Imagem de contêiner'}</span>
        <span>·</span>
        <span className="font-mono">{app.version}</span>
        <span>·</span>
        <span>
          {instances} {instances === 1 ? 'instância' : 'instâncias'}
        </span>
      </p>
    </Link>
  )
}
