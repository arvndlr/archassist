import { pool } from './pool.js';
import { reindexAll } from '../services/knowledge.js';

reindexAll().then((r) => { console.log('Reindexed', r); return pool.end(); })
  .catch((err) => { console.error(err); process.exit(1); });
