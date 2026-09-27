import { Component, Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { ConteudoProvider, useConteudo } from './i18n/ConteudoContext';
import { IDIOMAS, IDIOMA_PADRAO, SLUGS } from './i18n/idiomas';
import type { Idioma } from './i18n/idiomas';
import { Footer } from './layout/Footer';
import { Header } from './layout/Header';

const Home = lazy(() => import('./pages/Home'));
const Tecnologia = lazy(() => import('./pages/Tecnologia'));
const Consultoria = lazy(() => import('./pages/Consultoria'));
const Servicos = lazy(() => import('./pages/Servicos'));
const Produtos = lazy(() => import('./pages/Produtos'));
const Pesquisa = lazy(() => import('./pages/Pesquisa'));
const Noticias = lazy(() => import('./pages/Noticias'));
const Contato = lazy(() => import('./pages/Contato'));
const Entrar = lazy(() => import('./pages/auth/Entrar'));
const Cadastro = lazy(() => import('./pages/auth/Cadastro'));
const RecuperarSenha = lazy(() => import('./pages/auth/RecuperarSenha'));

const ESTADOS_ROTA: Record<Idioma, { loading: string; error: string; retry: string }> = {
  pt: {
    loading: 'Carregando o portal',
    error: 'Não foi possível carregar esta página.',
    retry: 'Tentar novamente',
  },
  en: {
    loading: 'Loading the portal',
    error: 'This page could not be loaded.',
    retry: 'Try again',
  },
  es: {
    loading: 'Cargando el portal',
    error: 'No se pudo cargar esta página.',
    retry: 'Intentar de nuevo',
  },
};

class PortalErrorBoundary extends Component<
  { children: ReactNode; idioma: Idioma },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      const copy = ESTADOS_ROTA[this.props.idioma];
      return (
        <main className="route-error" role="alert">
          <span aria-hidden="true">ORZYON / SYSTEM</span>
          <h1>{copy.error}</h1>
          <button className="btn btn-solid" type="button" onClick={() => window.location.reload()}>
            {copy.retry}
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

function SkipLink() {
  const { conteudo } = useConteudo();
  return (
    <a className="skip-link" href="#conteudo">
      {conteudo?.nav.pularConteudo ?? 'Ir para o conteúdo'}
    </a>
  );
}

function RouteLoading({ idioma }: { idioma: Idioma }) {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span aria-hidden="true" />
      <strong>
        ORZYON<span className="sr-only"> — {ESTADOS_ROTA[idioma].loading}</span>
      </strong>
    </div>
  );
}

function ConteudoDoIdioma({ idioma }: { idioma: Idioma }) {
  const { conteudo } = useConteudo();

  if (!conteudo) {
    return <RouteLoading idioma={idioma} />;
  }

  return (
    <>
      <SkipLink />
      <Header />
      <main id="conteudo" tabIndex={-1}>
        <Suspense fallback={<RouteLoading idioma={idioma} />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

function LayoutIdioma({ idioma }: { idioma: Idioma }) {
  const location = useLocation();

  return (
    <PortalErrorBoundary key={`${idioma}:${location.pathname}`} idioma={idioma}>
      <ConteudoProvider key={idioma} idioma={idioma}>
        <ConteudoDoIdioma idioma={idioma} />
      </ConteudoProvider>
    </PortalErrorBoundary>
  );
}

/**
 * Uma árvore de rotas por idioma (/pt, /en, /es), com slugs traduzidos —
 * o mesmo mapa de rotas do site original.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {IDIOMAS.map(idioma => {
          const slug = SLUGS[idioma];
          return (
            <Route key={idioma} path={`/${idioma}`} element={<LayoutIdioma idioma={idioma} />}>
              <Route index element={<Home />} />
              <Route path={slug.tecnologia} element={<Tecnologia />} />
              <Route path={slug.consultoria} element={<Consultoria />} />
              <Route path={slug.servicos} element={<Servicos />} />
              <Route path={slug.produtos} element={<Produtos />} />
              <Route path={slug.pesquisa} element={<Pesquisa />} />
              <Route path={slug.noticias} element={<Noticias />} />
              <Route path={slug.contato} element={<Contato />} />
              <Route path={slug.entrar} element={<Entrar />} />
              <Route path={slug.cadastro} element={<Cadastro />} />
              <Route path={slug.recuperarSenha} element={<RecuperarSenha />} />
              <Route path="*" element={<Navigate to={`/${idioma}`} replace />} />
            </Route>
          );
        })}
        <Route path="*" element={<Navigate to={`/${IDIOMA_PADRAO}`} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
