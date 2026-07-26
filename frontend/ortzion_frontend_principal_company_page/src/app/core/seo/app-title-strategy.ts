import { Injectable, inject } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { ConteudoService } from '../i18n/conteudo-service';
import type { Idioma, Pagina } from '../i18n/idiomas';
import { Seo } from './seo';

/**
 * A cada navegação (o resolver do idioma já carregou o dicionário),
 * registra a página atual e aplica o SEO completo daquela rota.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly conteudo = inject(ConteudoService);
  private readonly seo = inject(Seo);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route = snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }

    const idioma = route.data['idioma'] as Idioma | undefined;
    const pagina = route.data['pagina'] as Pagina | undefined;
    const conteudo = this.conteudo.conteudo();

    if (!idioma || !pagina || !conteudo) {
      return;
    }

    this.conteudo.definirPagina(pagina);
    this.seo.aplicar(idioma, pagina, conteudo.meta[pagina]);
  }
}
