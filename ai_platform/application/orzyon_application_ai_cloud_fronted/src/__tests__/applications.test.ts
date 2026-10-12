// Testes de organizações por segmento, aplicações, instâncias (serviços) e migração v6 → v7.
import { beforeEach, describe, expect, it } from 'vitest'
import { createSeed } from '../mock/seed'
import { getData, resetData } from '../services/store'
import { ApiError, createApplication, createOrganization, createService, deleteApplication } from '../services/api'
import { migrateV6toV7, migrateV7toV8, migrateV8toV9, migrateV9toV10, migrateV10toV11, migrateV11toV12, migrateV12toV13 } from '../services/migrations'
import { sectorAgents, sectorAgentsRunning } from '../lib/sectorAgents'
import { cloneApplication, cloneCluster, replicateService } from '../services/api'
import { applicationsScope, scopeCosts } from '../lib/context'
import { SECTOR_GROUPS } from '../mock/sectorApps'
import type { AppData } from '../domain/types'
import { orgScope } from '../lib/selectors'

beforeEach(() => resetData())

describe('integridade do seed v7', () => {
  const d = createSeed()

  it('toda organização tem tipo (segmento) e o governo está separado em civil e militar', () => {
    expect(d.orgs.every((o) => !!o.segment)).toBe(true)
    expect(d.orgs.map((o) => o.id)).toEqual(expect.arrayContaining(['org-orzyon', 'org-gov-civil', 'org-gov-militar']))
    expect(d.orgs.find((o) => o.id === 'org-gov-civil')?.name).toBe('Governo — Civil')
    expect(d.orgs.find((o) => o.id === 'org-gov-militar')?.segment).toBe('governo_militar')
  })

  it('a Orzyon começa com as quatro aplicações: Medical, Financial, Security e a Superinteligência', () => {
    const names = d.applications.filter((a) => a.orgId === 'org-orzyon').map((a) => a.name)
    expect(names.sort()).toEqual(
      ['Orzyon Cloud Superinteligência Services', 'Orzyon Financial AI Services', 'Orzyon Medical AI Services', 'Orzyon Security AI Services'].sort(),
    )
  })

  it('cada serviço executa uma aplicação da mesma organização do cluster', () => {
    for (const s of d.services) {
      const app = d.applications.find((a) => a.id === s.applicationId)
      const cluster = d.clusters.find((c) => c.id === s.clusterId)
      expect(app, `${s.id} sem aplicação`).toBeTruthy()
      expect(cluster?.orgId).toBe(app?.orgId)
    }
  })

  it('nenhuma organização de governo aparece com o identificador antigo', () => {
    const ids = new Set(d.orgs.map((o) => o.id))
    for (const c of d.clusters) expect(ids.has(c.orgId), c.id).toBe(true)
    for (const a of d.applications) expect(ids.has(a.orgId), a.id).toBe(true)
    for (const e of d.events) expect(ids.has(e.orgId), e.id).toBe(true)
  })
})

describe('migração v6 → v7', () => {
  // Estado no formato anterior: governo único e serviços que carregam o próprio código.
  const v6 = {
    orgs: [
      { id: 'org-orzyon', name: 'Orzyon', slug: 'orzyon', monthlyBudget: 1, limitPolicy: 'alertar', alertThreshold: 0.8, members: [] },
      { id: 'org-gov', name: 'Governo — Demonstração', slug: 'governo-demo', monthlyBudget: 2, limitPolicy: 'alertar', alertThreshold: 0.8, members: [] },
    ],
    clusters: [
      { id: 'cl-a', orgId: 'org-orzyon', name: 'A' },
      { id: 'cl-g', orgId: 'org-gov', name: 'G' },
    ],
    agents: [{ id: 'ag-1', orgId: 'org-gov' }],
    agentDeployments: [],
    events: [{ id: 'e1', orgId: 'org-gov' }],
    modelAccess: [{ id: 'acc-1', orgId: 'org-gov' }],
    services: [
      {
        id: 'svc-x',
        clusterId: 'cl-g',
        name: 'indexador',
        kind: 'image',
        image: 'registry.example/indexador:1',
        command: '/app/run',
        env: [{ key: 'REGION', value: 'demo' }],
        version: '1.0.0',
        status: 'ativo',
        replicas: 2,
        reservation: { vcpu: 4, memoryGiB: 8, gpus: 0, gpuMemoryGiB: 0 },
        endpoint: 'https://indexador.example',
        logs: [],
        trafficBase: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  }

  const migrated = migrateV6toV7(structuredClone(v6) as unknown as Record<string, unknown>) as unknown as ReturnType<typeof createSeed>

  it('o governo antigo vira "Governo — Civil" e ganha a organização militar', () => {
    expect(migrated.orgs.map((o) => o.id)).toEqual(['org-orzyon', 'org-gov-civil', 'org-gov-militar'])
    expect(migrated.orgs.find((o) => o.id === 'org-gov-civil')?.segment).toBe('governo_civil')
    expect(migrated.orgs.find((o) => o.id === 'org-orzyon')?.segment).toBe('orzyon')
  })

  it('referências à organização de governo passam para a organização civil', () => {
    expect(migrated.clusters.find((c) => c.id === 'cl-g')?.orgId).toBe('org-gov-civil')
    expect(migrated.agents[0].orgId).toBe('org-gov-civil')
    expect(migrated.events[0].orgId).toBe('org-gov-civil')
    expect(migrated.modelAccess[0].orgId).toBe('org-gov-civil')
  })

  it('o serviço antigo vira instância de uma aplicação com o código, comando e versão anteriores', () => {
    const svc = migrated.services[0]
    const app = migrated.applications.find((a) => a.id === svc.applicationId)
    expect(app).toMatchObject({ name: 'indexador', slug: 'indexador', kind: 'image', image: 'registry.example/indexador:1', command: '/app/run', version: '1.0.0', orgId: 'org-gov-civil' })
    expect(app?.env).toEqual([{ key: 'REGION', value: 'demo' }])
    expect(svc).toMatchObject({ clusterId: 'cl-g', replicas: 2, status: 'ativo' })
    expect(svc).not.toHaveProperty('kind')
    expect(svc).not.toHaveProperty('version')
  })
})

describe('aplicações e instâncias', () => {
  it('cria uma instância de aplicação em um cluster da mesma organização', async () => {
    const app = await createApplication({
      orgId: 'org-orzyon',
      name: 'Serviço de teste',
      description: '',
      kind: 'source',
      runtime: 'python',
      fileName: 'app.py',
      code: 'print("demo")',
      command: 'python app.py',
      env: [{ key: 'API_TOKEN', value: 'nao-persistir' }],
      version: 'v9.9.9',
    })
    expect(app.env).toEqual([{ key: 'API_TOKEN', value: '' }])
    const svc = await createService({
      applicationId: app.id,
      clusterId: 'cl-orz-lab',
      name: app.slug,
      replicas: 3,
      reservation: { vcpu: 1, memoryGiB: 2, gpus: 0, gpuMemoryGiB: 0 },
    })
    expect(svc).toMatchObject({ applicationId: app.id, clusterId: 'cl-orz-lab', replicas: 3, status: 'na_fila' })
    expect(getData().services.find((s) => s.id === svc.id)?.applicationId).toBe(app.id)
  })

  it('não permite instância em cluster de outra organização', async () => {
    const app = await createApplication({
      orgId: 'org-orzyon',
      name: 'Outra org',
      description: '',
      kind: 'source',
      runtime: 'python',
      code: 'print(1)',
      command: 'python app.py',
      env: [],
      version: 'v1.0.0',
    })
    await expect(
      createService({ applicationId: app.id, clusterId: 'cl-gov-receita', name: 'outra-org', replicas: 1, reservation: { vcpu: 1, memoryGiB: 1, gpus: 0, gpuMemoryGiB: 0 } }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('não exclui aplicação que tem instâncias', async () => {
    const d = getData()
    const medical = d.applications.find((a) => a.name === 'Orzyon Medical AI Services')!
    const err = await deleteApplication(medical.id).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.details).toEqual(expect.arrayContaining([expect.stringContaining('orzyon-medical-ai-services')]))
    expect(getData().applications.some((a) => a.id === medical.id)).toBe(true)
  })

  it('exclui aplicação sem instâncias', async () => {
    const app = await createApplication({ orgId: 'org-orzyon', name: 'Temporaria', description: '', kind: 'source', runtime: 'python', code: 'x', command: '', env: [], version: 'v1' })
    await deleteApplication(app.id)
    expect(getData().applications.some((a) => a.id === app.id)).toBe(false)
  })

  it('não aceita nome de aplicação repetido na mesma organização', async () => {
    await expect(
      createApplication({ orgId: 'org-orzyon', name: 'Orzyon Medical AI Services', description: '', kind: 'source', runtime: 'python', code: 'x', command: '', env: [], version: 'v1' }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('o escopo da organização inclui só as aplicações dela', () => {
    const scope = orgScope(getData(), 'org-gov-civil')
    expect(scope.applications.every((a) => a.orgId === 'org-gov-civil')).toBe(true)
    expect(scope.applications.length).toBeGreaterThan(0)
    expect(orgScope(getData(), 'org-gov-militar').applications.every((a) => a.orgId === 'org-gov-militar')).toBe(true)
    expect(orgScope(getData(), 'org-gov-militar').applications).toHaveLength(8)
  })
})

describe('organizações criadas pelo cliente', () => {
  it('nova organização é do tipo B2B, com o responsável como proprietário', async () => {
    const org = await createOrganization({ name: 'Cliente Teste Ltda', monthlyBudget: 50000, owner: { name: 'Responsável', email: 'resp@cliente.example' } })
    expect(org).toMatchObject({ segment: 'b2b', monthlyBudget: 50000 })
    expect(org.members).toEqual([expect.objectContaining({ role: 'Proprietário', email: 'resp@cliente.example' })])
    expect(getData().orgs.some((o) => o.id === org.id)).toBe(true)
  })

  it('não aceita organização com nome repetido nem orçamento zerado', async () => {
    await expect(createOrganization({ name: 'Orzyon', monthlyBudget: 1, owner: { name: 'x', email: 'x@y.example' } })).rejects.toBeInstanceOf(ApiError)
    await expect(createOrganization({ name: 'Sem Orçamento', monthlyBudget: 0, owner: { name: 'x', email: 'x@y.example' } })).rejects.toBeInstanceOf(ApiError)
  })
})

describe('setores das páginas iniciais (v8)', () => {
  const d = createSeed()

  it('cada setor militar é uma só aplicação; o civil tem 23 setores', () => {
    expect(d.applications.filter((a) => a.orgId === 'org-gov-militar' && a.sector)).toHaveLength(8)
    const civil = d.applications.filter((a) => a.orgId === 'org-gov-civil' && a.sector)
    expect(new Set(civil.map((a) => a.sector)).size).toBe(23)
  })

  it('setores com vários subsetores são exatamente os grupos definidos', () => {
    const civil = d.applications.filter((a) => a.orgId === 'org-gov-civil' && a.sector)
    const counts = civil.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.sector!]: (acc[a.sector!] ?? 0) + 1 }), {})
    const multi = Object.keys(counts).filter((k) => counts[k] > 1).sort()
    // A Superinteligência é um grupo da Orzyon com uma só aplicação; não entra nos grupos de governo civil.
    expect(multi).toEqual(Object.keys(SECTOR_GROUPS).filter((k) => k !== 'superinteligencia').sort())
    expect(counts['controle-integridade']).toBe(3)
    expect(counts['seguranca-alimentar']).toBe(3)
    expect(counts['fazenda-federal']).toBe(5)
    expect(counts['justica']).toBe(2)
    expect(counts['planejamento']).toBe(3)
    expect(counts['financeiro-federal']).toBe(2)
    expect(counts['desenvolvimento-economico']).toBe(2)
    expect(counts['investigacao']).toBe(4)
  })

  it('a Fazenda reúne Receita e Alfândega; o financeiro reúne Bancos e Banco Central', () => {
    const inSector = (sector: string) => d.applications.filter((a) => a.sector === sector).map((a) => a.name).sort()
    expect(inSector('fazenda-federal')).toEqual(['Alfândega', 'Apoio à auditoria', 'Classificação de documentos fiscais', 'Orientação tributária', 'Receita'])
    expect(inSector('financeiro-federal')).toEqual(['Banco Central', 'Bancos'])
  })

  it('os setores antigos de governo deixam de existir como chaves próprias', () => {
    const old = ['economia', 'estradas', 'comercio', 'alfandega', 'receita', 'bancos', 'banco-central', 'seguranca']
    expect(d.applications.some((a) => a.orgId === 'org-gov-civil' && a.sector && old.includes(a.sector))).toBe(false)
  })

  it('nenhuma descrição de setor fala em vigilância sem autorização', () => {
    expect(d.applications.some((a) => /sem (pedir )?permiss|sem limite|toda a vida/i.test(a.description))).toBe(false)
  })

  it('a Orzyon tem setores médicos, financeiros e de segurança', () => {
    const sectors = d.applications.filter((a) => a.orgId === 'org-orzyon' && a.sector).map((a) => a.sector)
    expect(sectors.sort()).toEqual(['financeiros', 'medicos', 'seguranca', 'superinteligencia'])
  })
})

describe('migração v7 → v8', () => {
  // Estado após a migração v6 → v7: os serviços de governo viraram aplicações com ids "app-svc-…".
  const v7 = {
    orgs: [
      { id: 'org-orzyon', name: 'Orzyon', slug: 'orzyon', segment: 'orzyon', monthlyBudget: 1, limitPolicy: 'alertar', alertThreshold: 0.8, members: [] },
      { id: 'org-gov-civil', name: 'Governo — Civil', slug: 'governo-civil', segment: 'governo_civil', monthlyBudget: 1, limitPolicy: 'alertar', alertThreshold: 0.8, members: [] },
      { id: 'org-gov-militar', name: 'Governo — Militar', slug: 'governo-militar', segment: 'governo_militar', monthlyBudget: 1, limitPolicy: 'alertar', alertThreshold: 0.8, members: [] },
    ],
    clusters: [],
    agents: [],
    agentDeployments: [],
    events: [],
    modelAccess: [],
    applications: [
      { id: 'app-svc-ingestao', orgId: 'org-gov-civil', name: 'ingestao-notas', slug: 'ingestao-notas', description: '', kind: 'image', image: 'x', command: '', env: [], version: '2.3.0', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'app-orzyon-medical', orgId: 'org-orzyon', name: 'Orzyon Medical AI Services', slug: 'orzyon-medical-ai-services', description: '', kind: 'source', runtime: 'python', fileName: 'app.py', code: 'x', command: '', env: [], version: 'v1.0.0', createdAt: '2026-01-01T00:00:00.000Z' },
    ],
    services: [{ id: 'svc-ingestao', applicationId: 'app-svc-ingestao', clusterId: 'cl-x', name: 'ingestao-notas' }],
  }
  const m = migrateV7toV8(structuredClone(v7) as unknown as Record<string, unknown>) as unknown as AppData

  it('troca o id legado sem perder a instância e o setor passa a ser o da Fazenda Federal', () => {
    expect(m.applications.some((a) => a.id === 'app-svc-ingestao')).toBe(false)
    expect(m.applications.find((a) => a.id === 'app-rf-ingestao')).toMatchObject({ name: 'Receita', sector: 'fazenda-federal', version: '2.3.0' })
    expect(m.services[0].applicationId).toBe('app-rf-ingestao')
  })

  it('acrescenta os setores militares sem duplicar aplicações existentes', () => {
    expect(m.applications.filter((a) => a.orgId === 'org-gov-militar' && a.sector)).toHaveLength(8)
    expect(m.applications.filter((a) => a.id === 'app-rf-ingestao')).toHaveLength(1)
  })

  it('marca os sistemas da Orzyon com o setor médico', () => {
    expect(m.applications.find((a) => a.id === 'app-orzyon-medical')?.sector).toBe('medicos')
  })
})

describe('migração v8 → v9', () => {
  // Dados da versão 8: setores antigos (Economia, Estradas e Segurança) e um setor novo ausente.
  const v8 = {
    orgs: [
      { id: 'org-gov-civil', name: 'Governo — Civil', slug: 'governo-civil', segment: 'governo_civil', monthlyBudget: 1, limitPolicy: 'alertar', alertThreshold: 0.8, members: [] },
    ],
    clusters: [],
    agents: [],
    agentDeployments: [],
    events: [],
    modelAccess: [],
    services: [],
    applications: [
      { id: 'app-me-etl', orgId: 'org-gov-civil', name: 'Economia', slug: 'economia', description: 'x', sector: 'economia', kind: 'source', runtime: 'python', fileName: 'app.py', code: 'x', command: 'python app.py', env: [], version: 'v1.1.0', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'app-gov-estradas', orgId: 'org-gov-civil', name: 'Estradas', slug: 'estradas', description: 'x', sector: 'estradas', kind: 'source', runtime: 'python', fileName: 'app.py', code: 'x', command: 'python app.py', env: [], version: 'v1.0.0', createdAt: '2026-01-01T00:00:00.000Z' },
    ],
  }
  const m = migrateV8toV9(structuredClone(v8) as unknown as Record<string, unknown>) as unknown as AppData

  it('o setor antigo de economia vira Desenvolvimento Econômico, sem perder o app', () => {
    expect(m.applications.find((a) => a.id === 'app-me-etl')).toMatchObject({ name: 'Desenvolvimento Econômico', sector: 'desenvolvimento-economico', version: 'v1.1.0' })
  })

  it('estradas vira Inteligência de Mobilidade e setores novos são acrescentados', () => {
    expect(m.applications.find((a) => a.id === 'app-gov-estradas')).toMatchObject({ name: 'Inteligência de Mobilidade', sector: 'mobilidade' })
    expect(m.applications.find((a) => a.id === 'app-gov-inv-fraudes')).toMatchObject({ sector: 'investigacao' })
    expect(m.applications.filter((a) => a.orgId === 'org-gov-civil' && a.sector)).toHaveLength(39)
  })
})

describe('contexto de setor e dashboards (v10)', () => {
  const d = createSeed()

  it('o financeiro federal reúne Bancos e Banco Central, com instâncias, agentes e custo', () => {
    const apps = d.applications.filter((a) => a.orgId === 'org-gov-civil' && a.sector === 'financeiro-federal')
    expect(apps.map((a) => a.name).sort()).toEqual(['Banco Central', 'Bancos'])
    const scope = applicationsScope(d, 'org-gov-civil', apps)
    expect(scope.services).toHaveLength(2)
    expect(scope.clusterIds).toEqual(['cl-gov-economia'])
    expect(scope.agentDeployments.length).toBeGreaterThan(0)
    expect(scopeCosts(d, scope.clusters).projected).toBeGreaterThan(0)
  })

  it('a migração v9 → v10 acrescenta as instâncias financeiras uma única vez', () => {
    const v9 = {
      orgs: [{ id: 'org-gov-civil' }],
      clusters: [{ id: 'cl-gov-economia' }],
      applications: [{ id: 'app-gov-bancos' }, { id: 'app-gov-banco-central' }],
      services: [],
    }
    const once = migrateV9toV10(structuredClone(v9) as unknown as Record<string, unknown>) as unknown as AppData
    const twice = migrateV9toV10(structuredClone(once) as unknown as Record<string, unknown>) as unknown as AppData
    expect(once.services.map((x) => x.id).sort()).toEqual(['svc-banco-central', 'svc-bancos'])
    expect(twice.services).toHaveLength(2)
  })
})

describe('investigação governamental (v11)', () => {
  const d = createSeed()

  it('a investigação tem só subsetores por tipo de crime, sem categorias de partido, cargo ou posição', () => {
    const names = d.applications.filter((a) => a.orgId === 'org-gov-civil' && a.sector === 'investigacao').map((a) => a.name).sort()
    expect(names).toEqual(['Corrupção', 'Fraudes', 'Lavagem de dinheiro', 'Licitações'])
    const texts = d.applications.filter((a) => a.sector === 'investigacao').map((a) => a.description).join(' ')
    expect(texts).toMatch(/autorização judicial/i)
    expect(/\b(partid|oposi|base do governo|ministros?|governador|poder p[úu]blico|membros? do estado)/i.test(texts)).toBe(false)
  })

  it('a migração v10 → v11 retira a aplicação antiga sem instâncias e acrescenta os subsetores', () => {
    const v10 = {
      orgs: [{ id: 'org-gov-civil' }],
      clusters: [],
      services: [],
      applications: [{ id: 'app-gov-investigacao', orgId: 'org-gov-civil', name: 'Antiga', slug: 'antiga', description: 'x', sector: 'investigacao', kind: 'source', command: '', env: [], version: 'v1', createdAt: 'x' }],
    }
    const m = migrateV10toV11(structuredClone(v10) as unknown as Record<string, unknown>) as unknown as AppData
    expect(m.applications.some((a) => a.id === 'app-gov-investigacao')).toBe(false)
    expect(m.applications.filter((a) => a.sector === 'investigacao')).toHaveLength(4)
  })
})

describe('painel do setor no governo militar (v12)', () => {
  const d = createSeed()

  it('cada setor militar tem instância no cluster de vigilância, com agentes e tokens', () => {
    const apps = d.applications.filter((a) => a.orgId === 'org-gov-militar' && a.sector)
    expect(apps).toHaveLength(8)
    const scope = applicationsScope(d, 'org-gov-militar', apps)
    expect(scope.services).toHaveLength(8)
    expect(scope.clusterIds).toEqual(['cl-gov-vigilancia'])
    expect(scope.agents).toHaveLength(2)
    expect(scope.agentDeployments.length).toBeGreaterThan(0)
  })

  it('a migração v11 → v12 acrescenta os dados militares uma única vez', () => {
    const v11 = {
      orgs: [{ id: 'org-gov-militar' }],
      clusters: [{ id: 'cl-gov-vigilancia' }],
      applications: d.applications.filter((a) => a.orgId === 'org-gov-militar'),
      services: [],
      agents: [],
      agentDeployments: [],
      modelAccess: [],
    }
    const once = migrateV11toV12(structuredClone(v11) as unknown as Record<string, unknown>) as unknown as AppData
    const twice = migrateV11toV12(structuredClone(once) as unknown as Record<string, unknown>) as unknown as AppData
    expect(once.services).toHaveLength(8)
    expect(once.agents).toHaveLength(2)
    expect(once.agentDeployments).toHaveLength(2)
    expect(once.modelAccess).toHaveLength(1)
    expect(twice.services).toHaveLength(8)
    expect(twice.agents).toHaveLength(2)
  })
})

describe('agentes fixos por setor (v13)', () => {
  const d = createSeed()

  it('cada setor é um agente: 23 no governo civil, 8 no militar e 4 na Orzyon', () => {
    expect(sectorAgents(d, 'org-gov-civil')).toHaveLength(23)
    expect(sectorAgents(d, 'org-gov-militar')).toHaveLength(8)
    expect(sectorAgents(d, 'org-orzyon')).toHaveLength(4)
  })

  it('o agente da Fazenda Federal tem as habilidades e os oito pods da Receita', () => {
    const a = sectorAgents(d, 'org-gov-civil').find((x) => x.key === 'fazenda-federal')!
    expect(a.apps.map((x) => x.name)).toEqual(expect.arrayContaining(['Classificação de documentos fiscais', 'Orientação tributária', 'Apoio à auditoria']))
    expect(a.clusterIds).toEqual(['cl-gov-receita'])
    expect(a.services.reduce((acc, x) => acc + x.replicas, 0)).toBe(8)
  })

  it('agentes em execução são menos que o total quando há setores sem serviço', () => {
    expect(sectorAgentsRunning(d, 'org-gov-civil')).toBeGreaterThan(0)
    expect(sectorAgentsRunning(d, 'org-gov-civil')).toBeLessThan(23)
  })
})

describe('migração v12 → v13', () => {
  it('renomeia a Osais, acrescenta as habilidades uma única vez e preserva a instância', () => {
    const v12 = {
      orgs: [{ id: 'org-orzyon' }, { id: 'org-gov-civil' }, { id: 'org-gov-militar' }],
      clusters: [{ id: 'cl-orz-lab' }, { id: 'cl-gov-receita' }],
      applications: [
        { id: 'app-osais-security', orgId: 'org-orzyon', name: 'Osais Security AI Services', slug: 'osais-security-ai-services', description: 'x', kind: 'source', command: '', env: [], version: 'v0.1.0', createdAt: 'x' },
      ],
      services: [
        {
          id: 'svc-osais-lab',
          applicationId: 'app-osais-security',
          clusterId: 'cl-orz-lab',
          name: 'osais-security-ai-services',
          status: 'ativo',
          replicas: 1,
          reservation: { vcpu: 4, memoryGiB: 8, gpus: 0, gpuMemoryGiB: 0 },
          endpoint: 'https://osais-security-ai-services.orzyon-laboratorio.orzyon-cloud.example',
          logs: [],
          trafficBase: 20,
          createdAt: 'x',
        },
      ],
    }
    const once = migrateV12toV13(structuredClone(v12) as unknown as Record<string, unknown>) as unknown as AppData
    const twice = migrateV12toV13(structuredClone(once) as unknown as Record<string, unknown>) as unknown as AppData
    expect(once.applications.find((a) => a.id === 'app-osais-security')).toMatchObject({ name: 'Orzyon Security AI Services', slug: 'orzyon-security-ai-services' })
    expect(once.services.find((s) => s.id === 'svc-osais-lab')).toMatchObject({ name: 'orzyon-security-ai-services' })
    expect(once.services.filter((s) => s.id === 'svc-skill-classificacao')).toHaveLength(1)
    expect(twice.services).toHaveLength(once.services.length)
    expect(twice.applications).toHaveLength(once.applications.length)
  })
})

describe('ações da aba Agentes: replicar e clonar', () => {
  it('replicar cria outra instância da mesma aplicação no mesmo cluster', async () => {
    const svc = getData().services.find((x) => x.id === 'svc-medical-prod')!
    const copy = await replicateService(svc.id)
    expect(copy).toMatchObject({ clusterId: svc.clusterId, applicationId: svc.applicationId, name: `${svc.name}-2` })
  })

  it('clonar um cluster copia serviços e aplicações, mantendo o setor', async () => {
    const before = getData().services.filter((x) => x.clusterId === 'cl-orz-prod').length
    const clone = await cloneCluster('cl-orz-prod', 'Orzyon — Produção (cópia de teste)')
    const copies = getData().services.filter((x) => x.clusterId === clone.id)
    expect(copies).toHaveLength(before)
    for (const s of copies) {
      const app = getData().applications.find((a) => a.id === s.applicationId)
      expect(app?.name).toMatch(/cópia/)
      expect(app?.sector).toBeTruthy()
    }
  })
})

describe('clonar aplicação', () => {
  it('cria outra definição no mesmo setor, sem instâncias', async () => {
    const app = getData().applications.find((a) => a.id === 'app-gov-trabalho')!
    const copy = await cloneApplication(app.id)
    expect(copy).toMatchObject({ orgId: app.orgId, sector: app.sector, kind: app.kind })
    expect(copy.name).toMatch(/cópia/)
    expect(getData().services.some((s) => s.applicationId === copy.id)).toBe(false)
  })
})
