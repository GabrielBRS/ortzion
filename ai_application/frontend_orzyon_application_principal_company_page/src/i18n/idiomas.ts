export type Idioma = 'pt' | 'en' | 'es';

export type Pagina =
  | 'home'
  | 'tecnologia'
  | 'consultoria'
  | 'servicos'
  | 'produtos'
  | 'pesquisa'
  | 'noticias'
  | 'contato'
  | 'entrar'
  | 'cadastro'
  | 'recuperarSenha';

export const IDIOMAS: readonly Idioma[] = ['pt', 'en', 'es'];

export const IDIOMA_PADRAO: Idioma = 'pt';

/** Slugs traduzidos por idioma — todos ASCII, sem acentos. */
export const SLUGS: Record<Idioma, Record<Pagina, string>> = {
  pt: {
    home: '',
    tecnologia: 'tecnologia',
    consultoria: 'consultoria',
    servicos: 'servicos',
    produtos: 'produtos',
    pesquisa: 'pesquisa',
    noticias: 'noticias',
    contato: 'contato',
    entrar: 'entrar',
    cadastro: 'cadastro',
    recuperarSenha: 'recuperar-senha',
  },
  en: {
    home: '',
    tecnologia: 'technology',
    consultoria: 'consulting',
    servicos: 'services',
    produtos: 'products',
    pesquisa: 'research',
    noticias: 'news',
    contato: 'contact',
    entrar: 'sign-in',
    cadastro: 'create-account',
    recuperarSenha: 'forgot-password',
  },
  es: {
    home: '',
    tecnologia: 'tecnologia',
    consultoria: 'consultoria',
    servicos: 'servicios',
    produtos: 'productos',
    pesquisa: 'investigacion',
    noticias: 'noticias',
    contato: 'contacto',
    entrar: 'iniciar-sesion',
    cadastro: 'registro',
    recuperarSenha: 'recuperar-contrasena',
  },
};

const URL_BASE_PADRAO = 'https://orzyon.ai';

export const URL_BASE = (import.meta.env.VITE_SITE_URL || URL_BASE_PADRAO).replace(/\/$/, '');
