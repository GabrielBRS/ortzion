// Aplicações dos setores tecnológicos das organizações de governo. Todas são fictícias.
// Cada aplicação pertence a um setor (`sector`, chave do grupo na página inicial).
// Setor com uma só aplicação leva direto a ela; setor com vários subsetores abre a lista.
// Usado pela semente inicial e pelas migrações do esquema (que atualizam os cadastros por id).
import type { AppInference, Application, EnvVar, Service, SourceRuntime } from '../domain/types'
import { slugify } from '../lib/format'
import { RUNTIME_DEFAULTS, SAMPLE_CODE } from './samples'
import { GOV_CIVIL_ORG, GOV_MILITAR_ORG, ORZYON_ORG } from './demoOrgs'

interface SectorDef {
  id: string
  orgId: string
  sector: string
  name: string
  description: string
  runtime?: SourceRuntime
  /** Quando informada, a aplicação é uma imagem de contêiner (mantida pelo cliente). */
  image?: string
  command?: string
  env?: EnvVar[]
  version?: string
}

/** Setores com mais de uma aplicação: nome e descrição do grupo exibidos na página inicial. */
export const SECTOR_GROUPS: Record<string, { name: string; description: string }> = {
  'controle-integridade': {
    name: 'Inteligência de Controle e Integridade Governamental',
    description: 'Auditoria e integridade da administração pública, dentro do mandato legal de cada órgão.',
  },
  'seguranca-alimentar': {
    name: 'Inteligência de Segurança Alimentar',
    description: 'Produção, abastecimento e combate à fome.',
  },
  'desenvolvimento-economico': {
    name: 'Inteligência de Desenvolvimento Econômico',
    description: 'Indústria, serviços e tecnologia.',
  },
  'fazenda-federal': {
    name: 'Inteligência da Fazenda Federal',
    description: 'Tributos, receitas e controle aduaneiro.',
  },
  justica: {
    name: 'Inteligência da Justiça',
    description: 'Jurisprudência, acórdãos e pesquisa de precedentes.',
  },
  planejamento: {
    name: 'Inteligência de Planejamento e Orçamento Governamental',
    description: 'Planejamento, orçamento, indicadores e relatórios de execução.',
  },
  investigacao: {
    name: 'Inteligência de Investigação Governamental',
    description: 'Investigação de crimes específicos. Cada caso exige autorização judicial registrada, com escopo, prazo e trilha de auditoria. Não há listas de alvos por partido, cargo ou posição política.',
  },
  'financeiro-federal': {
    name: 'Inteligência Financeira Federal',
    description: 'Sistema bancário e política monetária.',
  },
  superinteligencia: {
    name: 'Orzyon Cloud Superinteligência',
    description: 'Porta de entrada para os modelos de linguagem: chamadas autenticadas por token, para as aplicações da Orzyon e de terceiros.',
  },
}

const MIL = GOV_MILITAR_ORG.id
const CIV = GOV_CIVIL_ORG.id
const ORZ = ORZYON_ORG.id

/** Modelo e motor das aplicações da Orzyon, inclusive a Superinteligência. Usados pelo seed e pela migração. */
export const ORZYON_INFERENCE: Record<string, AppInference> = {
  'app-orzyon-medical': { modelId: 'mdl-qwen3-32b', engineId: 'eng-vllm' },
  'app-orzyon-financial': { modelId: 'mdl-gpt-oss-120b', engineId: 'eng-sglang' },
  'app-osais-security': { modelId: 'mdl-qwen3-8b', engineId: 'eng-llamacpp' },
  'app-orzyon-superintelligence': { modelId: 'mdl-gpt-oss-120b', engineId: 'eng-vllm' },
}

/** Setores de governo: rodízio entre modelos homologados, no motor llama.cpp (homologado nos dois perfis). */
const SECTOR_INFERENCE_CYCLE: AppInference[] = [
  { modelId: 'mdl-qwen3-8b', engineId: 'eng-llamacpp' },
  { modelId: 'mdl-qwen3-32b', engineId: 'eng-llamacpp' },
  { modelId: 'mdl-gpt-oss-20b', engineId: 'eng-llamacpp' },
  { modelId: 'mdl-r1-distill-32b', engineId: 'eng-llamacpp' },
  { modelId: 'mdl-gpt-oss-120b', engineId: 'eng-llamacpp' },
]

/** Modelo e motor padrão de uma aplicação de setor ou da Orzyon. Aplicações criadas pelo cliente não têm padrão. */
export function defaultInference(appId: string): AppInference | undefined {
  if (ORZYON_INFERENCE[appId]) return ORZYON_INFERENCE[appId]
  const i = SECTOR_APP_DEFS.findIndex((d) => d.id === appId)
  return i >= 0 ? SECTOR_INFERENCE_CYCLE[i % SECTOR_INFERENCE_CYCLE.length] : undefined
}

export const SECTOR_APP_DEFS: SectorDef[] = [
  // Orzyon: Superinteligência, porta de entrada para os modelos de linguagem.
  {
    id: 'app-orzyon-superintelligence',
    orgId: ORZ,
    sector: 'superinteligencia',
    name: 'Orzyon Cloud Superinteligência Services',
    description: 'Porta de entrada para os modelos de linguagem: chamadas autenticadas por token, para as aplicações da Orzyon e de terceiros.',
    runtime: 'python',
  },

  // Governo militar
  { id: 'app-mil-aviacao', orgId: MIL, sector: 'aviacao', name: 'Aviação', description: 'Aeronaves e pistas.', runtime: 'python' },
  { id: 'app-mil-drones', orgId: MIL, sector: 'drones', name: 'Drones', description: 'Vigilância aérea.', runtime: 'python_mojo' },
  { id: 'app-mil-blindados', orgId: MIL, sector: 'blindados', name: 'Blindados', description: 'Veículos de terra.', runtime: 'mojo' },
  { id: 'app-mil-vigilancia', orgId: MIL, sector: 'vigilancia', name: 'Vigilância', description: 'Radar e sensores.', runtime: 'python' },
  { id: 'app-mil-comando', orgId: MIL, sector: 'comando', name: 'Comando', description: 'Operações e alertas.', runtime: 'python' },
  { id: 'app-mil-teatro', orgId: MIL, sector: 'teatro', name: 'Teatro de guerra', description: 'Planos táticos, treinamento e simulação de combate.', runtime: 'python_mojo' },
  { id: 'app-mil-infantaria', orgId: MIL, sector: 'infantaria', name: 'Infantaria', description: 'Operações terrestres e logística de tropas.', runtime: 'python' },
  { id: 'app-mil-naval', orgId: MIL, sector: 'naval', name: 'Naval', description: 'Marinha: navegação, patrulha e logística marítima.', runtime: 'python' },

  // Governo civil: setores com uma aplicação (o nome da aplicação é o nome do setor).
  { id: 'app-gov-seguranca', orgId: CIV, sector: 'seguranca-publica', name: 'Inteligência de Segurança Pública', description: 'Análise de dados de segurança pública.', runtime: 'python' },
  { id: 'app-gov-inv-fraudes', orgId: CIV, sector: 'investigacao', name: 'Fraudes', description: 'Fraudes contra a administração pública. Autorização judicial por caso.', runtime: 'python' },
  { id: 'app-gov-inv-licitacoes', orgId: CIV, sector: 'investigacao', name: 'Licitações', description: 'Fraudes e conluio em licitações e contratos públicos. Autorização judicial por caso.', runtime: 'python' },
  { id: 'app-gov-inv-lavagem', orgId: CIV, sector: 'investigacao', name: 'Lavagem de dinheiro', description: 'Ocultação de recursos de origem ilícita. Autorização judicial por caso.', runtime: 'python' },
  { id: 'app-gov-inv-corrupcao', orgId: CIV, sector: 'investigacao', name: 'Corrupção', description: 'Corrupção ativa e passiva na administração pública. Autorização judicial por caso.', runtime: 'python' },
  { id: 'app-gov-trabalho', orgId: CIV, sector: 'trabalho', name: 'Inteligência do Trabalho', description: 'Emprego, renda e relações de trabalho.', runtime: 'python' },
  { id: 'app-gov-ctis', orgId: CIV, sector: 'ciencia-tecnologia', name: 'Inteligência em Ciência, Tecnologia e Inovação', description: 'Pesquisa, inovação e fomento tecnológico.', runtime: 'python' },
  { id: 'app-gov-urbanismo', orgId: CIV, sector: 'urbanismo', name: 'Inteligência de Urbanismo', description: 'Planejamento urbano e habitação.', runtime: 'python' },
  { id: 'app-gov-cultura', orgId: CIV, sector: 'cultura', name: 'Inteligência de Cultura', description: 'Editais, acervos e incentivo à cultura.', runtime: 'python' },
  { id: 'app-gov-comunicacoes', orgId: CIV, sector: 'comunicacoes', name: 'Inteligência de Comunicações', description: 'Comunicação social e telecomunicações.', runtime: 'python' },
  { id: 'app-gov-educacao', orgId: CIV, sector: 'educacao', name: 'Inteligência de Educação', description: 'Escolas, matrículas e desempenho educacional.', runtime: 'python' },
  { id: 'app-gov-esporte', orgId: CIV, sector: 'esporte', name: 'Inteligência do Esporte', description: 'Políticas e equipamentos esportivos.', runtime: 'python' },
  {
    id: 'app-mj-indexador',
    orgId: CIV,
    sector: 'justica',
    name: 'Inteligência da Justiça',
    description: 'Jurisprudência e acórdãos.',
    image: 'registry.orzyon-cloud.example/justica-demo/indexador:0.9.4',
    version: '0.9.4',
  },
  { id: 'app-gov-meio-ambiente', orgId: CIV, sector: 'meio-ambiente', name: 'Inteligência do Meio Ambiente', description: 'Licenciamento e monitoramento ambiental.', runtime: 'python' },
  { id: 'app-gov-minas-energia', orgId: CIV, sector: 'minas-energia', name: 'Inteligência de Minas e Energia', description: 'Mineração, petróleo e matriz energética.', runtime: 'python' },
  { id: 'app-gov-planejamento', orgId: CIV, sector: 'planejamento', name: 'Inteligência de Planejamento e Orçamento Governamental', description: 'Planejamento, orçamento e execução de gastos públicos.', runtime: 'python' },
  { id: 'app-gov-previdencia', orgId: CIV, sector: 'previdencia', name: 'Inteligência Previdenciária e Social', description: 'Benefícios previdenciários e assistência social.', runtime: 'python' },
  { id: 'app-gov-relacoes-exteriores', orgId: CIV, sector: 'relacoes-exteriores', name: 'Inteligência de Relações Exteriores', description: 'Acordos internacionais e missões diplomáticas.', runtime: 'python' },
  { id: 'app-gov-saude', orgId: CIV, sector: 'saude', name: 'Inteligência de Saúde', description: 'Atenção básica, vigilância e assistência à saúde.', runtime: 'python' },
  { id: 'app-gov-estradas', orgId: CIV, sector: 'mobilidade', name: 'Inteligência de Mobilidade', description: 'Estradas, aviação e navegação: movimentação de pessoas e mercadorias.', runtime: 'python' },
  { id: 'app-gov-turismo', orgId: CIV, sector: 'turismo', name: 'Inteligência de Turismo', description: 'Destinos, fluxo de visitantes e infraestrutura turística.', runtime: 'python' },

  // Governo civil: subsetores dentro de um setor com vários itens.
  { id: 'app-gov-agu', orgId: CIV, sector: 'controle-integridade', name: 'Advocacia-Geral da União', description: 'Consultoria jurídica e contencioso da União.', runtime: 'python' },
  { id: 'app-gov-casa-civil', orgId: CIV, sector: 'controle-integridade', name: 'Casa Civil', description: 'Coordenação de atos normativos e da agenda governamental.', runtime: 'python' },
  { id: 'app-gov-assuntos-internos', orgId: CIV, sector: 'controle-integridade', name: 'Assuntos Internos', description: 'Correição e conformidade interna dos órgãos.', runtime: 'python' },
  { id: 'app-gov-agricultura', orgId: CIV, sector: 'seguranca-alimentar', name: 'Agricultura e Pesca', description: 'Produção agropecuária, pesca e aquicultura.', runtime: 'python' },
  { id: 'app-gov-agrario', orgId: CIV, sector: 'seguranca-alimentar', name: 'Desenvolvimento Agrário e Familiar', description: 'Agricultura familiar e reforma agrária.', runtime: 'python' },
  { id: 'app-gov-fome', orgId: CIV, sector: 'seguranca-alimentar', name: 'Combate à Fome', description: 'Programas de alimentação e distribuição de alimentos.', runtime: 'python' },
  {
    id: 'app-me-etl',
    orgId: CIV,
    sector: 'desenvolvimento-economico',
    name: 'Desenvolvimento Econômico',
    description: 'Indústria, serviços e tecnologia. Carga diária de indicadores.',
    runtime: 'python',
    env: [{ key: 'SCHEDULE', value: 'diario' }],
    version: 'v1.1.0',
  },
  { id: 'app-gov-comercio', orgId: CIV, sector: 'desenvolvimento-economico', name: 'Comércio', description: 'Registro de empresas e estatísticas de comércio.', runtime: 'python' },
  {
    id: 'app-rf-ingestao',
    orgId: CIV,
    sector: 'fazenda-federal',
    name: 'Receita',
    description: 'Tributos e notas fiscais.',
    image: 'registry.orzyon-cloud.example/receita-demo/ingestao-notas:2.3.0',
    command: '/app/ingestao --workers 8',
    env: [{ key: 'REGION', value: 'demo' }],
    version: '2.3.0',
  },
  { id: 'app-gov-alfandega', orgId: CIV, sector: 'fazenda-federal', name: 'Alfândega', description: 'Controle de cargas e declarações de importação.', runtime: 'python' },
  { id: 'app-gov-bancos', orgId: CIV, sector: 'financeiro-federal', name: 'Bancos', description: 'Supervisão do sistema bancário e dados de crédito.', runtime: 'python' },
  { id: 'app-gov-banco-central', orgId: CIV, sector: 'financeiro-federal', name: 'Banco Central', description: 'Política monetária e indicadores financeiros.', runtime: 'python' },
  // Habilidades dos agentes dos setores: cada uma é uma aplicação do setor.
  { id: 'app-skill-classificacao', orgId: CIV, sector: 'fazenda-federal', name: 'Classificação de documentos fiscais', description: 'Classificação automática de documentos fiscais (demonstração).', runtime: 'python' },
  { id: 'app-skill-orientacao', orgId: CIV, sector: 'fazenda-federal', name: 'Orientação tributária', description: 'Explica regras tributárias ao contribuinte (demonstração).', runtime: 'python' },
  { id: 'app-skill-auditoria', orgId: CIV, sector: 'fazenda-federal', name: 'Apoio à auditoria', description: 'Aponta inconsistências em declarações (demonstração).', runtime: 'python' },
  { id: 'app-skill-jurisprudencia', orgId: CIV, sector: 'justica', name: 'Pesquisa jurisprudencial', description: 'Localiza decisões e precedentes (demonstração).', runtime: 'python' },
  { id: 'app-skill-indicadores', orgId: CIV, sector: 'planejamento', name: 'Análise de indicadores', description: 'Comenta séries de indicadores (demonstração).', runtime: 'python' },
  { id: 'app-skill-resumo', orgId: CIV, sector: 'planejamento', name: 'Resumo de relatórios', description: 'Resume relatórios de execução (demonstração).', runtime: 'python' },
]

/** Aplicações dos setores de governo, no formato do cadastro. `createdAt` é informado por quem monta o estado. */
export function sectorApplications(createdAt: string): Application[] {
  return SECTOR_APP_DEFS.map((d): Application => {
    const base = {
      id: d.id,
      orgId: d.orgId,
      name: d.name,
      slug: slugify(d.name),
      description: d.description,
      sector: d.sector,
      command: d.command ?? (d.image ? '' : RUNTIME_DEFAULTS[d.runtime ?? 'python'].command),
      env: d.env ?? [],
      version: d.version ?? 'v1.0.0',
      inference: defaultInference(d.id),
      createdAt,
    }
    if (d.image) return { ...base, kind: 'image', image: d.image }
    const runtime = d.runtime ?? 'python'
    return { ...base, kind: 'source', runtime, fileName: RUNTIME_DEFAULTS[runtime].fileName, code: SAMPLE_CODE[runtime] }
  })
}

/** Superinteligência da Orzyon: instância em produção, com duas réplicas e duas GPUs dedicadas por réplica. */
export function orzyonSuperintelligenceService(createdAt: string): Service {
  const name = slugify('Orzyon Cloud Superinteligência Services')
  return {
    id: 'svc-orzyon-superintelligence',
    applicationId: 'app-orzyon-superintelligence',
    clusterId: 'cl-orz-prod',
    name,
    status: 'ativo',
    replicas: 2,
    reservation: { vcpu: 16, memoryGiB: 64, gpus: 2, gpuMemoryGiB: 160 },
    endpoint: `https://${name}.orzyon-producao.orzyon-cloud.example`,
    logs: [{ ts: createdAt, level: 'info', message: 'Versão v1.0.0 ativa.' }],
    trafficBase: 120,
    createdAt,
  }
}

/** Instâncias demonstrativas: subsetores do financeiro federal e habilidades dos agentes dos setores. */
export function sectorServices(createdAt: string): Service[] {
  const make = (id: string, applicationId: string, name: string, clusterId: string, clusterSlug: string, replicas: number, perReplica: { vcpu: number; memoryGiB: number }): Service => ({
    id,
    applicationId,
    clusterId,
    name,
    status: 'ativo',
    replicas,
    reservation: { ...perReplica, gpus: 0, gpuMemoryGiB: 0 },
    endpoint: `https://${name}.${clusterSlug}.orzyon-cloud.example`,
    logs: [{ ts: createdAt, level: 'info', message: 'Versão v1.0.0 ativa.' }],
    trafficBase: 30,
    createdAt,
  })
  const ECON = 'ministerio-da-economia'
  const REC = 'receita-federal'
  const JUS = 'ministerio-da-justica'
  return [
    make('svc-bancos', 'app-gov-bancos', 'bancos', 'cl-gov-economia', ECON, 1, { vcpu: 2, memoryGiB: 4 }),
    make('svc-banco-central', 'app-gov-banco-central', 'banco-central', 'cl-gov-economia', ECON, 1, { vcpu: 2, memoryGiB: 4 }),
    make('svc-skill-classificacao', 'app-skill-classificacao', 'classificacao-de-documentos-fiscais', 'cl-gov-receita', REC, 4, { vcpu: 2, memoryGiB: 4 }),
    make('svc-skill-orientacao', 'app-skill-orientacao', 'orientacao-tributaria', 'cl-gov-receita', REC, 2, { vcpu: 2, memoryGiB: 4 }),
    make('svc-skill-auditoria', 'app-skill-auditoria', 'apoio-a-auditoria', 'cl-gov-receita', REC, 1, { vcpu: 2, memoryGiB: 4 }),
    make('svc-skill-jurisprudencia', 'app-skill-jurisprudencia', 'pesquisa-jurisprudencial', 'cl-gov-justica', JUS, 1, { vcpu: 1, memoryGiB: 2 }),
    make('svc-skill-indicadores', 'app-skill-indicadores', 'analise-de-indicadores', 'cl-gov-economia', ECON, 1, { vcpu: 1, memoryGiB: 2 }),
    make('svc-skill-resumo', 'app-skill-resumo', 'resumo-de-relatorios', 'cl-gov-economia', ECON, 1, { vcpu: 1, memoryGiB: 2 }),
  ]
}
