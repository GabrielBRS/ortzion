import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, Check, ChevronRight, Copy, HelpCircle, Inbox, Loader2, X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Cabeçalho de página e breadcrumbs

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-subtle">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3" aria-hidden />}
          {c.to ? (
            <Link to={c.to} className="hover:text-fg">
              {c.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-muted">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  badge,
}: {
  title: ReactNode
  description?: ReactNode
  crumbs?: Crumb[]
  actions?: ReactNode
  badge?: ReactNode
}) {
  return (
    <header className="mb-6">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
            {badge}
          </div>
          {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Status

type Tone = 'ok' | 'warn' | 'err' | 'info' | 'muted' | 'accent' | 'violet'

const TONE: Record<Tone, string> = {
  ok: 'text-ok bg-ok/10 border-ok/25',
  warn: 'text-warn bg-warn/10 border-warn/25',
  err: 'text-err bg-err/10 border-err/25',
  info: 'text-info bg-info/10 border-info/25',
  muted: 'text-muted bg-surface-3 border-line-strong',
  accent: 'text-accent bg-accent/10 border-accent/25',
  violet: 'text-violet bg-violet/10 border-violet/25',
}

const STATUS: Record<string, { label: string; tone: Tone; spin?: boolean }> = {
  ativo: { label: 'Ativo', tone: 'ok' },
  provisionando: { label: 'Provisionando', tone: 'info', spin: true },
  pausado: { label: 'Pausado', tone: 'muted' },
  preparando: { label: 'Preparando', tone: 'info', spin: true },
  carregando: { label: 'Carregando', tone: 'info', spin: true },
  disponivel: { label: 'Disponível', tone: 'ok' },
  falha: { label: 'Falha', tone: 'err' },
  na_fila: { label: 'Na fila', tone: 'info', spin: true },
  construindo: { label: 'Construindo', tone: 'info', spin: true },
  implantando: { label: 'Implantando', tone: 'info', spin: true },
  saudavel: { label: 'Saudável', tone: 'ok' },
  atencao: { label: 'Atenção', tone: 'warn' },
  degradado: { label: 'Degradado', tone: 'err' },
  info: { label: 'Info', tone: 'info' },
  sucesso: { label: 'Sucesso', tone: 'ok' },
  aviso: { label: 'Aviso', tone: 'warn' },
  erro: { label: 'Erro', tone: 'err' },
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'muted' as Tone }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE[s.tone]}`}>
      {s.spin ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {s.label}
    </span>
  )
}

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${TONE[tone]}`}>{children}</span>
}

// ---------------------------------------------------------------------------
// Cards e métricas

export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = 'p-4',
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={`card min-w-0 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'warn' | 'err'
}) {
  return (
    <div className="card min-w-0 p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">{label}</span>
        {icon && <span className="text-subtle">{icon}</span>}
      </div>
      <div className={`num mt-2 text-2xl font-semibold tracking-tight ${tone === 'warn' ? 'text-warn' : tone === 'err' ? 'text-err' : ''}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-subtle">{hint}</div>}
    </div>
  )
}

/**
 * Medidor de recurso: diferencia contratado (trilho), reservado (faixa clara)
 * e utilizado (faixa sólida).
 */
export function ResourceMeter({
  label,
  unit,
  total,
  reserved,
  used,
  format = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
  note,
}: {
  label: string
  unit: string
  total: number
  reserved: number
  used?: number
  format?: (v: number) => string
  note?: ReactNode
}) {
  const pct = (v: number) => (total > 0 ? Math.min(100, (v / total) * 100) : 0)
  const over = reserved > total
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-fg">{label}</span>
        <span className="num text-muted">
          {format(reserved)} / {format(total)} {unit}
        </span>
      </div>
      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-surface-3"
        role="meter"
        aria-label={`${label}: ${format(reserved)} de ${format(total)} ${unit} reservados`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={reserved}
      >
        <div className={`absolute inset-y-0 left-0 rounded-full ${over ? 'bg-err/50' : 'bg-accent/30'}`} style={{ width: `${pct(reserved)}%` }} />
        {used !== undefined && <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${pct(used)}%` }} />}
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-[11px] text-subtle">
        {used !== undefined ? (
          <span>
            Utilizado {format(used)} {unit}
          </span>
        ) : (
          <span />
        )}
        <span>
          Livre {format(Math.max(0, total - reserved))} {unit}
        </span>
      </div>
      {note && <div className="mt-1 text-[11px] text-subtle">{note}</div>}
    </div>
  )
}

export function MeterLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-[11px] text-subtle">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-surface-3 ring-1 ring-line-strong" /> Contratado
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-accent/30" /> Reservado
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-accent" /> Utilizado agora
      </span>
    </div>
  )
}

export function MiniBar({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'warn' | 'err' }) {
  const color = tone === 'err' ? 'bg-err' : tone === 'warn' ? 'bg-warn' : 'bg-accent'
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3" aria-hidden>
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Estados

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Inbox className="size-8 text-subtle" aria-hidden />
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function IssueList({ title, issues }: { title?: string; issues: string[] }) {
  if (!issues.length) return null
  return (
    <div role="alert" className="rounded-lg border border-err/30 bg-err/5 p-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-err">
        <AlertTriangle className="size-4" aria-hidden /> {title ?? 'Recursos insuficientes'}
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-6 text-xs text-fg/85">
        {issues.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div className={`flex gap-2.5 rounded-lg border p-3 text-xs ${tone === 'warn' ? 'border-warn/30 bg-warn/5 text-fg/85' : 'border-line bg-surface-2 text-muted'}`}>
      {tone === 'warn' ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden /> : <HelpCircle className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />}
      <div>{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulários

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-subtle">{hint}</p>}
    </div>
  )
}

/** Slider e campo numérico sincronizados. */
export function NumberSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  hint,
  disabled,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  unit: string
  hint?: ReactNode
  disabled?: boolean
}) {
  const id = useId()
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-muted">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            className="input num w-24 py-1 text-right"
            aria-label={`${label} (${unit})`}
            value={draft}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => {
              setDraft(e.target.value)
              const n = Number(e.target.value)
              if (e.target.value !== '' && !Number.isNaN(n) && n >= min && n <= max) onChange(n)
            }}
            onBlur={() => {
              const n = Number(draft)
              const v = Number.isNaN(n) ? value : clamp(n)
              setDraft(String(v))
              onChange(v)
            }}
          />
          <span className="w-10 text-xs text-subtle">{unit}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="flex justify-between text-[11px] text-subtle">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
      {hint && <p className="mt-1 text-[11px] text-subtle">{hint}</p>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${value === o.value ? 'bg-surface-3 text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function OptionCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  badge,
  name,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  description: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  name: string
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-colors ${selected ? 'border-accent bg-accent/5' : 'border-line bg-surface-2 hover:border-line-strong'}`}
    >
      <input type="radio" name={name} className="sr-only" checked={selected} onChange={onSelect} />
      {icon && <span className={`mt-0.5 ${selected ? 'text-accent' : 'text-subtle'}`}>{icon}</span>}
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {title} {badge}
        </span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
    </label>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface-3 ring-1 ring-line-strong'}`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Abas

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  return (
    <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t, i) => (
        <button
          key={t.value}
          ref={(el) => {
            refs.current[i] = el
          }}
          role="tab"
          aria-selected={value === t.value}
          tabIndex={value === t.value ? 0 : -1}
          onClick={() => onChange(t.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
              onChange(tabs[n].value)
              refs.current[n]?.focus()
            }
          }}
          className={`-mb-px border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${value === t.value ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal acessível baseado em <dialog> (foco preso e Esc nativos)

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100vw-2rem)] ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'} rounded-xl border border-line-strong bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60`}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="font-semibold">
                {title}
              </h2>
              {description && <div className="mt-1 text-sm text-muted">{description}</div>}
            </div>
            <button className="btn-ghost btn-sm -mr-2" onClick={onClose} aria-label="Fechar">
              <X className="size-4" />
            </button>
          </div>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  danger,
  busy,
  children,
  confirmDisabled,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  children?: ReactNode
  confirmDisabled?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy || confirmDisabled}>
            {busy && <Loader2 className="size-4 animate-spin" />} {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  )
}

// ---------------------------------------------------------------------------

export function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 1800)
    return () => clearTimeout(t)
  }, [done])
  return (
    <button
      className="btn-secondary btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          const ta = document.createElement('textarea')
          ta.value = text
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          ta.remove()
        }
        setDone(true)
      }}
      aria-label={`${label}: ${text}`}
    >
      {done ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
      {done ? 'Copiado' : label}
    </button>
  )
}

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" role="status">
      <Loader2 className="size-4 animate-spin" /> {label}
    </span>
  )
}

/** Simula a latência de carregamento inicial de uma tela. */
export function useSimulatedLoading(ms = 350, deps: unknown[] = []) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return loading
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} aria-hidden />
}

/**
 * Conteúdo de linha expandida dentro de tabela com rolagem horizontal: fica fixo à
 * esquerda e com a largura visível do contêiner, sem herdar a largura da tabela.
 */
export function ExpandedCell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | undefined>()
  useEffect(() => {
    const scroller = ref.current?.closest('.overflow-x-auto') as HTMLElement | null
    if (!scroller) return
    const update = () => setWidth(scroller.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(scroller)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="sticky left-0" style={{ width }}>
      {children}
    </div>
  )
}
