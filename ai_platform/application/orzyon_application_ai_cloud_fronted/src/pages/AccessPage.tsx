import { useState, type FormEvent } from 'react'
import { Plus, Wallet } from 'lucide-react'
import type { ApiKey } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { useToast } from '../components/Toast'
import { ConfirmDialog, CopyButton, EmptyState, Field, MetricCard, Modal, Notice, PageHeader, Panel } from '../components/ui'
import { GATEWAY_URL } from '../lib/gateway'
import { creditBalance } from '../lib/credits'
import { fmtBRL, fmtDate } from '../lib/format'
import { addCredits, createApiKey, revokeApiKey } from '../services/api'

const RECHARGE_PRESETS = [100, 500, 1000, 5000]

export default function AccessPage() {
  const { data, org } = useOrg()
  const toast = useToast()
  const balance = creditBalance(data, org.id)
  const keys = data.apiKeys.filter((k) => k.orgId === org.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const ledger = data.credits.filter((c) => c.orgId === org.id).sort((a, b) => b.at.localeCompare(a.at))
  const [keyOpen, setKeyOpen] = useState(false)
  const [creditOpen, setCreditOpen] = useState(false)
  const [toRevoke, setToRevoke] = useState<ApiKey | null>(null)
  const [busy, setBusy] = useState(false)
  const curl = `curl ${GATEWAY_URL}/chat/completions \\\n  -H "Authorization: Bearer SUA_CHAVE" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "IDENTIFICADOR_DO_MODELO", "messages": [{"role": "user", "content": "Olá"}]}'`

  const revoke = async () => {
    if (!toRevoke) return
    setBusy(true)
    try {
      await revokeApiKey(toRevoke.id)
      toast.success('Chave revogada.')
      setToRevoke(null)
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Acesso à API"
        description="Conecte as aplicações da organização ao modelo de linguagem da Orzyon. Pré-pago: adicione créditos antes de consumir."
        crumbs={[{ label: org.name, to: '/' }, { label: 'Acesso à API' }]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MetricCard
          label="Saldo disponível"
          value={fmtBRL(balance.balance)}
          hint="recargas menos o consumo do mês"
          tone={balance.balance < 0 ? 'err' : undefined}
          icon={<Wallet className="size-4" />}
        />
        <MetricCard label="Recargas" value={fmtBRL(balance.credited)} hint="total creditado" />
        <MetricCard label="Consumo do mês" value={fmtBRL(balance.consumed)} hint="modelos usados pela organização" />
      </div>
      {balance.balance <= 0 && <Notice tone="warn">Saldo zerado: as chamadas são recusadas até uma nova recarga.</Notice>}

      <Panel className="mt-6" title="Endpoint" description="Use este domínio com uma chave da organização. O identificador de cada modelo está na página Modelos.">
        <div className="flex flex-wrap items-center gap-2">
          <code className="num rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-sm break-all">{GATEWAY_URL}</code>
          <CopyButton text={GATEWAY_URL} label="Copiar endereço" />
        </div>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-[#080b0f] p-4 font-mono text-xs leading-relaxed text-fg/90">{curl}</pre>
      </Panel>

      <Panel
        className="mt-6"
        title="Chaves de API"
        description="Chaves da organização, não de uma pessoa. O segredo completo aparece só na criação; depois, fica só o prefixo."
        actions={
          <button className="btn-primary" onClick={() => setKeyOpen(true)}>
            <Plus className="size-4" /> Criar chave
          </button>
        }
        bodyClassName=""
      >
        {keys.length === 0 ? (
          <EmptyState title="Nenhuma chave criada" description="Crie uma chave para conectar uma aplicação ao endpoint." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="th">Nome</th>
                  <th className="th">Chave</th>
                  <th className="th">Criada em</th>
                  <th className="th">Estado</th>
                  <th className="th text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-2/50">
                    <td className="td font-medium">{k.name}</td>
                    <td className="td font-mono text-xs whitespace-nowrap">
                      {k.prefix}••••••••{k.last4}
                    </td>
                    <td className="td text-xs whitespace-nowrap text-muted">{fmtDate(k.createdAt)}</td>
                    <td className="td whitespace-nowrap">{k.revokedAt ? <span className="text-err">Revogada em {fmtDate(k.revokedAt)}</span> : <span className="text-ok">Ativa</span>}</td>
                    <td className="td text-right">
                      {!k.revokedAt && (
                        <button className="btn-ghost btn-sm text-err hover:text-err" onClick={() => setToRevoke(k)}>
                          Revogar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        className="mt-6"
        title="Créditos pré-pagos"
        description="Cada chamada consome o saldo conforme o modelo e os tokens usados."
        actions={
          <button className="btn-primary" onClick={() => setCreditOpen(true)}>
            <Wallet className="size-4" /> Adicionar créditos
          </button>
        }
      >
        <Notice>Demonstração: a recarga é simulada, não cobra nada e não coleta dados de pagamento.</Notice>
        {ledger.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nenhuma recarga registrada.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {ledger.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="block">{c.note}</span>
                  <span className="text-xs text-subtle">{fmtDate(c.at)}</span>
                </span>
                <span className="num text-ok">+{fmtBRL(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {keyOpen && <CreateKeyDialog orgId={org.id} onClose={() => setKeyOpen(false)} />}
      {creditOpen && <AddCreditsDialog orgId={org.id} onClose={() => setCreditOpen(false)} />}
      <ConfirmDialog
        open={!!toRevoke}
        onClose={() => setToRevoke(null)}
        title="Revogar chave"
        description={
          <>
            A chave <span className="font-medium text-fg">{toRevoke?.name}</span> deixa de funcionar imediatamente. Esta ação não pode ser desfeita.
          </>
        }
        danger
        confirmLabel="Revogar"
        busy={busy}
        onConfirm={revoke}
      />
    </>
  )
}

/** Cria a chave e mostra o segredo uma única vez. */
function CreateKeyDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { key } = await createApiKey(orgId, name)
      setSecret(key)
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  if (secret) {
    return (
      <Modal open onClose={onClose} title="Chave criada" description="Copie a chave agora. Por segurança, o segredo não é mostrado de novo.">
        <div className="space-y-3">
          <code className="block rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs break-all">{secret}</code>
          <CopyButton text={secret} label="Copiar chave" />
          <Notice tone="warn">Guarde esta chave em um cofre de segredos da aplicação. Depois de fechar esta janela, só o prefixo fica visível.</Notice>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={onClose}>
              Concluir
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="Criar chave de API" description="A chave pertence à organização. Use um nome que diga onde ela será usada.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome da chave" htmlFor="key-name">
          <input id="key-name" className="input" maxLength={60} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Aplicação de atendimento" />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
            Criar chave
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** Recarga do saldo pré-pago. Simulada: não cobra nada e não recebe dados de pagamento. */
function AddCreditsDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const toast = useToast()
  const [amount, setAmount] = useState(500)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await addCredits(orgId, amount)
      toast.success('Recarga registrada.')
      onClose()
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Adicionar créditos"
      description="Demonstração: a recarga é simulada e não cobra nada."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={busy || amount < 50} onClick={submit}>
            Confirmar recarga
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {RECHARGE_PRESETS.map((p) => (
            <button key={p} className={amount === p ? 'btn-primary' : 'btn-secondary'} onClick={() => setAmount(p)}>
              {fmtBRL(p)}
            </button>
          ))}
        </div>
        <Field label="Outro valor" hint="Entre R$ 50 e R$ 100.000.">
          <input className="input" type="number" min={50} max={100000} step={10} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
      </div>
    </Modal>
  )
}
