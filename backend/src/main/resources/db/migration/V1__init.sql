-- V1__init.sql — Escorts Kubota AI Service Assistant initial schema

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Users & roles
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    full_name      VARCHAR(255),
    phone          VARCHAR(32),
    preferred_lang VARCHAR(8) NOT NULL DEFAULT 'en',
    region         VARCHAR(64),
    dealer_code    VARCHAR(64),
    enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
    id   SMALLSERIAL PRIMARY KEY,
    name VARCHAR(32) NOT NULL UNIQUE
);

INSERT INTO roles(name) VALUES ('CUSTOMER'),('DEALER'),('SERVICE_ENGINEER'),('ADMIN');

CREATE TABLE user_roles (
    user_id UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id SMALLINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- ---------------------------------------------------------------------------
-- Tractors & implements catalogue (recommender source)
-- ---------------------------------------------------------------------------
CREATE TABLE tractors (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand        VARCHAR(64) NOT NULL,       -- Farmtrac / Powertrac / Kubota
    model        VARCHAR(64) NOT NULL,
    hp           NUMERIC(5,1) NOT NULL,
    fuel_type    VARCHAR(16) NOT NULL DEFAULT 'diesel',
    price_inr    NUMERIC(12,2),
    use_case     TEXT[],
    description  TEXT,
    image_url    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_tractors_brand_model ON tractors(brand, model);

-- ---------------------------------------------------------------------------
-- Complaints & service tickets
-- ---------------------------------------------------------------------------
CREATE TABLE complaints (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignee_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    tractor_model VARCHAR(64),
    title         VARCHAR(255) NOT NULL,
    description   TEXT NOT NULL,
    severity      VARCHAR(16) NOT NULL DEFAULT 'medium',
    status        VARCHAR(16) NOT NULL DEFAULT 'open',
    image_url     TEXT,
    ai_diagnosis  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at   TIMESTAMPTZ
);

CREATE INDEX idx_complaints_customer ON complaints(customer_id);
CREATE INDEX idx_complaints_status ON complaints(status);

-- ---------------------------------------------------------------------------
-- Knowledge base (RAG)
-- ---------------------------------------------------------------------------
CREATE TABLE kb_documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(255) NOT NULL,
    source_uri   TEXT NOT NULL,
    mime_type    VARCHAR(64) NOT NULL,
    uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    page_count   INT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kb_chunks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
    page_no      INT,
    chunk_index  INT NOT NULL,
    content      TEXT NOT NULL,
    embedding    vector(3072),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_chunks_document ON kb_chunks(document_id);
CREATE INDEX idx_kb_chunks_embedding
    ON kb_chunks USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

-- ---------------------------------------------------------------------------
-- Chat history
-- ---------------------------------------------------------------------------
CREATE TABLE chat_conversations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role            VARCHAR(16) NOT NULL,     -- 'user' | 'assistant' | 'system'
    content         TEXT NOT NULL,
    citations       JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conv ON chat_messages(conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE audit_events (
    id         BIGSERIAL PRIMARY KEY,
    actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    action     VARCHAR(64) NOT NULL,
    entity     VARCHAR(64),
    entity_id  UUID,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit_events(actor_id);
CREATE INDEX idx_audit_action ON audit_events(action);
