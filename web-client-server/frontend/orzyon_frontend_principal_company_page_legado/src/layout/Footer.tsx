import { Link } from 'react-router-dom';

import { DESTINOS } from '../config/destinos';
import { useConteudo } from '../i18n/ConteudoContext';
import { PORTAL_COPY } from '../i18n/portal';
import './footer.css';

export function Footer() {
  const { conteudo: t, idioma, linkPara } = useConteudo();
  const year = new Date().getFullYear();

  if (!t) {
    return null;
  }

  const copy = PORTAL_COPY[idioma];

  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand">
          <Link className="footer-brand__identity" to={linkPara('home')} aria-label={t.nav.inicioAria}>
            <img src="/orzyon-symbol.svg" alt="" aria-hidden="true" />
            <span>
              <strong>ORZYON</strong>
              <small>AI SYSTEMS ENGINEERING</small>
            </span>
          </Link>
          <p>{copy.footer.tagline}</p>
          <Link className="footer-platform-link" to={linkPara('entrar')}>
            {copy.footer.platform}<span aria-hidden="true">→</span>
          </Link>
        </div>

        <nav className="footer-col" aria-label={copy.footer.ecosystem}>
          <p className="footer-heading">{copy.footer.ecosystem}</p>
          <Link to={linkPara('produtos')}>{copy.nav.products}</Link>
          <a href={DESTINOS.smartFinance}>SmartFinance <span aria-hidden="true">↗</span></a>
          <a href={DESTINOS.maisClinical}>MaisClinical <span aria-hidden="true">↗</span></a>
          <Link to={linkPara('entrar')}>{copy.nav.login} <span aria-hidden="true">→</span></Link>
        </nav>

        <nav className="footer-col" aria-label={copy.footer.company}>
          <p className="footer-heading">{copy.footer.company}</p>
          <Link to={linkPara('tecnologia')}>{copy.nav.technology}</Link>
          <Link to={linkPara('pesquisa')}>{copy.nav.research}</Link>
          <Link to={linkPara('servicos')}>{copy.nav.engineering}</Link>
          <Link to={linkPara('consultoria')}>{copy.nav.consulting}</Link>
          <Link to={linkPara('noticias')}>{copy.nav.news}</Link>
          <Link to={linkPara('contato')}>{copy.nav.contact}</Link>
        </nav>

        <div className="footer-col">
          <p className="footer-heading">{copy.footer.contact}</p>
          <a href={DESTINOS.email}>gabriel.sousa&#64;orzyon.ai</a>
          <a href={DESTINOS.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
          <p className="footer-place">{t.footer.lugar}</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom__inner">
          <p>© {year} {t.footer.direitos}</p>
          <p><i aria-hidden="true" />AI SYSTEMS / ROBOTICS / COMPUTE</p>
        </div>
      </div>
    </footer>
  );
}
