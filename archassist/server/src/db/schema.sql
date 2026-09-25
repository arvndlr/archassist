-- Archassist database schema (PostgreSQL 16 + pgvector)
-- Safe to re-run: every object is created only if missing.

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Users (actors: student, admin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- D1. Knowledge base: architecture styles, patterns, quality-attribute tactics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id          SERIAL PRIMARY KEY,
  title       TEXT        NOT NULL,
  category    TEXT        NOT NULL CHECK (category IN ('style', 'pattern', 'tactic', 'reference')),
  summary     TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  -- For styles: { "qa": { "scalability": 1..5, ... }, "complexity": 1..5,
  --               "min_team": n, "project_types": ["web", ...] }
  -- For tactics/patterns: { "qa": { "<attribute>": 1..5 } } (the attributes they improve)
  attributes  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  source      TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by  INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chunks are the retrievable units for RAG (one entry -> one or more chunks).
-- The vector column has no fixed dimension so the embedding provider can be
-- swapped; rows are always filtered by embedding_model when searching.
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id              SERIAL PRIMARY KEY,
  entry_id        INTEGER     NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  chunk_index     INTEGER     NOT NULL,
  content         TEXT        NOT NULL,
  embedding       vector      NOT NULL,
  embedding_model TEXT        NOT NULL,
  tsv             tsvector    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS knowledge_chunks_tsv_idx   ON knowledge_chunks USING GIN (tsv);
CREATE INDEX IF NOT EXISTS knowledge_chunks_model_idx ON knowledge_chunks (embedding_model);

-- ---------------------------------------------------------------------------
-- Student projects (input) and their quality attributes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                   TEXT        NOT NULL,
  description             TEXT        NOT NULL,
  domain                  TEXT,
  project_type            TEXT        NOT NULL,
  functional_requirements TEXT[]      NOT NULL DEFAULT '{}',
  expected_users          TEXT        NOT NULL DEFAULT 'small',
  team_size               INTEGER     NOT NULL DEFAULT 3,
  team_experience         TEXT        NOT NULL DEFAULT 'beginner',
  timeline_weeks          INTEGER     NOT NULL DEFAULT 16,
  deployment              TEXT        NOT NULL DEFAULT 'cloud',
  constraints             TEXT,
  tech_preferences        TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_quality_attributes (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  attribute  TEXT    NOT NULL,
  priority   INTEGER NOT NULL CHECK (priority BETWEEN 0 AND 5),
  notes      TEXT,
  PRIMARY KEY (project_id, attribute)
);

-- ---------------------------------------------------------------------------
-- Recommendation reports (output), including the full pipeline trace
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendations (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  profile         JSONB       NOT NULL,   -- 1. input processing output
  retrieved       JSONB       NOT NULL,   -- 2. RAG output
  decision_matrix JSONB       NOT NULL,   -- scored candidate styles
  report          JSONB       NOT NULL,   -- 3. LLM recommendation
  provider        TEXT        NOT NULL,
  model           TEXT,
  error           TEXT,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recommendations_project_idx ON recommendations (project_id, created_at DESC);
