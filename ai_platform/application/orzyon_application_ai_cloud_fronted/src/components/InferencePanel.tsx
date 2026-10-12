// Inteligência da aplicação: medidor, os três fatores e a troca de modelo e motor (só modelos homologados).
import { useState } from 'react'
import type { Application } from '../domain/types'
import { useOrg } from '../state/AppContext'
import { setApplicationInference } from '../services/api'
import { applicationIntelligence } from '../lib/intelligence'
import { useToast } from './Toast'
import { IntelligenceGauge } from './IntelligenceGauge'
import { Field, Panel } from './ui'

export function InferencePanel({ app }: { app: Application }) {
  const { data } = useOrg()
  const toast = useToast()
  const current = app.inference
  const [modelId, setModelId] = useState(current?.modelId ?? '')
  const [engineId, setEngineId] = useState(current?.engineId ?? '')
  const [busy, setBusy] = useState(false)
  const reading = applicationIntelligence(data, app)
  const models = data.models.filter((m) => m.status === 'homologada')
  const changed = modelId !== (current?.modelId ?? '') || engineId !== (current?.engineId ?? '')

  const save = async () => {
    setBusy(true)
    try {
      await setApplicationInference(app.id, { modelId, engineId })
      toast.success('Modelo e motor atualizados.')
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Inteligência" description="Média de três fatores: modelo (parâmetros), motor de inferência e memória reservada pelas instâncias.">
      <div className="flex flex-col items-center gap-4">
        <IntelligenceGauge score={reading?.score ?? null} />
        {reading ? (
          <div className="w-full space-y-2 text-xs">
            <FactorRow label="Modelo" value={reading.model} />
            <FactorRow label="Motor" value={reading.engine} />
            <FactorRow label="Recursos" value={reading.resource} />
          </div>
        ) : (
          <p className="text-center text-xs text-muted">Escolha um modelo e um motor para calcular a inteligência desta aplicação.</p>
        )}
      </div>
      <div className="mt-5 space-y-3 border-t border-line pt-4">
        <Field label="Modelo" hint="Só modelos homologados entram.">
          <select className="input" value={modelId} onChange={(e) => setModelId(e.target.value)}>
            <option value="">Escolha um modelo</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.paramsB ? ` · ${m.paramsB} B` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Motor de inferência">
          <select className="input" value={engineId} onChange={(e) => setEngineId(e.target.value)}>
            <option value="">Escolha um motor</option>
            {data.engines.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
        <button type="button" className="btn-primary w-full" disabled={!changed || !modelId || !engineId || busy} onClick={save}>
          Salvar modelo e motor
        </button>
      </div>
    </Panel>
  )
}

function FactorRow({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="grid grid-cols-[72px_1fr_40px] items-center gap-2">
      <span className="text-muted">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="num text-right text-muted">{pct}%</span>
    </div>
  )
}
