import type { Pagina } from './idiomas';

export interface MetaPagina {
  titulo: string;
  descricao: string;
}

export interface CartaoSimples {
  titulo: string;
  texto: string;
}

export interface CartaoComLink extends CartaoSimples {
  rotulo: string;
  pagina: Pagina;
}

export interface BlocoCta {
  titulo: string;
  texto: string;
  botao: string;
}

export interface ConteudoSite {
  nav: {
    consultoria: string;
    servicos: string;
    produtos: string;
    pesquisa: string;
    noticias: string;
    contato: string;
    abrirMenu: string;
    principalAria: string;
    idiomaAria: string;
    inicioAria: string;
    pularConteudo: string;
  };

  home: {
    eyebrow: string;
    tituloInicio: string;
    tituloDestaque: string;
    lede: string;
    ctaPrimario: string;
    ctaSecundario: string;
    setoresAria: string;
    setoresLista: string[];
    oQueFazemos: { eyebrow: string; titulo: string; pilares: CartaoComLink[] };
    setores: { eyebrow: string; titulo: string; itens: CartaoSimples[] };
    experiencia: { eyebrow: string; titulo: string; nota: string; itens: CartaoSimples[] };
    extra: { eyebrow: string; titulo: string; cartoes: CartaoComLink[] };
    cta: BlocoCta;
  };

  consultoria: {
    eyebrow: string;
    titulo: string;
    lede: string;
    frentes: CartaoSimples[];
    siteDedicado: { texto: string; botao: string };
    cta: BlocoCta;
  };

  servicos: {
    eyebrow: string;
    titulo: string;
    lede: string;
    itens: CartaoSimples[];
    cta: BlocoCta;
  };

  produtos: {
    eyebrow: string;
    titulo: string;
    lede: string;
    itens: { nome: string; categoria: string; texto: string }[];
    nota: string;
    cta: BlocoCta;
  };

  pesquisa: {
    eyebrow: string;
    titulo: string;
    lede: string;
    linhas: CartaoSimples[];
    nota: string;
    cta: BlocoCta;
  };

  noticias: {
    eyebrow: string;
    titulo: string;
    lede: string;
    itens: { data: string; titulo: string; resumo: string }[];
    nota: string;
    notaLink: string;
  };

  contato: {
    eyebrow: string;
    titulo: string;
    lede: string;
    email: { titulo: string; texto: string };
    linkedin: { titulo: string; texto: string; rotulo: string };
    base: { titulo: string; linha1: string; linha2: string };
    briefing: { eyebrow: string; titulo: string; itens: string[] };
  };

  footer: {
    tagline: string;
    navegacao: string;
    navegacaoAria: string;
    contato: string;
    inicio: string;
    lugar: string;
    direitos: string;
  };

  meta: Record<Pagina, MetaPagina>;
}
