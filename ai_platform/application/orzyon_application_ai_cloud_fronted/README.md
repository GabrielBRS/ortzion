# Orzyon Cloud — Frontend (demonstração)

Console web da Orzyon Cloud para contratação e administração de clusters de IA. Esta etapa é **somente frontend**: autenticação, provisionamento, inferência, builds e faturamento são simulados localmente.

## Executar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # checagem de tipos + build de produção em dist/
npm run typecheck  # apenas checagem de tipos
npm run preview    # serve o build de produção
npm test           # testes de agregação e integridade (vitest)
```

Requer Node.js 20 ou superior.

## Modo demonstrativo

- **Login**: “Entrar” e “Explorar demonstração” abrem o painel com uma sessão fictícia. Nenhuma credencial é validada; a senha não é enviada nem armazenada.
- **Sessão**: guardada apenas em `sessionStorage` (aba atual). “Sair” a remove.
- **Dados**: organizações, clusters, aplicações, serviços, agentes e implantações ficam em `localStorage` (chave `orzyon-cloud:data`, esquema v7). Recarregar a página preserva as alterações.
- **Restaurar demonstração**: menu do usuário → “Restaurar demonstração” (ou Configurações).
- **Perfil operador**: menu do usuário → “Operador da cloud” libera a área “Operação da cloud”. É comportamento de interface, não um controle de segurança.
- Provisionamento de clusters, carregamento de modelos e builds de serviço são máquinas de estado com tempos simulados. Nenhum código é executado, nenhum arquivo é enviado e o playground usa respostas predefinidas.
- Custos usam uma tabela de tarifas fictícia; valores são ilustrativos e não representam oferta comercial. As organizações governamentais são cenários fictícios.

## Estrutura

```
src/
  domain/types.ts        Tipos de domínio (contratos futuros das APIs)
  mock/seed.ts           Dados iniciais fictícios
  mock/demoOrgs.ts       Cadastros das organizações de demonstração (Orzyon, governo civil e militar)
  mock/pricing.ts        Tabela de tarifas fictícia (fonte única das estimativas)
  mock/samples.ts        Exemplos de código e respostas do playground
  services/store.ts      Persistência local (localStorage/sessionStorage) e assinatura reativa
  services/api.ts        Serviços mock assíncronos (todas as mutações) e simulações
  lib/capacity.ts        Regras de capacidade, memória unificada e estimativa de memória de modelos
  lib/metrics.ts         Séries temporais determinísticas
  lib/costs.ts           Custos de capacidade reservada e consumo variável
  state/AppContext.tsx   Sessão, organização e cluster em foco
  components/            AppShell, ResourceMeter, StatusBadge, ConfirmDialog, ThemeArt (ilustrações), gráficos, tabelas…
  pages/                 Uma página por rota
```

## Regras de domínio relevantes

- Hierarquia (também a ordem do menu): Organização → Agentes → Clusters → Serviços → Aplicações → Modelos. Um agente usa um ou mais clusters; um cluster executa serviços; um serviço é instância de uma aplicação. Pools pertencem à infraestrutura.
- **Aplicação** é o código-fonte ou a imagem que a organização sobe. Ela pertence à organização e não executa sozinha.
- **Serviço** é uma instância de uma aplicação em um cluster, com réplicas e reserva por réplica (CPU, memória e GPU). Uma aplicação pode ter várias instâncias. Não é possível excluir uma aplicação com instâncias.
- **Memória unificada**: um único total físico por nó, com uma parcela destinada à GPU; nunca somada como RAM + VRAM independentes.
- **GPU dedicada**: RAM do host e VRAM das GPUs exibidas separadamente.
- Cada carga precisa caber em um único nó; memória de nós diferentes não forma uma GPU única.
- Uma implantação de modelo pode atender vários agentes sem multiplicar a memória dos pesos. Implantações em uso não podem ser removidas.
- Pausados e com falha liberam a reserva. A capacidade não pode ser reduzida abaixo do reservado.
- Custos separam capacidade reservada (pela capacidade contratada) de consumo variável (gateway, transferência, logs); tokens não são cobrados de novo.

## Organizações, aplicações e página inicial

- **Tipo da organização** (`segment`): `orzyon`, `governo_civil`, `governo_militar` ou `b2b`. Define o grupo no seletor (Orzyon, Governo, Clientes B2B) e a ambientação da página inicial.
- **Início** (`/`): é para onde a pessoa vai ao entrar ou trocar de organização. Mostra a ambientação do segmento e os setores tecnológicos, que são aplicações da organização: cada setor leva à sua aplicação. Governo civil: economia, segurança, estradas, justiça, receita, comércio, alfândega, cultura, bancos e Banco Central. Governo militar: aviação, drones, blindados, vigilância, comando, teatro de guerra, infantaria e naval. Orzyon: sistemas médicos, financeiros e de segurança. B2B: sem setores.
- **Dashboard** (`/dashboard`): métricas em tempo real (clusters, aplicações, serviços, agentes, requisições, custos e alertas). Cada indicador e cada item da lista leva ao detalhe.
- **Criar nova organização** (seletor de organização): cria uma organização B2B, com o responsável como proprietário. Ela aparece no grupo “Clientes B2B”.
- Os cenários de governo são fictícios. A organização militar começa com um cluster demonstrativo e sem aplicações.

## Agentes, implantações e réplicas

- **Agente**: definição reutilizável da organização (identidade, configuração versionada).
- **Implantação de agente**: execução de uma versão do agente em exatamente um cluster, com destino de inferência próprio (implantação de modelo local ou de outro cluster, modelo compartilhado Orzyon ou API externa). Salvar o agente cria nova versão; cada implantação só muda ao aplicar a versão explicitamente.
- **Réplica**: instância de uma implantação (pod simulado), com nó, estado, uptime e reinícios. O runtime do agente reserva CPU/memória por réplica; a GPU pertence à implantação de modelo.
- Clusters expandem na listagem com nós, cargas por nó e telemetria simulada atualizada a cada 1 s (janela de 5 min, pausável).
- Dados salvos no formato anterior (agente com `clusterId`) são migrados automaticamente (esquema v5 → v6) em `src/services/migrations.ts`.
- Esquema v6 → v7: “Governo — Demonstração” vira “Governo — Civil” (a organização militar é acrescentada) e cada serviço antigo vira uma instância de uma aplicação com o mesmo nome, preservando código, comando, versão e réplicas.

## Catálogo de modelos e cobrança

- **Inferência compartilhada Orzyon**: modelos hospedados (Qwen, DeepSeek, Kimi, gpt-oss), cobrados por tokens com preço definido pela Orzyon.
- **Modelos externos** (OpenAI, Anthropic, xAI, Moonshot): cobrados por tokens com preço do provedor × multiplicador (padrão 5×), convertido por câmbio de referência. Custo do fornecedor e multiplicador ficam só em *Operação da cloud*; o cliente vê o preço final e é avisado de que o conteúdo é processado pelo provedor.
- **Implantação dedicada**: modelo hospedado carregado em um cluster do cliente, cobrado pela capacidade reservada.
- Licença do modelo e local de execução são campos separados. Só modelos e combinações motor + hardware **homologados** podem ser usados ou implantados.
- Especificações dos modelos são candidatas de avaliação e as tarifas são demonstrativas: confirmar identificador, versão, licença e tarifa vigente no cadastro (`src/mock/seed.ts`).

## Substituição por APIs reais

1. Manter `domain/types.ts` como contrato.
2. Reimplementar as funções de `services/api.ts` com chamadas HTTP, preservando assinaturas e o `ApiError` (mensagem + detalhes).
3. Trocar `useData()` de `services/store.ts` por um cache de requisições (por exemplo, React Query) e remover `tickSimulations` — os estados passam a vir do backend (polling ou eventos).
4. Substituir `login()` em `state/AppContext.tsx` pelo fluxo de autenticação real.
5. Métricas (`lib/metrics.ts`) e custos (`lib/costs.ts`) passam a vir de endpoints de observabilidade e faturamento; `mock/pricing.ts` deixa de ser usado.
6. A logo provisória está em `components/Logo.tsx`.

## Limitações conhecidas

- Não há backend, autenticação, autorização, cobrança ou inferência reais.
- Simulações em andamento avançam apenas com o painel aberto; ao reabrir, etapas vencidas são aplicadas de uma vez.
- Histórico do playground é mantido apenas em memória durante a navegação.
- Séries de métricas são sintéticas e determinísticas; não representam medições em hardware real.
