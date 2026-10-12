import type { SeriesPoint } from '../lib/metrics'
import { summarize } from '../lib/metrics'
import { fmtCompact, fmtInt, fmtNum, fmtPct } from '../lib/format'
import { CHART_COLORS, TimeChart } from './charts'
import { MetricCard, Panel } from './ui'

export function MetricsSummary({ series }: { series: SeriesPoint[] }) {
  const s = summarize(series)
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard label="Requisições" value={fmtCompact(s.requests)} hint={`${fmtInt(s.requests)} no período`} />
      <MetricCard label="Taxa de erro" value={fmtPct(s.errorRate, 2)} hint={`${fmtInt(s.errors)} erros`} tone={s.errorRate > 0.02 ? 'warn' : undefined} />
      <MetricCard label="Latência p50" value={`${fmtInt(s.p50)} ms`} hint="média ponderada" />
      <MetricCard label="Latência p95" value={`${fmtInt(s.p95)} ms`} hint="pior intervalo" />
      <MetricCard label="Tokens de entrada" value={fmtCompact(s.tokensIn)} />
      <MetricCard label="Tokens de saída" value={fmtCompact(s.tokensOut)} />
    </div>
  )
}

export function MetricsCharts({ series, showGpu = true }: { series: SeriesPoint[]; showGpu?: boolean }) {
  const pct = (v: number) => `${fmtNum(v, 1)}`
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Requisições e erros" description="por intervalo">
        <TimeChart
          type="bar"
          data={series}
          series={[
            { key: 'requests', label: 'Requisições', color: CHART_COLORS.accent },
            { key: 'errors', label: 'Erros', color: CHART_COLORS.red },
          ]}
          format={fmtInt}
        />
      </Panel>
      <Panel title="Latência" description="p50 e p95 (ms)">
        <TimeChart
          type="line"
          data={series}
          series={[
            { key: 'p50', label: 'p50', color: CHART_COLORS.accent },
            { key: 'p95', label: 'p95', color: CHART_COLORS.violet },
          ]}
          unit="ms"
          format={fmtInt}
        />
      </Panel>
      <Panel title="Tokens" description="entrada e saída por intervalo">
        <TimeChart
          stacked
          data={series}
          series={[
            { key: 'tokensIn', label: 'Entrada', color: CHART_COLORS.blue },
            { key: 'tokensOut', label: 'Saída', color: CHART_COLORS.green },
          ]}
          unit="tokens"
          format={fmtInt}
        />
      </Panel>
      <Panel title="Tokens por segundo" description="geração média (saída)">
        <TimeChart data={series} series={[{ key: 'tokensPerSec', label: 'Tokens/s', color: CHART_COLORS.green }]} unit="tokens/s" format={fmtInt} />
      </Panel>
      <Panel title="Utilização de CPU e memória" description="% da capacidade contratada">
        <TimeChart
          type="line"
          data={series}
          yDomain={[0, 100]}
          series={[
            { key: 'cpuPct', label: 'CPU', color: CHART_COLORS.accent },
            { key: 'memPct', label: 'Memória (CPU)', color: CHART_COLORS.blue },
          ]}
          unit="%"
          format={pct}
        />
      </Panel>
      {showGpu && (
        <Panel title="GPU" description="utilização e memória destinada à GPU em uso (% do contratado)">
          <TimeChart
            type="line"
            data={series}
            yDomain={[0, 100]}
            series={[
              { key: 'gpuPct', label: 'Utilização de GPU', color: CHART_COLORS.violet },
              { key: 'gpuMemPct', label: 'Memória de GPU', color: CHART_COLORS.pink },
            ]}
            unit="%"
            format={pct}
          />
        </Panel>
      )}
      <Panel title="Fila e concorrência" description="requisições aguardando e em processamento">
        <TimeChart
          type="line"
          data={series}
          series={[
            { key: 'queue', label: 'Na fila', color: CHART_COLORS.amber },
            { key: 'concurrency', label: 'Em processamento', color: CHART_COLORS.accent },
          ]}
          unit="req"
          format={fmtInt}
        />
      </Panel>
    </div>
  )
}
