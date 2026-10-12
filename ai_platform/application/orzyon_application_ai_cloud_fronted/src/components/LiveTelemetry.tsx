import { useEffect, useMemo, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { useApp } from '../state/AppContext'
import { buildSeriesWindow, liveWindow, type SeriesScope } from '../lib/metrics'
import { fmtNum } from '../lib/format'
import { CHART_COLORS } from './charts'

/** Relógio de 1 s que pausa com a aba oculta e é cancelado ao desmontar. */
function useTicker(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    let t: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (t || document.visibilityState !== 'visible') return
      setNow(Date.now())
      t = setInterval(() => setNow(Date.now()), 1000)
    }
    const stop = () => {
      if (t) clearInterval(t)
      t = null
    }
    const onVis = () => (document.visibilityState === 'visible' ? start() : stop())
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [active])
  return now
}

interface Spark {
  key: 'cpuPct' | 'memPct' | 'gpuPct' | 'requestsPerSec' | 'tokensPerSec'
  label: string
  unit: string
  color: string
  digits?: number
}

function Sparkline({ data, s }: { data: object[]; s: Spark }) {
  const last = (data[data.length - 1] as Record<string, number>)?.[s.key] ?? 0
  return (
    <div className="min-w-0 rounded-lg border border-line bg-surface-2 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="truncate text-muted">{s.label}</span>
        <span className="num shrink-0 font-medium whitespace-nowrap text-fg">
          {fmtNum(last, s.digits ?? 1)} {s.unit}
        </span>
      </div>
      <div className="h-12" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <YAxis hide domain={s.unit === '%' ? [0, 100] : [0, 'auto']} />
            <Tooltip
              cursor={{ stroke: '#2f3a48' }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded border border-line-strong bg-surface-2 px-2 py-1 text-[11px]">
                    {(payload[0].payload as { label: string }).label} · {fmtNum(payload[0].value as number, s.digits ?? 1)} {s.unit}
                  </div>
                ) : null
              }
            />
            <Line type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Telemetria simulada em janela móvel de 5 min (300 pontos de 1 s). */
export function LiveTelemetry({ scope, showGpu = true }: { scope: SeriesScope; showGpu?: boolean }) {
  const { data } = useApp()
  const [paused, setPaused] = useState(false)
  const now = useTicker(!paused)
  const series = useMemo(() => buildSeriesWindow(data, scope, liveWindow(now)), [data, scope.clusterIds.join(), scope.workloadId, now])
  const sparks: Spark[] = [
    { key: 'cpuPct', label: 'CPU', unit: '%', color: CHART_COLORS.accent },
    { key: 'memPct', label: 'Memória (CPU)', unit: '%', color: CHART_COLORS.blue },
    ...(showGpu ? [{ key: 'gpuPct', label: 'Utilização da GPU', unit: '%', color: CHART_COLORS.violet } as Spark] : []),
    { key: 'requestsPerSec', label: 'Requisições', unit: 'req/s', color: CHART_COLORS.green, digits: 1 },
    { key: 'tokensPerSec', label: 'Tokens de saída', unit: 'tokens/s', color: CHART_COLORS.amber, digits: 0 },
  ]
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-subtle">
        <span className="rounded border border-warn/30 px-1.5 py-0.5 text-warn">Telemetria simulada · atualização a cada 1 s</span>
        <span>Janela de 5 min</span>
        <span className="num" aria-live="off">
          {paused ? 'Atualização pausada' : 'Atualização automática: 1 s'} · Atualizado às {new Date(now).toLocaleTimeString('pt-BR')}
        </span>
        <button className="btn-ghost btn-sm ml-auto" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />} {paused ? 'Retomar atualização' : 'Pausar atualização'}
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
        {sparks.map((s) => (
          <Sparkline key={s.key} data={series} s={s} />
        ))}
      </div>
    </div>
  )
}
