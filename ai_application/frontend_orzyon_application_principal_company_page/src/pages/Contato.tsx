import { DESTINOS } from '../config/destinos';
import { useConteudo } from '../i18n/ConteudoContext';
import { usePagina } from '../seo/usePagina';

export default function Contato() {
  const { conteudo: t } = useConteudo();
  usePagina('contato');

  if (!t) {
    return null;
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">{t.contato.eyebrow}</p>
          <h1>{t.contato.titulo}</h1>
          <p className="lede">{t.contato.lede}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-3">
            <article className="card">
              <h3>{t.contato.email.titulo}</h3>
              <p>{t.contato.email.texto}</p>
              <a className="link-arrow" href={DESTINOS.email}>gabriel.sousa&#64;orzyon.ai</a>
            </article>
            <article className="card">
              <h3>{t.contato.linkedin.titulo}</h3>
              <p>{t.contato.linkedin.texto}</p>
              <a
                className="link-arrow"
                href={DESTINOS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.contato.linkedin.rotulo}
              </a>
            </article>
            <article className="card">
              <h3>{t.contato.base.titulo}</h3>
              <p>
                {t.contato.base.linha1}
                <br />
                {t.contato.base.linha2}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">{t.contato.briefing.eyebrow}</p>
            <h2 className="section-title">{t.contato.briefing.titulo}</h2>
          </div>
          <ul className="checklist">
            {t.contato.briefing.itens.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
