import { Router } from 'express';
import { query } from '../db/pool.js';
import { fitScore, retrievalCount } from '../db/sql.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { knowledgeStats } from '../services/knowledge.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// System health for the last 30 days (admin dashboard).
router.get('/overview', async (_req, res) => {
  const { rows: [stats] } = await query(`SELECT
      (SELECT count(*)::int FROM users WHERE role = 'student') AS students,
      (SELECT count(*)::int FROM projects) AS projects,
      (SELECT count(*)::int FROM recommendations WHERE created_at >= now() - interval '30 days') AS recommendations_30d,
      (SELECT count(*)::int FROM recommendations
         WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days') AS recommendations_prev_30d,
      (SELECT round(avg(${fitScore('r')}))::int FROM recommendations r
         WHERE r.created_at >= now() - interval '30 days') AS avg_confidence,
      (SELECT count(*)::int FROM recommendations
         WHERE created_at >= now() - interval '30 days'
           AND COALESCE((retrieved->>'chunk_count')::int, 0) = 0) AS empty_retrievals,
      (SELECT count(*)::int FROM knowledge_entries WHERE updated_at >= date_trunc('month', now())) AS kb_edited_this_month`);

  const { rows: mostRetrieved } = await query(`
    SELECT e.id, e.title, e.category, ${retrievalCount('e.id')} AS count
    FROM knowledge_entries e ORDER BY count DESC, e.title LIMIT 5`);

  const { rows: activity } = await query(`
    (SELECT 'recommendation' AS kind, r.created_at AS at, u.name AS actor, p.title AS subject,
            r.report->'recommended_architecture'->>'name' AS detail, r.id AS ref
       FROM recommendations r JOIN projects p ON p.id = r.project_id JOIN users u ON u.id = p.user_id
       ORDER BY r.created_at DESC LIMIT 6)
    UNION ALL
    (SELECT CASE WHEN e.created_at = e.updated_at THEN 'kb_created' ELSE 'kb_updated' END, e.updated_at, NULL, e.title,
            (SELECT count(*)::text FROM knowledge_chunks c WHERE c.entry_id = e.id), e.id
       FROM knowledge_entries e ORDER BY e.updated_at DESC LIMIT 6)
    ORDER BY at DESC LIMIT 6`);

  res.json({ ...stats, knowledge: await knowledgeStats(), most_retrieved: mostRetrieved, activity });
});

export default router;
