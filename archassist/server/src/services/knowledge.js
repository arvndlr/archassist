// Knowledge base (D1) management: CRUD + chunking + embedding (indexing).
import pgvector from 'pgvector';
import { pool, query, withTransaction } from '../db/pool.js';
import { retrievalCount } from '../db/sql.js';
import { embed, embeddingModelId } from './embeddings.js';
import { QA_LABEL } from '../lib/domain.js';

const MAX_CHUNK_CHARS = 900;

/** Split an entry into retrievable chunks. Each chunk is prefixed with the title for context. */
export function chunkEntry(entry) {
  const header = `${entry.title} (${entry.category}).`;
  const qa = entry.attributes?.qa ?? {};
  const qaLine = Object.keys(qa).length
    ? ` Quality attributes: ${Object.entries(qa).map(([k, v]) => `${QA_LABEL[k] ?? k} ${v}/5`).join(', ')}.`
    : '';
  const tags = entry.tags?.length ? ` Tags: ${entry.tags.join(', ')}.` : '';
  const chunks = [`${header} ${entry.summary}${qaLine}${tags}`];

  const paragraphs = String(entry.content).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  let buf = '';
  for (const p of paragraphs) {
    if (buf && buf.length + p.length > MAX_CHUNK_CHARS) {
      chunks.push(`${header} ${buf}`);
      buf = '';
    }
    buf = buf ? `${buf}\n${p}` : p;
  }
  if (buf) chunks.push(`${header} ${buf}`);
  return chunks;
}

async function indexEntry(client, entry) {
  const chunks = chunkEntry(entry);
  const vectors = await embed(chunks, 'document');
  const model = embeddingModelId();
  await client.query('DELETE FROM knowledge_chunks WHERE entry_id = $1', [entry.id]);
  for (let i = 0; i < chunks.length; i++) {
    await client.query(
      `INSERT INTO knowledge_chunks (entry_id, chunk_index, content, embedding, embedding_model)
       VALUES ($1, $2, $3, $4, $5)`,
      [entry.id, i, chunks[i], pgvector.toSql(vectors[i]), model],
    );
  }
  return chunks.length;
}

const ENTRY_COLUMNS = `e.id, e.title, e.category, e.summary, e.content, e.attributes, e.tags, e.source,
  e.is_active, e.created_at, e.updated_at,
  (SELECT count(*)::int FROM knowledge_chunks c WHERE c.entry_id = e.id) AS chunk_count,
  ${retrievalCount('e.id')} AS retrievals_30d`;

export async function listEntries({ category, search, includeInactive = true } = {}) {
  const where = [];
  const params = [];
  if (category) { params.push(category); where.push(`e.category = $${params.length}`); }
  if (!includeInactive) where.push('e.is_active');
  if (search) {
    params.push(`%${search}%`);
    where.push(`(e.title ILIKE $${params.length} OR e.summary ILIKE $${params.length} OR $${params.length} ILIKE ANY(e.tags))`);
  }
  const { rows } = await query(
    `SELECT ${ENTRY_COLUMNS} FROM knowledge_entries e
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY e.category, e.title`,
    params,
  );
  return rows;
}

export async function getEntry(id) {
  const { rows } = await query(`SELECT ${ENTRY_COLUMNS} FROM knowledge_entries e WHERE e.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createEntry(data, userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO knowledge_entries (title, category, summary, content, attributes, tags, source, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [data.title, data.category, data.summary, data.content, data.attributes ?? {}, data.tags ?? [],
       data.source ?? null, data.is_active ?? true, userId ?? null],
    );
    await indexEntry(client, rows[0]);
    return rows[0];
  });
}

export async function updateEntry(id, data) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE knowledge_entries SET
         title = $2, category = $3, summary = $4, content = $5, attributes = $6, tags = $7,
         source = $8, is_active = $9, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, data.title, data.category, data.summary, data.content, data.attributes ?? {}, data.tags ?? [],
       data.source ?? null, data.is_active ?? true],
    );
    if (!rows[0]) return null;
    await indexEntry(client, rows[0]);
    return rows[0];
  });
}

export async function deleteEntry(id) {
  const { rowCount } = await query('DELETE FROM knowledge_entries WHERE id = $1', [id]);
  return rowCount > 0;
}

/** Re-embed every entry, e.g. after switching embedding provider. */
export async function reindexAll() {
  const { rows } = await query('SELECT * FROM knowledge_entries ORDER BY id');
  let chunks = 0;
  for (const entry of rows) {
    chunks += await withTransaction((client) => indexEntry(client, entry));
  }
  await query('DELETE FROM knowledge_chunks WHERE embedding_model <> $1', [embeddingModelId()]);
  return { entries: rows.length, chunks, model: embeddingModelId() };
}

export async function knowledgeStats() {
  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM knowledge_entries) AS entries,
       (SELECT count(*)::int FROM knowledge_entries WHERE category = 'style') AS styles,
       (SELECT count(*)::int FROM knowledge_entries WHERE category = 'pattern') AS patterns,
       (SELECT count(*)::int FROM knowledge_entries WHERE category = 'tactic') AS tactics,
       (SELECT count(*)::int FROM knowledge_entries WHERE category = 'reference') AS "references",
       (SELECT count(*)::int FROM knowledge_chunks WHERE embedding_model = $1) AS chunks,
       (SELECT count(*)::int FROM knowledge_chunks WHERE embedding_model <> $1) AS stale_chunks`,
    [embeddingModelId()],
  );
  return { ...rows[0], embedding_model: embeddingModelId() };
}
