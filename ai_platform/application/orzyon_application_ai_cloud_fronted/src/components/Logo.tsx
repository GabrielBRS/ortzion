// Wordmark provisório da Orzyon Cloud. Substitua este componente pela logo oficial
// quando ela for fornecida (ex.: <img src="/logo.svg" alt="Orzyon Cloud" />), preservando proporções.
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const lg = size === 'lg'
  return (
    <span className="inline-flex items-center gap-2" aria-label="Orzyon Cloud">
      <svg viewBox="0 0 32 32" className={lg ? 'size-9' : 'size-7'} aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0f1a22" />
        <circle cx="16" cy="16" r="8.5" fill="none" stroke="#22c3e6" strokeWidth="3" />
        <circle cx="16" cy="16" r="2.6" fill="#22c3e6" />
      </svg>
      <span className={`font-semibold tracking-tight ${lg ? 'text-2xl' : 'text-[15px]'}`}>
        Orzyon <span className="font-normal text-muted">Cloud</span>
      </span>
    </span>
  )
}
