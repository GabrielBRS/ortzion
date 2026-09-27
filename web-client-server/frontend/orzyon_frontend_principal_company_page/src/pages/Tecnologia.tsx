import { Link } from 'react-router-dom';

import { useConteudo } from '../i18n/ConteudoContext';
import { PORTAL_COPY } from '../i18n/portal';
import { TECHNOLOGY_COPY } from '../i18n/technology';
import { usePagina } from '../seo/usePagina';
import './home.css';

export default function Tecnologia() {
  const { conteudo, idioma, linkPara } = useConteudo();
  const copy = TECHNOLOGY_COPY[idioma];
  const portal = PORTAL_COPY[idioma];
  usePagina('tecnologia');

  if (!conteudo) return null;

  return (
    <>
      <section className="page-hero technology-page-hero">
        <div className="container technology-page-hero__grid">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className="lede">{copy.description}</p>
          </div>
          <div className="technology-language-rail" aria-label={portal.technology.stackLabel}>
            {portal.technology.stack.map(language => <span key={language}>{language}</span>)}
          </div>
        </div>
      </section>

      <section className="section technology-languages-section">
        <div className="container">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{copy.languagesEyebrow}</p>
              <h2>{copy.languagesTitle}</h2>
            </div>
            <p>{copy.languagesDescription}</p>
          </div>

          <div className="technology-language-grid">
            {copy.languages.map((language, index) => (
              <article className="technology-language-card" key={language.name}>
                <span aria-hidden="true">0{index + 1}</span>
                <p>{language.role}</p>
                <h3>{language.name}</h3>
                <p>{language.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section private-ai-section technology-architecture-section">
        <div className="container private-ai-grid">
          <div className="private-ai-copy">
            <p className="eyebrow">{copy.architectureEyebrow}</p>
            <h2>{copy.architectureTitle}</h2>
            <p>{copy.architectureDescription}</p>
            <ul className="private-ai-capabilities">
              {portal.privateAi.capabilities.map(capability => <li key={capability}>{capability}</li>)}
            </ul>
          </div>

          <div className="compute-stack" aria-label={portal.privateAi.stackLabel}>
            <div className="compute-stack__header">
              <span>{portal.privateAi.stackLabel}</span>
              <span>ORZYON / FULL STACK</span>
            </div>
            {portal.privateAi.stack.map((layer, index) => (
              <div className="compute-layer" key={layer}>
                <span>0{index + 1}</span>
                <strong>{layer}</strong>
                <i aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section closing-section">
        <div className="container closing-panel">
          <div>
            <p className="eyebrow">ORZYON / ENGINEERING</p>
            <h2>{portal.closing.title}</h2>
          </div>
          <p>{portal.closing.description}</p>
          <div className="closing-panel__actions">
            <Link className="btn btn-solid" to={linkPara('servicos')}>{copy.engineeringCta}</Link>
            <Link className="btn btn-quiet" to={linkPara('consultoria')}>{copy.consultingCta}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
