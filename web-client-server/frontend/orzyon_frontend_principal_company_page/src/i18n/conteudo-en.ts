import type { ConteudoSite } from './conteudo';

export const CONTEUDO_EN: ConteudoSite = {
  nav: {
    consultoria: 'Consulting',
    servicos: 'Engineering',
    produtos: 'Products',
    pesquisa: 'Research',
    noticias: 'News',
    contato: 'Contact us',
    abrirMenu: 'Open or close the menu',
    principalAria: 'Main navigation',
    idiomaAria: 'Language',
    inicioAria: 'Orzyon Technology — home',
    pularConteudo: 'Skip to content',
  },

  home: {
    eyebrow: 'Sovereign-by-Design',
    tituloInicio: 'AI engineering and critical platforms with ',
    tituloDestaque: 'data sovereignty',
    lede:
      'Orzyon designs, builds and operates artificial intelligence systems and on-premise infrastructure for regulated sectors — where control, security and performance are non-negotiable.',
    ctaPrimario: 'Talk to us',
    ctaSecundario: 'See services',
    setoresAria: 'Sectors we serve',
    setoresLista: ['GovTech', 'Defense', 'FinTech', 'HealthTech'],
    oQueFazemos: {
      eyebrow: 'What we do',
      titulo: 'From architecture decisions to operations',
      pilares: [
        {
          titulo: 'Consulting',
          texto:
            'Solution and AI architecture, independent assessments and self-hosted LLM adoption strategy.',
          rotulo: 'See consulting',
          pagina: 'consultoria',
        },
        {
          titulo: 'Services',
          texto:
            'Software engineering by performance layer, data platforms, MLOps/LLMOps and dedicated squads.',
          rotulo: 'See services',
          pagina: 'servicos',
        },
        {
          titulo: 'Products',
          texto:
            'Our own solutions, built on the same sovereign platform we design for clients.',
          rotulo: 'See products',
          pagina: 'produtos',
        },
      ],
    },
    setores: {
      eyebrow: 'Sectors',
      titulo: 'Where sovereignty matters',
      itens: [
        {
          titulo: 'GovTech',
          texto: 'Digital platforms for the public sector, compliant and sovereign from the design up.',
        },
        {
          titulo: 'Defense',
          texto: 'Mission-critical systems, secure by design and operated in controlled environments.',
        },
        {
          titulo: 'FinTech',
          texto: 'AI and data for regulated financial institutions, from RAG to the critical path.',
        },
        {
          titulo: 'HealthTech',
          texto: 'Clinical technology with privacy, traceability and healthcare compliance.',
        },
      ],
    },
    experiencia: {
      eyebrow: 'Experience',
      titulo: 'Results in production',
      nota:
        'For confidentiality, cases are described without identifying clients. Detailed references available on request.',
      itens: [
        {
          titulo: 'Telecom · AI agents in production',
          texto:
            'Orchestration of AI agents for voice-based service and sales at a tier-1 carrier, running at scale.',
        },
        {
          titulo: 'Finance · generative AI and RAG',
          texto:
            'Generative AI platforms with retrieval over proprietary data in the financial sector.',
        },
        {
          titulo: 'Infrastructure · self-hosted end to end',
          texto:
            'Kubernetes, observability and ML inference on our own GPUs — no public cloud dependency.',
        },
      ],
    },
    extra: {
      eyebrow: 'Beyond projects',
      titulo: 'Applied research and updates',
      cartoes: [
        {
          titulo: 'Science & Research',
          texto: 'The AI research lines that power our services and products.',
          rotulo: 'See research',
          pagina: 'pesquisa',
        },
        {
          titulo: 'News',
          texto: 'Announcements, launches and behind the scenes of what we are building.',
          rotulo: 'See news',
          pagina: 'noticias',
        },
      ],
    },
    cta: {
      titulo: 'Shall we talk about your next critical system?',
      texto: 'Tell us the context — we reply with a clear technical path.',
      botao: 'Contact us',
    },
  },

  consultoria: {
    eyebrow: 'Consulting',
    titulo: 'Well-grounded architecture decisions',
    lede:
      'The decision layer: we assess the context, design the solution and document the reasoning — before any line of production code.',
    frentes: [
      {
        titulo: 'Solution and AI architecture',
        texto:
          'Design of distributed systems, data platforms and generative AI architectures — from gateway to inference — with documented, justified decisions.',
      },
      {
        titulo: 'Technical assessment',
        texto:
          'Independent evaluation of platforms, code and infrastructure: security, performance, cost and readiness to scale.',
      },
      {
        titulo: 'Self-hosted LLM strategy',
        texto:
          'Adopting language models on your own infrastructure: model selection, hardware, inference servers and guardrails.',
      },
      {
        titulo: 'Proofs of concept',
        texto:
          'Short, measurable PoCs to validate AI hypotheses before investing in production.',
      },
      {
        titulo: 'Data governance and sovereignty',
        texto:
          'Policies, topology and controls to keep sensitive data under your own jurisdiction and infrastructure — LGPD, GDPR and sector-specific requirements.',
      },
    ],
    siteDedicado: {
      texto: 'Consulting can be contracted inside the ORZYON platform, alongside the ecosystem’s products and services.',
      botao: 'Contract consulting on the platform',
    },
    cta: {
      titulo: 'Need a well-grounded decision?',
      texto: 'Bring the problem — we return architecture, risks and an execution plan.',
      botao: 'Talk to us',
    },
  },

  servicos: {
    eyebrow: 'Engineering',
    titulo: 'Engineering that sustains production',
    lede:
      'The execution layer: we build, integrate and operate — with the right stack at every layer and performance as a requirement, not an afterthought.',
    itens: [
      {
        titulo: 'Engineering by performance layer',
        texto:
          'Python for intelligence and orchestration, Mojo for AI compute, Modern C++ for high-performance systems and CUDA C++ for GPU acceleration. This is the official set of ORZYON-supported languages.',
      },
      {
        titulo: 'Data platforms',
        texto:
          'Relational and vector databases, cache and messaging — designed, operated and monitored on your own infrastructure.',
      },
      {
        titulo: 'MLOps and LLMOps',
        texto:
          'From model versioning to high-performance GPU inference, with observability and continuous evaluation.',
      },
      {
        titulo: 'Integration and support',
        texto:
          'Evolution and operation of existing systems with clear SLOs, observability and incident response.',
      },
      {
        titulo: 'Dedicated squads',
        texto:
          'Senior engineering teams allocated for outcomes, under Orzyon technical leadership.',
      },
    ],
    cta: {
      titulo: 'Have a system to build or scale?',
      texto: 'From the first commit to SLOs in production.',
      botao: 'Talk to us',
    },
  },

  produtos: {
    eyebrow: 'Products',
    titulo: 'Our own solutions, sovereign by default',
    lede:
      'Products built on the same platform we design for clients — made to run on your infrastructure, not ours.',
    itens: [
      {
        nome: 'SmartFinance',
        categoria: 'FinTech · multi-agent AI',
        texto:
          'AI agent platform for the financial sector: analysis, service and automation with RAG over proprietary data — running entirely on client infrastructure.',
      },
      {
        nome: 'MaisClinical',
        categoria: 'HealthTech · clinical workflow',
        texto:
          'AI-assisted triage and clinical workflow, designed for privacy, traceability and healthcare compliance.',
      },
    ],
    nota: 'Roadmap and demos available on request.',
    cta: {
      titulo: 'Want a closer look at a product?',
      texto: 'We schedule a demo in your context.',
      botao: 'Talk to us',
    },
  },

  pesquisa: {
    eyebrow: 'Science & Research',
    titulo: 'Applied research, done in production',
    lede:
      'We do not research in the abstract: every line of investigation starts from real client problems and feeds back into our services and products.',
    linhas: [
      {
        titulo: 'Multi-agent systems',
        texto: 'Coordination, memory and evaluation of AI agents operating in critical business flows.',
      },
      {
        titulo: 'Sovereign RAG',
        texto:
          'Retrieval and generation over proprietary data, fully on-premise, with quality metrics and traceability.',
      },
      {
        titulo: 'Efficient inference',
        texto: 'Quantization, batching and serving optimization to get the most out of our own GPUs.',
      },
      {
        titulo: 'Real-time voice AI',
        texto: 'Voice agents with natural conversational latency, from recognition to synthesis.',
      },
    ],
    nota: 'Technical notes and publications will be released on this page.',
    cta: {
      titulo: 'Facing a frontier problem in your sector?',
      texto: 'Partner research, with IP and data under your control.',
      botao: 'Talk to us',
    },
  },

  noticias: {
    eyebrow: 'News',
    titulo: 'Orzyon updates',
    lede: 'Announcements, launches and behind the scenes of what we are building.',
    itens: [
      {
        data: 'Ecosystem',
        titulo: 'One portal for the entire ORZYON ecosystem',
        resumo:
          'Products, consulting, platform access and updates now begin from a single entry point.',
        rotulo: 'Explore the ecosystem',
        destino: { tipo: 'pagina', pagina: 'produtos' },
      },
      {
        data: 'ORZYON Financial',
        titulo: 'SmartFinance: intelligence connected to financial operations',
        resumo:
          'Explore the multi-agent AI platform for financial analysis, service and automation.',
        rotulo: 'Visit SmartFinance',
        destino: { tipo: 'produto', produto: 'smartFinance' },
      },
      {
        data: 'ORZYON Health',
        titulo: 'MaisClinical: intelligence for the clinical journey',
        resumo:
          'A healthcare experience supporting triage, privacy and traceability from the architecture up.',
        rotulo: 'Visit MaisClinical',
        destino: { tipo: 'produto', produto: 'maisClinical' },
      },
    ],
    nota: 'Want the news first-hand?',
    notaLink: 'Contact us',
  },

  contato: {
    eyebrow: 'Contact us',
    titulo: 'Tell us the context of your project',
    lede: 'We reply within one business day, with clear next steps.',
    email: { titulo: 'Email', texto: 'The main channel for new projects and partnerships.' },
    linkedin: {
      titulo: 'LinkedIn',
      texto: 'Professional profile and Orzyon updates.',
      rotulo: 'Open LinkedIn',
    },
    base: {
      titulo: 'Base',
      linha1: 'Brasília-DF, Brazil · GMT-3.',
      linha2: 'Remote delivery in Brazil and abroad.',
    },
    briefing: {
      eyebrow: 'Briefing',
      titulo: 'What speeds up the conversation',
      itens: [
        'Sector and regulatory context of the project.',
        'The problem and the expected outcome.',
        'Infrastructure constraints — on-premise, private cloud or hybrid.',
        'Timeline and budget range.',
      ],
    },
  },

  footer: {
    tagline:
      'Sovereign-by-Design — AI engineering and critical platforms with data sovereignty, for regulated sectors.',
    navegacao: 'Navigation',
    navegacaoAria: 'Footer navigation',
    contato: 'Contact',
    inicio: 'Home',
    lugar: 'Brasília-DF, Brazil · GMT-3',
    direitos: 'Orzyon Technology · CNPJ 65.268.596/0001-50 · Brasília-DF, Brazil',
  },

  meta: {
    home: {
      titulo: 'ORZYON Technology | AI Products, Platform and Robotics',
      descricao:
        'ORZYON builds AI products, autonomous agents, computer vision, robotics and high-performance infrastructure. Explore the ecosystem and access the platform.',
    },
    tecnologia: {
      titulo: 'Technology — ORZYON Technology',
      descricao: 'Python, Mojo, Modern C++ and CUDA C++: explore the languages and infrastructure behind the ORZYON ecosystem.',
    },
    consultoria: {
      titulo: 'Consulting — Orzyon Technology',
      descricao:
        'Solution and AI architecture, technical assessments, self-hosted LLM strategy, proofs of concept and data governance.',
    },
    servicos: {
      titulo: 'Engineering — ORZYON Technology',
      descricao:
        'AI systems engineering with Python, Mojo, Modern C++ and CUDA C++, data platforms, MLOps, LLMOps, integration and support.',
    },
    produtos: {
      titulo: 'AI Products and Platform — ORZYON Technology',
      descricao:
        'Explore the ORZYON ecosystem, visit SmartFinance and MaisClinical, or access the artificial intelligence platform directly.',
    },
    pesquisa: {
      titulo: 'Science & Research — Orzyon Technology',
      descricao:
        'Applied AI research lines: multi-agent systems, sovereign RAG, efficient inference and real-time voice.',
    },
    noticias: {
      titulo: 'News — Orzyon Technology',
      descricao: 'Announcements, launches and updates from Orzyon Technology.',
    },
    contato: {
      titulo: 'Contact us — Orzyon Technology',
      descricao:
        'Reach Orzyon Technology — email and LinkedIn. Based in Brasília-DF, remote delivery in Brazil and abroad.',
    },
    entrar: {
      titulo: 'Sign in — ORZYON Platform',
      descricao: 'Securely access your account and continue to the ORZYON platform.',
    },
    cadastro: {
      titulo: 'Create account — ORZYON Platform',
      descricao: 'Create your account to access the ORZYON ecosystem, products and services.',
    },
    recuperarSenha: {
      titulo: 'Recover password — ORZYON Platform',
      descricao: 'Securely request access recovery for your ORZYON account.',
    },
  },
};
