import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { useConteudo } from '../i18n/ConteudoContext';
import { IDIOMAS } from '../i18n/idiomas';
import type { Pagina } from '../i18n/idiomas';
import { PORTAL_COPY } from '../i18n/portal';
import './header.css';

export function Header() {
  const { conteudo: t, idioma, pagina, linkPara } = useConteudo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 18);
    const closeDesktopMenu = () => {
      if (window.innerWidth > 1280) setMenuOpen(false);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('resize', closeDesktopMenu, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateHeader);
      window.removeEventListener('resize', closeDesktopMenu);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) {
      document.body.classList.remove('nav-open');
      return;
    }

    const main = document.querySelector<HTMLElement>('main');
    const footer = document.querySelector<HTMLElement>('footer');
    const menu = document.getElementById('menu-principal');
    const menuFocusable = Array.from(
      menu?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [],
    );
    const focusable = [menuButtonRef.current, ...menuFocusable].filter(
      (element): element is HTMLElement => element !== null,
    );
    const firstFocusable = focusable[0];
    const lastFocusable = focusable.at(-1);
    const focusFrame = window.requestAnimationFrame(() => menuFocusable[0]?.focus());

    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }

      if (event.key !== 'Tab' || !firstFocusable || !lastFocusable) return;

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.body.classList.add('nav-open');
    if (main) main.inert = true;
    if (footer) footer.inert = true;
    window.addEventListener('keydown', handleKeyboard);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.classList.remove('nav-open');
      if (main) main.inert = false;
      if (footer) footer.inert = false;
      window.removeEventListener('keydown', handleKeyboard);
    };
  }, [menuOpen]);

  if (!t) {
    return <header className="site-header" />;
  }

  const copy = PORTAL_COPY[idioma];
  const links: readonly { page: Pagina; label: string }[] = [
    { page: 'produtos', label: copy.nav.products },
    { page: 'tecnologia', label: copy.nav.technology },
    { page: 'pesquisa', label: copy.nav.research },
    { page: 'servicos', label: copy.nav.engineering },
    { page: 'consultoria', label: copy.nav.consulting },
    { page: 'noticias', label: copy.nav.news },
    { page: 'contato', label: copy.nav.contact },
  ];
  const closeMenu = (returnFocus = false) => {
    setMenuOpen(false);
    if (returnFocus) window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };
  const finishMenuNavigation = () => {
    if (!menuOpen) return;
    setMenuOpen(false);
    window.requestAnimationFrame(() => document.getElementById('conteudo')?.focus());
  };

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="container header-inner">
        <Link to={linkPara('home')} className="brand" aria-label={t.nav.inicioAria} onClick={finishMenuNavigation}>
          <img className="brand-logo" src="/orzyon-symbol.svg" alt="" aria-hidden="true" />
          <span className="brand-copy">
            <strong>ORZYON</strong>
            <small>AI SYSTEMS ENGINEERING</small>
          </span>
        </Link>

        <button
          ref={menuButtonRef}
          type="button"
          className={`menu-toggle${menuOpen ? ' is-open' : ''}`}
          onClick={() => setMenuOpen(open => !open)}
          aria-expanded={menuOpen}
          aria-controls="menu-principal"
          aria-label={menuOpen ? copy.nav.closeMenu : copy.nav.openMenu}
        >
          <span className="menu-toggle-bar" />
          <span className="menu-toggle-bar" />
        </button>

        <nav
          id="menu-principal"
          className={`site-nav${menuOpen ? ' is-open' : ''}`}
          aria-label={t.nav.principalAria}
        >
          <div className="site-nav__links">
            {links.map(({ page, label }) => (
              <NavLink
                key={page}
                to={linkPara(page)}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                onClick={finishMenuNavigation}
              >
                {label}
              </NavLink>
            ))}
          </div>

          <div className="site-nav__actions">
            <div className="lang-switch" role="group" aria-label={t.nav.idiomaAria}>
              {IDIOMAS.map(idm => (
                <Link
                  key={idm}
                  className={`lang${idm === idioma ? ' lang-ativa' : ''}`}
                  to={linkPara(pagina, idm)}
                  aria-current={idm === idioma ? 'true' : undefined}
                  onClick={finishMenuNavigation}
                >
                  {idm.toUpperCase()}
                </Link>
              ))}
            </div>

            <Link to={linkPara('entrar')} className="btn nav-login" onClick={finishMenuNavigation}>
              <span className="nav-login__dot" aria-hidden="true" />
              {copy.nav.login}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </nav>
      </div>

      {menuOpen && (
        <button
          className="menu-scrim"
          type="button"
          onClick={() => closeMenu(true)}
          aria-label={copy.nav.closeMenu}
        />
      )}
    </header>
  );
}
