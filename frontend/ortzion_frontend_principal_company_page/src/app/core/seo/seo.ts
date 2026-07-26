import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { ConteudoService } from '../i18n/conteudo-service';
import type { MetaPagina } from '../i18n/conteudo';
import { IDIOMAS, IDIOMA_PADRAO, URL_BASE } from '../i18n/idiomas';
import type { Idioma, Pagina } from '../i18n/idiomas';

/**
 * Aplica, por página: <title>, meta description, Open Graph,
 * <html lang>, canonical e alternates hreflang (pt/en/es + x-default).
 * Roda também no prerender — as tags saem no HTML estático.
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly doc = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly conteudo = inject(ConteudoService);

  aplicar(idioma: Idioma, pagina: Pagina, metaPagina: MetaPagina): void {
    const urlCanonica = URL_BASE + this.conteudo.linkPara(pagina, idioma);

    this.title.setTitle(metaPagina.titulo);
    this.meta.updateTag({ name: 'description', content: metaPagina.descricao });
    this.meta.updateTag({ property: 'og:title', content: metaPagina.titulo });
    this.meta.updateTag({ property: 'og:description', content: metaPagina.descricao });
    this.meta.updateTag({ property: 'og:url', content: urlCanonica });
    this.meta.updateTag({ property: 'og:locale', content: LOCALES[idioma] });

    this.doc.documentElement.lang = idioma;

    this.definirLink('canonical', urlCanonica);
    for (const alternativo of IDIOMAS) {
      this.definirLink('alternate', URL_BASE + this.conteudo.linkPara(pagina, alternativo), alternativo);
    }
    this.definirLink('alternate', URL_BASE + this.conteudo.linkPara(pagina, IDIOMA_PADRAO), 'x-default');
  }

  private definirLink(rel: string, href: string, hreflang?: string): void {
    const seletor = hreflang
      ? `link[rel="${rel}"][hreflang="${hreflang}"]`
      : `link[rel="${rel}"]`;

    let link = this.doc.head.querySelector<HTMLLinkElement>(seletor);
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', rel);
      if (hreflang) {
        link.setAttribute('hreflang', hreflang);
      }
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}

const LOCALES: Record<Idioma, string> = {
  pt: 'pt_BR',
  en: 'en_US',
  es: 'es_ES',
};
