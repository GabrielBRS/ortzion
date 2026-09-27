import { useEffect } from 'react';

import { useConteudo } from '../i18n/ConteudoContext';
import type { Pagina } from '../i18n/idiomas';
import { aplicarSeo } from './seo';

/**
 * Cada página declara quem é; quando o dicionário do idioma está
 * carregado, registra a página atual e aplica o SEO completo da rota.
 */
export function usePagina(pagina: Pagina): void {
  const { idioma, conteudo } = useConteudo();

  useEffect(() => {
    if (conteudo) {
      aplicarSeo(idioma, pagina, conteudo.meta[pagina]);
    }
  }, [idioma, pagina, conteudo]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pagina, idioma]);
}
