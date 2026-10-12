import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Download, Loader2 } from 'lucide-react'
import type { LimitPolicy } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { updateOrganization } from '../services/api'
import { useToast } from '../components/Toast'
import { Field, MetricCard, Notice, OptionCard, PageHeader, Panel } from '../components/ui'
import { DonutChart, CHART_COLORS, SERIES_PALETTE, TimeChart } from '../components/charts'
import { monthWindow, orgCosts } from '../lib/costs'
import { fmtBRL, fmtBRL0, fmtCompact, fmtInt, fmtPct } from '../lib/format'
import { LIMIT_POLICIES, modalityLabel, profileLabel } from '../lib/labels'
import { PRICING_ROWS } from '../mock/pricing'

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  // Separador ";" e BOM para abrir corretamente em planilhas configuradas em pt-BR.
  const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function CostsPage() {
  const { data, org } = useOrg()
  const toast = useToast()
  const costs = orgCosts(data, org.id)
  const win = monthWindow()
  const [budget, setBudget] = useState(org.monthlyBudget)
  const [threshold, setThreshold] = useState(Math.round(org.alertThreshold * 100))
  const [policy, setPolicy] = useState<LimitPolicy>(org.limitPolicy)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setBudget(org.monthlyBudget)
    setThreshold(Math.round(org.alertThreshold * 100))
    setPolicy(org.limitPolicy)
  }, [org.id, org.monthlyBudget, org.alertThreshold, org.limitPolicy])

  const projectedRatio = costs.projected / org.monthlyBudget
  const byCategory = [
    { name: 'vCPU', value: costs.items.reduce((s, x) => s + x.reservedByResource.vcpu, 0) },
    { name: 'Memória', value: costs.items.reduce((s, x) => s + x.reservedByResource.memory, 0) },
    { name: 'GPU', value: costs.items.reduce((s, x) => s + x.reservedByResource.gpu, 0) },
    { name: 'Armazenamento', value: costs.items.reduce((s, x) => s + x.reservedByResource.storage, 0) },
    { name: 'Gateway', value: costs.items.reduce((s, x) => s + x.variable.gateway, 0) },
    { name: 'Transferência', value: costs.items.reduce((s, x) => s + x.variable.egress, 0) },
    { name: 'Logs e métricas', value: costs.items.reduce((s, x) => s + x.variable.observability, 0) },
    { name: 'Tokens — Orzyon', value: costs.tokens.hostedToDate },
    { name: 'Tokens — externos', value: costs.tokens.externalToDate },
  ]
  const byCluster = costs.items.map((x) => ({ label: x.cluster.name, reserved: +x.reservedToDate.toFixed(2), variable: +x.variableToDate.toFixed(2) }))

  const exportCsv = () => {
    const month = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).replace('/', '-')
    downloadCsv(`orzyon-cloud-custos-${org.slug}-${month}.csv`, [
      ['Valores ilustrativos para demonstração; não representam uma oferta comercial.'],
      ['Organização', 'Cluster', 'Modalidade', 'Perfil', 'Status', 'Capacidade reservada (acumulado R$)', 'Consumo variável (acumulado R$)', 'Total acumulado (R$)', 'Projeção do mês (R$)', 'Orçamento do cluster (R$)'],
      ...costs.items.map((x) => [
        org.name,
        x.cluster.name,
        modalityLabel(x.cluster.modality),
        profileLabel(x.cluster.profile),
        x.cluster.status,
        x.reservedToDate,
        x.variableToDate,
        x.toDate,
        x.projected,
        x.cluster.monthlyBudget,
      ]),
      [],
      ['Modelo (por tokens)', 'Processamento', 'Tokens de entrada', 'Tokens de saída', 'Acumulado (R$)', 'Projeção (R$)'],
      ...costs.tokens.items.map((u) => [
        u.model.name,
        u.model.offering === 'hosted' ? 'Orzyon Cloud' : (u.model.provider ?? ''),
        Math.round(u.tokensIn).toString(),
        Math.round(u.tokensOut).toString(),
        u.toDate,
        u.projected,
      ]),
      [],
      [org.name, 'TOTAL (clusters + tokens)', '', '', '', costs.reservedToDate, costs.variableToDate, costs.toDate, costs.projected, org.monthlyBudget],
      [],
      ['Categoria', 'Acumulado no mês (R$)'],
      ...byCategory.map((c) => [c.name, c.value]),
    ])
    toast.success('CSV de custos exportado.')
  }

  return (
    <>
      <PageHeader
        title="Custos e faturamento"
        description={`Consumo de ${win.start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} · ${fmtPct(win.fraction)} do mês decorrido`}
        crumbs={[{ label: org.name, to: '/' }, { label: 'Custos' }]}
        actions={
          <button className="btn-secondary" onClick={exportCsv}>
            <Download className="size-4" /> Exportar CSV
          </button>
        }
      />
      <div className="mb-4">
        <Notice tone="warn">Valores ilustrativos para demonstração; não representam uma oferta comercial.</Notice>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Consumo acumulado" value={fmtBRL0(costs.toDate)} hint={`${fmtBRL0(costs.reservedToDate)} capacidade · ${fmtBRL0(costs.variableToDate)} variável · ${fmtBRL0(costs.tokens.toDate)} tokens`} />
        <MetricCard
          label="Projeção do mês"
          value={fmtBRL0(costs.projected)}
          hint={`${fmtPct(projectedRatio)} do orçamento`}
          tone={projectedRatio >= 1 ? 'err' : projectedRatio >= org.alertThreshold ? 'warn' : undefined}
        />
        <MetricCard label="Orçamento mensal" value={fmtBRL0(org.monthlyBudget)} hint={`Alerta em ${fmtPct(org.alertThreshold)}`} />
        <MetricCard label="Saldo estimado" value={fmtBRL0(org.monthlyBudget - costs.projected)} hint="orçamento − projeção" tone={org.monthlyBudget - costs.projected < 0 ? 'err' : undefined} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Distribuição por cluster" description="Acumulado no mês">
          <TimeChart
            type="bar"
            stacked
            data={byCluster}
            series={[
              { key: 'reserved', label: 'Capacidade reservada', color: CHART_COLORS.blue },
              { key: 'variable', label: 'Consumo variável', color: CHART_COLORS.amber },
            ]}
            format={fmtBRL}
          />
        </Panel>
        <Panel title="Distribuição por categoria" description="Acumulado no mês">
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_200px]">
            <DonutChart data={byCategory} format={fmtBRL} />
            <ul className="space-y-1.5 text-xs">
              {byCategory.map((c, i) => (
                <li key={c.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-muted">
                    <span className="size-2.5 rounded-sm" style={{ background: SERIES_PALETTE[i % SERIES_PALETTE.length] }} />
                    {c.name}
                  </span>
                  <span className="num">{fmtBRL0(c.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel title="Custos por cluster" bodyClassName="">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="th">Cluster</th>
                  <th className="th text-right">Capacidade reservada</th>
                  <th className="th text-right">Consumo variável</th>
                  <th className="th text-right">Acumulado</th>
                  <th className="th text-right">Projeção</th>
                  <th className="th text-right">Orçamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {costs.items.map((x) => (
                  <tr key={x.cluster.id}>
                    <td className="td">
                      {x.cluster.name}
                      <div className="text-xs text-subtle">{fmtInt(x.requestsToDate)} requisições no mês</div>
                    </td>
                    <td className="td num text-right">{fmtBRL0(x.reservedToDate)}</td>
                    <td className="td num text-right">{fmtBRL(x.variableToDate)}</td>
                    <td className="td num text-right">{fmtBRL0(x.toDate)}</td>
                    <td className={`td num text-right ${x.projected > x.cluster.monthlyBudget ? 'text-warn' : ''}`}>{fmtBRL0(x.projected)}</td>
                    <td className="td num text-right text-muted">{fmtBRL0(x.cluster.monthlyBudget)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line-strong font-medium">
                <tr>
                  <td className="td">Total</td>
                  <td className="td num text-right">{fmtBRL0(costs.reservedToDate)}</td>
                  <td className="td num text-right">{fmtBRL(costs.variableToDate)}</td>
                  <td className="td num text-right">{fmtBRL0(costs.toDate)}</td>
                  <td className="td num text-right">{fmtBRL0(costs.projected)}</td>
                  <td className="td num text-right">{fmtBRL0(org.monthlyBudget)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="border-t border-line p-4 text-xs text-muted">
            <p>
              <span className="font-medium text-fg">Capacidade reservada</span> é cobrada pela capacidade contratada do cluster, independentemente do uso. Cluster pausado cobra apenas
              armazenamento.
            </p>
            <p className="mt-1">
              <span className="font-medium text-fg">Consumo variável</span> cobre gateway de requisições, transferência de saída e ingestão de logs. Tokens processados pelas suas
              implantações já estão cobertos pela capacidade reservada e não são cobrados novamente.
            </p>
          </div>
        </Panel>

        <Panel title="Orçamento e política de limite" description="Alterações locais da demonstração">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              try {
                await updateOrganization(org.id, { monthlyBudget: budget, alertThreshold: threshold / 100, limitPolicy: policy })
                toast.success('Orçamento atualizado. Alertas e projeções foram recalculados.')
              } catch (err) {
                toast.error(err)
              } finally {
                setBusy(false)
              }
            }}
          >
            <Field label="Orçamento mensal da organização (R$)" htmlFor="org-budget">
              <input id="org-budget" type="number" min={0} step={1000} className="input num" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            </Field>
            <Field label="Alertar ao atingir (% da projeção)" htmlFor="org-threshold">
              <input id="org-threshold" type="number" min={10} max={100} className="input num" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
            </Field>
            <fieldset>
              <legend className="label">Ao atingir o limite</legend>
              <div className="space-y-2">
                {LIMIT_POLICIES.map((p) => (
                  <OptionCard key={p.value} name="org-policy" selected={policy === p.value} onSelect={() => setPolicy(p.value)} title={p.label} description={p.description} />
                ))}
              </div>
            </fieldset>
            <button className="btn-primary" disabled={busy || budget <= 0}>
              {busy && <Loader2 className="size-4 animate-spin" />} Salvar orçamento
            </button>
          </form>
        </Panel>
      </div>

      <Panel
        title="Inferência por tokens"
        description="Modelos usados sem cluster: inferência compartilhada Orzyon e APIs externas"
        className="mt-4"
        bodyClassName=""
        actions={
          <Link to="/modelos/acessos" className="btn-ghost btn-sm">
            Gerenciar acessos
          </Link>
        }
      >
        {costs.tokens.items.length === 0 && costs.tokens.agentsToDate === 0 ? (
          <p className="p-4 text-sm text-muted">Nenhum modelo habilitado por tokens.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="th">Modelo</th>
                  <th className="th">Processamento</th>
                  <th className="th text-right">Tokens no mês</th>
                  <th className="th text-right">Acumulado</th>
                  <th className="th text-right">Projeção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {costs.tokens.items.map((u) => (
                  <tr key={u.access.id}>
                    <td className="td">{u.model.name}</td>
                    <td className="td text-muted">{u.model.offering === 'hosted' ? 'Orzyon Cloud' : u.model.provider}</td>
                    <td className="td num text-right text-xs">
                      {fmtCompact(u.tokensIn)} entrada · {fmtCompact(u.tokensOut)} saída
                    </td>
                    <td className="td num text-right">{fmtBRL(u.toDate)}</td>
                    <td className="td num text-right text-muted">{fmtBRL(u.projected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {costs.tokens.agentsToDate > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-sm">
            <span>
              Consumo atribuído a agentes (modelos compartilhados e APIs externas)
              <Link to="/agentes" className="ml-2 text-xs text-accent hover:underline">
                ver por agente
              </Link>
            </span>
            <span className="num">
              {fmtBRL(costs.tokens.agentsToDate)} <span className="text-xs text-subtle">· projeção {fmtBRL(costs.tokens.agentsProjected)}</span>
            </span>
          </div>
        )}
        <p className="border-t border-line px-4 py-3 text-xs text-subtle">
          Na inferência compartilhada a infraestrutura está embutida na tarifa por token. Em APIs externas, o preço final inclui a regra comercial Orzyon e o conteúdo é processado
          pelo provedor.
        </p>
      </Panel>

      <Panel title="Tabela de tarifas" description="Tarifas fictícias usadas em todas as estimativas da interface" className="mt-4" bodyClassName="">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Categoria</th>
                <th className="th">Item</th>
                <th className="th">Unidade</th>
                <th className="th text-right">Preço</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PRICING_ROWS.map((r) => (
                <tr key={r.item}>
                  <td className="td text-muted">{r.category}</td>
                  <td className="td">{r.item}</td>
                  <td className="td text-muted">{r.unit}</td>
                  <td className="td num text-right">{fmtBRL(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-3 text-xs text-subtle">
          Modalidade dedicada aplica multiplicador de 1,25 sobre a computação. Mês de referência: 730 horas. Valores ilustrativos.
        </p>
      </Panel>
    </>
  )
}
