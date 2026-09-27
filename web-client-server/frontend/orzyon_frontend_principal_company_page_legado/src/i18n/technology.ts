import type { Idioma } from './idiomas';

interface TechnologyLanguage {
  name: string;
  role: string;
  description: string;
}

interface TechnologyPageCopy {
  eyebrow: string;
  title: string;
  description: string;
  languagesEyebrow: string;
  languagesTitle: string;
  languagesDescription: string;
  languages: readonly TechnologyLanguage[];
  architectureEyebrow: string;
  architectureTitle: string;
  architectureDescription: string;
  engineeringCta: string;
  consultingCta: string;
}

export const TECHNOLOGY_COPY: Record<Idioma, TechnologyPageCopy> = {
  pt: {
    eyebrow: 'TECNOLOGIA ORZYON',
    title: 'A stack certa para sistemas de inteligência.',
    description:
      'Nossa tecnologia é orientada ao core de IA: do desenvolvimento de modelos e agentes ao runtime, à infraestrutura e à execução de alto desempenho.',
    languagesEyebrow: 'SUPORTE OFICIAL',
    languagesTitle: 'Quatro linguagens. Um sistema completo.',
    languagesDescription:
      'Concentramos nossa engenharia onde temos profundidade técnica. Rust, Mojo, Python e Zig formam o conjunto oficial de linguagens com suporte ORZYON.',
    languages: [
      {
        name: 'Rust',
        role: 'Sistemas críticos',
        description: 'Serviços seguros, concorrência previsível e componentes de alta performance para produção.',
      },
      {
        name: 'Mojo',
        role: 'Compute para IA',
        description: 'Kernels, pipelines numéricos e aceleração de cargas de inteligência artificial.',
      },
      {
        name: 'Python',
        role: 'Inteligência e orquestração',
        description: 'Modelos, agentes, dados, avaliação e automação do ciclo completo de IA.',
      },
      {
        name: 'Zig',
        role: 'Infraestrutura e runtimes',
        description: 'Ferramentas de baixo nível, interoperabilidade e controle explícito da execução.',
      },
    ],
    architectureEyebrow: 'ARQUITETURA',
    architectureTitle: 'Do produto ao acelerador.',
    architectureDescription:
      'Aplicações, orquestração, serviços, runtime e hardware trabalham como uma arquitetura única — observável, segura e preparada para escala.',
    engineeringCta: 'Conhecer nossa engenharia',
    consultingCta: 'Contratar consultoria',
  },
  en: {
    eyebrow: 'ORZYON TECHNOLOGY',
    title: 'The right stack for intelligence systems.',
    description:
      'Our technology is focused on the AI core: from models and agents to runtimes, infrastructure and high-performance execution.',
    languagesEyebrow: 'OFFICIAL SUPPORT',
    languagesTitle: 'Four languages. One complete system.',
    languagesDescription:
      'We focus our engineering where we have technical depth. Rust, Mojo, Python and Zig are the official set of ORZYON-supported languages.',
    languages: [
      {
        name: 'Rust',
        role: 'Critical systems',
        description: 'Safe services, predictable concurrency and high-performance production components.',
      },
      {
        name: 'Mojo',
        role: 'AI compute',
        description: 'Kernels, numerical pipelines and acceleration for artificial intelligence workloads.',
      },
      {
        name: 'Python',
        role: 'Intelligence and orchestration',
        description: 'Models, agents, data, evaluation and automation across the complete AI lifecycle.',
      },
      {
        name: 'Zig',
        role: 'Infrastructure and runtimes',
        description: 'Low-level tooling, interoperability and explicit control over execution.',
      },
    ],
    architectureEyebrow: 'ARCHITECTURE',
    architectureTitle: 'From product to accelerator.',
    architectureDescription:
      'Applications, orchestration, services, runtimes and hardware operate as one architecture — observable, secure and ready to scale.',
    engineeringCta: 'Explore our engineering',
    consultingCta: 'Contract consulting',
  },
  es: {
    eyebrow: 'TECNOLOGÍA ORZYON',
    title: 'El stack adecuado para sistemas de inteligencia.',
    description:
      'Nuestra tecnología está orientada al core de IA: desde modelos y agentes hasta runtimes, infraestructura y ejecución de alto rendimiento.',
    languagesEyebrow: 'SOPORTE OFICIAL',
    languagesTitle: 'Cuatro lenguajes. Un sistema completo.',
    languagesDescription:
      'Concentramos nuestra ingeniería donde tenemos profundidad técnica. Rust, Mojo, Python y Zig son el conjunto oficial de lenguajes con soporte ORZYON.',
    languages: [
      {
        name: 'Rust',
        role: 'Sistemas críticos',
        description: 'Servicios seguros, concurrencia predecible y componentes de alto rendimiento para producción.',
      },
      {
        name: 'Mojo',
        role: 'Compute para IA',
        description: 'Kernels, pipelines numéricos y aceleración de cargas de inteligencia artificial.',
      },
      {
        name: 'Python',
        role: 'Inteligencia y orquestación',
        description: 'Modelos, agentes, datos, evaluación y automatización del ciclo completo de IA.',
      },
      {
        name: 'Zig',
        role: 'Infraestructura y runtimes',
        description: 'Herramientas de bajo nivel, interoperabilidad y control explícito de la ejecución.',
      },
    ],
    architectureEyebrow: 'ARQUITECTURA',
    architectureTitle: 'Del producto al acelerador.',
    architectureDescription:
      'Aplicaciones, orquestación, servicios, runtime y hardware operan como una arquitectura única — observable, segura y preparada para escalar.',
    engineeringCta: 'Conocer nuestra ingeniería',
    consultingCta: 'Contratar consultoría',
  },
};
