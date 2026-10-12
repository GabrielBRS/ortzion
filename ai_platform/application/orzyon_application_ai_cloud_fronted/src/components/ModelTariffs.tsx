import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { updateCommercialSettings } from '../services/api'
import { useToast } from './Toast'
import { Badge, Field, Notice, Panel } from './ui'
import { callCost, clientRates, multiplierEconomics, providerRatesBRL } from '../lib/modelPricing'
import { fmtBRL, fmtDate, fmtNum, fmtPct } from '../lib/format'

const usd = (v: number) => `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Administração da Orzyon: custo dos fornecedores, multiplicador e preço final. Não exibido ao cliente. */
export function ModelTariffs() {
  const { data } = useApp()
  const toast = useToast()
  const c = data.commercial
  const [mult, setMult] = useState(c.externalMultiplier)
  const [fx, setFx] = useState(c.usdBrl)
  const [from, setFrom] = useState(c.ratesEffectiveFrom)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setMult(c.externalMultiplier)
    setFx(c.usdBrl)
    setFrom(c.ratesEffectiveFrom)
  }, [c])
  const econ = multiplierEconomics(c.externalMultiplier)
  const external = data.models.filter((m) => m.offering === 'external')
  const hosted = data.models.filter((m) => m.offering === 'hosted')

  // Exemplo: 10 mil tokens de entrada e 2 mil de saída com custo hipotético US$ 2 / US$ 10.
  const exCost = callCost({ input: 2, output: 10, cachedInput: 0.2 }, 10000, 2000)
  const exRevenue = exCost * c.externalMultiplier

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Panel title="Regra comercial de APIs externas" description="Aplicada separadamente a entrada, saída e cache">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              try {
                await updateCommercialSettings({ externalMultiplier: mult, usdBrl: fx, ratesEffectiveFrom: from })
                toast.success('Regra comercial atualizada. Preços finais recalculados.')
              } catch (err) {
                toast.error(err)
              } finally {
                setBusy(false)
              }
            }}
          >
            <Field label="Multiplicador sobre o preço do provedor" htmlFor="ct-mult" hint="Regra inicial: 5×.">
              <input id="ct-mult" type="number" min={1} step={0.1} className="input num" value={mult} onChange={(e) => setMult(Number(e.target.value))} />
            </Field>
            <Field label="Câmbio de referência (R$ por US$)" htmlFor="ct-fx" hint="Valor demonstrativo; atualizar conforme a política de câmbio.">
              <input id="ct-fx" type="number" min={0.01} step={0.01} className="input num" value={fx} onChange={(e) => setFx(Number(e.target.value))} />
            </Field>
            <Field label="Vigência das tarifas" htmlFor="ct-from">
              <input id="ct-from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <button className="btn-primary" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Salvar regra
            </button>
          </form>
          <div className="mt-4 rounded-lg border border-line bg-surface-2 p-3 text-xs text-muted">
            <p>
              {fmtNum(c.externalMultiplier, 1)}× = markup de <span className="text-fg">{fmtPct(econ.markup)}</span> e margem de{' '}
              <span className="text-fg">{fmtPct(econ.margin)}</span> sobre o custo da API.
            </p>
            <p className="mt-1">Não é lucro líquido: ainda há impostos, câmbio, meios de pagamento, suporte e operação.</p>
          </div>
        </Panel>

        <Panel title="Exemplo de chamada" description="Tarifa hipotética, sem representar o preço atual de nenhum modelo">
          <div className="grid gap-4 md:grid-cols-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-subtle">
                  <th className="pb-1.5 text-left font-normal">Categoria (por 1 milhão)</th>
                  <th className="pb-1.5 text-right font-normal">Fornecedor</th>
                  <th className="pb-1.5 text-right font-normal">Orzyon ({fmtNum(c.externalMultiplier, 1)}×)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Entrada', 2],
                  ['Saída', 10],
                  ['Entrada em cache', 0.2],
                ].map(([k, v]) => (
                  <tr key={k as string} className="border-t border-line/60">
                    <td className="py-1.5 text-muted">{k}</td>
                    <td className="num py-1.5 text-right">{usd(v as number)}</td>
                    <td className="num py-1.5 text-right">{usd((v as number) * c.externalMultiplier)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-sm">
              <p className="text-xs text-subtle">Chamada com 10 mil tokens de entrada e 2 mil de saída</p>
              <dl className="mt-2 grid grid-cols-2 gap-y-1">
                <dt className="text-muted">Custo da API</dt>
                <dd className="num text-right">{usd(exCost)}</dd>
                <dt className="text-muted">Receita Orzyon</dt>
                <dd className="num text-right">{usd(exRevenue)}</dd>
                <dt className="text-muted">Diferença antes dos demais custos</dt>
                <dd className="num text-right font-medium text-ok">{usd(exRevenue - exCost)}</dd>
              </dl>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Tarifas de provedores externos" description={`Custo do fornecedor e preço final ao cliente · vigência ${fmtDate(c.ratesEffectiveFrom)}`} bodyClassName="">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Modelo</th>
                <th className="th">Identificador</th>
                <th className="th text-right">Custo fornecedor (US$/1M) entrada · saída · cache</th>
                <th className="th text-right">Custo em R$/1M</th>
                <th className="th text-right">Preço cliente (R$/1M) entrada · saída · cache</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {external.map((m) => {
                const pc = m.providerCost!
                const brl = providerRatesBRL(m, c)!
                const fin = clientRates(m, c)!
                const fmt3 = (a: number, b: number, x: number | null, f: (v: number) => string) => `${f(a)} · ${f(b)} · ${x === null ? '—' : f(x)}`
                return (
                  <tr key={m.id}>
                    <td className="td">
                      {m.name}
                      <span className="block text-xs text-subtle">
                        {m.provider} · vigência {fmtDate(pc.effectiveFrom)} {pc.demo && <Badge tone="warn">demonstrativa</Badge>}
                      </span>
                    </td>
                    <td className="td font-mono text-xs">{m.identifier ?? <span className="font-sans text-warn">cadastrar</span>}</td>
                    <td className="td num text-right text-xs whitespace-nowrap">{fmt3(pc.input, pc.output, pc.cachedInput, (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }))}</td>
                    <td className="td num text-right text-xs whitespace-nowrap text-muted">{fmt3(brl.input, brl.output, brl.cachedInput, fmtBRL)}</td>
                    <td className="td num text-right text-xs whitespace-nowrap font-medium">{fmt3(fin.input, fin.output, fin.cachedInput, fmtBRL)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-3 text-xs text-subtle">
          Tarifas demonstrativas: substituir pelas tarifas vigentes de cada fornecedor, preservando categorias (entrada, saída, cache e recursos adicionais) e a data de vigência.
        </p>
      </Panel>

      <Panel title="Tarifas de modelos hospedados" description="Preço definido pela Orzyon para inferência compartilhada (R$/1M tokens)" bodyClassName="">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Modelo</th>
                <th className="th">Estado</th>
                <th className="th text-right">Entrada</th>
                <th className="th text-right">Saída</th>
                <th className="th text-right">Cache</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {hosted.map((m) => (
                <tr key={m.id}>
                  <td className="td">{m.name}</td>
                  <td className="td text-xs">{m.status}</td>
                  <td className="td num text-right">{fmtBRL(m.hostedPrice!.input)}</td>
                  <td className="td num text-right">{fmtBRL(m.hostedPrice!.output)}</td>
                  <td className="td num text-right">{m.hostedPrice!.cachedInput === null ? '—' : fmtBRL(m.hostedPrice!.cachedInput)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line p-4">
          <Notice tone="warn">
            Validar pelo custo real antes de tratar modelos abertos como linha econômica. Um modelo grande com pouca utilização pode custar mais por token que uma API externa.
            Pesam: tokens por segundo do equipamento, requisições simultâneas, ociosidade, contexto, quantização, arquitetura, energia, depreciação, rede e operação. Em MoE, não
            precificar só pelo total de parâmetros.
          </Notice>
        </div>
      </Panel>
    </div>
  )
}
