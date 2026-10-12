// Medidor de inteligência: arco de 180 graus, de 0 (esquerda) a 100 (direita), com ponteiro.
// Sem leitura (sem modelo configurado), mostra só o trilho e um traço no lugar do número.
// Com `explain`, passar o mouse ou focar o medidor abre uma explicação embaixo dele.
import { useId } from 'react'
import { RECOMMENDED_INTELLIGENCE, intelligenceTone } from '../lib/intelligence'

const TONE_CLASS = { err: 'text-err', warn: 'text-warn', ok: 'text-ok' } as const

export function IntelligenceGauge({
  score,
  size = 'md',
  label = 'Inteligência',
  explain = false,
}: {
  score: number | null
  size?: 'sm' | 'md'
  label?: string
  explain?: boolean
}) {
  const tipId = useId()
  const cx = 60
  const cy = 58
  const r = 46
  const hasScore = score !== null
  const clamped = hasScore ? Math.min(100, Math.max(0, score)) : 0
  const angle = (clamped / 100) * Math.PI
  const tipX = cx - r * Math.cos(angle)
  const tipY = cy - r * Math.sin(angle)
  const needleX = cx - (r - 10) * Math.cos(angle)
  const needleY = cy - (r - 10) * Math.sin(angle)
  const track = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const value = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${tipX.toFixed(2)} ${tipY.toFixed(2)}`
  const tone = hasScore ? TONE_CLASS[intelligenceTone(score)] : 'text-subtle'
  const stroke = size === 'sm' ? 8 : 10
  const width = size === 'sm' ? 56 : 128
  const number = score === null ? '—' : score

  const gauge = (
    <div
      role="img"
      aria-label={hasScore ? `${label}: ${score} de 100` : `${label}: sem modelo configurado`}
      className={`inline-flex ${size === 'sm' ? 'items-center gap-2' : 'flex-col items-center'} ${tone}`}
    >
      <svg viewBox="0 0 120 66" width={width} height={(width * 66) / 120} aria-hidden className="shrink-0 overflow-visible">
        <path d={track} fill="none" className="stroke-line-strong" strokeWidth={stroke} strokeLinecap="round" />
        {score !== null && score > 0 && <path d={value} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />}
        {hasScore && <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
        <circle cx={cx} cy={cy} r={4} fill="currentColor" />
      </svg>
      {size === 'sm' ? (
        <span className="num text-sm font-semibold">{number}</span>
      ) : (
        <div className="text-center">
          <span className="num text-xl font-semibold">{number}</span>
          <span className="block text-[11px] text-subtle">{label}</span>
        </div>
      )}
    </div>
  )

  if (!explain) return gauge

  return (
    <span className="group relative inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent" tabIndex={0} aria-describedby={tipId}>
      {gauge}
      <span
        id={tipId}
        role="tooltip"
        className="invisible absolute top-full left-1/2 z-30 mt-2 w-80 -translate-x-1/2 rounded-lg border border-line-strong bg-surface-2 p-3 text-left text-xs leading-relaxed font-normal text-muted opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100"
      >
        <IntelligenceTip score={score} />
      </span>
    </span>
  )
}

/** Explicação da métrica: o que é, o mínimo recomendado, a distância até ele e como aumentar a inteligência. */
function IntelligenceTip({ score }: { score: number | null }) {
  return (
    <>
      <p className="font-medium text-fg">Inteligência do agente</p>
      <p className="mt-1">
        Mede o quão inteligente o agente é: a média da inteligência das suas aplicações, considerando o modelo, o motor de inferência e os recursos reservados.
      </p>
      <p className="mt-2">A Orzyon recomenda no mínimo {RECOMMENDED_INTELLIGENCE}%.</p>
      {score === null && <p className="mt-1 text-subtle">Nenhuma aplicação do agente tem modelo configurado.</p>}
      {score !== null && score < RECOMMENDED_INTELLIGENCE && (
        <p className="mt-1 text-warn">
          Está em {score}%: faltam {RECOMMENDED_INTELLIGENCE - score} pontos para o mínimo.
        </p>
      )}
      <p className="mt-3 font-medium text-fg">Para aumentar a inteligência</p>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        <li>Mais recursos nos clusters: memória de GPU (VRAM), GPUs, CPU e RAM.</li>
        <li>Trocar o modelo por um com mais parâmetros, mais especialista na tarefa.</li>
        <li>Trocar o motor de inferência por um homologado para o perfil do cluster.</li>
        <li>Otimizar o motor, o modelo e as reservas de memória e computação.</li>
      </ul>
    </>
  )
}
