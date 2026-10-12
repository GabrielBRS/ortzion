import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Loader2, Rocket } from 'lucide-react'
import type { Reservation } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { createService, ApiError } from '../services/api'
import { useToast } from '../components/Toast'
import { Field, IssueList, Notice, NumberSlider, PageHeader, Panel } from '../components/ui'
import { reservationText } from '../components/workloads'
import { RUNTIME_LABEL } from '../mock/samples'
import { checkFit, scaleRes } from '../lib/capacity'
import { slugify } from '../lib/format'

export default function ServiceDeployPage() {
  const { data, org, orgClusters, cluster: ctxCluster } = useOrg()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const apps = data.applications.filter((a) => a.orgId === org.id)
  const preselected = params.get('aplicacao')
  const [applicationId, setApplicationId] = useState(() => (apps.some((a) => a.id === preselected) ? preselected! : (apps[0]?.id ?? '')))
  const [clusterId, setClusterId] = useState(ctxCluster?.id ?? orgClusters.find((c) => c.status === 'ativo')?.id ?? orgClusters[0]?.id ?? '')
  const [name, setName] = useState('')
  const [replicas, setReplicas] = useState(1)
  const [vcpu, setVcpu] = useState(2)
  const [mem, setMem] = useState(4)
  const [gpus, setGpus] = useState(0)
  const [gpuMem, setGpuMem] = useState(0)
  const [busy, setBusy] = useState(false)
  const [issues, setIssues] = useState<string[]>([])

  const app = apps.find((a) => a.id === applicationId)
  const cluster = orgClusters.find((c) => c.id === clusterId)
  const cap = cluster?.capacity
  const unified = cluster?.profile === 'unified'
  // Os controles de GPU acompanham o cluster escolhido; valores acima do nó são ajustados.
  const gpuCount = cap ? Math.min(gpus, cap.gpusPerNode) : 0
  const gpuMemory = cap ? (unified ? Math.min(gpuMem, cap.gpuSharePerNodeGiB) : gpuCount * cap.vramPerGpuGiB) : 0
  const reservation: Reservation = { vcpu, memoryGiB: mem, gpus: gpuCount, gpuMemoryGiB: gpuMemory }
  const fitIssues = useMemo(() => (cluster ? checkFit(data, cluster, scaleRes(reservation, replicas)) : []), [data, cluster, vcpu, mem, gpuCount, gpuMemory, replicas])
  const instanceName = slugify(name.trim() || app?.slug || '')

  const submit = async () => {
    if (!app) return
    setBusy(true)
    setIssues([])
    try {
      const s = await createService({ applicationId: app.id, clusterId, name: instanceName, replicas, reservation })
      toast.success(`Implantação de "${s.name}" iniciada.`)
      navigate(`/servicos/${s.id}`)
    } catch (e) {
      if (e instanceof ApiError) setIssues([e.message, ...e.details])
      toast.error(e)
      setBusy(false)
    }
  }

  if (!apps.length)
    return (
      <>
        <PageHeader title="Implantar serviço" crumbs={[{ label: org.name, to: '/' }, { label: 'Serviços', to: '/servicos' }, { label: 'Novo' }]} />
        <Panel>
          <Notice>
            Crie uma aplicação antes de implantar um serviço.{' '}
            <Link to="/aplicacoes/novo" className="text-accent underline">
              Nova aplicação
            </Link>
          </Notice>
        </Panel>
      </>
    )

  if (!orgClusters.length)
    return (
      <>
        <PageHeader title="Implantar serviço" crumbs={[{ label: org.name, to: '/' }, { label: 'Serviços', to: '/servicos' }, { label: 'Novo' }]} />
        <Panel>
          <Notice tone="warn">
            Crie um cluster antes de implantar serviços.{' '}
            <Link to="/clusters/novo" className="text-accent underline">
              Criar cluster
            </Link>
          </Notice>
        </Panel>
      </>
    )

  return (
    <>
      <PageHeader
        title="Implantar serviço"
        description="Uma instância da aplicação em um cluster, com réplicas e reserva por réplica. A execução é simulada; nenhum código é executado."
        crumbs={[{ label: org.name, to: '/' }, { label: 'Serviços', to: '/servicos' }, { label: 'Novo' }]}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Aplicação">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Aplicação" htmlFor="sv-app" hint={app && <Link to={`/aplicacoes/${app.id}`} className="text-accent hover:underline">Ver detalhes da aplicação</Link>}>
                <select id="sv-app" className="input" value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
                  {apps.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              {app && (
                <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-xs text-muted">
                  <p className="text-fg">{app.kind === 'source' ? `Código · ${RUNTIME_LABEL[app.runtime ?? 'python']}` : 'Imagem de contêiner'}</p>
                  <p className="mt-1 font-mono">
                    {app.version} · {app.kind === 'source' ? (app.fileName ?? 'arquivo principal') : app.image}
                  </p>
                  {app.command && <p className="mt-1 font-mono break-all">{app.command}</p>}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Destino">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Cluster" htmlFor="sv-cluster">
                <select id="sv-cluster" className="input" value={clusterId} onChange={(e) => setClusterId(e.target.value)}>
                  {orgClusters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nome da instância" htmlFor="sv-name" hint={instanceName ? `Endpoint: https://${instanceName}.${slugify(cluster?.name ?? '')}.orzyon-cloud.example` : 'Letras minúsculas, números e hífens.'}>
                <input id="sv-name" className="input font-mono" value={name} onChange={(e) => setName(e.target.value)} placeholder={app?.slug} />
              </Field>
            </div>
          </Panel>

          <Panel title="Escala e reserva por réplica" description="Cada réplica reserva os recursos abaixo. A reserva total é multiplicada pelo número de réplicas.">
            <div className="grid gap-6 md:grid-cols-2">
              <NumberSlider label="Réplicas" value={replicas} min={1} max={10} step={1} unit="réplicas" onChange={setReplicas} hint="Até 10 réplicas por instância." />
              <NumberSlider label="vCPU por réplica" value={vcpu} min={0.5} max={32} step={0.5} unit="vCPU" onChange={setVcpu} />
              <NumberSlider
                label={unified ? 'Memória (parcela de CPU) por réplica' : 'Memória RAM por réplica'}
                value={mem}
                min={1}
                max={128}
                unit="GiB"
                onChange={setMem}
              />
              {cap && cap.gpusPerNode > 0 && (
                <NumberSlider
                  label="GPUs por réplica"
                  value={gpuCount}
                  min={0}
                  max={cap.gpusPerNode}
                  unit="GPU"
                  onChange={setGpus}
                  hint={`Até ${cap.gpusPerNode} GPU por nó. As GPUs de uma réplica ficam no mesmo nó.`}
                />
              )}
              {cap && unified && cap.gpuSharePerNodeGiB > 0 && (
                <NumberSlider
                  label="Memória para GPU por réplica"
                  value={gpuMemory}
                  min={0}
                  max={cap.gpuSharePerNodeGiB}
                  step={8}
                  unit="GiB"
                  onChange={setGpuMem}
                  hint="Parcela da memória unificada do nó. Faz parte do mesmo total físico; não é somada à RAM."
                />
              )}
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel title="Resumo" className="xl:sticky xl:top-20">
            <div className="space-y-5">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Réplicas</dt>
                  <dd className="num">{replicas}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Reserva por réplica</dt>
                  <dd className="num text-right text-xs">{cluster && reservationText(reservation, !!unified)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Reserva total</dt>
                  <dd className="num text-right text-xs">{cluster && reservationText(scaleRes(reservation, replicas), !!unified)}</dd>
                </div>
              </dl>
              <IssueList issues={fitIssues} />
              {issues.length > 0 && <IssueList title={issues[0]} issues={issues.slice(1)} />}
              <button className="btn-primary w-full" disabled={busy || !app || !instanceName || fitIssues.length > 0} onClick={submit}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Implantar serviço
              </button>
              {!instanceName && <p className="text-center text-[11px] text-subtle">Informe o nome da instância.</p>}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
