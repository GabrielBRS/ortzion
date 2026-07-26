import { Injectable, inject, signal } from '@angular/core';
import type { ResolveFn } from '@angular/router';

import type { ConteudoSite } from './conteudo';
import { IDIOMA_PADRAO, SLUGS } from './idiomas';
import type { Idioma, Pagina } from './idiomas';

/**
 * Estado de idioma/página e dicionário ativo.
 * Cada dicionário é um chunk próprio, carregado sob demanda
 * pelo resolver da árvore de rotas do idioma.
 */
@Injectable({ providedIn: 'root' })
export class ConteudoService {
  private readonly _idioma = signal<Idioma>(IDIOMA_PADRAO);
  private readonly _pagina = signal<Pagina>('home');
  private readonly _conteudo = signal<ConteudoSite | null>(null);

  readonly idioma = this._idioma.asReadonly();
  readonly pagina = this._pagina.asReadonly();
  readonly conteudo = this._conteudo.asReadonly();

  async carregar(idioma: Idioma): Promise<void> {
    if (this._idioma() === idioma && this._conteudo() !== null) {
      return;
    }
    const conteudo = await importarConteudo(idioma);
    this._idioma.set(idioma);
    this._conteudo.set(conteudo);
  }

  definirPagina(pagina: Pagina): void {
    this._pagina.set(pagina);
  }

  /** Caminho absoluto de uma página em um idioma (padrão: o idioma atual). */
  linkPara(pagina: Pagina, idioma: Idioma = this._idioma()): string {
    const slug = SLUGS[idioma][pagina];
    return slug ? `/${idioma}/${slug}` : `/${idioma}`;
  }
}

function importarConteudo(idioma: Idioma): Promise<ConteudoSite> {
  switch (idioma) {
    case 'en':
      return import('./conteudo-en').then(m => m.CONTEUDO_EN);
    case 'es':
      return import('./conteudo-es').then(m => m.CONTEUDO_ES);
    default:
      return import('./conteudo-pt').then(m => m.CONTEUDO_PT);
  }
}

export const conteudoResolver: ResolveFn<void> = route =>
  inject(ConteudoService).carregar(route.data['idioma'] as Idioma);
