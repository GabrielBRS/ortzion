/**
 * Emblema da Orzyon — versão vetorial da logo oficial:
 * espada-T em um anel segmentado, com trilhas de circuito.
 * A estrutura herda `currentColor`; a gema e os nós usam o azul de acento.
 */
export function Emblema({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      {/* anel segmentado (4 arcos) */}
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round">
        <path d="M 89.6 44.4 A 40 40 0 0 0 55.6 10.4" />
        <path d="M 44.4 10.4 A 40 40 0 0 0 10.4 44.4" />
        <path d="M 10.4 55.6 A 40 40 0 0 0 44.4 89.6" />
        <path d="M 55.6 89.6 A 40 40 0 0 0 89.6 55.6" />
      </g>

      {/* espada-T */}
      <path
        fill="currentColor"
        d="M 22 31 H 78 L 70.5 41.5 H 55.5 V 68 L 50 82 L 44.5 68 V 41.5 H 29.5 Z"
      />

      {/* gema no topo */}
      <path
        fill="var(--color-accent, #3b82f6)"
        d="M 50 8 L 54 12.5 V 23 L 50 27.5 L 46 23 V 12.5 Z"
      />

      {/* trilhas de circuito */}
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <path d="M 44.5 50 H 35 L 30 45 H 23" />
        <path d="M 44.5 58 H 32 L 27 63 H 21" />
        <path d="M 55.5 50 H 65 L 70 45 H 77" />
        <path d="M 55.5 58 H 68 L 73 63 H 79" />
      </g>
      <g fill="var(--color-accent, #3b82f6)">
        <circle cx="20.5" cy="45" r="3" />
        <circle cx="18.5" cy="63" r="3" />
        <circle cx="79.5" cy="45" r="3" />
        <circle cx="81.5" cy="63" r="3" />
      </g>
    </svg>
  );
}
