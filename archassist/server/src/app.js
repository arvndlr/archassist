import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { HttpError } from './lib/errors.js';
import authRoutes from './routes/auth.js';
import metaRoutes from './routes/meta.js';
import knowledgeRoutes from './routes/knowledge.js';
import projectRoutes, { recommendationsRouter } from './routes/projects.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '1mb' }));
  if (config.env !== 'test') app.use(morgan('dev'));

  app.use('/api', metaRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/knowledge', knowledgeRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/recommendations', recommendationsRouter);
  app.use('/api/admin', adminRoutes);

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));

  // Express 5 forwards async errors here automatically.
  app.use((err, _req, res, _next) => {
    const status = err.status ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message, details: err.details });
  });
  return app;
}
