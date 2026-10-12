# sgt_vault — v1

KV secrets server. Unseal por passphrase (Argon2id), identidade por mTLS, policy como dado.

**Não compilei este código** — o container não tem Rust ≥ 1.80. O `cargo check` é seu.

---

## As 6 correções de mentalidade Java

### 1. Módulo é arquivo, não pasta

Você tinha `src/api/api.rs` **e** `src/api.rs`. Isso é `package api` + `class Api`.

```
src/seal.rs      ← É o módulo `seal`
src/seal/        ← guarda os FILHOS dele
  passphrase.rs  ← é `seal::passphrase`
```

A pasta só existe se houver filhos. `mod.rs` é a forma antiga (Rust 2015) — não use.

### 2. Um arquivo ≠ um tipo

Java força 1 classe pública = 1 arquivo. É limitação da linguagem, não design.
`keyring.rs` tem `Keyring` + `Envelope` + as constantes + os testes. Uma ideia, um arquivo.

### 3. Sem `service` / `repository` / `handler` / `dto` / `util`

Vocabulário de framework. Um vault tem `seal`, `keyring`, `store`, `auth`, `audit`.
O nome do módulo diz o que o sistema **é**.

### 4. Sem `IStore` / `StoreImpl`

O `I` e o `Impl` existem porque em Java interface e classe brigam pelo mesmo namespace.
Em Rust: `trait Store` + `struct FsStore`. O nome diz a tecnologia, não a posição na hierarquia.

### 5. `lib.rs` + `main.rs` — a que mais dói

Não tem equivalente Java. **Toda a lógica vive em `lib.rs`.** O `main.rs` é o composition root e nada mais.

`tests/` compila como crate separado e **só enxerga a lib**. Lógica no `main.rs` é literalmente inalcançável para teste de integração. Veja `tests/integracao.rs`: ele só existe por causa dessa separação.

### 6. Enum, não hierarquia de exceção

`VaultError` é um enum. O `match` é exaustivo — variante nova sem tratamento não compila.
Sem `instanceof`, sem catch por tipo pai.

---

## Árvore

```
src/
  lib.rs             o sistema
  main.rs            só o composition root
  config.rs          ÚNICO lugar que lê std::env
  error.rs           VaultError + IntoResponse
  seal.rs            trait Unsealer + máquina de estados   ← o coração
  seal/passphrase.rs adapter Argon2id
  keyring.rs         envelope encryption
  store.rs           trait Store + normalizar()
  store/fs.rs        adapter filesystem
  auth.rs            Identidade (mTLS) + VaultAberto
  auth/policy.rs     deny-by-default
  audit.rs           cadeia de hash
  tls.rs             accept loop mTLS
  api.rs             UMA rota de KV
  api/sys.rs         init / unseal / seal
  api/kv.rs          os handlers
tests/integracao.rs  a máquina de estados
policies/*.toml      dado, versionado em git
```

## Rodar

```bash
cargo check                 # comece por aqui
cargo test                  # unitários + integração, sem TLS

# certs de dev (o real vem do sgt-identity):
mkdir -p certs && cd certs
openssl req -x509 -newkey ed25519 -days 365 -nodes \
  -keyout sgt-ca.key.pem -out sgt-ca.crt.pem -subj "/CN=SGT Dev CA"
openssl req -newkey ed25519 -nodes -keyout vault.key.pem -out vault.csr \
  -subj "/CN=vault.sgt.internal"
openssl x509 -req -in vault.csr -CA sgt-ca.crt.pem -CAkey sgt-ca.key.pem \
  -CAcreateserial -days 365 -out vault.crt.pem \
  -extfile <(printf "subjectAltName=DNS:localhost,DNS:vault.sgt.internal")
# cert de cliente — o SAN URI É a identidade:
openssl req -newkey ed25519 -nodes -keyout pix.key.pem -out pix.csr -subj "/CN=pix"
openssl x509 -req -in pix.csr -CA sgt-ca.crt.pem -CAkey sgt-ca.key.pem \
  -CAcreateserial -days 365 -out pix.crt.pem \
  -extfile <(printf "subjectAltName=URI:spiffe://sgt/smart-finance/pix")
cd ..

cp .env.exemplo .env && set -a && . ./.env && set +a
cargo run
```

```bash
V=https://localhost:8200
CA="--cacert certs/sgt-ca.crt.pem"
PIX="--cert certs/pix.crt.pem --key certs/pix.key.pem"

curl $CA $PIX $V/sys/estado                                    # selado
curl $CA $PIX -X POST $V/sys/init   -d '{"partes":["senha-forte-aqui"]}' -H 'content-type: application/json'
curl $CA $PIX -X POST $V/sys/unseal -d '{"parte":"senha-forte-aqui"}'    -H 'content-type: application/json'

curl $CA $PIX $V/v1/kv/smart-finance/pix/db                    # 403: pix não escreve
curl $CA $PIX $V/v1/kv/smart-finance/credito/db                # 403: fora do prefixo
curl $CA $PIX $V/v1/kv/smart-finance/pix/../../__sys/selo      # 400: traversal
curl $CA $PIX -X POST $V/sys/seal && curl $CA $PIX $V/v1/kv/smart-finance/pix/db  # 503
```

## Onde eu tenho menos certeza

1. **`tls.rs` / `conexao()`** — o casamento `hyper::service::service_fn` + `Router` + `ServiceExt::ready`. É o padrão do exemplo `low-level-rustls` do axum, mas a API do hyper 1.x + hyper-util muda. Se der erro de trait bound, compare com `tokio-rs/axum/examples/low-level-rustls`.
2. **`rustls::crypto::ring::default_provider()`** — pode ser `aws_lc_rs` dependendo das features. Se reclamar, troque.
3. **`WebPkiClientVerifier::builder()`** — assinatura mexeu entre 0.22 e 0.23.
4. **`#[derive(FromRef)]` no AppState** — precisa de `axum` com feature `macros`. Está no Cargo.toml.

O resto (`seal`, `keyring`, `store`, `auth/policy`) é Rust comum e tem teste.

## v2

- `seal/tpm.rs` — confira `ls -l /dev/tpmrm0` primeiro. Auto-unseal + recovery keys Shamir offline. Nunca Shamir como mecanismo principal com você sendo o único operador.
- Keyring versionado de verdade (rotação da root key).
- Leases + TTL + revogação. É o que transforma vazamento em janela de 5 min.
- Audit fail-closed: hoje ele grita e continua. Deveria abortar o request.