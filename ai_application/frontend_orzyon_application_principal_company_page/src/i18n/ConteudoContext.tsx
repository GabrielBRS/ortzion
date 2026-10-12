import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import type { ConteudoSite } from './conteudo';
import { SLUGS } from './idiomas';
import type { Idioma, Pagina } from './idiomas';

/**
 * Estado de idioma/página e dicionário ativo.
 * Cada dicionário é um chunk próprio, carregado sob demanda
 * quando a árvore de rotas do idioma é montada.
 */
interface ConteudoContexto {
  idioma: Idioma;
  pagina: Pagina;
  conteudo: ConteudoSite | null;
  /** Caminho absoluto de uma página em um idioma (padrão: o idioma atual). */
  linkPara: (pagina: Pagina, idioma?: Idioma) => string;
}

const Contexto = createContext<ConteudoContexto | null>(null);

const cache = new Map<Idioma, ConteudoSite>();

interface ConteudoCarregado {
  idioma: Idioma;
  conteudo: ConteudoSite;
}

interface FalhaDeConteudo {
  idioma: Idioma;
  erro: Error;
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

function paginaPeloCaminho(idioma: Idioma, pathname: string): Pagina {
  const caminhoSemIdioma = pathname
    .replace(new RegExp(`^/${idioma}/?`), '')
    .replace(/\/$/, '');
  const slugAtual = caminhoSemIdioma.split('/')[0] ?? '';
  const paginas = Object.entries(SLUGS[idioma]) as [Pagina, string][];

  return paginas.find(([, slug]) => slug === slugAtual)?.[0] ?? 'home';
}

export function ConteudoProvider({ idioma, children }: { idioma: Idioma; children: ReactNode }) {
  const [carregado, setCarregado] = useState<ConteudoCarregado | null>(() => {
    const conteudoEmCache = cache.get(idioma);
    return conteudoEmCache ? { idioma, conteudo: conteudoEmCache } : null;
  });
  const [falha, setFalha] = useState<FalhaDeConteudo | null>(null);
  const location = useLocation();
  const pagina = paginaPeloCaminho(idioma, location.pathname);

  useEffect(() => {
    setFalha(null);
    const emCache = cache.get(idioma);
    if (emCache) {
      setCarregado({ idioma, conteudo: emCache });
      return;
    }
    let ativo = true;
    importarConteudo(idioma)
      .then(dicionario => {
        cache.set(idioma, dicionario);
        if (ativo) {
          setCarregado({ idioma, conteudo: dicionario });
        }
      })
      .catch(causa => {
        if (ativo) {
          const erro = causa instanceof Error ? causa : new Error('Não foi possível carregar o conteúdo.');
          setFalha({ idioma, erro });
        }
      });
    return () => {
      ativo = false;
    };
  }, [idioma]);

  if (falha?.idioma === idioma) {
    throw falha.erro;
  }

  const conteudoEmCache = cache.get(idioma);
  const conteudo = conteudoEmCache ?? (carregado?.idioma === idioma ? carregado.conteudo : null);

  const valor: ConteudoContexto = {
    idioma,
    pagina,
    conteudo,
    linkPara: (pagina, idm = idioma) => {
      const slug = SLUGS[idm][pagina];
      return slug ? `/${idm}/${slug}` : `/${idm}`;
    },
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useConteudo(): ConteudoContexto {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error('useConteudo deve ser usado dentro de <ConteudoProvider>');
  }
  return contexto;
}
