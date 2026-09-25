import { Router } from 'express';
import { QUALITY_ATTRIBUTES, PROJECT_TYPES, EXPECTED_USERS, TEAM_EXPERIENCE, DEPLOYMENT } from '../lib/domain.js';
import { activeProvider } from '../services/llm.js';
import { embeddingModelId } from '../services/embeddings.js';
import { config } from '../config.js';

const router = Router();

// Options used to build the student input forms.
router.get('/options', (_req, res) => {
  res.json({
    quality_attributes: QUALITY_ATTRIBUTES,
    project_types: PROJECT_TYPES,
    expected_users: EXPECTED_USERS,
    team_experience: TEAM_EXPERIENCE,
    deployment: DEPLOYMENT,
  });
});

router.get('/health', (_req, res) => {
  const provider = activeProvider();
  res.json({
    status: 'ok',
    llm_provider: provider,
    llm_model: provider === 'anthropic' ? config.llm.anthropicModel : 'decision-matrix-v1',
    embedding_model: embeddingModelId(),
  });
});

export default router;
