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
      'Concentramos nossa engenharia onde temos profundidade técnica. Python, Mojo, Modern C++ e CUDA C++ formam o conjunto oficial de linguagens com suporte ORZYON.',
    languages: [
      {
        name: 'Python',
        role: 'Inteligência e orquestração',
        description: 'Modelos, agentes, dados, avaliação e automação do ciclo completo de IA.',
      },
      {
        name: 'Mojo',
        role: 'Compute para IA',
        description: 'Kernels, pipelines numéricos e aceleração de cargas de inteligência artificial.',
      },
      {
        name: 'Modern C++',
        role: 'Sistemas de alto desempenho',
        description: 'Runtimes, serviços críticos e componentes eficientes com controle preciso de recursos.',
      },
      {
        name: 'CUDA C++',
        role: 'Aceleração em GPU',
        description: 'Kernels e pipelines paralelos otimizados para treinamento, inferência e computação intensiva.',
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
      'We focus our engineering where we have technical depth. Python, Mojo, Modern C++ and CUDA C++ are the official set of ORZYON-supported languages.',
    languages: [
      {
        name: 'Python',
        role: 'Intelligence and orchestration',
        description: 'Models, agents, data, evaluation and automation across the complete AI lifecycle.',
      },
      {
        name: 'Mojo',
        role: 'AI compute',
        description: 'Kernels, numerical pipelines and acceleration for artificial intelligence workloads.',
      },
      {
        name: 'Modern C++',
        role: 'High-performance systems',
        description: 'Runtimes, critical services and efficient components with precise resource control.',
      },
      {
        name: 'CUDA C++',
        role: 'GPU acceleration',
        description: 'Parallel kernels and pipelines optimized for training, inference and intensive computing.',
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
      'Concentramos nuestra ingeniería donde tenemos profundidad técnica. Python, Mojo, Modern C++ y CUDA C++ son el conjunto oficial de lenguajes con soporte ORZYON.',
    languages: [
      {
        name: 'Python',
        role: 'Inteligencia y orquestación',
        description: 'Modelos, agentes, datos, evaluación y automatización del ciclo completo de IA.',
      },
      {
        name: 'Mojo',
        role: 'Compute para IA',
        description: 'Kernels, pipelines numéricos y aceleración de cargas de inteligencia artificial.',
      },
      {
        name: 'Modern C++',
        role: 'Sistemas de alto rendimiento',
        description: 'Runtimes, servicios críticos y componentes eficientes con control preciso de recursos.',
      },
      {
        name: 'CUDA C++',
        role: 'Aceleración en GPU',
        description: 'Kernels y pipelines paralelos optimizados para entrenamiento, inferencia y computación intensiva.',
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
