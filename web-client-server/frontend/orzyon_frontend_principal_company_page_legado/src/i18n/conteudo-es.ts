import type { ConteudoSite } from './conteudo';

export const CONTEUDO_ES: ConteudoSite = {
  nav: {
    consultoria: 'Consultoría',
    servicos: 'Ingeniería',
    produtos: 'Productos',
    pesquisa: 'Investigación',
    noticias: 'Noticias',
    contato: 'Contáctenos',
    abrirMenu: 'Abrir o cerrar el menú',
    principalAria: 'Navegación principal',
    idiomaAria: 'Idioma',
    inicioAria: 'Orzyon Technology — página de inicio',
    pularConteudo: 'Ir al contenido',
  },

  home: {
    eyebrow: 'Sovereign-by-Design',
    tituloInicio: 'Ingeniería de IA y plataformas críticas con ',
    tituloDestaque: 'soberanía de datos',
    lede:
      'Orzyon diseña, construye y opera sistemas de inteligencia artificial e infraestructura on-premise para sectores regulados — donde el control, la seguridad y el rendimiento no son negociables.',
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
      texto: 'La consultoría puede contratarse dentro de la plataforma ORZYON, junto con los productos y servicios del ecosistema.',
      botao: 'Contratar consultoría en la plataforma',
    },
    cta: {
      titulo: '¿Necesita una decisión bien fundamentada?',
      texto: 'Traiga el problema — devolvemos arquitectura, riesgos y un plan de ejecución.',
      botao: 'Hable con nosotros',
    },
  },

  servicos: {
    eyebrow: 'Ingeniería',
    titulo: 'Ingeniería que sostiene producción',
    lede:
      'La capa de ejecución: construimos, integramos y operamos — con el stack correcto en cada capa y el rendimiento como requisito, no como optimización tardía.',
    itens: [
      {
        titulo: 'Ingeniería por capa de rendimiento',
        texto:
          'Rust para sistemas críticos, Mojo y Python para inteligencia y orquestación, y Zig para infraestructura y herramientas de bajo nivel. Este es el conjunto oficial de lenguajes con soporte ORZYON.',
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
          'Equipos de ingeniería sénior asignados por resultado, bajo el liderazgo técnico de Orzyon.',
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
    titulo: 'Novedades de Orzyon',
    lede: 'Anuncios, lanzamientos y el detrás de escena de lo que estamos construyendo.',
    itens: [
      {
        data: 'Ecosistema',
        titulo: 'Un portal para todo el ecosistema ORZYON',
        resumo:
          'Productos, consultoría, acceso a la plataforma y novedades parten ahora de una única puerta de entrada.',
        rotulo: 'Conocer el ecosistema',
        destino: { tipo: 'pagina', pagina: 'produtos' },
      },
      {
        data: 'ORZYON Financial',
        titulo: 'SmartFinance: inteligencia conectada a la operación financiera',
        resumo:
          'Conozca la plataforma de IA multiagente para análisis, atención y automatización financiera.',
        rotulo: 'Visitar SmartFinance',
        destino: { tipo: 'produto', produto: 'smartFinance' },
      },
      {
        data: 'ORZYON Health',
        titulo: 'MaisClinical: inteligencia para la jornada clínica',
        resumo:
          'Una experiencia de salud con soporte al triaje, privacidad y trazabilidad desde la arquitectura.',
        rotulo: 'Visitar MaisClinical',
        destino: { tipo: 'produto', produto: 'maisClinical' },
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
      texto: 'Perfil profesional y novedades de Orzyon.',
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
    direitos: 'Orzyon Technology · CNPJ 65.268.596/0001-50 · Brasília-DF, Brasil',
  },

  meta: {
    home: {
      titulo: 'ORZYON Technology | Productos, Plataforma de IA y Robótica',
      descricao:
        'ORZYON desarrolla productos de IA, agentes autónomos, visión computacional, robótica e infraestructura de alto rendimiento. Conozca el ecosistema y acceda a la plataforma.',
    },
    tecnologia: {
      titulo: 'Tecnología — ORZYON Technology',
      descricao: 'Rust, Mojo, Python y Zig: conozca los lenguajes y la infraestructura que sostienen el ecosistema ORZYON.',
    },
    consultoria: {
      titulo: 'Consultoría — Orzyon Technology',
      descricao:
        'Arquitectura de soluciones y de IA, assessments técnicos, estrategia de LLMs self-hosted, pruebas de concepto y gobernanza de datos.',
    },
    servicos: {
      titulo: 'Ingeniería — ORZYON Technology',
      descricao:
        'Ingeniería de sistemas de IA con Rust, Mojo, Python y Zig, plataformas de datos, MLOps, LLMOps, integración y soporte.',
    },
    produtos: {
      titulo: 'Productos y Plataforma de IA — ORZYON Technology',
      descricao:
        'Conozca el ecosistema ORZYON, visite SmartFinance y MaisClinical o acceda directamente a la plataforma de inteligencia artificial.',
    },
    pesquisa: {
      titulo: 'Ciencia e Investigación — Orzyon Technology',
      descricao:
        'Líneas de investigación aplicada en IA: sistemas multiagente, RAG soberano, inferencia eficiente y voz en tiempo real.',
    },
    noticias: {
      titulo: 'Noticias — Orzyon Technology',
      descricao: 'Anuncios, lanzamientos y novedades de Orzyon Technology.',
    },
    contato: {
      titulo: 'Contáctenos — Orzyon Technology',
      descricao:
        'Hable con Orzyon Technology — correo y LinkedIn. Base en Brasília-DF, atención remota en Brasil y el exterior.',
    },
    entrar: {
      titulo: 'Iniciar sesión — Plataforma ORZYON',
      descricao: 'Acceda de forma segura a su cuenta y continúe a la plataforma ORZYON.',
    },
    cadastro: {
      titulo: 'Crear cuenta — Plataforma ORZYON',
      descricao: 'Cree su cuenta para acceder al ecosistema, productos y servicios ORZYON.',
    },
    recuperarSenha: {
      titulo: 'Recuperar contraseña — Plataforma ORZYON',
      descricao: 'Solicite de forma segura la recuperación de acceso a su cuenta ORZYON.',
    },
  },
};
