const NOVO_SITE = 'https://orzyon.ai/';

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m6.5 12.5 3.4 3.4L17.8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function App() {
  return (
    <main className="migration-page">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />
      <div className="grid-overlay" aria-hidden="true" />

      <nav className="topbar" aria-label="Identidade Orzyon">
        <a className="brand" href={NOVO_SITE} aria-label="Visitar o novo site da Orzyon">
          <img src="/orzyon-symbol.svg" alt="" />
          <span>ORZYON</span>
        </a>
        <span className="topbar-status">
          <i aria-hidden="true" />
          Novo endereço oficial
        </span>
      </nav>

      <section className="hero" aria-labelledby="migration-title">
        <div className="hero-copy">
          <div className="announcement">
            <span>ORTZION</span>
            <span className="announcement-line" aria-hidden="true" />
            <strong>ORZYON</strong>
          </div>

          <p className="eyebrow">Nós evoluímos</p>
          <h1 id="migration-title">
            Nosso nome mudou.
            <span> Nosso propósito, não.</span>
          </h1>
          <p className="intro">
            Você chegou ao antigo site da Ortzion. Agora somos <strong>Orzyon</strong> — uma nova identidade para a mesma visão de construir tecnologia que transforma o futuro.
          </p>

          <div className="actions">
            <a className="primary-action" href={NOVO_SITE}>
              Ir para o novo site
              <ArrowIcon />
            </a>
            <p>
              <CheckIcon />
              Link oficial e seguro
            </p>
          </div>
        </div>

        <aside className="domain-card" aria-label="Mudança de domínio">
          <div className="orbit" aria-hidden="true">
            <span className="orbit-dot" />
            <span className="orbit-ring orbit-ring-one" />
            <span className="orbit-ring orbit-ring-two" />
            <img src="/orzyon-symbol.svg" alt="" />
          </div>

          <div className="domain-transition">
            <div className="domain-old">
              <span>Endereço anterior</span>
              <s>ortzion.com</s>
            </div>
            <span className="transition-arrow" aria-hidden="true">
              <ArrowIcon />
            </span>
            <div className="domain-new">
              <span>Estamos agora em</span>
              <a href={NOVO_SITE}>orzyon.ai</a>
            </div>
          </div>
        </aside>
      </section>

      <footer>
        <p>© {new Date().getFullYear()} Orzyon Technology</p>
        <a href={NOVO_SITE}>orzyon.ai</a>
      </footer>
    </main>
  );
}
