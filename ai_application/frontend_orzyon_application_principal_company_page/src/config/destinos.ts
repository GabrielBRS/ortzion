const destino = (variavel: string | undefined, fallback: string): string => variavel?.trim() || fallback;

/**
 * Destinos externos do ecossistema ORZYON. Os fallbacks seguem a convenção
 * de subdomínios e podem ser substituídos no deploy sem espalhar URLs pelo site.
 */
export const DESTINOS = {
  aiCloud: 'https://cloud.orzyon.ai/',
  consultoria: 'https://consultancy.orzyon.ai/',
  plataforma: destino(import.meta.env.VITE_URL_PLATAFORMA, 'https://app.orzyon.com'),
  smartFinance: destino(import.meta.env.VITE_URL_SMARTFINANCE, 'https://oaifs.orzyon.ai/'),
  maisClinical: destino(import.meta.env.VITE_URL_MAISCLINICAL, 'https://oaims.orzyon.ai/'),
  linkedin: 'https://www.linkedin.com/company/orzyon-technology',
  email: 'mailto:gabriel.sousa@orzyon.ai',
} as const;
