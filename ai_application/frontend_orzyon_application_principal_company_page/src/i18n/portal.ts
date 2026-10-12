import type { Idioma } from './idiomas';

export interface PortalProduct {
  key: 'aiCloud' | 'smartFinance' | 'maisClinical';
  family: string;
  name: string;
  status: string;
  description: string;
  cta: string;
  capabilities: readonly string[];
  note?: string;
  details?: readonly { title: string; description: string }[];
}

export interface PortalDivision {
  index: string;
  title: string;
  description: string;
  capabilities: readonly string[];
}

export interface PortalCopy {
  nav: {
    products: string;
    technology: string;
    research: string;
    engineering: string;
    consulting: string;
    news: string;
    contact: string;
    login: string;
    openMenu: string;
    closeMenu: string;
  };
  hero: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    productsCta: string;
    technologyCta: string;
    accessNote: string;
  };
  graph: {
    label: string;
    status: string;
    center: string;
    agents: string;
    models: string;
    vision: string;
    robotics: string;
    compute: string;
    aria: string;
  };
  divisionsLabel: string;
  divisions: readonly PortalDivision[];
  ecosystem: {
    eyebrow: string;
    title: string;
    description: string;
    platformEyebrow: string;
    platformTitle: string;
    platformDescription: string;
    platformCta: string;
    platformNote: string;
    products: readonly PortalProduct[];
    consulting: {
      eyebrow: string;
      title: string;
      description: string;
      cta: string;
      capabilities: readonly string[];
    };
    externalLabel: string;
  };
  technology: {
    eyebrow: string;
    title: string;
    description: string;
    stackLabel: string;
    stack: readonly string[];
    cta: string;
  };
  privateAi: {
    eyebrow: string;
    title: string;
    description: string;
    capabilities: readonly string[];
    stackLabel: string;
    stack: readonly string[];
  };
  research: {
    eyebrow: string;
    title: string;
    description: string;
    projects: readonly { code: string; title: string; description: string }[];
    cta: string;
  };
  closing: {
    eyebrow: string;
    title: string;
    description: string;
    contactCta: string;
    platformCta: string;
  };
  productsPage: {
    eyebrow: string;
    title: string;
    description: string;
    directoryLabel: string;
  };
  footer: {
    tagline: string;
    ecosystem: string;
    company: string;
    contact: string;
    platform: string;
  };
}

export const PORTAL_COPY: Record<Idioma, PortalCopy> = {
  pt: {
    nav: {
      products: 'Produtos',
      technology: 'Tecnologia',
      research: 'Pesquisa',
      engineering: 'Engenharia',
      consulting: 'Consultoria',
      news: 'Notícias',
      contact: 'Contato',
      login: 'Entrar',
      openMenu: 'Abrir menu',
      closeMenu: 'Fechar menu',
    },
    hero: {
      eyebrow: 'ORZYON TECHNOLOGY / AI SYSTEMS & ROBOTICS',
      titleLead: 'Engenharia de',
      titleAccent: 'inteligência.',
      description:
        'Desenvolvemos produtos de IA, agentes autônomos, sistemas multimodais e infraestrutura de alto desempenho para operações complexas no mundo real.',
      productsCta: 'Conhecer os produtos',
      technologyCta: 'Explorar tecnologia',
      accessNote: 'Login e cadastro do portal Orzyon.',
    },
    graph: {
      label: 'SYSTEM FABRIC // ONLINE',
      status: 'Sistemas conectados',
      center: 'ORZYON CORE',
      agents: 'Agentes',
      models: 'Modelos',
      vision: 'Visão',
      robotics: 'Robótica',
      compute: 'Compute',
      aria: 'Diagrama da plataforma ORZYON conectando agentes, modelos, visão, robótica e computação.',
    },
    divisionsLabel: 'Inteligência aplicada em três frentes',
    divisions: [
      {
        index: '01',
        title: 'AI Systems',
        description: 'Sistemas que raciocinam, recuperam contexto e executam fluxos complexos com autonomia delimitada.',
        capabilities: ['Agentes', 'RAG', 'LLMs', 'Multimodal'],
      },
      {
        index: '02',
        title: 'Robotics',
        description: 'Inteligência que percebe o ambiente, planeja ações e opera além da camada de software.',
        capabilities: ['Percepção', 'Visão', 'Autonomia', 'Controle'],
      },
      {
        index: '03',
        title: 'AI Compute',
        description: 'Infraestrutura de inferência e sistemas de alto desempenho projetados para cada carga.',
        capabilities: ['GPU', 'HPC', 'Inferência', 'Sistemas'],
      },
    ],
    ecosystem: {
      eyebrow: 'ECOSSISTEMA ORZYON',
      title: 'Uma empresa. Um ecossistema de produtos inteligentes.',
      description:
        'Conheça os produtos e a consultoria Orzyon. Explore a Orzyon AI Cloud em demonstração ou acesse sua conta no portal Orzyon.',
      platformEyebrow: 'PLATAFORMA ORZYON',
      platformTitle: 'Seu ambiente de IA, em um só lugar.',
      platformDescription:
        'Entre para contratar soluções, gerenciar integrações, acompanhar tokens, consumo, cotações e faturamento em uma experiência unificada.',
      platformCta: 'Entrar ou criar conta',
      platformNote: 'Acesse sua conta no portal Orzyon.',
      externalLabel: 'site externo',
      products: [
        {
          key: 'aiCloud',
          family: 'ORZYON AI CLOUD · INFRAESTRUTURA DE IA',
          name: 'Orzyon AI Cloud',
          status: 'Demonstração',
          description:
            'Gerencie clusters, agentes, modelos e serviços de IA em um único console. Visualize recursos computacionais, acompanhe o consumo de tokens e organize a operação por organização e cluster.',
          cta: 'Explorar Orzyon AI Cloud',
          capabilities: ['Clusters de IA', 'Agentes', 'Modelos', 'Compute'],
          note: 'Explore o console em ambiente de demonstração.',
          details: [
            { title: 'Clusters e recursos', description: 'Visão de nós, CPU, GPU e memória, com organização da capacidade por cluster.' },
            { title: 'Agentes e serviços', description: 'Acompanhamento de implantações, réplicas e contexto de execução.' },
            { title: 'Modelos e inferência', description: 'Catálogo e configuração de modelos e motores, conforme disponibilidade na plataforma.' },
            { title: 'Métricas e consumo', description: 'Visualização de tokens, utilização de recursos e estimativas de custos.' },
          ],
        },
        {
          key: 'smartFinance',
          family: 'ORZYON AI FINANCIAL SERVICES · IA MULTIAGENTE',
          name: 'Orzyon AI Financial Services',
          status: 'Plataforma financeira',
          description:
            'Inteligência multiagente para análise, atendimento e automação financeira, conectada aos dados e processos da instituição.',
          cta: 'Explorar Orzyon AI Financial Services',
          capabilities: ['Agentes', 'RAG privado', 'Automação'],
        },
        {
          key: 'maisClinical',
          family: 'ORZYON AI MEDICAL SERVICES · INTELIGÊNCIA CLÍNICA',
          name: 'Orzyon AI Medical Services',
          status: 'Tecnologia para saúde',
          description:
            'IA aplicada à jornada clínica, com suporte à triagem, privacidade e rastreabilidade desde a arquitetura.',
          cta: 'Explorar Orzyon AI Medical Services',
          capabilities: ['Fluxo clínico', 'Privacidade', 'Rastreabilidade'],
        },
      ],
      consulting: {
        eyebrow: 'ORZYON CONSULTING · ATENDIMENTO ESPECIALIZADO',
        title: 'Consultoria integrada ao ecossistema.',
        description:
          'Arquitetura de IA, estratégia, implantação e suporte técnico para empresas que precisam construir ou evoluir sistemas críticos.',
        cta: 'Conhecer a consultoria',
        capabilities: ['Arquitetura', 'Estratégia de IA', 'Implantação', 'Suporte especializado'],
      },
    },
    technology: {
      eyebrow: 'TECNOLOGIA',
      title: 'Do modelo à máquina.',
      description:
        'Projetamos o sistema completo: inteligência, runtime, serviços, infraestrutura e aceleração. A tecnologia aparece onde cria vantagem real.',
      stackLabel: 'Linguagens com suporte oficial ORZYON',
      stack: ['Python', 'Mojo', 'Modern C++', 'CUDA C++'],
      cta: 'Conhecer nossa tecnologia',
    },
    privateAi: {
      eyebrow: 'PRIVATE AI',
      title: 'Seus modelos. Sua infraestrutura. Seus dados.',
      description:
        'Implante IA em infraestrutura privada sem depender de provedores externos a cada inferência. Controle o dado, a execução e a operação.',
      capabilities: ['LLMs self-hosted', 'Inferência privada', 'GPU dedicada', 'Soberania de dados'],
      stackLabel: 'Arquitetura de execução',
      stack: ['Aplicações', 'Orquestração de IA', 'Serviços de alta performance', 'Runtime de inferência', 'CPU · GPU · Accelerators'],
    },
    research: {
      eyebrow: 'PESQUISA & ENGENHARIA',
      title: 'Construindo as próximas camadas da inteligência.',
      description:
        'Linhas de pesquisa aplicada orientadas por problemas reais de autonomia, eficiência e operação em produção.',
      projects: [
        {
          code: 'FOCUS / 001',
          title: 'High-Performance Agent Runtime',
          description: 'Execução previsível, ferramentas tipadas e observabilidade para agentes em produção.',
        },
        {
          code: 'FOCUS / 002',
          title: 'Heterogeneous AI Compute',
          description: 'Distribuição eficiente de cargas entre CPU, GPU e aceleradores especializados.',
        },
        {
          code: 'FOCUS / 003',
          title: 'Autonomous Multi-Agent Systems',
          description: 'Coordenação e decisão autônoma com limites explícitos e avaliação contínua.',
        },
      ],
      cta: 'Explorar pesquisa',
    },
    closing: {
      eyebrow: 'BUILD WHAT COMES NEXT',
      title: 'Sistemas inteligentes exigem engenharia.',
      description: 'Mais do que APIs e prompts: arquitetura, compute, segurança e operação trabalhando como um único sistema.',
      contactCta: 'Falar com a engenharia ORZYON',
      platformCta: 'Entrar ou criar conta',
    },
    productsPage: {
      eyebrow: 'DIRETÓRIO DE PRODUTOS',
      title: 'O ecossistema ORZYON.',
      description:
        'Conheça cada solução de forma independente, explore a demonstração da Orzyon AI Cloud ou acesse sua conta no portal Orzyon.',
      directoryLabel: 'Produtos e ambientes disponíveis',
    },
    footer: {
      tagline: 'AI Systems. Autonomous Machines. High-Performance Compute.',
      ecosystem: 'Ecossistema',
      company: 'Empresa',
      contact: 'Contato',
      platform: 'Entrar ou criar conta',
    },
  },
  en: {
    nav: {
      products: 'Products',
      technology: 'Technology',
      research: 'Research',
      engineering: 'Engineering',
      consulting: 'Consulting',
      news: 'News',
      contact: 'Contact',
      login: 'Sign in',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },
    hero: {
      eyebrow: 'ORZYON TECHNOLOGY / AI SYSTEMS & ROBOTICS',
      titleLead: 'Engineering',
      titleAccent: 'intelligence.',
      description:
        'We build AI products, autonomous agents, multimodal systems and high-performance infrastructure for complex real-world operations.',
      productsCta: 'Explore our products',
      technologyCta: 'Explore technology',
      accessNote: 'Sign-in and registration for the Orzyon portal.',
    },
    graph: {
      label: 'SYSTEM FABRIC // ONLINE',
      status: 'Systems connected',
      center: 'ORZYON CORE',
      agents: 'Agents',
      models: 'Models',
      vision: 'Vision',
      robotics: 'Robotics',
      compute: 'Compute',
      aria: 'Diagram of the ORZYON platform connecting agents, models, vision, robotics and compute.',
    },
    divisionsLabel: 'Intelligence applied across three domains',
    divisions: [
      {
        index: '01',
        title: 'AI Systems',
        description: 'Systems that reason, retrieve context and execute complex workflows with bounded autonomy.',
        capabilities: ['Agents', 'RAG', 'LLMs', 'Multimodal'],
      },
      {
        index: '02',
        title: 'Robotics',
        description: 'Intelligence that perceives its environment, plans actions and operates beyond software.',
        capabilities: ['Perception', 'Vision', 'Autonomy', 'Control'],
      },
      {
        index: '03',
        title: 'AI Compute',
        description: 'Inference infrastructure and high-performance systems designed for each workload.',
        capabilities: ['GPU', 'HPC', 'Inference', 'Systems'],
      },
    ],
    ecosystem: {
      eyebrow: 'ORZYON ECOSYSTEM',
      title: 'One company. An ecosystem of intelligent products.',
      description:
        'Discover Orzyon products and consulting. Explore the Orzyon AI Cloud demo or access your account in the Orzyon portal.',
      platformEyebrow: 'ORZYON PLATFORM',
      platformTitle: 'Your AI environment, in one place.',
      platformDescription:
        'Sign in to contract solutions, manage integrations, and track tokens, usage, quotes and billing in one unified experience.',
      platformCta: 'Sign in or create account',
      platformNote: 'Access your account in the Orzyon portal.',
      externalLabel: 'external site',
      products: [
        {
          key: 'aiCloud',
          family: 'ORZYON AI CLOUD · AI INFRASTRUCTURE',
          name: 'Orzyon AI Cloud',
          status: 'Demo',
          description:
            'Manage AI clusters, agents, models, and services in one console. Monitor computing resources, track token usage, and organize operations by organization and cluster.',
          cta: 'Explore Orzyon AI Cloud',
          capabilities: ['AI clusters', 'Agents', 'Models', 'Compute'],
          note: 'Explore the console in a demo environment.',
          details: [
            { title: 'Clusters and resources', description: 'View nodes, CPU, GPU, and memory, with capacity organized by cluster.' },
            { title: 'Agents and services', description: 'Track deployments, replicas, and execution context.' },
            { title: 'Models and inference', description: 'Browse and configure models and engines, subject to availability in the platform.' },
            { title: 'Metrics and usage', description: 'View tokens, resource utilization, and cost estimates.' },
          ],
        },
        {
          key: 'smartFinance',
          family: 'ORZYON AI FINANCIAL SERVICES · MULTI-AGENT AI',
          name: 'Orzyon AI Financial Services',
          status: 'Financial platform',
          description:
            'Multi-agent intelligence for financial analysis, service and automation, connected to institutional data and processes.',
          cta: 'Explore Orzyon AI Financial Services',
          capabilities: ['Agents', 'Private RAG', 'Automation'],
        },
        {
          key: 'maisClinical',
          family: 'ORZYON AI MEDICAL SERVICES · CLINICAL INTELLIGENCE',
          name: 'Orzyon AI Medical Services',
          status: 'Healthcare technology',
          description:
            'AI for the clinical journey, supporting triage, privacy and traceability from the architecture up.',
          cta: 'Explore Orzyon AI Medical Services',
          capabilities: ['Clinical workflow', 'Privacy', 'Traceability'],
        },
      ],
      consulting: {
        eyebrow: 'ORZYON CONSULTING · SPECIALIZED SERVICE',
        title: 'Consulting integrated into the ecosystem.',
        description:
          'AI architecture, strategy, deployment and technical support for companies building or evolving critical systems.',
        cta: 'Explore consulting',
        capabilities: ['Architecture', 'AI strategy', 'Deployment', 'Specialized support'],
      },
    },
    technology: {
      eyebrow: 'TECHNOLOGY',
      title: 'From model to machine.',
      description:
        'We design the complete system: intelligence, runtime, services, infrastructure and acceleration. Technology appears where it creates real advantage.',
      stackLabel: 'Languages officially supported by ORZYON',
      stack: ['Python', 'Mojo', 'Modern C++', 'CUDA C++'],
      cta: 'Explore our technology',
    },
    privateAi: {
      eyebrow: 'PRIVATE AI',
      title: 'Your models. Your infrastructure. Your data.',
      description:
        'Deploy AI inside private infrastructure without relying on external providers for every inference. Control data, execution and operations.',
      capabilities: ['Self-hosted LLMs', 'Private inference', 'Dedicated GPU', 'Data sovereignty'],
      stackLabel: 'Execution architecture',
      stack: ['Applications', 'AI orchestration', 'High-performance services', 'Inference runtime', 'CPU · GPU · Accelerators'],
    },
    research: {
      eyebrow: 'RESEARCH & ENGINEERING',
      title: 'Building the next layers of intelligence.',
      description: 'Applied research driven by real autonomy, efficiency and production operations challenges.',
      projects: [
        {
          code: 'FOCUS / 001',
          title: 'High-Performance Agent Runtime',
          description: 'Predictable execution, typed tools and observability for production agents.',
        },
        {
          code: 'FOCUS / 002',
          title: 'Heterogeneous AI Compute',
          description: 'Efficient workload distribution across CPUs, GPUs and specialized accelerators.',
        },
        {
          code: 'FOCUS / 003',
          title: 'Autonomous Multi-Agent Systems',
          description: 'Autonomous coordination and decisions with explicit boundaries and continuous evaluation.',
        },
      ],
      cta: 'Explore research',
    },
    closing: {
      eyebrow: 'BUILD WHAT COMES NEXT',
      title: 'Intelligent systems require engineering.',
      description: 'More than APIs and prompts: architecture, compute, security and operations working as a single system.',
      contactCta: 'Talk to ORZYON engineering',
      platformCta: 'Sign in or create account',
    },
    productsPage: {
      eyebrow: 'PRODUCT DIRECTORY',
      title: 'The ORZYON ecosystem.',
      description:
        'Explore each solution independently, try the Orzyon AI Cloud demo, or access your account in the Orzyon portal.',
      directoryLabel: 'Available products and environments',
    },
    footer: {
      tagline: 'AI Systems. Autonomous Machines. High-Performance Compute.',
      ecosystem: 'Ecosystem',
      company: 'Company',
      contact: 'Contact',
      platform: 'Sign in or create account',
    },
  },
  es: {
    nav: {
      products: 'Productos',
      technology: 'Tecnología',
      research: 'Investigación',
      engineering: 'Ingeniería',
      consulting: 'Consultoría',
      news: 'Noticias',
      contact: 'Contacto',
      login: 'Iniciar sesión',
      openMenu: 'Abrir menú',
      closeMenu: 'Cerrar menú',
    },
    hero: {
      eyebrow: 'ORZYON TECHNOLOGY / AI SYSTEMS & ROBOTICS',
      titleLead: 'Ingeniería de',
      titleAccent: 'inteligencia.',
      description:
        'Desarrollamos productos de IA, agentes autónomos, sistemas multimodales e infraestructura de alto rendimiento para operaciones complejas del mundo real.',
      productsCta: 'Conocer los productos',
      technologyCta: 'Explorar tecnología',
      accessNote: 'Inicio de sesión y registro del portal Orzyon.',
    },
    graph: {
      label: 'SYSTEM FABRIC // ONLINE',
      status: 'Sistemas conectados',
      center: 'ORZYON CORE',
      agents: 'Agentes',
      models: 'Modelos',
      vision: 'Visión',
      robotics: 'Robótica',
      compute: 'Compute',
      aria: 'Diagrama de la plataforma ORZYON conectando agentes, modelos, visión, robótica y computación.',
    },
    divisionsLabel: 'Inteligencia aplicada en tres frentes',
    divisions: [
      {
        index: '01',
        title: 'AI Systems',
        description: 'Sistemas que razonan, recuperan contexto y ejecutan flujos complejos con autonomía delimitada.',
        capabilities: ['Agentes', 'RAG', 'LLMs', 'Multimodal'],
      },
      {
        index: '02',
        title: 'Robotics',
        description: 'Inteligencia que percibe el entorno, planifica acciones y opera más allá del software.',
        capabilities: ['Percepción', 'Visión', 'Autonomía', 'Control'],
      },
      {
        index: '03',
        title: 'AI Compute',
        description: 'Infraestructura de inferencia y sistemas de alto rendimiento diseñados para cada carga.',
        capabilities: ['GPU', 'HPC', 'Inferencia', 'Sistemas'],
      },
    ],
    ecosystem: {
      eyebrow: 'ECOSISTEMA ORZYON',
      title: 'Una empresa. Un ecosistema de productos inteligentes.',
      description:
        'Conoce los productos y la consultoría Orzyon. Explora la demostración de Orzyon AI Cloud o accede a tu cuenta en el portal Orzyon.',
      platformEyebrow: 'PLATAFORMA ORZYON',
      platformTitle: 'Su entorno de IA, en un solo lugar.',
      platformDescription:
        'Inicie sesión para contratar soluciones, administrar integraciones y seguir tokens, consumo, cotizaciones y facturación en una experiencia unificada.',
      platformCta: 'Entrar o crear cuenta',
      platformNote: 'Accede a tu cuenta en el portal Orzyon.',
      externalLabel: 'sitio externo',
      products: [
        {
          key: 'aiCloud',
          family: 'ORZYON AI CLOUD · INFRAESTRUCTURA DE IA',
          name: 'Orzyon AI Cloud',
          status: 'Demostración',
          description:
            'Gestiona clústeres, agentes, modelos y servicios de IA desde una sola consola. Visualiza los recursos de cómputo, supervisa el consumo de tokens y organiza la operación por organización y clúster.',
          cta: 'Explorar Orzyon AI Cloud',
          capabilities: ['Clústeres de IA', 'Agentes', 'Modelos', 'Cómputo'],
          note: 'Explora la consola en un entorno de demostración.',
          details: [
            { title: 'Clústeres y recursos', description: 'Vista de nodos, CPU, GPU y memoria, con la capacidad organizada por clúster.' },
            { title: 'Agentes y servicios', description: 'Seguimiento de despliegues, réplicas y contexto de ejecución.' },
            { title: 'Modelos e inferencia', description: 'Catálogo y configuración de modelos y motores, según su disponibilidad en la plataforma.' },
            { title: 'Métricas y consumo', description: 'Visualización de tokens, utilización de recursos y estimaciones de costos.' },
          ],
        },
        {
          key: 'smartFinance',
          family: 'ORZYON AI FINANCIAL SERVICES · IA MULTIAGENTE',
          name: 'Orzyon AI Financial Services',
          status: 'Plataforma financiera',
          description:
            'Inteligencia multiagente para análisis, atención y automatización financiera, conectada a los datos y procesos de la institución.',
          cta: 'Explorar Orzyon AI Financial Services',
          capabilities: ['Agentes', 'RAG privado', 'Automatización'],
        },
        {
          key: 'maisClinical',
          family: 'ORZYON AI MEDICAL SERVICES · INTELIGENCIA CLÍNICA',
          name: 'Orzyon AI Medical Services',
          status: 'Tecnología para salud',
          description:
            'IA aplicada a la jornada clínica, con apoyo al triaje, privacidad y trazabilidad desde la arquitectura.',
          cta: 'Explorar Orzyon AI Medical Services',
          capabilities: ['Flujo clínico', 'Privacidad', 'Trazabilidad'],
        },
      ],
      consulting: {
        eyebrow: 'ORZYON CONSULTING · ATENCIÓN ESPECIALIZADA',
        title: 'Consultoría integrada al ecosistema.',
        description:
          'Arquitectura de IA, estrategia, implementación y soporte técnico para empresas que construyen o evolucionan sistemas críticos.',
        cta: 'Conocer la consultoría',
        capabilities: ['Arquitectura', 'Estrategia de IA', 'Implementación', 'Soporte especializado'],
      },
    },
    technology: {
      eyebrow: 'TECNOLOGÍA',
      title: 'Del modelo a la máquina.',
      description:
        'Diseñamos el sistema completo: inteligencia, runtime, servicios, infraestructura y aceleración. La tecnología aparece donde crea una ventaja real.',
      stackLabel: 'Lenguajes con soporte oficial ORZYON',
      stack: ['Python', 'Mojo', 'Modern C++', 'CUDA C++'],
      cta: 'Conocer nuestra tecnología',
    },
    privateAi: {
      eyebrow: 'PRIVATE AI',
      title: 'Sus modelos. Su infraestructura. Sus datos.',
      description:
        'Implemente IA dentro de infraestructura privada sin depender de proveedores externos en cada inferencia. Controle datos, ejecución y operación.',
      capabilities: ['LLMs self-hosted', 'Inferencia privada', 'GPU dedicada', 'Soberanía de datos'],
      stackLabel: 'Arquitectura de ejecución',
      stack: ['Aplicaciones', 'Orquestación de IA', 'Servicios de alto rendimiento', 'Runtime de inferencia', 'CPU · GPU · Accelerators'],
    },
    research: {
      eyebrow: 'INVESTIGACIÓN & INGENIERÍA',
      title: 'Construyendo las próximas capas de la inteligencia.',
      description:
        'Investigación aplicada orientada por desafíos reales de autonomía, eficiencia y operación en producción.',
      projects: [
        {
          code: 'FOCUS / 001',
          title: 'High-Performance Agent Runtime',
          description: 'Ejecución predecible, herramientas tipadas y observabilidad para agentes en producción.',
        },
        {
          code: 'FOCUS / 002',
          title: 'Heterogeneous AI Compute',
          description: 'Distribución eficiente de cargas entre CPU, GPU y aceleradores especializados.',
        },
        {
          code: 'FOCUS / 003',
          title: 'Autonomous Multi-Agent Systems',
          description: 'Coordinación y decisión autónoma con límites explícitos y evaluación continua.',
        },
      ],
      cta: 'Explorar investigación',
    },
    closing: {
      eyebrow: 'BUILD WHAT COMES NEXT',
      title: 'Los sistemas inteligentes exigen ingeniería.',
      description: 'Más que APIs y prompts: arquitectura, compute, seguridad y operación trabajando como un solo sistema.',
      contactCta: 'Hablar con ingeniería ORZYON',
      platformCta: 'Entrar o crear cuenta',
    },
    productsPage: {
      eyebrow: 'DIRECTORIO DE PRODUCTOS',
      title: 'El ecosistema ORZYON.',
      description:
        'Conoce cada solución de forma independiente, explora la demostración de Orzyon AI Cloud o accede a tu cuenta en el portal Orzyon.',
      directoryLabel: 'Productos y entornos disponibles',
    },
    footer: {
      tagline: 'AI Systems. Autonomous Machines. High-Performance Compute.',
      ecosystem: 'Ecosistema',
      company: 'Empresa',
      contact: 'Contacto',
      platform: 'Entrar o crear cuenta',
    },
  },
};
