-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE event_source AS ENUM ('ui', 'system', 'vroomsign', 'calendar');

CREATE TABLE satisfaction_event (
    id uuid primary key default gen_random_uuid(),
    cardId text,
    -- step card id
    source event_source not null,
    source_event_id text,
    -- provider id (preferred)
    idempotency_key text,
    -- fallback if no provider id
    event_key text not null,
    -- e.g. "document.doc_987.executed"
    occurred_at timestamptz not null,
    -- when it happened (UTC Z)
    created_at timestamptz not null default now(),
    -- when we ingested it
    metadata jsonb not null default '{}' :: jsonb
);

-- Prefer provider idempotency if present
CREATE UNIQUE INDEX ux_sat_source_provider_event ON satisfaction_event(source, source_event_id)
WHERE
    source_event_id IS NOT NULL;

-- Fallback idempotency
CREATE UNIQUE INDEX ux_sat_source_idempotency ON satisfaction_event(source, idempotency_key)
WHERE
    idempotency_key IS NOT NULL;

-- DO NOTHING idempotency key
CREATE UNIQUE INDEX ux_sat_event_dedupe
ON satisfaction_event (event_key, source, source_event_id);
    source_event_id IS NOT NULL;

-- DO NOTHING idempotency key
CREATE UNIQUE INDEX ux_sat_event_source_idom_dedupe
ON satisfaction_event (event_key, source, idempotency_key);
    idempotency_key IS NOT NULL;

-- Query perf: "has X occurred?"
CREATE INDEX ix_sat_event_key_time ON satisfaction_event(event_key, occurred_at);