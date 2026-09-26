# Archassist

**Software architecture decision-support system for academic software projects.**

Archassist analyzes a student project's characteristics, requirements, and quality attributes, retrieves
relevant architecture knowledge through **RAG** (Retrieval-Augmented Generation), and uses an **LLM** to
recommend and justify a suitable software architecture. It does **not** generate application source code.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React (Vite), Tailwind CSS v4, React Router |
| Backend | Node.js, Express 5, Zod, JWT auth |
| Database | PostgreSQL 16 + pgvector |
| LLM | Anthropic Claude (pluggable; offline decision-matrix fallback) |
| Embeddings | Local feature-hashing (default, no key) · Voyage AI · OpenAI |

## How it maps to the DFD

| DFD element | Implementation |
| --- | --- |
| Student / Admin (external entities) | `users.role` = `student` / `admin`, JWT auth |
| **1. Input processing** | `server/src/services/analyzer.js` — normalizes input, detects signals (real-time, payments, IoT, offline…), builds weights and the retrieval query |
| **2. Knowledge retrieval (RAG)** | `server/src/services/retriever.js` — hybrid vector + full-text search fused with Reciprocal Rank Fusion, category quotas, metadata filtering; plus a transparent **decision matrix** scoring every style |
| **D1. Knowledge base** | `knowledge_entries` + `knowledge_chunks` (embeddings) — seeded with 14 styles, 10 patterns, 17 tactics, 4 references |
| **3. LLM-based recommendation** | `server/src/services/llm.js` — Claude with a forced structured-output tool; falls back to an offline report |
| Recommendation report | `recommendations` table stores profile, retrieved context, matrix, and report (full audit trail) |
| Manage knowledge base (admin) | `/api/knowledge` CRUD + re-index; admin UI under `/admin/knowledge` |

## Screens

The UI follows the **Archassist Screen Guide** (Claude Design): Archivo type, ink `#201e1d` on paper `#f3f2f2`,
red accent `#ec3013`, square corners and 2px rules. Design tokens live in `client/src/index.css`.

| Actor | Screen | Route |
| --- | --- | --- |
| All | Sign in (Student / Admin) · Register | `/login`, `/register` |
| Student | Step 1 — Project profile (autosaved draft) | `/projects/new` |
| Student | Step 2 — Quality attributes | `/projects/new?step=qa` |
| Student | Step 3 — Analysing (live pipeline stages) | — |
| Student | Recommendation report | `/reports/:id` |
| Student | History | `/history` |
| Admin | System health dashboard | `/admin` |
| Admin | Knowledge base · Entry editor | `/admin/knowledge`, `/admin/knowledge/:id` |

## Getting started

Requirements: Node.js 20.19+ or 22.12+ (22 LTS recommended), and either Docker or a local PostgreSQL 16 with the `pgvector` extension.

```bash
npm run install:all          # install server + client
npm run db                   # start Postgres+pgvector in Docker (skip if you have one)
cp server/.env.example server/.env   # then edit values (see below)
npm run seed                 # create tables, admin account, and seed the knowledge base
npm run dev:server           # API on http://localhost:4000
npm run dev:client           # UI  on http://localhost:5173
```

**Ports already in use?** Copy `client/.env.example` to `client/.env` and set `CLIENT_PORT` (e.g. `5180`).
If port 4000 is also taken, set `PORT` in `server/.env` and the matching `API_URL` in `client/.env`.
The browser only talks to the Vite dev server, which proxies `/api` to the API, so `CORS_ORIGIN` does not need to change.

Default admin: `admin@archassist.local` / `admin12345` (change via `ADMIN_EMAIL` / `ADMIN_PASSWORD` before first run).
Students create their own accounts on the Register page.

### Enabling the LLM

Without an API key, Archassist runs in **offline mode**: the report is built from the decision matrix and retrieved
knowledge. To enable Claude, set in `server/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5    # any current Claude model id
```

If the LLM call fails, the system automatically falls back to offline mode and records the error on the report.

### Switching embedding provider

Set `EMBEDDING_PROVIDER=voyage` (with `VOYAGE_API_KEY`) or `openai` (with `OPENAI_API_KEY`), then run
`npm --prefix server run reindex` (or click **Re-index** in the admin overview). Vectors from different models are never mixed.

## Deploy for free (Render + Neon)

One free Render web service runs the API **and** serves the built React app; the database is a free Neon Postgres
(pgvector included). On first start the server creates the tables, the admin account and the knowledge base.

1. **Neon** (neon.com) → create a project → in the SQL editor run `CREATE EXTENSION IF NOT EXISTS vector;` →
   copy the connection string (it ends with `?sslmode=require`).
2. **Render** (render.com) → New → **Blueprint** → pick this GitHub repo (uses `render.yaml`).
   If the code is inside a subfolder, set that folder as the **Root Directory**.
3. Fill in the secret env vars Render asks for: `DATABASE_URL` (Neon), `ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`.
4. Deploy, then open `https://<service>.onrender.com`.

Free-tier notes: the service sleeps after 15 minutes idle and takes about a minute to wake up; Neon suspends
after 5 minutes idle and wakes in about a second.

## API overview

| Method | Path | Actor |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` · GET `/api/auth/me` | all |
| GET | `/api/options`, `/api/health` | all |
| GET/POST | `/api/projects` · GET/PUT/DELETE `/api/projects/:id` | student (own), admin (all) |
| POST | `/api/projects/:id/recommend` — runs the pipeline | student, admin |
| GET | `/api/recommendations/:id` | owner, admin |
| GET/POST/PUT/DELETE | `/api/knowledge[/:id]` · POST `/api/knowledge/reindex` · GET `/api/knowledge/stats` | admin |
| GET | `/api/admin/overview` | admin |

## Tests

```bash
npm test
```

## Project structure

```
server/
  src/
    config.js            env configuration
    app.js, index.js     Express app + startup (auto-migrates)
    db/                  schema.sql, migrate, seed, reindex
    data/                knowledge-seed.js (initial knowledge base)
    lib/                 domain vocabulary, errors
    middleware/          JWT auth, role guard
    routes/              auth, meta, projects, knowledge, admin
    services/            analyzer (1), retriever (2), llm (3), embeddings, knowledge, projects
  test/
client/
  src/
    pages/               Login, Register, Dashboard, ProjectForm, ProjectDetail, Report, admin/*
    components/, context/, lib/
```
