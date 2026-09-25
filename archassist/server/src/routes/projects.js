import { Router } from 'express';
import { z } from 'zod';
import { HttpError, validate } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { QA_KEYS, PROJECT_TYPES, EXPECTED_USERS, TEAM_EXPERIENCE, DEPLOYMENT, keysOf } from '../lib/domain.js';
import {
  createProject, updateProject, getProject, listProjects, deleteProject,
  runRecommendation, getRecommendation, listRecommendations,
} from '../services/projects.js';

const router = Router();
router.use(requireAuth);

const projectSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(20).max(5000),
  domain: z.string().trim().max(100).nullish(),
  project_type: z.enum(keysOf(PROJECT_TYPES)),
  functional_requirements: z.array(z.string().trim().min(2).max(500)).max(50).default([]),
  expected_users: z.enum(keysOf(EXPECTED_USERS)),
  team_size: z.number().int().min(1).max(50),
  team_experience: z.enum(keysOf(TEAM_EXPERIENCE)),
  timeline_weeks: z.number().int().min(1).max(104),
  deployment: z.enum(keysOf(DEPLOYMENT)),
  constraints: z.string().trim().max(2000).nullish(),
  tech_preferences: z.string().trim().max(1000).nullish(),
  quality_attributes: z.array(z.object({
    attribute: z.enum(QA_KEYS),
    priority: z.number().int().min(0).max(5),
    notes: z.string().trim().max(500).nullish(),
  })).default([]),
});

const idParam = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid id');
  return id;
};

async function loadOwnedProject(req) {
  const project = await getProject(idParam(req));
  if (!project) throw new HttpError(404, 'Project not found');
  if (req.user.role !== 'admin' && project.user_id !== req.user.id) throw new HttpError(404, 'Project not found');
  return project;
}

// Students see their own projects; admins see all.
router.get('/', async (req, res) => {
  res.json(await listProjects(req.user.role === 'admin' ? {} : { userId: req.user.id }));
});

router.post('/', async (req, res) => {
  const data = validate(projectSchema, req.body);
  const id = await createProject(req.user.id, data);
  res.status(201).json(await getProject(id));
});

router.get('/:id', async (req, res) => {
  const project = await loadOwnedProject(req);
  res.json({ ...project, recommendations: await listRecommendations(project.id) });
});

router.put('/:id', async (req, res) => {
  const project = await loadOwnedProject(req);
  const data = validate(projectSchema, req.body);
  await updateProject(project.id, data);
  res.json(await getProject(project.id));
});

router.delete('/:id', async (req, res) => {
  const project = await loadOwnedProject(req);
  await deleteProject(project.id);
  res.status(204).end();
});

// Run analysis -> retrieval -> recommendation and store a report.
router.post('/:id/recommend', async (req, res) => {
  const project = await loadOwnedProject(req);
  const recommendationId = await runRecommendation(project.id);
  res.status(201).json(await getRecommendation(recommendationId));
});

export default router;

export const recommendationsRouter = Router();
recommendationsRouter.use(requireAuth);
recommendationsRouter.get('/:id', async (req, res) => {
  const rec = await getRecommendation(idParam(req));
  if (!rec || (req.user.role !== 'admin' && rec.user_id !== req.user.id)) throw new HttpError(404, 'Report not found');
  res.json(rec);
});
