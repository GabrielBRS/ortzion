import type { ConteudoSite } from './conteudo';

export const CONTEUDO_PT: ConteudoSite = {
  nav: {
    consultoria: 'Consultoria',
    servicos: 'Engenharia',
    produtos: 'Produtos',
    pesquisa: 'Pesquisa',
    noticias: 'Notícias',
    contato: 'Contate-nos',
    abrirMenu: 'Abrir ou fechar o menu',
    principalAria: 'Navegação principal',
    idiomaAria: 'Idioma',
    inicioAria: 'Orzyon Technology — página inicial',
    pularConteudo: 'Ir para o conteúdo',
  },

  home: {
    eyebrow: 'Sovereign-by-Design',
    tituloInicio: 'Engenharia de IA e plataformas críticas com ',
    tituloDestaque: 'soberania de dados',
    lede:
      'A Orzyon projeta, constrói e opera sistemas de inteligência artificial e infraestrutura on-premise para setores regulados — onde controle, segurança e desempenho não são negociáveis.',
    ctaPrimario: 'Fale conosco',
    ctaSecundario: 'Ver serviços',
    setoresAria: 'Setores atendidos',
    setoresLista: ['GovTech', 'Defesa', 'FinTech', 'HealthTech'],
    oQueFazemos: {
      eyebrow: 'O que fazemos',
      titulo: 'Da decisão de arquitetura à operação',
      pilares: [
        {
          titulo: 'Consultoria',
          texto:
            'Arquitetura de soluções e de IA, assessments independentes e estratégia de adoção de LLMs em infraestrutura própria.',
          rotulo: 'Ver consultoria',
          pagina: 'consultoria',
        },
        {
          titulo: 'Serviços',
          texto:
            'Engenharia de software por camada de performance, plataformas de dados, MLOps/LLMOps e squads dedicados.',
          rotulo: 'Ver serviços',
          pagina: 'servicos',
        },
        {
          titulo: 'Produtos',
          texto:
            'Soluções próprias, construídas sobre a mesma plataforma soberana que projetamos para clientes.',
          rotulo: 'Ver produtos',
          pagina: 'produtos',
        },
      ],
    },
    setores: {
      eyebrow: 'Setores',
      titulo: 'Onde a soberania importa',
      itens: [
        {
          titulo: 'GovTech',
          texto: 'Plataformas digitais para o setor público, com conformidade e soberania desde o desenho.',
        },
        {
          titulo: 'Defesa',
          texto: 'Sistemas de missão crítica com segurança por projeto e operação em ambiente controlado.',
        },
        {
          titulo: 'FinTech',
          texto: 'IA e dados para instituições financeiras reguladas, do RAG ao caminho crítico.',
        },
        {
          titulo: 'HealthTech',
          texto: 'Tecnologia clínica com privacidade, rastreabilidade e conformidade em saúde.',
        },
      ],
    },
    experiencia: {
      eyebrow: 'Experiência',
      titulo: 'Resultados em produção',
      nota:
        'Por confidencialidade, os cases são descritos sem identificação dos clientes. Referências detalhadas sob solicitação.',
      itens: [
        {
          titulo: 'Telecom · agentes de IA em produção',
          texto:
            'Orquestração de agentes de IA para atendimento e vendas por voz em operadora tier-1, operando em escala.',
        },
        {
          titulo: 'Financeiro · IA generativa e RAG',
          texto:
            'Plataformas de IA generativa com recuperação sobre dados proprietários no setor financeiro.',
        },
        {
          titulo: 'Infraestrutura · self-hosted de ponta a ponta',
          texto:
            'Kubernetes, observabilidade e inferência de ML em GPU própria — sem dependência de nuvem pública.',
        },
      ],
    },
    extra: {
      eyebrow: 'Além dos projetos',
      titulo: 'Pesquisa aplicada e novidades',
      cartoes: [
        {
          titulo: 'Ciência & Pesquisa',
          texto: 'As linhas de investigação em IA que sustentam nossos serviços e produtos.',
          rotulo: 'Ver pesquisa',
          pagina: 'pesquisa',
        },
        {
          titulo: 'Notícias',
          texto: 'Anúncios, lançamentos e bastidores do que estamos construindo.',
          rotulo: 'Ver notícias',
          pagina: 'noticias',
        },
      ],
    },
    cta: {
      titulo: 'Vamos falar sobre o seu próximo sistema crítico?',
      texto: 'Conte o contexto — respondemos com um caminho técnico claro.',
      botao: 'Contate-nos',
    },
  },

  consultoria: {
    eyebrow: 'Consultoria',
    titulo: 'Decisões de arquitetura bem fundamentadas',
    lede:
      'A camada de decisão: avaliamos o contexto, desenhamos a solução e documentamos o porquê — antes de qualquer linha de código em produção.',
    frentes: [
      {
        titulo: 'Arquitetura de soluções e de IA',
        texto:
          'Desenho de sistemas distribuídos, plataformas de dados e arquiteturas de IA generativa — do gateway à inferência — com decisões documentadas e justificadas.',
      },
      {
        titulo: 'Assessment técnico',
        texto:
          'Avaliação independente de plataformas, código e infraestrutura: segurança, desempenho, custo e prontidão para escala.',
      },
      {
        titulo: 'Estratégia de LLMs self-hosted',
        texto:
          'Adoção de modelos de linguagem em infraestrutura própria: seleção de modelos, hardware, servidores de inferência e guardrails.',
      },
      {
        titulo: 'Provas de conceito',
        texto:
          'PoCs curtas e mensuráveis para validar hipóteses de IA antes do investimento em produção.',
      },
      {
        titulo: 'Governança e soberania de dados',
        texto:
          'Políticas, topologia e controles para manter dados sensíveis sob jurisdição e infraestrutura próprias — LGPD e requisitos setoriais.',
      },
    ],
    siteDedicado: {
      texto: 'A consultoria pode ser contratada dentro da plataforma ORZYON, junto aos produtos e serviços do ecossistema.',
      botao: 'Contratar consultoria na plataforma',
    },
    cta: {
      titulo: 'Precisa de uma decisão bem fundamentada?',
      texto: 'Traga o problema — devolvemos arquitetura, riscos e um plano de execução.',
      botao: 'Fale conosco',
    },
  },

  servicos: {
    eyebrow: 'Engenharia',
    titulo: 'Engenharia que sustenta produção',
    lede:
      'A camada de execução: construímos, integramos e operamos — com a stack certa em cada camada e desempenho como requisito, não como otimização tardia.',
    itens: [
      {
        titulo: 'Engenharia por camada de performance',
        texto:
          'Rust para sistemas críticos, Mojo e Python na inteligência e orquestração, e Zig em infraestrutura e ferramentas de baixo nível. Esse é o conjunto oficial de linguagens com suporte ORZYON.',
      },
      {
        titulo: 'Plataformas de dados',
        texto:
          'Bancos relacionais, vetoriais, cache e mensageria — projetados, operados e monitorados em infraestrutura própria.',
      },
      {
        titulo: 'MLOps e LLMOps',
        texto:
          'Do versionamento de modelos à inferência de alto desempenho em GPU, com observabilidade e avaliação contínua.',
      },
      {
        titulo: 'Integração e sustentação',
        texto:
          'Evolução e operação de sistemas existentes com SLOs claros, observabilidade e resposta a incidentes.',
      },
      {
        titulo: 'Squads dedicados',
        texto:
          'Times de engenharia sênior alocados por resultado, sob a liderança técnica da Orzyon.',
      },
    ],
    cta: {
      titulo: 'Tem um sistema para construir ou escalar?',
      texto: 'Do primeiro commit ao SLO em produção.',
      botao: 'Fale conosco',
    },
  },

  produtos: {
    eyebrow: 'Produtos',
    titulo: 'Soluções próprias, soberania de série',
    lede:
      'Produtos construídos sobre a mesma plataforma que projetamos para clientes — feitos para rodar na sua infraestrutura, não na nossa.',
    itens: [
      {
        nome: 'SmartFinance',
        categoria: 'FinTech · IA multiagente',
        texto:
          'Plataforma de agentes de IA para o setor financeiro: análise, atendimento e automação com RAG sobre dados proprietários — operando inteiramente na infraestrutura do cliente.',
      },
      {
        nome: 'MaisClinical',
        categoria: 'HealthTech · Fluxo clínico',
        texto:
          'Triagem e fluxo clínico assistidos por IA, projetados para privacidade, rastreabilidade e conformidade em saúde.',
      },
    ],
    nota: 'Roadmap e demonstrações sob solicitação.',
    cta: {
      titulo: 'Quer ver um produto de perto?',
      texto: 'Agendamos uma demonstração no seu contexto.',
      botao: 'Fale conosco',
    },
  },

  pesquisa: {
    eyebrow: 'Ciência & Pesquisa',
    titulo: 'Pesquisa aplicada, feita em produção',
    lede:
      'Não pesquisamos em abstrato: cada linha de investigação nasce de problemas reais de clientes e volta para os nossos serviços e produtos.',
    linhas: [
      {
        titulo: 'Sistemas multiagente',
        texto: 'Coordenação, memória e avaliação de agentes de IA operando em fluxos críticos de negócio.',
      },
      {
        titulo: 'RAG soberano',
        texto:
          'Recuperação e geração sobre dados proprietários, inteiramente on-premise, com métricas de qualidade e rastreabilidade.',
      },
      {
        titulo: 'Inferência eficiente',
        texto: 'Quantização, batching e otimização de serving para extrair o máximo de GPU própria.',
      },
      {
        titulo: 'IA de voz em tempo real',
        texto: 'Agentes de voz com latência de conversação natural, do reconhecimento à síntese.',
      },
    ],
    nota: 'Notas técnicas e publicações serão divulgadas nesta página.',
    cta: {
      titulo: 'Tem um problema de fronteira no seu setor?',
      texto: 'Pesquisa em parceria, com propriedade intelectual e dados sob o seu controle.',
      botao: 'Fale conosco',
    },
  },

  noticias: {
    eyebrow: 'Notícias',
    titulo: 'Novidades da Orzyon',
    lede: 'Anúncios, lançamentos e bastidores do que estamos construindo.',
    itens: [
      {
        data: 'Ecossistema',
        titulo: 'Um portal para todo o ecossistema ORZYON',
        resumo:
          'Produtos, consultoria, acesso à plataforma e novidades agora partem de uma única porta de entrada.',
        rotulo: 'Conhecer o ecossistema',
        destino: { tipo: 'pagina', pagina: 'produtos' },
      },
      {
        data: 'ORZYON Financial',
        titulo: 'SmartFinance: inteligência conectada à operação financeira',
        resumo:
          'Conheça a plataforma de IA multiagente para análise, atendimento e automação financeira.',
        rotulo: 'Visitar SmartFinance',
        destino: { tipo: 'produto', produto: 'smartFinance' },
      },
      {
        data: 'ORZYON Health',
        titulo: 'MaisClinical: inteligência para a jornada clínica',
        resumo:
          'Uma experiência de saúde com suporte à triagem, privacidade e rastreabilidade desde a arquitetura.',
        rotulo: 'Visitar MaisClinical',
        destino: { tipo: 'produto', produto: 'maisClinical' },
      },
    ],
    nota: 'Quer receber as novidades em primeira mão?',
    notaLink: 'Contate-nos',
  },

  contato: {
    eyebrow: 'Contate-nos',
    titulo: 'Conte o contexto do seu projeto',
    lede: 'Respondemos em até um dia útil, com os próximos passos claros.',
    email: { titulo: 'E-mail', texto: 'O canal principal para novos projetos e parcerias.' },
    linkedin: {
      titulo: 'LinkedIn',
      texto: 'Perfil profissional e atualizações da Orzyon.',
      rotulo: 'Abrir LinkedIn',
    },
    base: {
      titulo: 'Base',
      linha1: 'Brasília-DF, Brasil · GMT-3.',
      linha2: 'Atendimento remoto no Brasil e no exterior.',
    },
    briefing: {
      eyebrow: 'Briefing',
      titulo: 'O que ajuda a acelerar a conversa',
      itens: [
        'Setor e contexto regulatório do projeto.',
        'O problema e o resultado esperado.',
        'Restrições de infraestrutura — on-premise, nuvem privada ou híbrido.',
        'Prazo e ordem de grandeza de orçamento.',
      ],
    },
  },

  footer: {
    tagline:
      'Sovereign-by-Design — engenharia de IA e plataformas críticas com soberania de dados, para setores regulados.',
    navegacao: 'Navegação',
    navegacaoAria: 'Navegação do rodapé',
    contato: 'Contato',
    inicio: 'Início',
    lugar: 'Brasília-DF, Brasil · GMT-3',
    direitos: 'Orzyon Technology · CNPJ 65.268.596/0001-50 · Brasília-DF, Brasil',
  },

  meta: {
    home: {
      titulo: 'ORZYON Technology | Produtos, Plataforma de IA e Robótica',
      descricao:
        'A ORZYON desenvolve produtos de IA, agentes autônomos, visão computacional, robótica e infraestrutura de alto desempenho. Conheça o ecossistema e acesse a plataforma.',
    },
    tecnologia: {
      titulo: 'Tecnologia — ORZYON Technology',
      descricao: 'Rust, Mojo, Python e Zig: conheça as linguagens e a infraestrutura que sustentam o ecossistema ORZYON.',
    },
    consultoria: {
      titulo: 'Consultoria — Orzyon Technology',
      descricao:
        'Arquitetura de soluções e de IA, assessments técnicos, estratégia de LLMs self-hosted, provas de conceito e governança de dados.',
    },
    servicos: {
      titulo: 'Engenharia — ORZYON Technology',
      descricao:
        'Engenharia de sistemas de IA com Rust, Mojo, Python e Zig, plataformas de dados, MLOps, LLMOps, integração e sustentação.',
    },
    produtos: {
      titulo: 'Produtos e Plataforma de IA — ORZYON Technology',
      descricao:
        'Conheça o ecossistema ORZYON, visite os sites do SmartFinance e MaisClinical ou acesse diretamente a plataforma de inteligência artificial.',
    },
    pesquisa: {
      titulo: 'Ciência & Pesquisa — Orzyon Technology',
      descricao:
        'Linhas de pesquisa aplicada em IA: sistemas multiagente, RAG soberano, inferência eficiente e voz em tempo real.',
    },
    noticias: {
      titulo: 'Notícias — Orzyon Technology',
      descricao: 'Anúncios, lançamentos e novidades da Orzyon Technology.',
    },
    contato: {
      titulo: 'Contate-nos — Orzyon Technology',
      descricao:
        'Fale com a Orzyon Technology — e-mail e LinkedIn. Base em Brasília-DF, atendimento remoto no Brasil e no exterior.',
    },
    entrar: {
      titulo: 'Entrar — Plataforma ORZYON',
      descricao: 'Acesse com segurança sua conta e continue para a plataforma ORZYON.',
    },
    cadastro: {
      titulo: 'Criar conta — Plataforma ORZYON',
      descricao: 'Crie sua conta para acessar o ecossistema, produtos e serviços ORZYON.',
    },
    recuperarSenha: {
      titulo: 'Recuperar senha — Plataforma ORZYON',
      descricao: 'Solicite com segurança a recuperação de acesso à sua conta ORZYON.',
    },
  },
};
