// Process 2 — Knowledge retrieval (RAG) and decision-matrix scoring.
//
// Hybrid retrieval over knowledge_chunks:
//   * semantic search: cosine similarity on embeddings (pgvector)
//   * lexical search:  PostgreSQL full-text search
// The two ranked lists are fused with Reciprocal Rank Fusion (RRF), then
// grouped per knowledge entry.
import pgvector from 'pgvector';
import { query } from '../db/pool.js';
import { config } from '../config.js';
import { embed, embeddingModelId } from './embeddings.js';
import { QA_KEYS, QA_LABEL } from '../lib/domain.js';

const RRF_K = 60;
const CATEGORY_QUOTA = { style: 5, pattern: 4, tactic: 4, reference: 2 };

function lexicalQuery(text) {
  const words = [...new Set(
    String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2),
  )].slice(0, 60);
  return words.join(' | ');
}

export async function retrieveKnowledge(profile) {
  const [queryVector] = await embed([profile.retrieval_query], 'query');
  const model = embeddingModelId();
  const limit = config.rag.candidateChunks;

  const semantic = await query(
    `SELECT c.id, c.entry_id, c.content, 1 - (c.embedding <=> $1) AS similarity
     FROM knowledge_chunks c JOIN knowledge_entries e ON e.id = c.entry_id
     WHERE c.embedding_model = $2 AND e.is_active
     ORDER BY c.embedding <=> $1 LIMIT $3`,
    [pgvector.toSql(queryVector), model, limit],
  );

  const tsq = lexicalQuery(profile.retrieval_query);
  const lexical = tsq
    ? await query(
      `SELECT c.id, c.entry_id, c.content, ts_rank(c.tsv, to_tsquery('english', $1)) AS rank
       FROM knowledge_chunks c JOIN knowledge_entries e ON e.id = c.entry_id
       WHERE c.embedding_model = $2 AND e.is_active AND c.tsv @@ to_tsquery('english', $1)
       ORDER BY rank DESC LIMIT $3`,
      [tsq, model, limit],
    )
    : { rows: [] };

  // Reciprocal Rank Fusion
  const fused = new Map();
  const addList = (rows, key) => rows.forEach((r, i) => {
    const cur = fused.get(r.id) ?? { id: r.id, entry_id: r.entry_id, content: r.content, rrf: 0, similarity: null, lexical_rank: null };
    cur.rrf += 1 / (RRF_K + i + 1);
    if (key === 'semantic') cur.similarity = Number(r.similarity);
    else cur.lexical_rank = Number(r.rank);
    fused.set(r.id, cur);
  });
  addList(semantic.rows, 'semantic');
  addList(lexical.rows, 'lexical');

  const ranked = [...fused.values()].sort((a, b) => b.rrf - a.rrf);
  if (ranked.length === 0) return { embedding_model: model, query: profile.retrieval_query, chunk_count: 0, entries: [] };

  // Group chunks per entry
  const entryIds = [...new Set(ranked.map((c) => c.entry_id))];
  const { rows: entryRows } = await query(
    `SELECT id, title, category, summary, attributes, tags FROM knowledge_entries WHERE id = ANY($1)`,
    [entryIds],
  );
  const maxRrf = ranked[0].rrf;
  const grouped = entryRows.map((e) => {
    const cs = ranked.filter((c) => c.entry_id === e.id).slice(0, 2);
    return {
      ...e,
      relevance: Number((cs[0].rrf / maxRrf).toFixed(3)),
      similarity: Math.max(...cs.map((c) => c.similarity ?? 0)),
      chunks: cs.map((c) => ({ id: c.id, content: c.content, similarity: c.similarity, lexical_rank: c.lexical_rank })),
    };
  });

  // Metadata filter: demote entries (styles, specialised patterns) not meant for this project type.
  for (const e of grouped) {
    const types = e.attributes?.project_types ?? [];
    if (types.length && !types.includes(profile.project_type) && !profile.signals.includes('AI / ML component')) {
      e.relevance = Number((e.relevance * 0.5).toFixed(3));
      e.demoted = 'project type mismatch';
    }
  }
  grouped.sort((a, b) => b.relevance - a.relevance);

  // Diversify the context: styles alone are not enough, the LLM also needs
  // patterns and quality-attribute tactics.
  const picked = [];
  for (const [category, n] of Object.entries(CATEGORY_QUOTA)) {
    picked.push(...grouped.filter((e) => e.category === category).slice(0, n));
  }

  // Metadata-based retrieval: tactics that strongly support the top-priority
  // quality attributes, in case semantic/lexical search missed them.
  const have = new Set(picked.map((e) => e.id));
  const topQa = profile.ranked_quality_attributes.slice(0, 3).map((q) => q.key);
  if (topQa.length) {
    const { rows: tactics } = await query(
      `SELECT e.id, e.title, e.category, e.summary, e.attributes, e.tags,
              (SELECT c.content FROM knowledge_chunks c WHERE c.entry_id = e.id ORDER BY c.chunk_index DESC LIMIT 1) AS chunk
       FROM knowledge_entries e
       WHERE e.is_active AND e.category = 'tactic'
         AND EXISTS (SELECT 1 FROM unnest($1::text[]) k WHERE (e.attributes->'qa'->>k)::int >= 4)
       ORDER BY e.title`,
      [topQa],
    );
    for (const t of tactics) {
      if (have.has(t.id)) continue;
      const supports = topQa.filter((k) => (t.attributes?.qa?.[k] ?? 0) >= 4);
      picked.push({
        id: t.id, title: t.title, category: t.category, summary: t.summary, attributes: t.attributes, tags: t.tags,
        relevance: 0, added_by: `quality_attribute:${supports.join(',')}`,
        chunks: t.chunk ? [{ content: t.chunk }] : [],
      });
      have.add(t.id);
    }
  }

  return {
    embedding_model: model,
    query: profile.retrieval_query,
    chunk_count: ranked.length,
    entries: picked,
  };
}

const EXPERIENCE_CAPACITY = { beginner: 2, intermediate: 3, advanced: 4 };

/**
 * Score every active architecture style in the knowledge base against the
 * project profile. Transparent, explainable, and used as grounding for the LLM.
 */
export async function buildDecisionMatrix(profile, retrieved) {
  const { rows: styles } = await query(
    `SELECT id, title, summary, attributes FROM knowledge_entries WHERE category = 'style' AND is_active ORDER BY title`,
  );
  const relevanceById = new Map(retrieved.entries.map((e) => [e.id, e.relevance]));

  let totalWeight = QA_KEYS.reduce((s, k) => s + (profile.weights[k] ?? 0), 0);
  const weights = totalWeight > 0 ? profile.weights : Object.fromEntries(QA_KEYS.map((k) => [k, 1]));
  if (totalWeight === 0) totalWeight = QA_KEYS.length;

  const capacity = (EXPERIENCE_CAPACITY[profile.team.experience] ?? 2)
    + (profile.team.size >= 5 ? 1 : 0)
    + (profile.team.timeline_weeks >= 20 ? 1 : 0)
    - (profile.team.timeline_weeks <= 10 ? 1 : 0);

  const rows = styles.map((s) => {
    const attrs = s.attributes ?? {};
    const ratings = attrs.qa ?? {};
    const breakdown = QA_KEYS
      .filter((k) => (weights[k] ?? 0) > 0)
      .map((k) => ({ attribute: k, label: QA_LABEL[k], weight: weights[k], rating: ratings[k] ?? 3 }));
    const fit = breakdown.reduce((sum, b) => sum + b.weight * b.rating, 0) / (totalWeight * 5) * 100;

    const complexity = attrs.complexity ?? 3;
    const complexityPenalty = Math.max(0, complexity - capacity) * 7;
    const types = attrs.project_types ?? [];
    const typeAdjustment = types.length === 0 ? 0 : types.includes(profile.project_type) ? 5 : -3;
    const teamPenalty = attrs.min_team && profile.team.size < attrs.min_team ? 5 : 0;
    const relevance = relevanceById.get(s.id) ?? 0;
    const retrievalBonus = relevance * 5;

    const score = Math.max(0, Math.min(100, fit - complexityPenalty - teamPenalty + typeAdjustment + retrievalBonus));
    return {
      entry_id: s.id,
      name: s.title,
      summary: s.summary,
      score: Number(score.toFixed(1)),
      components: {
        quality_fit: Number(fit.toFixed(1)),
        complexity_penalty: -complexityPenalty,
        team_size_penalty: -teamPenalty,
        project_type_adjustment: typeAdjustment,
        retrieval_bonus: Number(retrievalBonus.toFixed(1)),
      },
      complexity,
      team_capacity: capacity,
      qa: ratings,
      breakdown,
    };
  }).sort((a, b) => b.score - a.score);

  return {
    method: 'Weighted quality-attribute fit (priority × style rating) with complexity, team, project-type and retrieval adjustments.',
    team_capacity: capacity,
    candidates: rows,
  };
}

/** Make sure the top-scoring styles are in the LLM context even if retrieval missed them. */
export async function ensureTopStylesInContext(retrieved, matrix, n = 3) {
  const have = new Set(retrieved.entries.map((e) => e.id));
  const missing = matrix.candidates.slice(0, n).filter((c) => !have.has(c.entry_id)).map((c) => c.entry_id);
  if (missing.length === 0) return retrieved;
  const { rows } = await query(
    `SELECT e.id, e.title, e.category, e.summary, e.attributes, e.tags,
            (SELECT c.content FROM knowledge_chunks c WHERE c.entry_id = e.id ORDER BY c.chunk_index LIMIT 1) AS first_chunk
     FROM knowledge_entries e WHERE e.id = ANY($1)`,
    [missing],
  );
  return {
    ...retrieved,
    entries: [
      ...retrieved.entries,
      ...rows.map((r) => ({
        id: r.id, title: r.title, category: r.category, summary: r.summary, attributes: r.attributes, tags: r.tags,
        relevance: 0, added_by: 'decision_matrix',
        chunks: r.first_chunk ? [{ content: r.first_chunk }] : [],
      })),
    ],
  };
}
