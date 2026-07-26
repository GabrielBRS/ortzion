export type Idioma = 'pt' | 'en' | 'es';

export type Pagina =
  | 'home'
  | 'consultoria'
  | 'servicos'
  | 'produtos'
  | 'pesquisa'
  | 'noticias'
  | 'contato';

export const IDIOMAS: readonly Idioma[] = ['pt', 'en', 'es'];

export const IDIOMA_PADRAO: Idioma = 'pt';

/** Slugs traduzidos por idioma — todos ASCII, sem acentos. */
export const SLUGS: Record<Idioma, Record<Pagina, string>> = {
  pt: {
    home: '',
    consultoria: 'consultoria',
    servicos: 'servicos',
    produtos: 'produtos',
    pesquisa: 'pesquisa',
    noticias: 'noticias',
    contato: 'contato',
  },
  en: {
    home: '',
    consultoria: 'consulting',
    servicos: 'services',
    produtos: 'products',
    pesquisa: 'research',
    noticias: 'news',
    contato: 'contact',
  },
  es: {
    home: '',
    consultoria: 'consultoria',
    servicos: 'servicios',
    produtos: 'productos',
    pesquisa: 'investigacion',
    noticias: 'noticias',
    contato: 'contacto',
  },
};

export const URL_BASE = 'https://ortzion.com';

// TODO: apontar para o endereço real do site da consultoria quando ele for ao ar
export const URL_SITE_CONSULTORIA = 'https://consultoria.ortzion.com';
