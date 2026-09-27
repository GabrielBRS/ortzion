import { Link } from 'react-router-dom';

import { DESTINOS } from '../config/destinos';
import { useConteudo } from '../i18n/ConteudoContext';
import { PORTAL_COPY } from '../i18n/portal';
import type { PortalProduct } from '../i18n/portal';
import { usePagina } from '../seo/usePagina';
import './home.css';

const URL_PRODUTO: Record<PortalProduct['key'], string> = {
  smartFinance: DESTINOS.smartFinance,
  maisClinical: DESTINOS.maisClinical,
};

export default function Produtos() {
  const { conteudo, idioma, linkPara } = useConteudo();
  const copy = PORTAL_COPY[idioma];
  usePagina('produtos');

  if (!conteudo) {
    return null;
  }

  return (
    <>
      <section className="page-hero product-directory-hero">
        <div className="container">
          <p className="eyebrow">{copy.productsPage.eyebrow}</p>
          <h1>{copy.productsPage.title}</h1>
          <p className="lede">{copy.productsPage.description}</p>
        </div>
      </section>

      <section className="section ecosystem-section">
        <div className="container">
          <h2 className="sr-only">{copy.productsPage.directoryLabel}</h2>

          <Link className="platform-gateway" to={linkPara('entrar')}>
            <div className="platform-gateway__signal" aria-hidden="true">
              <span /><span /><span />
            </div>
            <div className="platform-gateway__copy">
              <p className="platform-gateway__eyebrow">{copy.ecosystem.platformEyebrow}</p>
              <h3>{copy.ecosystem.platformTitle}</h3>
              <p>{copy.ecosystem.platformDescription}</p>
            </div>
            <div className="platform-gateway__action">
              <span>{copy.ecosystem.platformCta}</span>
              <b aria-hidden="true">→</b>
              <small>{copy.ecosystem.platformNote}</small>
            </div>
          </Link>

          <div className="product-grid">
            {copy.ecosystem.products.map(product => (
              <a className="product-card" href={URL_PRODUTO[product.key]} key={product.key}>
                <div className="product-card__topline">
                  <span className="product-card__status"><i />{product.status}</span>
                </div>
                <p className="product-card__family">{product.family}</p>
                <h3>{product.name}</h3>
                <p className="product-card__description">{product.description}</p>
                <ul className="capability-list" aria-label={product.name}>
                  {product.capabilities.map(capability => <li key={capability}>{capability}</li>)}
                </ul>
                <span className="product-card__cta">
                  {product.cta}<span className="sr-only"> ({copy.ecosystem.externalLabel})</span><b aria-hidden="true">↗</b>
                </span>
              </a>
            ))}
          </div>

          <Link className="ecosystem-consulting" to={linkPara('consultoria')}>
            <div>
              <p>{copy.ecosystem.consulting.eyebrow}</p>
              <h3>{copy.ecosystem.consulting.title}</h3>
              <p>{copy.ecosystem.consulting.description}</p>
            </div>
            <ul aria-label={copy.ecosystem.consulting.title}>
              {copy.ecosystem.consulting.capabilities.map(capability => <li key={capability}>{capability}</li>)}
            </ul>
            <span>{copy.ecosystem.consulting.cta}<b aria-hidden="true">→</b></span>
          </Link>
        </div>
      </section>

      <section className="section closing-section">
        <div className="container closing-panel">
          <div>
            <p className="eyebrow">{copy.closing.eyebrow}</p>
            <h2>{copy.closing.title}</h2>
            <p>{copy.closing.description}</p>
          </div>
          <div className="closing-panel__actions">
            <Link className="btn btn-solid btn-arrow" to={linkPara('contato')}>
              {copy.closing.contactCta}<span aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn-quiet" to={linkPara('entrar')}>{copy.closing.platformCta}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
