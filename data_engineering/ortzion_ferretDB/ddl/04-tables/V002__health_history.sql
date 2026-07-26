CREATE TABLE health_history (
    id              UUID        PRIMARY KEY,
    patient_id      UUID        NOT NULL REFERENCES patient(id),
    status          SMALLINT    NOT NULL,
    supersedes      UUID        REFERENCES health_history(id),
    created_at      TIMESTAMPTZ NOT NULL,
    valid_from      TIMESTAMPTZ NOT NULL,
    valid_to        TIMESTAMPTZ,
    sys_period      TSTZRANGE   NOT NULL DEFAULT tstzrange(now(), NULL)
);

CREATE TABLE health_history_entry (
    id                  UUID        PRIMARY KEY,
    health_history_id   UUID        NOT NULL REFERENCES health_history(id),
    exam_type           SMALLINT    NOT NULL,
    exam_type_label     TEXT        NOT NULL,
    exam_date           DATE        NOT NULL,
    -- proveniência
    source_document_id  UUID        NOT NULL,
    source_page         INTEGER,
    ai_model_id         TEXT        NOT NULL,
    ai_model_version    TEXT        NOT NULL,
    confidence          DOUBLE PRECISION NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    extracted_at        TIMESTAMPTZ NOT NULL,
    reviewed_by         UUID,
    reviewed_at         TIMESTAMPTZ,
    -- payload dinâmico
    findings            JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_findings_gin
    ON health_history_entry USING GIN (findings jsonb_path_ops);

CREATE INDEX idx_entry_by_history
    ON health_history_entry (health_history_id);

CREATE INDEX idx_history_by_patient_valid
    ON health_history (patient_id, valid_from DESC);