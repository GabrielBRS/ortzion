import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Rocket, Trash2 } from 'lucide-react'
import { useOrg } from '../state/AppContext'
import { deleteApplication } from '../services/api'
import { useToast } from '../components/Toast'
import { ConfirmDialog, MetricCard, Notice, PageHeader, Panel } from '../components/ui'
import { ServicesTable } from '../components/workloads'
import { InferencePanel } from '../components/InferencePanel'
import { RUNTIME_LABEL } from '../mock/samples'
import { fmtDate } from '../lib/format'
import NotFoundPage from './NotFoundPage'

export default function ApplicationDetailPage() {
  const { applicationId } = useParams()
  const { data, org } = useOrg()
  const toast = useToast()
  const navigate = useNavigate()
  const [delOpen, setDelOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const app = data.applications.find((a) => a.id === applicationId)

  if (!app || app.orgId !== org.id) return <NotFoundPage message="Aplicação não encontrada nesta organização" />

  const instances = data.services.filter((s) => s.applicationId === app.id)
  const clusterIds = [...new Set(instances.map((s) => s.clusterId))]
  const replicas = instances.reduce((acc, s) => acc + s.replicas, 0)
  const origin = app.kind === 'source' ? `Código · ${RUNTIME_LABEL[app.runtime ?? 'python']}` : 'Imagem de contêiner'

  return (
    <>
      <PageHeader
        title={app.name}
        badge={<span className="rounded-md border border-line-strong px-1.5 py-0.5 font-mono text-xs text-muted">{app.version}</span>}
        description={app.description || origin}
        crumbs={[{ label: org.name, to: '/' }, { label: 'Aplicações', to: '/aplicacoes' }, { label: app.name }]}
        actions={
          <>
            <Link to={`/servicos/novo?aplicacao=${app.id}`} className="btn-primary">
              <Rocket className="size-4" /> Implantar serviço
            </Link>
            <button className="btn-secondary text-err hover:text-err" disabled={instances.length > 0} title={instances.length ? 'Remova as instâncias antes' : undefined} onClick={() => setDelOpen(true)}>
              <Trash2 className="size-4" /> Excluir
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Origem" value={<span className="text-base">{app.kind === 'source' ? 'Código-fonte' : 'Imagem'}</span>} hint={origin} />
        <MetricCard label="Instâncias" value={instances.length} hint={`${clusterIds.length} ${clusterIds.length === 1 ? 'cluster' : 'clusters'}`} />
        <MetricCard label="Réplicas" value={replicas} hint="somadas em todas as instâncias" />
        <MetricCard label="Criada em" value={<span className="text-base">{fmtDate(app.createdAt)}</span>} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Instâncias" description="Serviços que executam esta aplicação, cada um em um cluster." bodyClassName="">
            <ServicesTable services={instances} />
          </Panel>
          {app.kind === 'source' && app.code && (
            <Panel title={`Código-fonte · ${app.fileName}`} description="Somente leitura. O código não é executado nem compilado." bodyClassName="">
              <pre className="max-h-96 overflow-auto bg-[#080b0f] p-4 font-mono text-[12px] leading-relaxed text-fg/90">{app.code}</pre>
            </Panel>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <InferencePanel app={app} />
          <Panel title="Configuração">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs text-subtle">Origem</dt>
                <dd className="mt-1">{origin}</dd>
              </div>
              {app.kind === 'image' && (
                <div>
                  <dt className="text-xs text-subtle">Imagem</dt>
                  <dd className="mt-1 font-mono text-xs break-all">{app.image}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-subtle">Comando</dt>
                <dd className="mt-1 font-mono text-xs break-all">{app.command || '(padrão da imagem)'}</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Variáveis de ambiente</dt>
                <dd className="mt-1">
                  {app.env.length === 0 ? (
                    <span className="text-muted">Nenhuma</span>
                  ) : (
                    <ul className="space-y-1 font-mono text-xs">
                      {app.env.map((e) => (
                        <li key={e.key} className="break-all">
                          {e.key}={e.value || <span className="text-subtle">(valor não persistido)</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Identificador técnico</dt>
                <dd className="mt-1 font-mono text-xs">{app.slug}</dd>
              </div>
            </dl>
          </Panel>
          {instances.length > 0 && (
            <Notice>
              Esta aplicação tem {instances.length} {instances.length === 1 ? 'instância' : 'instâncias'}. Remova as instâncias antes de excluí-la.
            </Notice>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title="Excluir aplicação"
        description={
          <>
            A aplicação <span className="font-medium text-fg">{app.name}</span> será removida do cadastro desta organização.
          </>
        }
        danger
        confirmLabel="Excluir"
        busy={busy}
        onConfirm={async () => {
          setBusy(true)
          try {
            await deleteApplication(app.id)
            toast.success('Aplicação removida.')
            navigate('/aplicacoes')
          } catch (e) {
            toast.error(e)
            setBusy(false)
            setDelOpen(false)
          }
        }}
      />
    </>
  )
}
