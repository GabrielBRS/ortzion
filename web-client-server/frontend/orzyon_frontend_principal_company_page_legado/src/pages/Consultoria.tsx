import { Link } from 'react-router-dom';

import { useConteudo } from '../i18n/ConteudoContext';
import { usePagina } from '../seo/usePagina';

export default function Consultoria() {
  const { conteudo: t, linkPara } = useConteudo();
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
            <Link to={linkPara('entrar')} className="btn btn-ghost">
              {t.consultoria.siteDedicado.botao}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
