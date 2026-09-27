import { Link } from 'react-router-dom';

import { NewsCard } from '../components/NewsCard';
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

export default function Home() {
  const { conteudo, idioma, linkPara } = useConteudo();
  const copy = PORTAL_COPY[idioma];
  usePagina('home');

  if (!conteudo) {
    return null;
  }

  return (
    <>
      <section className="portal-hero">
        <div className="container portal-hero__grid">
          <div className="portal-hero__content">
            <p className="eyebrow portal-hero__eyebrow">{copy.hero.eyebrow}</p>
            <h1>
              <span>{copy.hero.titleLead}</span>
              <strong>{copy.hero.titleAccent}</strong>
            </h1>
            <p className="portal-hero__lede">{copy.hero.description}</p>
            <div className="portal-hero__actions">
              <Link to={linkPara('produtos')} className="btn btn-solid btn-arrow">
                {copy.hero.productsCta}<span aria-hidden="true">→</span>
              </Link>
              <Link to={linkPara('tecnologia')} className="btn btn-quiet">{copy.hero.technologyCta}</Link>
            </div>
            <Link className="portal-login-link" to={linkPara('entrar')}>
              <span className="portal-login-link__icon" aria-hidden="true">→</span>
              <span>
                <strong>{copy.nav.login}</strong>
                <small>{copy.hero.accessNote}</small>
              </span>
            </Link>
          </div>

          <figure className="portal-brand-visual">
            <div className="portal-brand-visual__media">
              <img src="/orzyon-image.png" alt="Representação visual da infraestrutura de inteligência artificial ORZYON." />
            </div>
            <figcaption>
              <span>ORZYON CORE</span>
              <span>AI SYSTEMS ENGINEERING</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="division-strip" aria-label={copy.divisionsLabel}>
        <div className="container division-strip__grid">
          {copy.divisions.map(division => (
            <article className="division-summary" key={division.index}>
              <span className="division-summary__index">{division.index}</span>
              <div>
                <h2>{division.title}</h2>
                <p>{division.capabilities.join('  ·  ')}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section ecosystem-section" id="produtos">
        <div className="container">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{copy.ecosystem.eyebrow}</p>
              <h2>{copy.ecosystem.title}</h2>
            </div>
            <p>{copy.ecosystem.description}</p>
          </div>

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

      <section className="section technology-section" id="tecnologia">
        <div className="container">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{copy.technology.eyebrow}</p>
              <h2>{copy.technology.title}</h2>
            </div>
            <div>
              <p>{copy.technology.description}</p>
              <Link className="text-link" to={linkPara('tecnologia')}>{copy.technology.cta}<span aria-hidden="true">→</span></Link>
            </div>
          </div>

          <div className="division-grid">
            {copy.divisions.map(division => (
              <article className="division-card" key={division.index}>
                <div className="division-card__number">{division.index}</div>
                <h3>{division.title}</h3>
                <p>{division.description}</p>
                <ul>
                  {division.capabilities.map(capability => <li key={capability}>{capability}</li>)}
                </ul>
              </article>
            ))}
          </div>

          <div className="engineering-stack">
            <p>{copy.technology.stackLabel}</p>
            <div>
              {copy.technology.stack.map(item => <span key={item}>{item}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="section private-ai-section">
        <div className="container private-ai-grid">
          <div className="private-ai-copy">
            <p className="eyebrow">{copy.privateAi.eyebrow}</p>
            <h2>{copy.privateAi.title}</h2>
            <p>{copy.privateAi.description}</p>
            <ul className="private-ai-capabilities">
              {copy.privateAi.capabilities.map(capability => <li key={capability}>{capability}</li>)}
            </ul>
          </div>
          <div className="compute-stack" aria-label={copy.privateAi.stackLabel}>
            <div className="compute-stack__header">
              <span>{copy.privateAi.stackLabel}</span>
              <span>ORZYON / FULL STACK</span>
            </div>
            {copy.privateAi.stack.map((layer, index) => (
              <div className="compute-layer" key={layer}>
                <span>0{index + 1}</span>
                <strong>{layer}</strong>
                <i aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section research-section">
        <div className="container">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{copy.research.eyebrow}</p>
              <h2>{copy.research.title}</h2>
            </div>
            <div>
              <p>{copy.research.description}</p>
              <Link className="text-link" to={linkPara('pesquisa')}>{copy.research.cta}<span aria-hidden="true">→</span></Link>
            </div>
          </div>
          <div className="research-grid">
            {copy.research.projects.map(project => (
              <article className="research-card" key={project.code}>
                <span>{project.code}</span>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <div className="research-card__trace" aria-hidden="true"><i /><i /><i /><i /></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section news-section">
        <div className="container">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{conteudo.noticias.eyebrow}</p>
              <h2>{conteudo.noticias.titulo}</h2>
            </div>
            <div>
              <p>{conteudo.noticias.lede}</p>
              <Link className="text-link" to={linkPara('noticias')}>{copy.nav.news}<span aria-hidden="true">→</span></Link>
            </div>
          </div>
          <div className="news-grid">
            {conteudo.noticias.itens.slice(0, 3).map(item => (
              <NewsCard key={item.titulo} item={item} linkPara={linkPara} externalLabel={copy.ecosystem.externalLabel} />
            ))}
          </div>
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
