import { Link } from 'react-router-dom';

import { useConteudo } from '../i18n/ConteudoContext';
import { usePagina } from '../seo/usePagina';

export default function Servicos() {
  const { conteudo: t, linkPara } = useConteudo();
  usePagina('servicos');

  if (!t) {
    return null;
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">{t.servicos.eyebrow}</p>
          <h1>{t.servicos.titulo}</h1>
          <p className="lede">{t.servicos.lede}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-2">
            {t.servicos.itens.map(servico => (
              <article className="card" key={servico.titulo}>
                <h3>{servico.titulo}</h3>
                <p>{servico.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cta-band">
          <h2>{t.servicos.cta.titulo}</h2>
          <p>{t.servicos.cta.texto}</p>
          <Link to={linkPara('contato')} className="btn btn-solid">{t.servicos.cta.botao}</Link>
        </div>
      </section>
    </>
  );
}
