import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import type { Member, MemberRole } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { updateOrganization } from '../services/api'
import { useToast } from '../components/Toast'
import { Badge, Field, MetricCard, Notice, PageHeader, Panel } from '../components/ui'
import { orgCosts } from '../lib/costs'
import { fmtBRL0, fmtPct, uid } from '../lib/format'
import { policyLabel } from '../lib/labels'
import { SEGMENT_LABEL } from '../lib/segments'

const ROLES: { value: MemberRole; description: string }[] = [
  { value: 'Proprietário', description: 'Gerencia orçamento, membros e todos os clusters.' },
  { value: 'Administrador', description: 'Cria e altera clusters, agentes e serviços.' },
  { value: 'Desenvolvedor', description: 'Configura agentes e implanta serviços.' },
  { value: 'Leitura', description: 'Visualiza métricas e custos.' },
]

export default function OrganizationPage() {
  const { data, org } = useOrg()
  const toast = useToast()
  const [name, setName] = useState(org.name)
  const [members, setMembers] = useState<Member[]>(org.members)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<MemberRole>('Desenvolvedor')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setName(org.name)
    setMembers(org.members)
  }, [org])
  const costs = orgCosts(data, org.id)
  const clusters = data.clusters.filter((c) => c.orgId === org.id)
  const dirty = name !== org.name || JSON.stringify(members) !== JSON.stringify(org.members)
  const owners = members.filter((m) => m.role === 'Proprietário').length

  const save = async () => {
    if (!name.trim()) return toast.push('erro', 'Informe o nome da organização.')
    if (owners === 0) return toast.push('erro', 'A organização precisa de pelo menos um proprietário.')
    setBusy(true)
    try {
      await updateOrganization(org.id, { name: name.trim(), members })
      toast.success('Organização atualizada.')
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Organização"
        description="Nome, membros, papéis e orçamento da organização."
        crumbs={[{ label: org.name, to: '/' }, { label: 'Organização' }]}
        actions={
          <button className="btn-primary" onClick={save} disabled={!dirty || busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar alterações
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Clusters" value={clusters.length} />
        <MetricCard label="Membros" value={members.length} />
        <MetricCard label="Orçamento mensal" value={fmtBRL0(org.monthlyBudget)} hint={policyLabel(org.limitPolicy)} />
        <MetricCard label="Projeção do mês" value={fmtBRL0(costs.projected)} hint={`${fmtPct(costs.projected / org.monthlyBudget)} do orçamento`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Panel title="Dados gerais">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome da organização" htmlFor="org-name">
                <input id="org-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Identificador" htmlFor="org-slug">
                <input id="org-slug" className="input font-mono" value={org.slug} readOnly />
              </Field>
              <Field label="Tipo" htmlFor="org-segment" hint="Define o grupo no seletor e a ambientação da página inicial.">
                <input id="org-segment" className="input" value={SEGMENT_LABEL[org.segment]} readOnly />
              </Field>
            </div>
          </Panel>

          <Panel title="Membros" description="Membros fictícios desta demonstração" bodyClassName="">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line">
                  <tr>
                    <th className="th">Nome</th>
                    <th className="th">E-mail</th>
                    <th className="th">Papel</th>
                    <th className="th">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="td font-medium">{m.name}</td>
                      <td className="td text-muted">{m.email}</td>
                      <td className="td">
                        <select
                          className="input w-44 py-1.5"
                          aria-label={`Papel de ${m.name}`}
                          value={m.role}
                          onChange={(e) => setMembers(members.map((x) => (x.id === m.id ? { ...x, role: e.target.value as MemberRole } : x)))}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value}>{r.value}</option>
                          ))}
                        </select>
                      </td>
                      <td className="td text-right">
                        <button
                          className="btn-ghost btn-sm text-err hover:text-err"
                          aria-label={`Remover ${m.name}`}
                          disabled={m.role === 'Proprietário' && owners === 1}
                          title={m.role === 'Proprietário' && owners === 1 ? 'Último proprietário' : undefined}
                          onClick={() => setMembers(members.filter((x) => x.id !== m.id))}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form
              className="grid gap-2 border-t border-line p-3 md:grid-cols-[1fr_1fr_170px_auto]"
              onSubmit={(e) => {
                e.preventDefault()
                if (!newName.trim() || !/^\S+@\S+\.\S+$/.test(newEmail)) return toast.push('erro', 'Informe nome e um e-mail válido para o membro.')
                setMembers([...members, { id: uid('m'), name: newName.trim(), email: newEmail.trim(), role: newRole }])
                setNewName('')
                setNewEmail('')
              }}
            >
              <input className="input" aria-label="Nome do novo membro" placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input className="input" aria-label="E-mail do novo membro" placeholder="email@exemplo.example" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <select className="input" aria-label="Papel do novo membro" value={newRole} onChange={(e) => setNewRole(e.target.value as MemberRole)}>
                {ROLES.map((r) => (
                  <option key={r.value}>{r.value}</option>
                ))}
              </select>
              <button className="btn-secondary">
                <Plus className="size-4" /> Adicionar
              </button>
            </form>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={<span className="flex items-center gap-2">Papéis e permissões <Badge tone="warn">demonstrativo</Badge></span>}>
            <ul className="space-y-3 text-sm">
              {ROLES.map((r) => (
                <li key={r.value}>
                  <p className="font-medium">{r.value}</p>
                  <p className="text-xs text-muted">{r.description}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Notice>Os papéis são ilustrativos nesta demonstração e não aplicam controle de acesso real.</Notice>
            </div>
          </Panel>
          <Panel title="Orçamento">
            <p className="text-sm text-muted">
              Orçamento mensal de <span className="text-fg">{fmtBRL0(org.monthlyBudget)}</span> com alerta em {fmtPct(org.alertThreshold)} e política “{policyLabel(org.limitPolicy)}”.
            </p>
            <Link to="/custos" className="btn-secondary btn-sm mt-3">
              Alterar orçamento
            </Link>
          </Panel>
        </div>
      </div>
    </>
  )
}
