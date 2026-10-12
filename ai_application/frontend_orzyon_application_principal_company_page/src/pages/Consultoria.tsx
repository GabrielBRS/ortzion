import { Link } from 'react-router-dom';

import { DESTINOS } from '../config/destinos';
import { useConteudo } from '../i18n/ConteudoContext';
import { PORTAL_COPY } from '../i18n/portal';
import { usePagina } from '../seo/usePagina';

export default function Consultoria() {
  const { conteudo: t, idioma, linkPara } = useConteudo();
  usePagina('consultoria');

  if (!t) {
    return null;
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">{t.consultoria.eyebrow}</p>
          <h1>{t.consultoria.titulo}</h1>
          <p className="lede">{t.consultoria.lede}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-2">
            {t.consultoria.frentes.map(frente => (
              <article className="card" key={frente.titulo}>
                <h3>{frente.titulo}</h3>
                <p>{frente.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cta-band">
          <h2>{t.consultoria.cta.titulo}</h2>
          <p>{t.consultoria.cta.texto}</p>
          <p>{t.consultoria.siteDedicado.texto}</p>
          <div className="cta-acoes">
            <Link to={linkPara('contato')} className="btn btn-solid">{t.consultoria.cta.botao}</Link>
            <a href={DESTINOS.consultoria} className="btn btn-ghost">
              {t.consultoria.siteDedicado.botao}
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> ({PORTAL_COPY[idioma].ecosystem.externalLabel})</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
