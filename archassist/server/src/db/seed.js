// Seeds the architecture knowledge base. Usage:
//   npm run seed           -> seeds only if the knowledge base is empty
//   npm run seed -- --reset -> deletes all knowledge entries and re-seeds
import { pool, query } from './pool.js';
import { migrate } from './migrate.js';
import { createEntry } from '../services/knowledge.js';
import { SEED_ENTRIES } from '../data/knowledge-seed.js';

async function seed() {
  await migrate();
  const reset = process.argv.includes('--reset');
  if (reset) await query('DELETE FROM knowledge_entries');
  const { rows } = await query('SELECT count(*)::int AS n FROM knowledge_entries');
  if (rows[0].n > 0) {
    console.log(`Knowledge base already has ${rows[0].n} entries; use --reset to re-seed.`);
    return;
  }
  for (const entry of SEED_ENTRIES) await createEntry(entry, null);
  console.log(`Seeded ${SEED_ENTRIES.length} knowledge entries.`);
}

seed().then(() => pool.end()).catch((err) => { console.error(err); process.exit(1); });
