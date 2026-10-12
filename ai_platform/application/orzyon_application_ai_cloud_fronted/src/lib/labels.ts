import type { AnalysisProfile, IntegrationStatus, LimitPolicy } from '../domain/types'

export const LIMIT_POLICIES: { value: LimitPolicy; label: string; description: string }[] = [
  { value: 'alertar', label: 'Alertar', description: 'Envia alertas, sem interromper cargas ou novas alocações.' },
  { value: 'bloquear_alocacoes', label: 'Impedir novas alocações', description: 'Cargas atuais continuam; novos agentes, serviços e implantações são bloqueados.' },
  { value: 'pausar_lote', label: 'Pausar tarefas em lote', description: 'Pausa serviços e agentes marcados como lote; atendimento interativo continua.' },
]

export const policyLabel = (p: LimitPolicy) => LIMIT_POLICIES.find((x) => x.value === p)?.label ?? p

export const ANALYSIS_PROFILES: { value: AnalysisProfile; description: string }[] = [
  { value: 'Essencial', description: 'Respostas diretas com orçamento de execução curto. Indicado para classificação e perguntas frequentes.' },
  { value: 'Avançado', description: 'Permite etapas intermediárias e consulta a mais fontes, com orçamento de execução maior.' },
  { value: 'Especializado', description: 'Análises longas e em várias etapas, com o maior orçamento de execução por requisição.' },
]

export const profileLabel = (p: 'unified' | 'dedicated_gpu') => (p === 'unified' ? 'Memória unificada AMD' : 'GPU com memória dedicada')
export const modalityLabel = (m: 'virtual' | 'dedicado') => (m === 'dedicado' ? 'Dedicado' : 'Virtual')

export const INTEGRATION_STATUS: Record<IntegrationStatus, { label: string; tone: 'ok' | 'warn' | 'muted'; description: string }> = {
  homologada: { label: 'Homologada', tone: 'ok', description: 'Combinação validada; pode ser implantada.' },
  experimental: { label: 'Experimental', tone: 'warn', description: 'Em avaliação; visível no catálogo, sem implantação.' },
  planejada: { label: 'Planejada', tone: 'muted', description: 'Prevista no roteiro; ainda não avaliada.' },
}
export const integrationLabel = (s: IntegrationStatus) => INTEGRATION_STATUS[s].label
