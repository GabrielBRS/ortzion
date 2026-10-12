import type { MetaPagina } from '../i18n/conteudo';
import { IDIOMAS, IDIOMA_PADRAO, SLUGS, URL_BASE } from '../i18n/idiomas';
import type { Idioma, Pagina } from '../i18n/idiomas';

const LOCALES: Record<Idioma, string> = {
  pt: 'pt_BR',
  en: 'en_US',
  es: 'es_ES',
};

function linkPara(pagina: Pagina, idioma: Idioma): string {
  const slug = SLUGS[idioma][pagina];
  return slug ? `/${idioma}/${slug}` : `/${idioma}`;
}

/**
 * Aplica, por página: <title>, meta description, Open Graph,
 * <html lang>, canonical e alternates hreflang (pt/en/es + x-default).
 */
export function aplicarSeo(idioma: Idioma, pagina: Pagina, meta: MetaPagina): void {
  const urlCanonica = URL_BASE + linkPara(pagina, idioma);
  const paginaPrivada = pagina === 'entrar' || pagina === 'cadastro' || pagina === 'recuperarSenha';

  document.title = meta.titulo;
  definirMeta('name', 'description', meta.descricao);
  definirMeta('property', 'og:title', meta.titulo);
  definirMeta('property', 'og:description', meta.descricao);
  definirMeta('property', 'og:url', urlCanonica);
  definirMeta('property', 'og:locale', LOCALES[idioma]);
  definirMeta('name', 'twitter:title', meta.titulo);
  definirMeta('name', 'twitter:description', meta.descricao);
  definirMeta('name', 'robots', paginaPrivada ? 'noindex,follow' : 'index,follow');

  document.documentElement.lang = idioma;

  definirLink('canonical', urlCanonica);
  for (const alternativo of IDIOMAS) {
    definirLink('alternate', URL_BASE + linkPara(pagina, alternativo), alternativo);
  }
  definirLink('alternate', URL_BASE + linkPara(pagina, IDIOMA_PADRAO), 'x-default');
}

function definirMeta(atributo: 'name' | 'property', chave: string, valor: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${atributo}="${chave}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(atributo, chave);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', valor);
}

function definirLink(rel: string, href: string, hreflang?: string): void {
  const seletor = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;

  let link = document.head.querySelector<HTMLLinkElement>(seletor);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    if (hreflang) {
      link.setAttribute('hreflang', hreflang);
    }
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}
