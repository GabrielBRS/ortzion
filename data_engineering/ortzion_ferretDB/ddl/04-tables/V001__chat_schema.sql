-- ============================================================================
-- V001: Chat AI baseline schema
-- Idempotente: pode rodar múltiplas vezes sem efeito colateral.
-- ============================================================================

BEGIN;

-- Sessions: agrupa N mensagens de um usuário em uma "conversa"
CREATE TABLE IF NOT EXISTS chat_session (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,                    -- vem do sgt-identity
    title           TEXT        NOT NULL DEFAULT 'Nova conversa',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,                              -- soft delete
    metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb -- extensão livre
);

CREATE INDEX IF NOT EXISTS ix_chat_session_user
    ON chat_session (user_id, updated_at DESC)
    WHERE deleted_at IS NULL;

-- Messages: as mensagens individuais dentro de uma session
CREATE TABLE IF NOT EXISTS chat_message (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID        NOT NULL
                                REFERENCES chat_session(id) ON DELETE CASCADE,
    role            TEXT        NOT NULL
                                CHECK (role IN ('user','assistant','system','tool')),
    content         TEXT        NOT NULL,
    token_count     INT,                                       -- nullable; preenche depois
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_chat_message_session
    ON chat_message (session_id, created_at ASC);

-- Trigger pra manter chat_session.updated_at atualizado quando vem mensagem nova
CREATE OR REPLACE FUNCTION touch_session_on_message() RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_session
       SET updated_at = now()
     WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_session ON chat_message;
CREATE TRIGGER trg_touch_session
    AFTER INSERT ON chat_message
    FOR EACH ROW EXECUTE FUNCTION touch_session_on_message();

COMMIT;