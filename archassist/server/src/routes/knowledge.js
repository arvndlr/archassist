import { Router } from 'express';
import { z } from 'zod';
import { HttpError, validate } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { QA_KEYS } from '../lib/domain.js';
import {
  listEntries, getEntry, createEntry, updateEntry, deleteEntry, reindexAll, knowledgeStats,
} from '../services/knowledge.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const rating = z.number().int().min(1).max(5);
const entrySchema = z.object({
  title: z.string().trim().min(2).max(200),
  category: z.enum(['style', 'pattern', 'tactic', 'reference']),
  summary: z.string().trim().min(10).max(1000),
  content: z.string().trim().min(10).max(20000),
  attributes: z.object({
    qa: z.partialRecord(z.enum(QA_KEYS), rating).optional(),
    complexity: rating.optional(),
    min_team: z.number().int().min(1).max(50).optional(),
    project_types: z.array(z.string()).optional(),
    structure: z.array(z.object({ name: z.string(), responsibility: z.string() })).optional(),
  }).passthrough().default({}),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  source: z.string().trim().max(500).nullish(),
  is_active: z.boolean().default(true),
});

const idParam = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid id');
  return id;
};

router.get('/stats', async (_req, res) => res.json(await knowledgeStats()));

router.get('/', async (req, res) => {
  res.json(await listEntries({ category: req.query.category, search: req.query.search }));
});

router.get('/:id', async (req, res) => {
  const entry = await getEntry(idParam(req));
  if (!entry) throw new HttpError(404, 'Knowledge entry not found');
  res.json(entry);
});

router.post('/', async (req, res) => {
  const data = validate(entrySchema, req.body);
  const entry = await createEntry(data, req.user.id);
  res.status(201).json(await getEntry(entry.id));
});

router.put('/:id', async (req, res) => {
  const data = validate(entrySchema, req.body);
  const entry = await updateEntry(idParam(req), data);
  if (!entry) throw new HttpError(404, 'Knowledge entry not found');
  res.json(await getEntry(entry.id));
});

router.delete('/:id', async (req, res) => {
  if (!(await deleteEntry(idParam(req)))) throw new HttpError(404, 'Knowledge entry not found');
  res.status(204).end();
});

router.post('/reindex', async (_req, res) => res.json(await reindexAll()));

export default router;
