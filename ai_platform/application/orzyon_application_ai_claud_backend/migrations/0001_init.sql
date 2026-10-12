-- Orzyon Cloud — migração inicial (protótipo integrado).
-- Unidades: memória/disco em bytes; vCPU em millicores; dinheiro em centavos.

CREATE TABLE demo_users (
    id          uuid PRIMARY KEY,
    name        text NOT NULL,
    email       text NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
    id                   uuid PRIMARY KEY,
    name                 text NOT NULL,
    slug                 text NOT NULL UNIQUE,
    monthly_budget_cents bigint NOT NULL CHECK (monthly_budget_cents >= 0),
    limit_policy         text NOT NULL CHECK (limit_policy IN ('alertar', 'bloquear_alocacoes', 'pausar_lote')),
    alert_threshold      double precision NOT NULL CHECK (alert_threshold >= 0 AND alert_threshold <= 1),
    is_seed              boolean NOT NULL DEFAULT false,
    created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
    user_id uuid NOT NULL REFERENCES demo_users(id) ON DELETE CASCADE,
    org_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role    text NOT NULL,
    PRIMARY KEY (user_id, org_id)
);

CREATE TABLE org_members (
    id     uuid PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name   text NOT NULL,
    email  text NOT NULL,
    role   text NOT NULL
);
CREATE INDEX org_members_org_idx ON org_members (org_id);

CREATE TABLE sessions (
    token              text PRIMARY KEY,
    user_id            uuid NOT NULL REFERENCES demo_users(id) ON DELETE CASCADE,
    role               text NOT NULL CHECK (role IN ('cliente', 'operador')),
    current_org_id     uuid REFERENCES organizations(id) ON DELETE SET NULL,
    current_cluster_id uuid,
    created_at         timestamptz NOT NULL DEFAULT now(),
    expires_at         timestamptz NOT NULL
);
CREATE INDEX sessions_expiry_idx ON sessions (expires_at);

CREATE TABLE compute_pools (
    id                    uuid PRIMARY KEY,
    name                  text NOT NULL,
    region                text NOT NULL,
    profile               text NOT NULL CHECK (profile IN ('unified', 'dedicated_gpu')),
    hardware              text NOT NULL,
    nodes                 integer NOT NULL CHECK (nodes > 0),
    vcpu_per_node         integer NOT NULL,
    memory_per_node_bytes bigint NOT NULL,
    gpus_per_node         integer NOT NULL,
    vram_per_gpu_bytes    bigint NOT NULL DEFAULT 0,
    health                text NOT NULL CHECK (health IN ('saudavel', 'atencao', 'degradado')),
    nodes_degraded        integer NOT NULL DEFAULT 0
);

CREATE TABLE pool_nodes (
    pool_id uuid NOT NULL REFERENCES compute_pools(id) ON DELETE CASCADE,
    idx     integer NOT NULL,
    health  text NOT NULL DEFAULT 'saudavel' CHECK (health IN ('saudavel', 'atencao', 'degradado')),
    PRIMARY KEY (pool_id, idx)
);

CREATE TABLE clusters (
    id                        uuid PRIMARY KEY,
    org_id                    uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    pool_id                   uuid NOT NULL REFERENCES compute_pools(id) ON DELETE RESTRICT,
    name                      text NOT NULL,
    purpose                   text NOT NULL DEFAULT '',
    modality                  text NOT NULL CHECK (modality IN ('virtual', 'dedicado')),
    profile                   text NOT NULL CHECK (profile IN ('unified', 'dedicated_gpu')),
    status                    text NOT NULL CHECK (status IN ('provisionando', 'ativo', 'pausado')),
    nodes                     integer NOT NULL CHECK (nodes > 0),
    vcpu_per_node_millicores  bigint NOT NULL,
    memory_per_node_bytes     bigint NOT NULL,
    gpus_per_node             integer NOT NULL,
    vram_per_gpu_bytes        bigint NOT NULL DEFAULT 0,
    gpu_share_per_node_bytes  bigint NOT NULL DEFAULT 0,
    storage_bytes             bigint NOT NULL,
    monthly_budget_cents      bigint NOT NULL DEFAULT 0,
    limit_policy              text NOT NULL CHECK (limit_policy IN ('alertar', 'bloquear_alocacoes', 'pausar_lote')),
    created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX clusters_org_name_key ON clusters (org_id, lower(name));
CREATE INDEX clusters_org_idx ON clusters (org_id);
CREATE INDEX clusters_pool_idx ON clusters (pool_id);

-- Histórico de capacidade/status para custo por segmentos (sem retroatividade).
CREATE TABLE cluster_capacity_history (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cluster_id     uuid NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    effective_from timestamptz NOT NULL,
    capacity       jsonb NOT NULL,
    status         text NOT NULL
);
CREATE INDEX cluster_capacity_history_idx ON cluster_capacity_history (cluster_id, effective_from);

CREATE TABLE model_profiles (
    id            uuid PRIMARY KEY,
    name          text NOT NULL,
    params_b      double precision NOT NULL,
    max_context   integer NOT NULL,
    quantizations jsonb NOT NULL,
    description   text NOT NULL,
    tag           text NOT NULL
);

CREATE TABLE inference_engines (
    id            uuid PRIMARY KEY,
    name          text NOT NULL,
    vendor        text NOT NULL,
    description   text NOT NULL,
    profiles      jsonb NOT NULL,
    compatibility text NOT NULL,
    requires_gpu  boolean NOT NULL
);

CREATE TABLE model_deployments (
    id                    uuid PRIMARY KEY,
    cluster_id            uuid NOT NULL REFERENCES clusters(id) ON DELETE RESTRICT,
    name                  text NOT NULL,
    model_id              uuid NOT NULL REFERENCES model_profiles(id) ON DELETE RESTRICT,
    engine_id             uuid NOT NULL REFERENCES inference_engines(id) ON DELETE RESTRICT,
    quantization          text NOT NULL CHECK (quantization IN ('FP16', 'FP8', 'INT8', 'INT4')),
    context_length        integer NOT NULL,
    status                text NOT NULL CHECK (status IN ('preparando', 'carregando', 'disponivel', 'pausado', 'falha')),
    res_vcpu_millicores   bigint NOT NULL,
    res_memory_bytes      bigint NOT NULL,
    res_gpus              integer NOT NULL,
    res_gpu_memory_bytes  bigint NOT NULL,
    failure_reason        text,
    created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX model_deployments_cluster_idx ON model_deployments (cluster_id);

CREATE TABLE agents (
    id                      uuid PRIMARY KEY,
    cluster_id              uuid NOT NULL REFERENCES clusters(id) ON DELETE RESTRICT,
    name                    text NOT NULL,
    description             text NOT NULL DEFAULT '',
    status                  text NOT NULL CHECK (status IN ('ativo', 'pausado')),
    tags                    jsonb NOT NULL DEFAULT '[]',
    system_prompt           text NOT NULL DEFAULT '',
    deployment_id           uuid REFERENCES model_deployments(id) ON DELETE RESTRICT,
    analysis_profile        text NOT NULL,
    temperature             double precision NOT NULL,
    max_tokens              integer NOT NULL,
    tools                   jsonb NOT NULL DEFAULT '[]',
    knowledge               jsonb NOT NULL DEFAULT '[]',
    routes                  jsonb NOT NULL DEFAULT '[]',
    concurrency             integer NOT NULL CHECK (concurrency >= 1),
    runtime_vcpu_millicores bigint NOT NULL,
    runtime_memory_bytes    bigint NOT NULL,
    traffic_base            double precision NOT NULL DEFAULT 0,
    updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agents_cluster_idx ON agents (cluster_id);
CREATE INDEX agents_deployment_idx ON agents (deployment_id);

CREATE TABLE services (
    id                    uuid PRIMARY KEY,
    cluster_id            uuid NOT NULL REFERENCES clusters(id) ON DELETE RESTRICT,
    name                  text NOT NULL,
    kind                  text NOT NULL CHECK (kind IN ('source', 'image')),
    runtime               text CHECK (runtime IN ('python', 'mojo', 'python_mojo')),
    file_name             text,
    code                  text,
    image                 text,
    command               text NOT NULL DEFAULT '',
    env                   jsonb NOT NULL DEFAULT '[]',
    version               text NOT NULL,
    status                text NOT NULL CHECK (status IN ('na_fila', 'construindo', 'implantando', 'ativo', 'pausado', 'falha')),
    res_vcpu_millicores   bigint NOT NULL,
    res_memory_bytes      bigint NOT NULL,
    res_gpus              integer NOT NULL,
    res_gpu_memory_bytes  bigint NOT NULL,
    endpoint              text NOT NULL,
    traffic_base          double precision NOT NULL DEFAULT 0,
    failure_reason        text,
    created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX services_cluster_name_key ON services (cluster_id, name);
CREATE INDEX services_cluster_idx ON services (cluster_id);

CREATE TABLE service_logs (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    ts         timestamptz NOT NULL DEFAULT now(),
    level      text NOT NULL CHECK (level IN ('info', 'aviso', 'erro')),
    message    text NOT NULL
);
CREATE INDEX service_logs_service_idx ON service_logs (service_id, ts, id);

CREATE TABLE jobs (
    id           uuid PRIMARY KEY,
    org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind         text NOT NULL,
    status       text NOT NULL CHECK (status IN ('pending', 'running', 'done', 'failed')),
    progress     integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    payload      jsonb NOT NULL DEFAULT '{}',
    result       jsonb,
    error        text,
    attempts     integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 3,
    run_after    timestamptz NOT NULL DEFAULT now(),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_poll_idx ON jobs (status, run_after);
CREATE INDEX jobs_org_idx ON jobs (org_id);

CREATE TABLE activity_events (
    id         uuid PRIMARY KEY,
    org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cluster_id uuid,
    ts         timestamptz NOT NULL DEFAULT now(),
    level      text NOT NULL CHECK (level IN ('info', 'sucesso', 'aviso', 'erro')),
    source     text NOT NULL,
    message    text NOT NULL
);
CREATE INDEX activity_events_org_idx ON activity_events (org_id, ts DESC);

CREATE TABLE idempotency_keys (
    org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    endpoint     text NOT NULL,
    key          text NOT NULL,
    request_hash text NOT NULL,
    response     jsonb NOT NULL,
    status_code  integer NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, endpoint, key)
);
