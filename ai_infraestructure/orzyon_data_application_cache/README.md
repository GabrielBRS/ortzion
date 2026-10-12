# orzyon_data_application_cache

Componente da plataforma **Orzyon AI Cloud**: um serviço de **cache chave-valor em
memória**, acessado exclusivamente por **gRPC** por outras aplicações da plataforma.

O armazenamento vive **dentro do próprio processo Rust** (biblioteca Moka
embarcada) — não há Redis, Valkey ou qualquer servidor externo de dados. O motor de
armazenamento é interno; o acesso *entre aplicações* acontece pela rede via gRPC.

## Características

- `Put` — insere ou substitui uma entrada;
- `Get` — busca uma entrada, distinguindo explicitamente **cache miss** de um
  **hit com valor vazio** (campo `found` no `GetResponse`);
- `Delete` — remove de forma **idempotente** (excluir chave inexistente não falha);
- Identificação por **`(namespace, key)`**: namespaces diferentes podem usar a
  mesma chave sem colisão. Namespace é separação **lógica**, não autorização;
- Valores binários (`bytes` no Protobuf) — o consumidor não é obrigado a usar JSON;
- **TTL** por entrada (o do request, ou um padrão configurável) e **capacidade
  alvo** global em quantidade de entradas;
- Validação de namespace, chave e tamanho máximo do valor, com limites coerentes
  para as mensagens gRPC;
- Encerramento gracioso (SIGINT/SIGTERM).

## ⚠️ Volatilidade dos dados

O cache é **puramente em memória**. **Todos os dados são perdidos quando o
processo termina** — inclusive em shutdown gracioso, reinício, deploy ou crash.
Este serviço é um cache, não uma fonte de verdade.

## ⚠️ Exposição de rede

O endereço padrão é `127.0.0.1:50051` (loopback). Esta versão **não possui
autenticação nem autorização** para o acesso entre serviços: **não a exponha em
interface pública**. A restrição de acesso deve vir da rede (interfaces,
firewall, service mesh), não da aplicação.

Nenhum log registra valores de entradas, credenciais ou dados sensíveis — os
handlers logam apenas metadados (namespace, chave, tamanho do valor) no nível
`debug`.

## Arquitetura

Arquitetura hexagonal (Ports and Adapters) com **Composition Root explícito**,
em um único pacote Cargo:

```
                        ┌──────────────────────────────┐
   gRPC (Tonic) ──────▶ │  ADAPTER INBOUND (grpc)      │  handlers: conversão
                        │  - cache_service             │  Protobuf ↔ tipos internos,
                        │  - error_mapping             │  tradução de erros p/ Status
                        └──────────────┬───────────────┘
                                       ▼
                        ┌──────────────────────────────┐
                        │  APPLICATION                 │  casos de uso:
                        │  - use_cases (put/get/delete)│  validação, regras, TTL
                        │  - ports::CacheRepository    │  trait de armazenamento
                        └──────┬───────────────┬───────┘
                               ▼               ▼
                        ┌─────────────┐ ┌──────────────────────────────┐
                        │  DOMAIN     │ │  ADAPTER OUTBOUND (cache)    │
                        │  key, error │ │  - MokaCacheRepository       │
                        └─────────────┘ └──────────────────────────────┘
                                       ▼
                        ┌──────────────────────────────┐
                        │  COMPOSITION ROOT            │  montagem explícita de
                        │  composition_root.rs         │  todas as dependências
                        └──────────────────────────────┘
```

### Módulos

| Caminho | Responsabilidade |
| --- | --- |
| `src/domain/` | Tipos e regras puras: `CacheKey` (identidade estruturada `(Namespace, EntryKey)`), `CacheError`. **Não** importa Tonic, Protobuf, Moka ou DashMap. |
| `src/application/ports/` | Traits dos ports: `CacheRepository` (armazenamento). |
| `src/application/use_cases/` | Casos de uso `PutEntry`, `GetEntry`, `DeleteEntry`: validação, limite de tamanho, resolução de TTL. Dependem apenas do port (via `Arc<dyn CacheRepository>`). |
| `src/adapters/inbound/grpc/` | Servidor/handlers gRPC e mapeamento de erros para `tonic::Status`. Sem regras de negócio e sem acesso direto ao Moka. |
| `src/adapters/outbound/cache/` | Implementação do `CacheRepository` com `moka::future::Cache`. |
| `src/composition_root.rs` | Ponto único de montagem: config → logs → repositório Moka → casos de uso → handlers → serviços gRPC → servidor + shutdown gracioso. |
| `src/config.rs` | Configuração por variáveis de ambiente, com validação. |
| `src/main.rs` | Mínimo: inicializa o runtime Tokio e delega ao Composition Root. |
| `proto/orzyon/cache/v1/cache.proto` | Contrato Protobuf (`package orzyon.cache.v1`). |
| `examples/cache_client.rs` | Cliente Rust de exemplo (Put, Get, Delete). |
| `tests/` | Testes de domínio, casos de uso, adaptador Moka, integração gRPC e configuração. |

### Decisões de design

- **Moka é o único repositório de dados.** Capacidade, TTL por entrada e
  expiração são delegados a ele.
- **DashMap deliberadamente não usado nesta etapa.** Não existe estado auxiliar
  concorrente que justifique uma segunda estrutura de dados; adicioná-lo seria
  complexidade especulativa. Se um dia houver necessidade concreta (ex.:
  contadores/indexes auxiliares fora do domínio), ele entra nos adapters
  outbound — nunca no domínio — e sem guards atravessando `.await`.
- **Identidade estruturada, sem concatenação de strings.** `CacheKey` compõe
  `Namespace` + `EntryKey` como campos e deriva `Hash`/`Eq` sobre a estrutura;
  pares como `("a", "bc")` e `("ab", "c")` são distintos por construção. A chave
  usada internamente pelo Moka é o próprio `CacheKey`.
- **Capacidade é contagem de entradas, não bytes de RAM.** `max_capacity` define
  um alvo de cardinalidade; ao excedê-lo, o Moka aplica evicção aproximada por
  frequência/recência (W-TinyLFU). Não há garantia de limite rígido de memória.
- **TTL padrão configurável + TTL por request.** Se o request informa `ttl`, ele
  vale; senão aplica-se `ORZYON_CACHE_DEFAULT_TTL_SECS`. TTL zero é rejeitado.
- **Regras vivem nos casos de uso.** Os handlers gRPC só convertem mensagens e
  traduzem erros; o domínio só valida identidade. Assim, transporte e
  armazenamento são substituíveis independentemente.

## Contrato gRPC (`orzyon.cache.v1`)

| RPC | Descrição |
| --- | --- |
| `Put(PutRequest) → PutResponse` | Insere/substitui. `PutRequest{namespace, key, value: bytes, ttl?: google.protobuf.Duration}`. |
| `Get(GetRequest) → GetResponse` | `GetResponse{found: bool, value: bytes}`. `found=false` ⇒ miss (ignore `value`); `found=true` ⇒ hit (value pode ser vazio). |
| `Delete(DeleteRequest) → DeleteResponse` | `DeleteResponse{deleted: bool}` — `false` quando a chave não existia (sem erro). |

Geração de código: `build.rs` invoca `tonic-build` (que usa `prost-build`) sobre
`proto/orzyon/cache/v1/cache.proto`. Os artefatos vão para `OUT_DIR` e são
incluídos no módulo `pb` (`src/lib.rs`).

### Requisitos para gerar o código Protobuf

- **Rust estável** com `cargo`, `rustfmt` e `clippy`;
- **`protoc`** (Protocol Buffers compiler) instalado e no `PATH` — necessário
  para o `prost-build`/`tonic-build` compilar o `.proto` (as *well-known types*
  como `google/protobuf/duration.proto` já acompanham o `prost-build`/`protoc`).

Regenerar acontece automaticamente a cada `cargo build`/`cargo test` quando o
`.proto` muda. Não é preciso commitar código gerado.

## Configuração

Todas as configurações são variáveis de ambiente (a aplicação **não** carrega
`.env` automaticamente — exporte no shell ou configure o orquestrador). Veja
`.env.example`.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `ORZYON_CACHE_GRPC_ADDR` | `127.0.0.1:50051` | Endereço/porta do servidor gRPC. Loopback apenas por padrão. |
| `ORZYON_CACHE_DEFAULT_TTL_SECS` | `300` | TTL padrão (segundos) para entradas sem TTL próprio. |
| `ORZYON_CACHE_MAX_CAPACITY` | `100000` | Capacidade alvo em **nº de entradas** (não é limite de RAM). |
| `ORZYON_CACHE_MAX_ENTRY_BYTES` | `1048576` (1 MiB) | Tamanho máximo de um valor. |
| `ORZYON_CACHE_GRPC_MAX_DECODING_BYTES` | `4194304` (4 MiB) | Limite de mensagem gRPC recebida; deve ser maior que o limite de entrada. |
| `ORZYON_LOG_LEVEL` | `info` | Filtro de log (sintaxe `tracing-subscriber` EnvFilter). |

Validação aplicada na carga: TTL, capacidade e limite de entrada devem ser
maiores que zero; o limite gRPC deve ser maior que o limite de entrada.

## Como executar

```sh
# compilar
cargo build

# testes
cargo test

# servidor (em um terminal)
ORZYON_LOG_LEVEL=debug cargo run

# cliente de exemplo (em outro terminal) — Put, Get e Delete
cargo run --example cache_client
# ou apontando para outro endereço:
ORZYON_CACHE_GRPC_ADDR=127.0.0.1:50051 cargo run --example cache_client
```

Verificações de qualidade:

```sh
cargo fmt --check
cargo check
cargo clippy --all-targets -- -D warnings
cargo test
```

Encerre o servidor com `Ctrl+C` (SIGINT) ou `kill -TERM <pid>`: o drain gracioso
é executado e os dados em memória são descartados.

## Fora de escopo (nesta etapa)

Replicação, consenso, cluster, persistência em disco, redb, LanceDB, integração
de dados, gerenciamento de sessões, autenticação/autorização completas, e
paridade de recursos com Redis. A arquitetura hexagonal permite evoluir para
esses pontos sem reescrever domínio e casos de uso, mas **nenhuma abstração
especulativa** para eles foi criada agora.
