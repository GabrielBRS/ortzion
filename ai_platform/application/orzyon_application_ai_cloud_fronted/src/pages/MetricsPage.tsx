import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Period } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { PageHeader, Panel, Segmented, StatusBadge } from '../components/ui'
import { MetricsCharts, MetricsSummary } from '../components/MetricsCharts'
import { PERIODS, buildSeries } from '../lib/metrics'
import { orgScope } from '../lib/selectors'
import { fmtDateTime } from '../lib/format'

export default function MetricsPage() {
  const { data, org, cluster, setCluster } = useOrg()
  const [period, setPeriod] = useState<Period>('24h')
  const [workload, setWorkload] = useState('')
  const [q, setQ] = useState('')
  const [level, setLevel] = useState('')
  const scope = orgScope(data, org.id, cluster?.id)
  const validWorkload = scope.agents.some((a) => a.id === workload) || scope.services.some((s) => s.id === workload) ? workload : ''

  const series = useMemo(() => buildSeries(data, { clusterIds: scope.clusterIds, workloadId: validWorkload || null }, period), [data, scope.clusterIds.join(), validWorkload, period])

  // Eventos e logs: eventos da organização + logs dos serviços no escopo.
  const rows = useMemo(() => {
    const evs = scope.events.map((e) => ({
      id: e.id,
      ts: e.ts,
      level: e.level,
      source: e.source,
      cluster: data.clusters.find((c) => c.id === e.clusterId)?.name ?? '—',
      message: e.message,
    }))
    const logs = scope.services
      .filter((s) => !validWorkload || s.id === validWorkload)
      .flatMap((s) =>
        s.logs.map((l, i) => ({
          id: `${s.id}-${i}`,
          ts: l.ts,
          level: l.level === 'info' ? 'info' : l.level,
          source: `Serviço ${s.name}`,
          cluster: data.clusters.find((c) => c.id === s.clusterId)?.name ?? '—',
          message: l.message,
        })),
      )
    return [...evs, ...logs]
      .filter((r) => (!level || r.level === level) && (!q || `${r.message} ${r.source}`.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, 80)
  }, [scope.events, scope.services, data.clusters, validWorkload, level, q])

  return (
    <>
      <PageHeader title="Métricas e observabilidade" description="Tráfego, latência, tokens e uso de recursos, filtrados por cluster, carga e período." crumbs={[{ label: org.name, to: '/' }, { label: 'Métricas' }]} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="input w-auto" aria-label="Cluster" value={cluster?.id ?? ''} onChange={(e) => setCluster(e.target.value || null)}>
          <option value="">Todos os clusters</option>
          {scope.clusters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input w-auto" aria-label="Agente ou serviço" value={validWorkload} onChange={(e) => setWorkload(e.target.value)}>
          <option value="">Todos os agentes e serviços</option>
          <optgroup label="Agentes">
            {scope.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Serviços">
            {scope.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        </select>
        <div className="ml-auto">
          <Segmented label="Período" value={period} onChange={setPeriod} options={PERIODS} />
        </div>
      </div>
      <div className="space-y-4">
        <MetricsSummary series={series} />
        <MetricsCharts series={series} />
        <Panel
          title="Eventos e logs"
          description="Registros demonstrativos"
          bodyClassName=""
          actions={
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle" aria-hidden />
                <input className="input w-52 py-1.5 pl-8 text-xs" placeholder="Buscar" aria-label="Buscar eventos e logs" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="input w-auto py-1.5 text-xs" aria-label="Filtrar por nível" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">Todos os níveis</option>
                <option value="info">Info</option>
                <option value="sucesso">Sucesso</option>
                <option value="aviso">Aviso</option>
                <option value="erro">Erro</option>
              </select>
            </>
          }
        >
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-line bg-surface">
                <tr>
                  <th className="th">Data e hora</th>
                  <th className="th">Status</th>
                  <th className="th">Origem</th>
                  <th className="th">Cluster</th>
                  <th className="th">Mensagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td num text-xs whitespace-nowrap text-muted">{fmtDateTime(r.ts)}</td>
                    <td className="td">
                      <StatusBadge status={r.level} />
                    </td>
                    <td className="td text-xs whitespace-nowrap">{r.source}</td>
                    <td className="td text-xs whitespace-nowrap text-muted">{r.cluster}</td>
                    <td className="td min-w-64 text-xs">{r.message}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="td py-8 text-center text-muted">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  )
}
