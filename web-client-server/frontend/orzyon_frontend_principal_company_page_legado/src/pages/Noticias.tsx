import { Link } from 'react-router-dom';

import { NewsCard } from '../components/NewsCard';
import { useConteudo } from '../i18n/ConteudoContext';
import { PORTAL_COPY } from '../i18n/portal';
import { usePagina } from '../seo/usePagina';
import './home.css';

export default function Noticias() {
  const { conteudo: t, idioma, linkPara } = useConteudo();
  const copy = PORTAL_COPY[idioma];
  usePagina('noticias');

  if (!t) {
    return null;
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">{t.noticias.eyebrow}</p>
          <h1>{t.noticias.titulo}</h1>
          <p className="lede">{t.noticias.lede}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="news-grid">
            {t.noticias.itens.map(item => (
              <NewsCard key={item.titulo} item={item} linkPara={linkPara} externalLabel={copy.ecosystem.externalLabel} />
            ))}
          </div>
          <p className="note-confidencial">
            {t.noticias.nota}{' '}
            <Link to={linkPara('contato')} className="link-arrow">{t.noticias.notaLink}</Link>
          </p>
        </div>
      </section>
    </>
  );
}
