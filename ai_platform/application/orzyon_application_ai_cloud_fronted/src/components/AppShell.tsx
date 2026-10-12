import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  BarChart3,
  Bot,
  Boxes,
  Briefcase,
  Building2,
  ChevronDown,
  CircleDollarSign,
  Cpu,
  KeyRound,
  House,
  Landmark,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  MessagesSquare,
  Package,
  Plus,
  RotateCcw,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import type { OrgSegment } from '../domain/types'
import { useApp, useOrg } from '../state/AppContext'
import { restoreDemo, tickSimulations } from '../services/api'
import { GROUP_LABEL, GROUP_ORDER, SEGMENT_GROUP } from '../lib/segments'
import { useToast } from './Toast'
import { ConfirmDialog } from './ui'
import { Logo } from './Logo'
import { CreateOrganizationDialog } from './CreateOrganizationDialog'

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }[] = [
  // Ordem da hierarquia: agente usa clusters, que executam serviços, que executam aplicações.
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agentes', label: 'Agentes', icon: Bot },
  { to: '/clusters', label: 'Clusters', icon: Server },
  { to: '/servicos', label: 'Serviços', icon: Boxes },
  { to: '/aplicacoes', label: 'Aplicações', icon: Package },
  { to: '/modelos', label: 'Modelos', icon: Cpu },
  { to: '/acesso', label: 'Acesso à API', icon: KeyRound },
  { to: '/playground', label: 'Playground', icon: MessagesSquare },
  { to: '/metricas', label: 'Métricas', icon: BarChart3 },
  { to: '/custos', label: 'Custos', icon: CircleDollarSign },
]

const SEGMENT_ICON: Record<OrgSegment, typeof Building2> = {
  orzyon: Building2,
  governo_civil: Landmark,
  governo_militar: Shield,
  b2b: Briefcase,
}

const NAV_ORG = [
  { to: '/organizacao', label: 'Organização', icon: Building2 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

const CLUSTER_SCOPED = ['/agentes', '/modelos', '/servicos', '/metricas', '/playground']

/** Avança simulações (provisionamento, builds) enquanto o painel está montado. */
function SimulationRunner() {
  useEffect(() => {
    tickSimulations()
    const t = setInterval(() => tickSimulations(), 1000)
    return () => clearInterval(t)
  }, [])
  return null
}

function NavItem({ to, label, icon: Icon, end, onClick }: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${isActive ? 'bg-accent/10 font-medium text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg'}`
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </NavLink>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { session } = useOrg()
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Logo />
      </div>
      <nav aria-label="Navegação principal" className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        <div className="space-y-0.5">
          <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-subtle uppercase">Organização</p>
          {NAV.map((n) => (
            <NavItem key={n.to} {...n} onClick={onNavigate} />
          ))}
        </div>
        <div className="space-y-0.5">
          <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-subtle uppercase">Administração</p>
          {NAV_ORG.map((n) => (
            <NavItem key={n.to} {...n} onClick={onNavigate} />
          ))}
        </div>
        {session.role === 'operador' && (
          <div className="space-y-0.5 rounded-lg border border-violet/25 bg-violet/5 p-1.5">
            <p className="px-2 pt-1 pb-1.5 text-[11px] font-medium tracking-wide text-violet uppercase">Orzyon Cloud · global</p>
            <NavLink
              to="/operacao"
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${isActive ? 'bg-violet/15 font-medium text-violet' : 'text-muted hover:bg-surface-2 hover:text-fg'}`
              }
            >
              <Layers className="size-4" aria-hidden /> Operação da cloud
            </NavLink>
          </div>
        )}
      </nav>
      <div className="border-t border-line px-4 py-3 text-[11px] text-subtle">Ambiente de demonstração · dados fictícios</div>
    </div>
  )
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onOutside()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onOutside()
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', k)
    }
  }, [ref, onOutside, active])
}

function Dropdown({ button, children, label, align = 'left' }: { button: ReactNode; children: (close: () => void) => ReactNode; label: string; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false), open)
  return (
    <div ref={ref} className="relative">
      <button
        className="flex max-w-full items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm hover:border-line-strong"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        {button}
        <ChevronDown className="size-3.5 shrink-0 text-subtle" aria-hidden />
      </button>
      {open && (
        <div role="menu" className={`absolute z-50 mt-1.5 w-64 rounded-xl border border-line-strong bg-surface-2 p-1.5 shadow-2xl ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

function MenuItem({ onClick, children, active }: { onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-3 ${active ? 'text-accent' : 'text-fg'}`}
    >
      {children}
    </button>
  )
}

function OrganizationSwitcher() {
  const { data, org, setOrg } = useOrg()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  // Organizações de governo são definidas pela Orzyon: não criam organizações nem solicitam recursos.
  const isGovernment = org.segment === 'governo_civil' || org.segment === 'governo_militar'
  return (
    <>
      <Dropdown
        label={`Organização: ${org.name}. Trocar organização`}
        button={
          <>
            <Building2 className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="max-w-[9rem] truncate sm:max-w-[14rem]">{org.name}</span>
          </>
        }
      >
        {(close) => (
          <>
            {GROUP_ORDER.map((group) => {
              const orgs = data.orgs.filter((o) => SEGMENT_GROUP[o.segment] === group)
              if (!orgs.length) return null
              return (
                <div key={group}>
                  <p className="px-2.5 pt-1.5 pb-1.5 text-[11px] font-medium text-subtle uppercase">{GROUP_LABEL[group]}</p>
                  {orgs.map((o) => {
                    const Icon = SEGMENT_ICON[o.segment]
                    return (
                      <MenuItem
                        key={o.id}
                        active={o.id === org.id}
                        onClick={() => {
                          setOrg(o.id)
                          close()
                          // Cada organização abre na página inicial, com a ambientação dela.
                          navigate('/')
                        }}
                      >
                        <Icon className="size-4 shrink-0 text-subtle" aria-hidden />
                        <span className="flex-1 truncate">{o.name}</span>
                        {o.id === org.id && <span className="text-xs">atual</span>}
                      </MenuItem>
                    )
                  })}
                </div>
              )
            })}
            {!isGovernment && (
              <>
                <div className="my-1.5 border-t border-line" />
                <MenuItem
                  onClick={() => {
                    close()
                    setCreateOpen(true)
                  }}
                >
                  <Plus className="size-4 text-accent" aria-hidden /> Criar nova organização
                </MenuItem>
              </>
            )}
          </>
        )}
      </Dropdown>
      <CreateOrganizationDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}

function ClusterSelector() {
  const { orgClusters, cluster, setCluster } = useOrg()
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="cluster-ctx" className="sr-only">
        Cluster em foco
      </label>
      <select id="cluster-ctx" className="input max-w-[13rem] py-1.5" value={cluster?.id ?? ''} onChange={(e) => setCluster(e.target.value || null)}>
        <option value="">Todos os clusters</option>
        {orgClusters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Deixa explícito quando a página está filtrada por um cluster. */
function ClusterScopeBar() {
  const { cluster, setCluster } = useOrg()
  if (!cluster) return null
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-accent/20 bg-accent/5 px-4 py-1.5 text-xs sm:px-6 lg:px-8">
      <span className="text-muted">Filtrando pelo cluster</span>
      <span className="font-medium text-accent">{cluster.name}</span>
      <button className="btn-ghost btn-sm" onClick={() => setCluster(null)}>
        <X className="size-3.5" /> Ver todos os clusters
      </button>
    </div>
  )
}

function UserMenu() {
  const { session, setRole, logout } = useOrg()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <Dropdown
        align="right"
        label="Menu do usuário"
        button={
          <>
            <span className="flex size-6 items-center justify-center rounded-full bg-accent/15 text-accent">
              <UserRound className="size-3.5" aria-hidden />
            </span>
            <span className="hidden max-w-[10rem] truncate lg:inline">{session.userName}</span>
          </>
        }
      >
        {(close) => (
          <>
            <div className="border-b border-line px-2.5 pt-1.5 pb-2.5">
              <p className="text-sm font-medium">{session.userName}</p>
              <p className="text-xs text-muted">{session.email}</p>
            </div>
            <p className="px-2.5 pt-2.5 pb-1 text-[11px] font-medium text-subtle uppercase">Perfil demonstrativo</p>
            <MenuItem
              active={session.role === 'cliente'}
              onClick={() => {
                setRole('cliente')
                close()
                navigate('/')
              }}
            >
              <UserRound className="size-4" aria-hidden /> Cliente da organização
            </MenuItem>
            <MenuItem
              active={session.role === 'operador'}
              onClick={() => {
                setRole('operador')
                close()
                navigate('/operacao')
              }}
            >
              <ShieldCheck className="size-4" aria-hidden /> Operador da cloud
            </MenuItem>
            <div className="my-1.5 border-t border-line" />
            <MenuItem
              onClick={() => {
                close()
                setConfirmReset(true)
              }}
            >
              <RotateCcw className="size-4" aria-hidden /> Restaurar demonstração
            </MenuItem>
            <MenuItem
              onClick={() => {
                close()
                logout()
                navigate('/login')
              }}
            >
              <LogOut className="size-4" aria-hidden /> Sair
            </MenuItem>
          </>
        )}
      </Dropdown>
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Restaurar demonstração"
        description="Todas as alterações locais (clusters, agentes, serviços, orçamentos) serão descartadas e os dados iniciais serão recarregados."
        confirmLabel="Restaurar"
        danger
        busy={busy}
        onConfirm={async () => {
          setBusy(true)
          await restoreDemo()
          setBusy(false)
          setConfirmReset(false)
          navigate('/')
          toast.success('Demonstração restaurada para o estado inicial.')
        }}
      />
    </>
  )
}

export function AppShell() {
  const { session } = useApp()
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)
  const scoped = CLUSTER_SCOPED.some((p) => location.pathname === p)
  const isOps = location.pathname.startsWith('/operacao')

  useEffect(() => setDrawer(false), [location.pathname])
  if (!session) return null

  return (
    <div className="flex min-h-full">
      <SimulationRunner />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface shadow-2xl">
            <button className="btn-ghost btn-sm absolute top-3 right-3" onClick={() => setDrawer(false)} aria-label="Fechar menu">
              <X className="size-4" />
            </button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-3 backdrop-blur sm:gap-3 sm:px-5">
          <button className="btn-ghost btn-sm lg:hidden" onClick={() => setDrawer(true)} aria-label="Abrir menu">
            <Menu className="size-5" />
          </button>
          {isOps ? (
            <span className="flex items-center gap-2 rounded-lg border border-violet/30 bg-violet/10 px-2.5 py-1.5 text-sm text-violet">
              <Layers className="size-4" aria-hidden />
              <span>
                <span className="hidden sm:inline">Operação global da </span>Orzyon Cloud
              </span>
            </span>
          ) : (
            <OrganizationSwitcher />
          )}
          {scoped && (
            <div className="hidden md:block">
              <ClusterSelector />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-md border border-warn/30 bg-warn/10 px-2 py-1 text-[11px] font-medium text-warn sm:inline">Demonstração</span>
            {session.role === 'operador' && <span className="hidden rounded-md border border-violet/30 px-2 py-1 text-[11px] text-violet md:inline">Operador</span>}
            <UserMenu />
          </div>
        </header>
        {scoped && (
          <div className="border-b border-line px-3 py-2 md:hidden">
            <ClusterSelector />
          </div>
        )}
        {scoped && <ClusterScopeBar />}
        <main className="mx-auto w-full max-w-none min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="py-10 text-sm text-muted" role="status">Carregando…</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
