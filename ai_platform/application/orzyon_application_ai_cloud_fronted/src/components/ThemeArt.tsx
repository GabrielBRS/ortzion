// Ilustrações da página inicial. Cada tipo de organização tem sua ambientação.
// São traços simplificados e fictícios: não representam equipamentos ou marcas reais.
import type { ReactNode } from 'react'

/** Silhueta de caça visto de cima (cabe em 160 × 60). */
export function JetGlyph() {
  return <path fill="currentColor" d="M4 30 L62 24 L94 6 L104 6 L92 24 L130 24 L150 14 L154 14 L146 30 L154 46 L150 46 L130 36 L92 36 L104 54 L94 54 L62 36 Z" />
}

/** Quadricóptero (cabe em 64 × 40). */
export function DroneGlyph() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 12 L32 20 L50 12 M14 28 L32 20 L50 28" />
      <circle cx="12" cy="11" r="6" />
      <circle cx="52" cy="11" r="6" />
      <circle cx="12" cy="29" r="6" />
      <circle cx="52" cy="29" r="6" />
      <rect x="25" y="16" width="14" height="8" rx="2" fill="currentColor" stroke="none" />
    </g>
  )
}

/** Blindado de esteira com canhão (cabe em 120 × 56). */
export function TankGlyph() {
  return (
    <g fill="currentColor">
      <rect x="6" y="36" width="108" height="14" rx="7" />
      <rect x="14" y="26" width="88" height="14" rx="4" opacity=".85" />
      <path d="M40 26 Q44 12 60 12 Q76 12 80 26 Z" />
      <rect x="78" y="17" width="40" height="4" rx="2" />
    </g>
  )
}

/** Ícone de setor: envolve um desenho em um viewBox próprio. */
export function GlyphIcon({ glyph, width, height, className = '' }: { glyph: ReactNode; width: number; height: number; className?: string }) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      {glyph}
    </svg>
  )
}

/** Cenário militar: radar de varredura, caça, drone e blindado sobre o horizonte. */
export function MilitaryArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 260" className={className} aria-hidden preserveAspectRatio="xMaxYMid slice">
      <g fill="none" stroke="currentColor" strokeOpacity=".22">
        <circle cx="390" cy="120" r="40" />
        <circle cx="390" cy="120" r="80" />
        <circle cx="390" cy="120" r="120" />
        <line x1="270" y1="120" x2="510" y2="120" />
        <line x1="390" y1="0" x2="390" y2="240" />
      </g>
      <path d="M390 120 L390 0 A120 120 0 0 1 499 50 Z" fill="currentColor" fillOpacity=".16" />
      <g color="currentColor" transform="translate(40 52) scale(1.1)" opacity=".8">
        <JetGlyph />
      </g>
      <g color="currentColor" transform="translate(268 150) scale(1.4)" opacity=".75">
        <DroneGlyph />
      </g>
      <g color="currentColor" transform="translate(70 178) scale(1.25)">
        <TankGlyph />
      </g>
      <line x1="0" y1="232" x2="520" y2="232" stroke="currentColor" strokeOpacity=".35" />
    </svg>
  )
}

/** Cenário civil: skyline, via com faixa central e nós de serviço. */
export function CivilArt({ className = '' }: { className?: string }) {
  const bars = [60, 110, 80, 150, 96, 130, 70, 120]
  return (
    <svg viewBox="0 0 520 260" className={className} aria-hidden preserveAspectRatio="xMaxYMid slice">
      <g fill="currentColor" fillOpacity=".16">
        {bars.map((h, i) => (
          <rect key={i} x={300 + i * 26} y={232 - h} width="20" height={h} rx="3" />
        ))}
      </g>
      <path d="M0 232 L520 232 L520 252 L0 252 Z" fill="currentColor" fillOpacity=".12" />
      <line x1="0" y1="242" x2="520" y2="242" stroke="currentColor" strokeOpacity=".6" strokeDasharray="14 12" strokeWidth="2" />
      <g fill="none" stroke="currentColor" strokeOpacity=".4">
        <path d="M60 200 L130 150 L200 176 L260 118" />
        <circle cx="60" cy="200" r="6" fill="currentColor" />
        <circle cx="130" cy="150" r="6" fill="currentColor" />
        <circle cx="200" cy="176" r="6" fill="currentColor" />
        <circle cx="260" cy="118" r="6" fill="currentColor" />
      </g>
    </svg>
  )
}

/** Cenário de rede: nós (clusters) e ligações, usado na Orzyon e em clientes B2B. */
export function NetworkArt({ className = '' }: { className?: string }) {
  const nodes = [
    [80, 60],
    [200, 40],
    [300, 110],
    [420, 60],
    [140, 170],
    [270, 200],
    [400, 180],
  ]
  const links = [
    [0, 1],
    [1, 2],
    [2, 3],
    [0, 4],
    [4, 5],
    [5, 2],
    [2, 6],
    [6, 3],
  ]
  return (
    <svg viewBox="0 0 520 260" className={className} aria-hidden preserveAspectRatio="xMaxYMid slice">
      <g stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5">
        {links.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
        ))}
      </g>
      <g fill="currentColor">
        {nodes.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === 2 ? 11 : 7} fillOpacity={i === 2 ? 0.9 : 0.55} />
        ))}
      </g>
    </svg>
  )
}
