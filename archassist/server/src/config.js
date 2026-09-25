import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') throw new Error(`Missing required env var ${name}`);
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/archassist'),
  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-only-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  admin: {
    name: process.env.ADMIN_NAME ?? 'Archassist Admin',
    email: process.env.ADMIN_EMAIL ?? 'admin@archassist.local',
    password: process.env.ADMIN_PASSWORD ?? 'admin12345',
  },

  // LLM provider: "anthropic" or "offline". "auto" = anthropic when a key is set.
  llm: {
    provider: process.env.LLM_PROVIDER ?? 'auto',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5',
    maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 4000),
  },

  // Embedding provider: "local" (no key, runs offline), "voyage", or "openai".
  embeddings: {
    provider: process.env.EMBEDDING_PROVIDER ?? 'local',
    voyageApiKey: process.env.VOYAGE_API_KEY ?? '',
    voyageModel: process.env.VOYAGE_MODEL ?? 'voyage-3.5-lite',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    openaiModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
  },

  rag: {
    candidateChunks: Number(process.env.RAG_CANDIDATE_CHUNKS ?? 80),
  },
};
