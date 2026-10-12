import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Check, Loader2, Pause, Play, Search, Trash2 } from 'lucide-react'
import { useOrg } from '../state/AppContext'
import { deleteService, setServicePaused } from '../services/api'
import { useToast } from '../components/Toast'
import { ConfirmDialog, CopyButton, MetricCard, PageHeader, Panel, StatusBadge } from '../components/ui'
import { CHART_COLORS, TimeChart } from '../components/charts'
import { reservationText } from '../components/workloads'
import { buildSeries, summarize } from '../lib/metrics'
import { fmtCompact, fmtDateTime, fmtInt, fmtPct, fmtTime } from '../lib/format'
import NotFoundPage from './NotFoundPage'

const STEPS_SOURCE = [
  { key: 'na_fila', label: 'Na fila' },
  { key: 'construindo', label: 'Construção' },
  { key: 'implantando', label: 'Implantação' },
  { key: 'ativo', label: 'Ativo' },
]
const STEPS_IMAGE = STEPS_SOURCE.filter((s) => s.key !== 'construindo')

export default function ServiceDetailPage() {
  const { serviceId } = useParams()
  const { data, org } = useOrg()
  const toast = useToast()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const svc = data.services.find((s) => s.id === serviceId)
  const cluster = svc ? data.clusters.find((c) => c.id === svc.clusterId) : undefined
  const series = useMemo(() => (svc ? buildSeries(data, { clusterIds: [svc.clusterId], workloadId: svc.id }, '24h') : []), [data, svc])

  if (!svc || cluster?.orgId !== org.id) return <NotFoundPage message="Serviço não encontrado nesta organização" />

  const app = data.applications.find((a) => a.id === svc.applicationId)
  const steps = app?.kind === 'image' ? STEPS_IMAGE : STEPS_SOURCE
  const idx = svc.status === 'pausado' || svc.status === 'falha' ? steps.length : steps.findIndex((s) => s.key === svc.status)
  const logs = svc.logs.filter((l) => !q || l.message.toLowerCase().includes(q.toLowerCase()))
  const s = summarize(series)
  const deploying = !!svc.simulation

  const toggle = async () => {
    setBusy(true)
    try {
      await setServicePaused(svc.id, svc.status !== 'pausado')
      toast.success(svc.status === 'pausado' ? 'Serviço retomado.' : 'Serviço pausado e reserva liberada.')
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: org.name, to: '/' }, { label: 'Serviços', to: '/servicos' }, { label: svc.name }]}
        title={<span className="font-mono">{svc.name}</span>}
        badge={<StatusBadge status={svc.status} />}
        description={`${cluster.name} · ${app ? app.name : 'Aplicação removida'} · ${app?.version ?? ''}`}
        actions={
          <>
            {(svc.status === 'ativo' || svc.status === 'pausado') && (
              <button className="btn-secondary" disabled={busy} onClick={toggle}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : svc.status === 'pausado' ? <Play className="size-4" /> : <Pause className="size-4" />}
                {svc.status === 'pausado' ? 'Retomar' : 'Pausar'}
              </button>
            )}
            <button className="btn-danger" disabled={deploying} onClick={() => setDelOpen(true)}>
              <Trash2 className="size-4" /> Remover
            </button>
          </>
        }
      />

      <div className="space-y-4">
        <Panel title="Implantação">
          <ol className="grid gap-2 sm:grid-cols-4" aria-label="Etapas da implantação">
            {steps.map((st, i) => {
              const done = i < idx || (svc.status === 'ativo' && i === idx)
              const active = i === idx && svc.status !== 'ativo'
              return (
                <li key={st.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${done ? 'border-ok/30 bg-ok/5' : active ? 'border-accent/40 bg-accent/5' : 'border-line'}`}>
                  <span className={`flex size-5 items-center justify-center rounded-full text-[11px] ${done ? 'bg-ok text-bg' : active ? 'text-accent' : 'border border-line-strong text-subtle'}`}>
                    {done ? <Check className="size-3" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
                  </span>
                  {st.label}
                </li>
              )
            })}
          </ol>
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
            <div className="min-w-0">
              <p className="text-xs text-subtle">Endpoint demonstrativo</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="truncate rounded-md bg-surface-2 px-2 py-1 font-mono text-xs">{svc.endpoint}</code>
                <CopyButton text={svc.endpoint} label="Copiar endpoint" />
              </div>
            </div>
            <div>
              <p className="text-xs text-subtle">Recursos reservados</p>
              <p className="mt-1">{svc.status === 'pausado' ? 'Liberados (pausado)' : reservationText(svc.reservation, cluster.profile === 'unified')}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">Aplicação</p>
              <p className="mt-1">
                {app ? (
                  <Link to={`/aplicacoes/${app.id}`} className="hover:text-accent">
                    {app.name}
                  </Link>
                ) : (
                  'Removida'
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-subtle">Comando</p>
              <p className="mt-1 font-mono text-xs">{app?.command || '(padrão da imagem)'}</p>
            </div>
            {app?.kind === 'image' && (
              <div className="md:col-span-3">
                <p className="text-xs text-subtle">Imagem</p>
                <p className="mt-1 font-mono text-xs break-all">{app?.image}</p>
              </div>
            )}
            {app && app.env.length > 0 && (
              <div className="md:col-span-3">
                <p className="text-xs text-subtle">Variáveis de ambiente (demonstrativas)</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {app?.env.map((e) => (
                    <span key={e.key} className="chip font-mono">
                      {e.key}={e.value || '•••• (não persistido)'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Requisições (24 h)" value={fmtCompact(s.requests)} />
          <MetricCard label="Taxa de erro" value={fmtPct(s.errorRate, 2)} />
          <MetricCard label="Latência p50" value={`${fmtInt(s.p50)} ms`} />
          <MetricCard label="Criado em" value={<span className="text-base">{fmtDateTime(svc.createdAt)}</span>} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Logs"
            description="Logs fictícios da construção e execução"
            bodyClassName=""
            actions={
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle" aria-hidden />
                <input className="input w-48 py-1.5 pl-8 text-xs" placeholder="Buscar nos logs" aria-label="Buscar nos logs" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            }
          >
            <div className="max-h-80 overflow-y-auto bg-[#080b0f] p-3 font-mono text-[12px] leading-relaxed" role="log" aria-live="polite">
              {logs.length === 0 && <p className="text-subtle">{svc.logs.length ? 'Nenhuma linha corresponde à busca.' : 'Aguardando logs…'}</p>}
              {logs.map((l, i) => (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 text-subtle">{fmtTime(l.ts)}</span>
                  <span className={`w-10 shrink-0 ${l.level === 'erro' ? 'text-err' : l.level === 'aviso' ? 'text-warn' : 'text-accent'}`}>{l.level}</span>
                  <span className="text-fg/90">{l.message}</span>
                </div>
              ))}
              {deploying && (
                <div className="mt-1 flex items-center gap-2 text-subtle">
                  <Loader2 className="size-3 animate-spin" /> em andamento…
                </div>
              )}
            </div>
          </Panel>
          <Panel title="Requisições (24 h)">
            <TimeChart data={series} series={[{ key: 'requests', label: 'Requisições', color: CHART_COLORS.accent }]} unit="req" format={fmtInt} height={250} />
          </Panel>
        </div>

      </div>

      <ConfirmDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title="Remover serviço"
        description={`O serviço ${svc.name} será removido e a reserva de recursos liberada.`}
        danger
        confirmLabel="Remover"
        busy={busy}
        onConfirm={async () => {
          setBusy(true)
          try {
            await deleteService(svc.id)
            toast.success('Serviço removido.')
            navigate('/servicos')
          } catch (e) {
            toast.error(e)
            setBusy(false)
          }
        }}
      />
    </>
  )
}
