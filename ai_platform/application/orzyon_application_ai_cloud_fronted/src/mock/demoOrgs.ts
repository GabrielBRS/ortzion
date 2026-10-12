// Organizações demonstrativas. Usadas pela semente inicial e pela migração do esquema v6.
// Todos os órgãos, unidades e pessoas são fictícios.
import type { Cluster, CreditEntry, Organization } from '../domain/types'

/** Recarga inicial de demonstração da Orzyon, para o saldo pré-pago começar positivo. */
export function demoCredits(at: string): CreditEntry[] {
  return [{ id: 'cr-demo-orzyon', orgId: 'org-orzyon', amount: 10000, at, note: 'Recarga inicial (demonstração)' }]
}

export const ORZYON_ORG: Organization = {
  id: 'org-orzyon',
  name: 'Orzyon',
  slug: 'orzyon',
  segment: 'orzyon',
  monthlyBudget: 260000,
  limitPolicy: 'alertar',
  alertThreshold: 0.85,
  members: [
    { id: 'm1', name: 'Ana Ribeiro', email: 'ana.ribeiro@orzyon.example', role: 'Proprietário' },
    { id: 'm2', name: 'Bruno Carvalho', email: 'bruno.carvalho@orzyon.example', role: 'Administrador' },
    { id: 'm3', name: 'Camila Torres', email: 'camila.torres@orzyon.example', role: 'Desenvolvedor' },
    { id: 'm4', name: 'Diego Martins', email: 'diego.martins@orzyon.example', role: 'Leitura' },
  ],
}

export const GOV_CIVIL_ORG: Organization = {
  id: 'org-gov-civil',
  name: 'Governo — Civil',
  slug: 'governo-civil',
  segment: 'governo_civil',
  monthlyBudget: 300000,
  limitPolicy: 'bloquear_alocacoes',
  alertThreshold: 0.8,
  members: [
    { id: 'm5', name: 'Equipe Demo — Coordenação', email: 'coordenacao@gov-demo.example', role: 'Proprietário' },
    { id: 'm6', name: 'Equipe Demo — Receita', email: 'receita@gov-demo.example', role: 'Administrador' },
    { id: 'm7', name: 'Equipe Demo — Justiça', email: 'justica@gov-demo.example', role: 'Desenvolvedor' },
    { id: 'm8', name: 'Equipe Demo — Economia', email: 'economia@gov-demo.example', role: 'Desenvolvedor' },
  ],
}

export const GOV_MILITAR_ORG: Organization = {
  id: 'org-gov-militar',
  name: 'Governo — Militar',
  slug: 'governo-militar',
  segment: 'governo_militar',
  monthlyBudget: 150000,
  limitPolicy: 'bloquear_alocacoes',
  alertThreshold: 0.8,
  members: [
    { id: 'm9', name: 'Equipe Demo — Comando', email: 'comando@gov-demo.example', role: 'Proprietário' },
    { id: 'm10', name: 'Equipe Demo — Operações', email: 'operacoes@gov-demo.example', role: 'Administrador' },
  ],
}

/** Cluster fictício da organização militar. Sem aplicações: a demonstração começa vazia nesse ponto. */
export const demoMilitarCluster = (createdAt: string): Cluster => ({
  id: 'cl-gov-vigilancia',
  orgId: GOV_MILITAR_ORG.id,
  poolId: 'pool-gpu-sp1',
  name: 'Vigilância — Demonstração',
  purpose: 'Cenário fictício: monitoramento de imagens e apoio à decisão.',
  modality: 'dedicado',
  profile: 'dedicated_gpu',
  status: 'ativo',
  capacity: { nodes: 1, vcpuPerNode: 32, memoryPerNodeGiB: 256, gpusPerNode: 2, vramPerGpuGiB: 80, gpuSharePerNodeGiB: 0, storageGiB: 2048 },
  monthlyBudget: 60000,
  limitPolicy: 'bloquear_alocacoes',
  createdAt,
})
