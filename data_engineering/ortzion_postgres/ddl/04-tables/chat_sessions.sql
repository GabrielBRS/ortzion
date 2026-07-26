-- V1__chat_sessions.sql

CREATE TABLE chat_session (
    id                  UUID PRIMARY KEY,
    tenant_id           VARCHAR(64) NOT NULL,
    patient_id          UUID NOT NULL,
    primary_doctor_id   UUID NOT NULL,
    started_at          TIMESTAMPTZ NOT NULL,
    status              VARCHAR(16) NOT NULL,
    status_changed_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_chat_session_patient
    ON chat_session (tenant_id, patient_id, status);

CREATE INDEX idx_chat_session_doctor
    ON chat_session (tenant_id, primary_doctor_id, status);

CREATE TABLE chat_conversation_turn (
    id                  UUID PRIMARY KEY,
    session_id          UUID NOT NULL REFERENCES chat_session(id),
    sequence_number     INT NOT NULL,
    role                VARCHAR(16) NOT NULL,
    content             TEXT NOT NULL,
    model_used          VARCHAR(64),
    input_tokens        INT,
    output_tokens       INT,
    created_at          TIMESTAMPTZ NOT NULL,
    UNIQUE (session_id, sequence_number)
);

CREATE INDEX idx_chat_turn_session
    ON chat_conversation_turn (session_id, sequence_number);

CREATE TABLE chat_access (
    id                  UUID PRIMARY KEY,
    session_id          UUID NOT NULL REFERENCES chat_session(id),
    grantee_id          UUID NOT NULL,
    grantee_kind        VARCHAR(16) NOT NULL,
    access_level        VARCHAR(32) NOT NULL,
    granted_by          UUID NOT NULL,
    granted_at          TIMESTAMPTZ NOT NULL,
    expires_at          TIMESTAMPTZ,
    revoked_at          TIMESTAMPTZ,
    revoked_by          UUID
);

CREATE INDEX idx_chat_access_session
    ON chat_access (session_id) WHERE revoked_at IS NULL;

CREATE INDEX idx_chat_access_grantee
    ON chat_access (grantee_id, revoked_at);