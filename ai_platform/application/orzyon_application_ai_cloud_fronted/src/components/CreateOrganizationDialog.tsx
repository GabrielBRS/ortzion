import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Loader2 } from 'lucide-react'
import { useOrg } from '../state/AppContext'
import { createOrganization, ApiError } from '../services/api'
import { useToast } from './Toast'
import { Field, IssueList, Modal } from './ui'

/** Cria uma organização de cliente (B2B) e a seleciona. Ela aparece no grupo "Clientes B2B". */
export function CreateOrganizationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, setOrg } = useOrg()
  const navigate = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [budget, setBudget] = useState(100000)
  const [ownerName, setOwnerName] = useState(session?.userName ?? '')
  const [ownerEmail, setOwnerEmail] = useState(session?.email ?? '')
  const [busy, setBusy] = useState(false)
  const [issues, setIssues] = useState<string[]>([])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setIssues([])
    try {
      const created = await createOrganization({ name, monthlyBudget: budget, owner: { name: ownerName, email: ownerEmail } })
      setOrg(created.id)
      toast.success(`Organização "${created.name}" criada.`)
      setName('')
      onClose()
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) setIssues([err.message, ...err.details])
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Criar nova organização"
      description="Organização de cliente dentro da plataforma Orzyon Cloud. Ela começa vazia, com o responsável como proprietário."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" form="create-org-form" className="btn-primary" disabled={busy || !name.trim()}>
            {busy && <Loader2 className="size-4 animate-spin" />} Criar organização
          </button>
        </>
      }
    >
      <form id="create-org-form" className="space-y-4" onSubmit={submit}>
        <Field label="Nome da organização" htmlFor="co-name" hint="Nome da empresa ou do órgão cliente.">
          <input id="co-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" autoFocus />
        </Field>
        <Field label="Orçamento mensal (R$)" htmlFor="co-budget" hint="Limite usado nos alertas e na projeção do mês.">
          <input id="co-budget" type="number" min={1000} step={1000} className="input num" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Responsável" htmlFor="co-owner-name">
            <input id="co-owner-name" className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </Field>
          <Field label="E-mail do responsável" htmlFor="co-owner-email">
            <input id="co-owner-email" type="email" className="input" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
          </Field>
        </div>
        <IssueList issues={issues} />
      </form>
    </Modal>
  )
}
