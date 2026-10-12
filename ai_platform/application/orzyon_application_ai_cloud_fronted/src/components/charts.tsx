import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Panel } from './ui'

export const CHART_COLORS = {
  accent: '#22c3e6',
  blue: '#60a5fa',
  violet: '#a78bfa',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  slate: '#94a1b2',
  pink: '#f472b6',
}
export const SERIES_PALETTE = ['#22c3e6', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f472b6', '#94a1b2', '#fb923c', '#2dd4bf']

export interface SeriesDef {
  key: string
  label: string
  color: string
}

const axis = { stroke: '#6b7787', fontSize: 11, tickLine: false, axisLine: false } as const

function TooltipBox({
  active,
  payload,
  label,
  format,
  unit,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
  format: (v: number) => string
  unit?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line-strong bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 text-muted">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="num flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}:</span>
          <span className="font-medium">
            {format(p.value)}
            {unit ? ` ${unit}` : ''}
          </span>
        </p>
      ))}
    </div>
  )
}

export function TimeChart({
  data,
  series,
  type = 'area',
  unit,
  format = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
  height = 220,
  stacked,
  yDomain,
}: {
  data: object[]
  series: SeriesDef[]
  type?: 'area' | 'line' | 'bar'
  unit?: string
  format?: (v: number) => string
  height?: number
  stacked?: boolean
  yDomain?: [number, number]
}) {
  const common = { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } }
  const grid = <CartesianGrid stroke="#232c38" strokeDasharray="3 3" vertical={false} />
  const x = <XAxis dataKey="label" {...axis} minTickGap={24} />
  const y = <YAxis {...axis} width={54} tickFormatter={(v: number) => compactTick(v)} domain={yDomain} />
  const tip = <Tooltip cursor={{ stroke: '#2f3a48' }} content={<TooltipBox format={format} unit={unit} />} />
  const legend = series.length > 1 ? <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a1b2' }} /> : null
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart {...common}>
            {grid}
            {x}
            {y}
            <Tooltip cursor={{ fill: '#151b23' }} content={<TooltipBox format={format} unit={unit} />} />
            {legend}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={stacked ? 'a' : undefined} radius={stacked ? 0 : [3, 3, 0, 0]} />
            ))}
          </BarChart>
        ) : type === 'line' ? (
          <LineChart {...common}>
            {grid}
            {x}
            {y}
            {tip}
            {legend}
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        ) : (
          <AreaChart {...common}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {grid}
            {x}
            {y}
            {tip}
            {legend}
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#g-${s.key})`}
                stackId={stacked ? 'a' : undefined}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function compactTick(v: number) {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export function ChartPanel({ title, description, actions, children }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <Panel title={title} description={description} actions={actions}>
      {children}
    </Panel>
  )
}

export function DonutChart({
  data,
  format,
  height = 200,
}: {
  data: { name: string; value: number }[]
  format: (v: number) => string
  height?: number
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={SERIES_PALETTE[i % SERIES_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox format={format} />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
