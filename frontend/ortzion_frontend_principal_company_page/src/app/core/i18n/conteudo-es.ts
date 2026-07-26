import type { ConteudoSite } from './conteudo';

export const CONTEUDO_ES: ConteudoSite = {
  nav: {
    consultoria: 'Consultoría',
    servicos: 'Servicios',
    produtos: 'Productos',
    pesquisa: 'Investigación',
    noticias: 'Noticias',
    contato: 'Contáctenos',
    abrirMenu: 'Abrir o cerrar el menú',
    principalAria: 'Navegación principal',
    idiomaAria: 'Idioma',
    inicioAria: 'Ortzion Technology — página de inicio',
    pularConteudo: 'Ir al contenido',
  },

  home: {
    eyebrow: 'Sovereign-by-Design',
    tituloInicio: 'Ingeniería de IA y plataformas críticas con ',
    tituloDestaque: 'soberanía de datos',
    lede:
      'Ortzion diseña, construye y opera sistemas de inteligencia artificial e infraestructura on-premise para sectores regulados — donde el control, la seguridad y el rendimiento no son negociables.',
    ctaPrimario: 'Hable con nosotros',
    ctaSecundario: 'Ver servicios',
    setoresAria: 'Sectores atendidos',
    setoresLista: ['GovTech', 'Defensa', 'FinTech', 'HealthTech'],
    oQueFazemos: {
      eyebrow: 'Qué hacemos',
      titulo: 'De la decisión de arquitectura a la operación',
      pilares: [
        {
          titulo: 'Consultoría',
          texto:
            'Arquitectura de soluciones y de IA, assessments independientes y estrategia de adopción de LLMs en infraestructura propia.',
          rotulo: 'Ver consultoría',
          pagina: 'consultoria',
        },
        {
          titulo: 'Servicios',
          texto:
            'Ingeniería de software por capa de rendimiento, plataformas de datos, MLOps/LLMOps y squads dedicados.',
          rotulo: 'Ver servicios',
          pagina: 'servicos',
        },
        {
          titulo: 'Productos',
          texto:
            'Soluciones propias, construidas sobre la misma plataforma soberana que diseñamos para clientes.',
          rotulo: 'Ver productos',
          pagina: 'produtos',
        },
      ],
    },
    setores: {
      eyebrow: 'Sectores',
      titulo: 'Donde la soberanía importa',
      itens: [
        {
          titulo: 'GovTech',
          texto: 'Plataformas digitales para el sector público, con cumplimiento y soberanía desde el diseño.',
        },
        {
          titulo: 'Defensa',
          texto: 'Sistemas de misión crítica, seguros por diseño y operados en entornos controlados.',
        },
        {
          titulo: 'FinTech',
          texto: 'IA y datos para instituciones financieras reguladas, del RAG al camino crítico.',
        },
        {
          titulo: 'HealthTech',
          texto: 'Tecnología clínica con privacidad, trazabilidad y cumplimiento sanitario.',
        },
      ],
    },
    experiencia: {
      eyebrow: 'Experiencia',
      titulo: 'Resultados en producción',
      nota:
        'Por confidencialidad, los casos se describen sin identificar a los clientes. Referencias detalladas bajo solicitud.',
      itens: [
        {
          titulo: 'Telecom · agentes de IA en producción',
          texto:
            'Orquestación de agentes de IA para atención y ventas por voz en una operadora tier-1, funcionando a escala.',
        },
        {
          titulo: 'Financiero · IA generativa y RAG',
          texto:
            'Plataformas de IA generativa con recuperación sobre datos propietarios en el sector financiero.',
        },
        {
          titulo: 'Infraestructura · self-hosted de extremo a extremo',
          texto:
            'Kubernetes, observabilidad e inferencia de ML en GPU propia — sin dependencia de nube pública.',
        },
      ],
    },
    extra: {
      eyebrow: 'Más allá de los proyectos',
      titulo: 'Investigación aplicada y novedades',
      cartoes: [
        {
          titulo: 'Ciencia e Investigación',
          texto: 'Las líneas de investigación en IA que sostienen nuestros servicios y productos.',
          rotulo: 'Ver investigación',
          pagina: 'pesquisa',
        },
        {
          titulo: 'Noticias',
          texto: 'Anuncios, lanzamientos y el detrás de escena de lo que estamos construyendo.',
          rotulo: 'Ver noticias',
          pagina: 'noticias',
        },
      ],
    },
    cta: {
      titulo: '¿Hablamos de su próximo sistema crítico?',
      texto: 'Cuéntenos el contexto — respondemos con un camino técnico claro.',
      botao: 'Contáctenos',
    },
  },

  consultoria: {
    eyebrow: 'Consultoría',
    titulo: 'Decisiones de arquitectura bien fundamentadas',
    lede:
      'La capa de decisión: evaluamos el contexto, diseñamos la solución y documentamos el porqué — antes de cualquier línea de código en producción.',
    frentes: [
      {
        titulo: 'Arquitectura de soluciones y de IA',
        texto:
          'Diseño de sistemas distribuidos, plataformas de datos y arquitecturas de IA generativa — del gateway a la inferencia — con decisiones documentadas y justificadas.',
      },
      {
        titulo: 'Assessment técnico',
        texto:
          'Evaluación independiente de plataformas, código e infraestructura: seguridad, rendimiento, costo y preparación para escalar.',
      },
      {
        titulo: 'Estrategia de LLMs self-hosted',
        texto:
          'Adopción de modelos de lenguaje en infraestructura propia: selección de modelos, hardware, servidores de inferencia y guardrails.',
      },
      {
        titulo: 'Pruebas de concepto',
        texto:
          'PoCs cortas y medibles para validar hipótesis de IA antes de invertir en producción.',
      },
      {
        titulo: 'Gobernanza y soberanía de datos',
        texto:
          'Políticas, topología y controles para mantener datos sensibles bajo jurisdicción e infraestructura propias — LGPD, RGPD y requisitos sectoriales.',
      },
    ],
    siteDedicado: {
      texto: 'La consultoría tiene un espacio propio, con metodología, formatos de trabajo y casos en detalle.',
      botao: 'Visitar el sitio de consultoría',
    },
    cta: {
      titulo: '¿Necesita una decisión bien fundamentada?',
      texto: 'Traiga el problema — devolvemos arquitectura, riesgos y un plan de ejecución.',
      botao: 'Hable con nosotros',
    },
  },

  servicos: {
    eyebrow: 'Servicios',
    titulo: 'Ingeniería que sostiene producción',
    lede:
      'La capa de ejecución: construimos, integramos y operamos — con el stack correcto en cada capa y el rendimiento como requisito, no como optimización tardía.',
    itens: [
      {
        titulo: 'Ingeniería por capa de rendimiento',
        texto:
          'Rust y C++ en los caminos críticos, Go en servicios de plataforma, Python como control plane de orquestación, Java en la lógica corporativa regulada y Angular en el front-end.',
      },
      {
        titulo: 'Plataformas de datos',
        texto:
          'Bases relacionales, vectoriales, caché y mensajería — diseñadas, operadas y monitoreadas en infraestructura propia.',
      },
      {
        titulo: 'MLOps y LLMOps',
        texto:
          'Del versionado de modelos a la inferencia de alto rendimiento en GPU, con observabilidad y evaluación continua.',
      },
      {
        titulo: 'Integración y soporte',
        texto:
          'Evolución y operación de sistemas existentes con SLOs claros, observabilidad y respuesta a incidentes.',
      },
      {
        titulo: 'Squads dedicados',
        texto:
          'Equipos de ingeniería sénior asignados por resultado, bajo el liderazgo técnico de Ortzion.',
      },
    ],
    cta: {
      titulo: '¿Tiene un sistema para construir o escalar?',
      texto: 'Del primer commit al SLO en producción.',
      botao: 'Hable con nosotros',
    },
  },

  produtos: {
    eyebrow: 'Productos',
    titulo: 'Soluciones propias, soberanía de serie',
    lede:
      'Productos construidos sobre la misma plataforma que diseñamos para clientes — hechos para funcionar en su infraestructura, no en la nuestra.',
    itens: [
      {
        nome: 'SmartFinance',
        categoria: 'FinTech · IA multiagente',
        texto:
          'Plataforma de agentes de IA para el sector financiero: análisis, atención y automatización con RAG sobre datos propietarios — operando íntegramente en la infraestructura del cliente.',
      },
      {
        nome: 'MaisClinical',
        categoria: 'HealthTech · Flujo clínico',
        texto:
          'Triaje y flujo clínico asistidos por IA, diseñados para privacidad, trazabilidad y cumplimiento sanitario.',
      },
    ],
    nota: 'Roadmap y demostraciones bajo solicitud.',
    cta: {
      titulo: '¿Quiere ver un producto de cerca?',
      texto: 'Agendamos una demostración en su contexto.',
      botao: 'Hable con nosotros',
    },
  },

  pesquisa: {
    eyebrow: 'Ciencia e Investigación',
    titulo: 'Investigación aplicada, hecha en producción',
    lede:
      'No investigamos en abstracto: cada línea nace de problemas reales de clientes y vuelve a nuestros servicios y productos.',
    linhas: [
      {
        titulo: 'Sistemas multiagente',
        texto: 'Coordinación, memoria y evaluación de agentes de IA operando en flujos críticos de negocio.',
      },
      {
        titulo: 'RAG soberano',
        texto:
          'Recuperación y generación sobre datos propietarios, íntegramente on-premise, con métricas de calidad y trazabilidad.',
      },
      {
        titulo: 'Inferencia eficiente',
        texto: 'Cuantización, batching y optimización de serving para aprovechar al máximo GPU propia.',
      },
      {
        titulo: 'IA de voz en tiempo real',
        texto: 'Agentes de voz con latencia de conversación natural, del reconocimiento a la síntesis.',
      },
    ],
    nota: 'Notas técnicas y publicaciones se divulgarán en esta página.',
    cta: {
      titulo: '¿Tiene un problema de frontera en su sector?',
      texto: 'Investigación en alianza, con propiedad intelectual y datos bajo su control.',
      botao: 'Hable con nosotros',
    },
  },

  noticias: {
    eyebrow: 'Noticias',
    titulo: 'Novedades de Ortzion',
    lede: 'Anuncios, lanzamientos y el detrás de escena de lo que estamos construyendo.',
    itens: [
      {
        data: 'Julio de 2026',
        titulo: 'Ortzion Technology presenta su nueva identidad',
        resumo:
          'Nueva marca y nuevo sitio — el mismo principio de siempre: IA y plataformas críticas con soberanía de datos.',
      },
      {
        data: 'Próximamente',
        titulo: 'Detrás de escena de nuestra plataforma de agentes de IA',
        resumo:
          'Una serie sobre las decisiones de ingeniería detrás de sistemas de IA en producción.',
      },
    ],
    nota: '¿Quiere recibir las novedades de primera mano?',
    notaLink: 'Contáctenos',
  },

  contato: {
    eyebrow: 'Contáctenos',
    titulo: 'Cuéntenos el contexto de su proyecto',
    lede: 'Respondemos en un día hábil, con próximos pasos claros.',
    email: { titulo: 'Correo', texto: 'El canal principal para nuevos proyectos y alianzas.' },
    linkedin: {
      titulo: 'LinkedIn',
      texto: 'Perfil profesional y novedades de Ortzion.',
      rotulo: 'Abrir LinkedIn',
    },
    base: {
      titulo: 'Base',
      linha1: 'Brasília-DF, Brasil · GMT-3.',
      linha2: 'Atención remota en Brasil y el exterior.',
    },
    briefing: {
      eyebrow: 'Briefing',
      titulo: 'Qué acelera la conversación',
      itens: [
        'Sector y contexto regulatorio del proyecto.',
        'El problema y el resultado esperado.',
        'Restricciones de infraestructura — on-premise, nube privada o híbrida.',
        'Plazo y orden de magnitud del presupuesto.',
      ],
    },
  },

  footer: {
    tagline:
      'Sovereign-by-Design — ingeniería de IA y plataformas críticas con soberanía de datos, para sectores regulados.',
    navegacao: 'Navegación',
    navegacaoAria: 'Navegación del pie de página',
    contato: 'Contacto',
    inicio: 'Inicio',
    lugar: 'Brasília-DF, Brasil · GMT-3',
    direitos: 'Ortzion Technology · CNPJ 65.268.596/0001-50 · Brasília-DF, Brasil',
  },

  meta: {
    home: {
      titulo: 'Ortzion Technology — Ingeniería de IA y plataformas soberanas',
      descricao:
        'Consultoría e ingeniería de IA on-premise para sectores regulados — GovTech, Defensa, FinTech y HealthTech. Sovereign-by-Design.',
    },
    consultoria: {
      titulo: 'Consultoría — Ortzion Technology',
      descricao:
        'Arquitectura de soluciones y de IA, assessments técnicos, estrategia de LLMs self-hosted, pruebas de concepto y gobernanza de datos.',
    },
    servicos: {
      titulo: 'Servicios — Ortzion Technology',
      descricao:
        'Ingeniería de software por capa de rendimiento, plataformas de datos, MLOps y LLMOps, integración, soporte y squads dedicados.',
    },
    produtos: {
      titulo: 'Productos — Ortzion Technology',
      descricao:
        'Soluciones propias de Ortzion, construidas para funcionar en la infraestructura del cliente: SmartFinance y MaisClinical.',
    },
    pesquisa: {
      titulo: 'Ciencia e Investigación — Ortzion Technology',
      descricao:
        'Líneas de investigación aplicada en IA: sistemas multiagente, RAG soberano, inferencia eficiente y voz en tiempo real.',
    },
    noticias: {
      titulo: 'Noticias — Ortzion Technology',
      descricao: 'Anuncios, lanzamientos y novedades de Ortzion Technology.',
    },
    contato: {
      titulo: 'Contáctenos — Ortzion Technology',
      descricao:
        'Hable con Ortzion Technology — correo y LinkedIn. Base en Brasília-DF, atención remota en Brasil y el exterior.',
    },
  },
};
