// Diálogos e botões da aba Agentes. Cada diálogo cuida de uma ação; quem chama decide onde ela aparece.
import { useState, type FormEvent, type ReactNode } from 'react'
import type { Application, Cluster, EnvVar } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { useToast } from './Toast'
import { Field, Modal } from './ui'
import { ApiError, cloneCluster, createApplication, createCluster, createService } from '../services/api'
import { slugify } from '../lib/format'
import { RUNTIME_DEFAULTS, SAMPLE_CODE } from '../mock/samples'

/** Executa uma ação com feedback: mensagem de sucesso ou de erro, e fecha o diálogo quando termina. */
export function useRun() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<unknown>, ok: string, done: () => void) => {
    setBusy(true)
    try {
      await fn()
      toast.success(ok)
      done()
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
}

export function ActionButton({ icon, label, onClick, disabled, title }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean; title?: string }) {
  return (
    <button type="button" className="btn-secondary btn-sm whitespace-nowrap" onClick={onClick} disabled={disabled} title={title}>
      {icon} {label}
    </button>
  )
}

function FormDialog({
  title,
  description,
  submitLabel,
  busy,
  submitDisabled,
  onClose,
  onSubmit,
  children,
}: {
  title: string
  description?: ReactNode
  submitLabel: string
  busy: boolean
  submitDisabled?: boolean
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  children: ReactNode
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" form="acao-form" className="btn-primary" disabled={busy || submitDisabled}>
            {submitLabel}
          </button>
        </>
      }
    >
      <form id="acao-form" className="space-y-4" onSubmit={onSubmit}>
        {children}
      </form>
    </Modal>
  )
}

/** Serviço: a aplicação executa num cluster, com réplicas e reserva por réplica. */
export function CreateServiceDialog({
  title,
  apps,
  clusters,
  lockedApp,
  lockedCluster,
  onClose,
}: {
  title: string
  apps: Application[]
  clusters: Cluster[]
  lockedApp?: Application
  lockedCluster?: Cluster
  onClose: () => void
}) {
  const { busy, run } = useRun()
  const [appId, setAppId] = useState(lockedApp?.id ?? apps[0]?.id ?? '')
  const [clusterId, setClusterId] = useState(lockedCluster?.id ?? clusters[0]?.id ?? '')
  const [name, setName] = useState('')
  const [replicas, setReplicas] = useState(1)
  const [vcpu, setVcpu] = useState(2)
  const [mem, setMem] = useState(4)
  const app = lockedApp ?? apps.find((a) => a.id === appId)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!app || !clusterId) return
    run(
      () =>
        createService({
          applicationId: app.id,
          clusterId,
          name: slugify(name.trim() || app.slug),
          replicas,
          reservation: { vcpu, memoryGiB: mem, gpus: 0, gpuMemoryGiB: 0 },
        }),
      'Serviço implantado.',
      onClose,
    )
  }
  return (
    <FormDialog title={title} submitLabel="Implantar serviço" busy={busy} submitDisabled={!app || !clusterId} onClose={onClose} onSubmit={submit}>
      <Field label="Aplicação" htmlFor="acao-app">
        <select id="acao-app" className="input" value={app?.id ?? ''} disabled={!!lockedApp} onChange={(e) => setAppId(e.target.value)}>
          {(lockedApp ? [lockedApp] : apps).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Cluster" htmlFor="acao-cluster">
        <select id="acao-cluster" className="input" value={clusterId} disabled={!!lockedCluster} onChange={(e) => setClusterId(e.target.value)}>
          {(lockedCluster ? [lockedCluster] : clusters).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nome da instância" htmlFor="acao-nome" hint="Padrão: nome da aplicação.">
        <input id="acao-nome" className="input font-mono" value={name} placeholder={app?.slug} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Réplicas" htmlFor="acao-rep">
          <input id="acao-rep" type="number" min={1} max={10} className="input num" value={replicas} onChange={(e) => setReplicas(Number(e.target.value))} />
        </Field>
        <Field label="vCPU por réplica" htmlFor="acao-cpu">
          <input id="acao-cpu" type="number" min={0.5} step={0.5} className="input num" value={vcpu} onChange={(e) => setVcpu(Number(e.target.value))} />
        </Field>
        <Field label="Memória (GiB)" htmlFor="acao-mem">
          <input id="acao-mem" type="number" min={1} className="input num" value={mem} onChange={(e) => setMem(Number(e.target.value))} />
        </Field>
      </div>
    </FormDialog>
  )
}

/** Cluster novo, do zero: capacidade padrão do pool escolhido e um serviço inicial para o agente. */
export function CreateClusterDialog({ apps, sectorName, onClose }: { apps: Application[]; sectorName: string; onClose: () => void }) {
  const { data, org } = useOrg()
  const { busy, run } = useRun()
  const [name, setName] = useState('')
  const [poolId, setPoolId] = useState(data.pools[0]?.id ?? '')
  const [nodes, setNodes] = useState(1)
  const [appId, setAppId] = useState(apps[0]?.id ?? '')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const pool = data.pools.find((p) => p.id === poolId)
    const app = apps.find((a) => a.id === appId)
    run(
      async () => {
        if (!pool || !app) throw new ApiError('Escolha um pool e uma aplicação do setor.')
        const cluster = await createCluster({
          orgId: org.id,
          name: name.trim(),
          purpose: `Cluster do setor ${sectorName}.`,
          modality: 'virtual',
          profile: pool.profile,
          poolId: pool.id,
          capacity: {
            nodes,
            vcpuPerNode: pool.perNode.vcpu,
            memoryPerNodeGiB: pool.perNode.memoryGiB,
            gpusPerNode: pool.perNode.gpus,
            vramPerGpuGiB: pool.perNode.vramPerGpuGiB,
            gpuSharePerNodeGiB: pool.profile === 'unified' ? Math.round(pool.perNode.memoryGiB / 2) : 0,
            storageGiB: 1024,
          },
          monthlyBudget: 30000,
          limitPolicy: 'alertar',
        })
        await createService({ applicationId: app.id, clusterId: cluster.id, name: app.slug, replicas: 1, reservation: { vcpu: 2, memoryGiB: 4, gpus: 0, gpuMemoryGiB: 0 } })
      },
      'Cluster criado com o serviço inicial.',
      onClose,
    )
  }
  return (
    <FormDialog title="Criar cluster" description="Cria um cluster do zero e implanta a primeira aplicação do agente nele." submitLabel="Criar cluster" busy={busy} submitDisabled={!name.trim() || !apps.length} onClose={onClose} onSubmit={submit}>
      <Field label="Nome do cluster" htmlFor="acao-cl-nome">
        <input id="acao-cl-nome" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Receita — Homologação" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pool de computação" htmlFor="acao-cl-pool">
          <select id="acao-cl-pool" className="input" value={poolId} onChange={(e) => setPoolId(e.target.value)}>
            {data.pools.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nós" htmlFor="acao-cl-nos" hint="Capacidade por nó vem do pool.">
          <input id="acao-cl-nos" type="number" min={1} max={4} className="input num" value={nodes} onChange={(e) => setNodes(Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Aplicação inicial" htmlFor="acao-cl-app">
        <select id="acao-cl-app" className="input" value={appId} onChange={(e) => setAppId(e.target.value)}>
          {apps.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
    </FormDialog>
  )
}

/** Clonar cluster: copia capacidade, serviços e aplicações para um cluster novo. */
export function CloneClusterDialog({ clusters, onClose }: { clusters: Cluster[]; onClose: () => void }) {
  const { busy, run } = useRun()
  const [clusterId, setClusterId] = useState(clusters[0]?.id ?? '')
  const [name, setName] = useState(clusters[0] ? `${clusters[0].name} (cópia)` : '')
  const source = clusters.find((c) => c.id === clusterId)
  const pick = (id: string) => {
    setClusterId(id)
    const c = clusters.find((x) => x.id === id)
    if (c) setName(`${c.name} (cópia)`)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!source) return
    run(() => cloneCluster(source.id, name.trim()), 'Cluster clonado com serviços e aplicações.', onClose)
  }
  return (
    <FormDialog title="Clonar cluster" description="Cria outro cluster com a mesma capacidade e copia os serviços e as aplicações dele." submitLabel="Clonar" busy={busy} submitDisabled={!source || !name.trim()} onClose={onClose} onSubmit={submit}>
      {clusters.length > 1 && (
        <Field label="Cluster a clonar" htmlFor="acao-clone-src">
          <select id="acao-clone-src" className="input" value={clusterId} onChange={(e) => pick(e.target.value)}>
            {clusters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Nome do novo cluster" htmlFor="acao-clone-nome">
        <input id="acao-clone-nome" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
    </FormDialog>
  )
}

/** Aplicação nova no setor: vira uma habilidade do agente. */
export function CreateApplicationDialog({ orgId, sector, onClose }: { orgId: string; sector: string; onClose: () => void }) {
  const { busy, run } = useRun()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [runtime, setRuntime] = useState<'python' | 'mojo' | 'python_mojo'>('python')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    run(
      () =>
        createApplication({
          orgId,
          name: name.trim(),
          description: description.trim(),
          kind: 'source',
          runtime,
          fileName: RUNTIME_DEFAULTS[runtime].fileName,
          code: SAMPLE_CODE[runtime],
          command: RUNTIME_DEFAULTS[runtime].command,
          env: [] as EnvVar[],
          version: 'v1.0.0',
          sector,
        }),
      'Aplicação criada no setor.',
      onClose,
    )
  }
  return (
    <FormDialog title="Criar aplicação" description="Nova habilidade do agente. Depois, implante-a em um cluster." submitLabel="Criar aplicação" busy={busy} submitDisabled={!name.trim()} onClose={onClose} onSubmit={submit}>
      <Field label="Nome da aplicação" htmlFor="acao-app-nome">
        <input id="acao-app-nome" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Conciliação de notas" />
      </Field>
      <Field label="Descrição" htmlFor="acao-app-desc">
        <input id="acao-app-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Runtime" htmlFor="acao-app-runtime">
        <select id="acao-app-runtime" className="input" value={runtime} onChange={(e) => setRuntime(e.target.value as typeof runtime)}>
          <option value="python">Python</option>
          <option value="mojo">Mojo</option>
          <option value="python_mojo">Python + Mojo</option>
        </select>
      </Field>
    </FormDialog>
  )
}
