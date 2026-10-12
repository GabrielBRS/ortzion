const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brl0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('pt-BR')
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

export const fmtBRL = (v: number) => brl.format(v)
export const fmtBRL0 = (v: number) => brl0.format(v)
export const fmtNum = (v: number, digits = 0) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v)
export const fmtInt = (v: number) => num.format(Math.round(v))
export const fmtCompact = (v: number) => compact.format(v)
export const fmtPct = (v: number, digits = 0) => `${fmtNum(v * 100, digits)}%`
export const fmtGiB = (v: number) => (v >= 1024 ? `${fmtNum(v / 1024, 1)} TiB` : `${fmtNum(v, v < 10 ? 1 : 0)} GiB`)

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
}

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
