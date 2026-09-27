import { Link } from 'react-router-dom';

import { useConteudo } from '../i18n/ConteudoContext';
import { usePagina } from '../seo/usePagina';

export default function Pesquisa() {
  const { conteudo: t, linkPara } = useConteudo();
  usePagina('pesquisa');

  if (!t) {
    return null;
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">{t.pesquisa.eyebrow}</p>
          <h1>{t.pesquisa.titulo}</h1>
          <p className="lede">{t.pesquisa.lede}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-2">
            {t.pesquisa.linhas.map(linha => (
              <article className="card" key={linha.titulo}>
                <h3>{linha.titulo}</h3>
                <p>{linha.texto}</p>
              </article>
            ))}
          </div>
          <p className="note-confidencial">{t.pesquisa.nota}</p>
        </div>
      </section>

      <section className="section">
        <div className="container cta-band">
          <h2>{t.pesquisa.cta.titulo}</h2>
          <p>{t.pesquisa.cta.texto}</p>
          <Link to={linkPara('contato')} className="btn btn-solid">{t.pesquisa.cta.botao}</Link>
        </div>
      </section>
    </>
  );
}
