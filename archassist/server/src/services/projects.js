// Student projects, quality attributes, and the recommendation pipeline
// (1. input processing -> 2. RAG retrieval -> 3. LLM recommendation).
import { query, withTransaction } from '../db/pool.js';
import { fitScore } from '../db/sql.js';
import { analyzeProject } from './analyzer.js';
import { retrieveKnowledge, buildDecisionMatrix, ensureTopStylesInContext } from './retriever.js';
import { generateRecommendation } from './llm.js';

const PROJECT_FIELDS = ['title', 'description', 'domain', 'project_type', 'functional_requirements', 'expected_users',
  'team_size', 'team_experience', 'timeline_weeks', 'deployment', 'constraints', 'tech_preferences'];

async function saveQualityAttributes(client, projectId, qualityAttributes) {
  await client.query('DELETE FROM project_quality_attributes WHERE project_id = $1', [projectId]);
  for (const qa of qualityAttributes ?? []) {
    await client.query(
      `INSERT INTO project_quality_attributes (project_id, attribute, priority, notes) VALUES ($1, $2, $3, $4)`,
      [projectId, qa.attribute, qa.priority, qa.notes ?? null],
    );
  }
}

export async function createProject(userId, data) {
  return withTransaction(async (client) => {
    const values = PROJECT_FIELDS.map((f) => data[f] ?? null);
    const { rows } = await client.query(
      `INSERT INTO projects (user_id, ${PROJECT_FIELDS.join(', ')})
       VALUES ($1, ${PROJECT_FIELDS.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING id`,
      [userId, ...values],
    );
    await saveQualityAttributes(client, rows[0].id, data.quality_attributes);
    return rows[0].id;
  });
}

export async function updateProject(id, data) {
  return withTransaction(async (client) => {
    const sets = PROJECT_FIELDS.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const { rowCount } = await client.query(
      `UPDATE projects SET ${sets}, updated_at = now() WHERE id = $1`,
      [id, ...PROJECT_FIELDS.map((f) => data[f] ?? null)],
    );
    if (!rowCount) return false;
    await saveQualityAttributes(client, id, data.quality_attributes);
    return true;
  });
}

export async function getProject(id) {
  const { rows } = await query(
    `SELECT p.*, u.name AS owner_name,
       COALESCE((SELECT json_agg(json_build_object('attribute', q.attribute, 'priority', q.priority, 'notes', q.notes)
                 ORDER BY q.priority DESC) FROM project_quality_attributes q WHERE q.project_id = p.id), '[]') AS quality_attributes
     FROM projects p JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listProjects({ userId } = {}) {
  const { rows } = await query(
    `SELECT p.id, p.title, p.project_type, p.domain, p.created_at, p.updated_at, u.name AS owner_name,
       r.id AS latest_recommendation_id, r.report->'recommended_architecture'->>'name' AS latest_architecture,
       r.created_at AS latest_recommendation_at, r.report->>'confidence' AS latest_confidence,
       CASE WHEN r.id IS NULL THEN NULL ELSE round(${fitScore('r')})::int END AS latest_fit,
       (SELECT count(*)::int FROM recommendations x WHERE x.project_id = p.id) AS recommendation_count
     FROM projects p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN LATERAL (SELECT * FROM recommendations r WHERE r.project_id = p.id ORDER BY r.created_at DESC LIMIT 1) r ON TRUE
     ${userId ? 'WHERE p.user_id = $1' : ''}
     ORDER BY p.updated_at DESC`,
    userId ? [userId] : [],
  );
  return rows;
}

export async function deleteProject(id) {
  const { rowCount } = await query('DELETE FROM projects WHERE id = $1', [id]);
  return rowCount > 0;
}

/** Run the full Archassist pipeline for a project and store the report. */
export async function runRecommendation(projectId) {
  const started = Date.now();
  const project = await getProject(projectId);
  if (!project) return null;

  const profile = analyzeProject(project);                          // 1. Input processing
  let retrieved = await retrieveKnowledge(profile);                  // 2. Knowledge retrieval (RAG)
  const matrix = await buildDecisionMatrix(profile, retrieved);
  retrieved = await ensureTopStylesInContext(retrieved, matrix);
  const result = await generateRecommendation({ project, profile, matrix, retrieved }); // 3. LLM recommendation

  const { rows } = await query(
    `INSERT INTO recommendations (project_id, profile, retrieved, decision_matrix, report, provider, model, error, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [projectId, profile, retrieved, matrix, result.report, result.provider, result.model ?? null,
     result.fallback_error ?? null, Date.now() - started],
  );
  return rows[0].id;
}

export async function getRecommendation(id) {
  const { rows } = await query(
    `SELECT r.*, p.user_id, p.title AS project_title FROM recommendations r JOIN projects p ON p.id = r.project_id WHERE r.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listRecommendations(projectId) {
  const { rows } = await query(
    `SELECT id, provider, model, created_at, duration_ms, report->'recommended_architecture'->>'name' AS architecture,
            report->>'confidence' AS confidence
     FROM recommendations WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId],
  );
  return rows;
}
