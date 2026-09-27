const destino = (variavel: string | undefined, fallback: string): string => variavel?.trim() || fallback;

/**
 * Destinos externos do ecossistema ORZYON. Os fallbacks seguem a convenção
 * de subdomínios e podem ser substituídos no deploy sem espalhar URLs pelo site.
 */
export const DESTINOS = {
  plataforma: destino(import.meta.env.VITE_URL_PLATAFORMA, 'https://app.orzyon.com'),
  smartFinance: destino(import.meta.env.VITE_URL_SMARTFINANCE, 'https://smartfinance.orzyon.com'),
  maisClinical: destino(import.meta.env.VITE_URL_MAISCLINICAL, 'https://maisclinical.orzyon.com'),
  linkedin: 'https://www.linkedin.com/company/orzyon-technology',
  email: 'mailto:gabriel.sousa@orzyon.ai',
} as const;
