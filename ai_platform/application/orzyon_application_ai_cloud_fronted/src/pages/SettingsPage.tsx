import { useState } from 'react'
import { useNavigate } from 'react-router'
import { LogOut, RotateCcw } from 'lucide-react'
import { useOrg } from '../state/AppContext'
import { restoreDemo } from '../services/api'
import { SCHEMA_VERSION } from '../services/store'
import { useToast } from '../components/Toast'
import { ConfirmDialog, PageHeader, Panel } from '../components/ui'
import { fmtDateTime } from '../lib/format'

export default function SettingsPage() {
  const { data, org, session, logout } = useOrg()
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <PageHeader title="Configurações" description="Sessão, dados da demonstração e informações do ambiente." crumbs={[{ label: org.name, to: '/' }, { label: 'Configurações' }]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Sessão">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted">Usuário</dt>
            <dd className="text-right">{session.userName}</dd>
            <dt className="text-muted">E-mail</dt>
            <dd className="text-right">{session.email}</dd>
            <dt className="text-muted">Perfil</dt>
            <dd className="text-right">{session.role === 'operador' ? 'Operador da cloud' : 'Cliente da organização'}</dd>
            <dt className="text-muted">Organização atual</dt>
            <dd className="text-right">{org.name}</dd>
            <dt className="text-muted">Início da sessão</dt>
            <dd className="text-right">{fmtDateTime(session.startedAt)}</dd>
          </dl>
          <p className="mt-3 text-xs text-subtle">Autenticação simulada. A sessão fica apenas nesta aba do navegador e termina ao sair ou fechar a aba.</p>
          <button
            className="btn-secondary mt-4"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <LogOut className="size-4" /> Sair
          </button>
        </Panel>
        <Panel title="Dados da demonstração">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted">Organizações</dt>
            <dd className="num text-right">{data.orgs.length}</dd>
            <dt className="text-muted">Clusters</dt>
            <dd className="num text-right">{data.clusters.length}</dd>
            <dt className="text-muted">Agentes · implantações de agentes</dt>
            <dd className="num text-right">
              {data.agents.length} · {data.agentDeployments.length}
            </dd>
            <dt className="text-muted">Serviços · implantações de modelo</dt>
            <dd className="num text-right">
              {data.services.length} · {data.deployments.length}
            </dd>
            <dt className="text-muted">Versão do esquema local</dt>
            <dd className="num text-right">v{SCHEMA_VERSION}</dd>
          </dl>
          <p className="mt-3 text-xs text-subtle">
            Alterações ficam salvas neste navegador e são preservadas ao recarregar a página. Nenhuma senha ou segredo é armazenado.
          </p>
          <button className="btn-danger mt-4" onClick={() => setOpen(true)}>
            <RotateCcw className="size-4" /> Restaurar demonstração
          </button>
        </Panel>
        <Panel title="Sobre o ambiente de demonstração" className="lg:col-span-2">
          <ul className="grid gap-2 text-sm text-muted md:grid-cols-2">
            <li>• Login, permissões e papéis são simulados; não há autenticação real.</li>
            <li>• Provisionamento de clusters e carregamento de modelos são simulações locais.</li>
            <li>• O playground usa respostas predefinidas; não há inferência real.</li>
            <li>• Builds e implantações de serviços são simulados; nenhum código é executado.</li>
            <li>• Valores de custo são ilustrativos e não representam oferta comercial.</li>
            <li>• Organizações governamentais são cenários fictícios, não clientes reais.</li>
          </ul>
        </Panel>
      </div>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Restaurar demonstração"
        description="Todas as alterações locais serão descartadas e os dados iniciais recarregados. A sessão atual é mantida."
        confirmLabel="Restaurar"
        danger
        busy={busy}
        onConfirm={async () => {
          setBusy(true)
          await restoreDemo()
          setBusy(false)
          setOpen(false)
          toast.success('Demonstração restaurada para o estado inicial.')
          navigate('/')
        }}
      />
    </>
  )
}
