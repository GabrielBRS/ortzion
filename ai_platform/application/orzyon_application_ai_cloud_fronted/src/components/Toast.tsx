import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { ApiError } from '../services/api'

type Kind = 'sucesso' | 'erro' | 'aviso' | 'info'
interface ToastItem {
  id: number
  kind: Kind
  title: string
  details?: string[]
}

interface ToastApi {
  push: (kind: Kind, title: string, details?: string[]) => void
  success: (title: string) => void
  error: (err: unknown) => void
}

const Ctx = createContext<ToastApi | null>(null)

const ICONS = { sucesso: CheckCircle2, erro: XCircle, aviso: AlertTriangle, info: Info }
const COLORS = { sucesso: 'text-ok', erro: 'text-err', aviso: 'text-warn', info: 'text-info' }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id))
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (kind: Kind, title: string, details?: string[]) => {
      const id = ++seq.current
      setItems((xs) => [...xs.slice(-3), { id, kind, title, details }])
      timers.current.set(id, setTimeout(() => dismiss(id), details?.length ? 9000 : 4500))
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((t) => clearTimeout(t))
  }, [])

  const api: ToastApi = {
    push,
    success: (title) => push('sucesso', title),
    error: (err) => {
      if (err instanceof ApiError) push('erro', err.message, err.details)
      else push('erro', 'Não foi possível concluir a operação.')
    },
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => {
          const Icon = ICONS[t.kind]
          return (
            <div key={t.id} role="status" className="pointer-events-auto card flex gap-3 p-3.5 shadow-2xl shadow-black/40">
              <Icon className={`mt-0.5 size-4 shrink-0 ${COLORS[t.kind]}`} aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{t.title}</p>
                {t.details && t.details.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted">
                    {t.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button className="text-subtle hover:text-fg" onClick={() => dismiss(t.id)} aria-label="Fechar notificação">
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast fora do ToastProvider')
  return v
}
