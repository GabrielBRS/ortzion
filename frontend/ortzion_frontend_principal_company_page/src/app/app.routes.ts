import type { Route, Routes } from '@angular/router';

import { conteudoResolver } from './core/i18n/conteudo-service';
import { IDIOMA_PADRAO, SLUGS } from './core/i18n/idiomas';
import type { Idioma } from './core/i18n/idiomas';

/**
 * Uma árvore de rotas por idioma (/pt, /en, /es), com slugs traduzidos.
 * Todas as rotas são literais — o prerender (`**` em app.routes.server.ts)
 * gera HTML estático das 21 páginas.
 */
function rotasDoIdioma(idioma: Idioma): Route {
  const slug = SLUGS[idioma];

  return {
    path: idioma,
    resolve: { conteudo: conteudoResolver },
    data: { idioma },
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home/home').then(m => m.Home),
        data: { idioma, pagina: 'home' },
      },
      {
        path: slug.consultoria,
        loadComponent: () => import('./pages/consultoria/consultoria').then(m => m.Consultoria),
        data: { idioma, pagina: 'consultoria' },
      },
      {
        path: slug.servicos,
        loadComponent: () => import('./pages/servicos/servicos').then(m => m.Servicos),
        data: { idioma, pagina: 'servicos' },
      },
      {
        path: slug.produtos,
        loadComponent: () => import('./pages/produtos/produtos').then(m => m.Produtos),
        data: { idioma, pagina: 'produtos' },
      },
      {
        path: slug.pesquisa,
        loadComponent: () => import('./pages/pesquisa/pesquisa').then(m => m.Pesquisa),
        data: { idioma, pagina: 'pesquisa' },
      },
      {
        path: slug.noticias,
        loadComponent: () => import('./pages/noticias/noticias').then(m => m.Noticias),
        data: { idioma, pagina: 'noticias' },
      },
      {
        path: slug.contato,
        loadComponent: () => import('./pages/contato/contato').then(m => m.Contato),
        data: { idioma, pagina: 'contato' },
      },
      { path: '**', redirectTo: '' },
    ],
  };
}

export const routes: Routes = [
  rotasDoIdioma('pt'),
  rotasDoIdioma('en'),
  rotasDoIdioma('es'),
  { path: '', pathMatch: 'full', redirectTo: IDIOMA_PADRAO },
  { path: '**', redirectTo: IDIOMA_PADRAO },
];
