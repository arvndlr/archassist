// Seeds the architecture knowledge base. Usage:
//   npm run seed           -> seeds only if the knowledge base is empty
//   npm run seed -- --reset -> deletes all knowledge entries and re-seeds
import { fileURLToPath } from 'node:url';
import { pool, query } from './pool.js';
import { migrate } from './migrate.js';
import { createEntry } from '../services/knowledge.js';
import { SEED_ENTRIES } from '../data/knowledge-seed.js';

/** Seed the knowledge base if it has no entries. Returns the number of entries added. */
export async function seedIfEmpty({ reset = false } = {}) {
  if (reset) await query('DELETE FROM knowledge_entries');
  const { rows } = await query('SELECT count(*)::int AS n FROM knowledge_entries');
  if (rows[0].n > 0) return 0;
  for (const entry of SEED_ENTRIES) await createEntry(entry, null);
  return SEED_ENTRIES.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    await migrate();
    const added = await seedIfEmpty({ reset: process.argv.includes('--reset') });
    console.log(added ? `Seeded ${added} knowledge entries.` : 'Knowledge base already has entries; use --reset to re-seed.');
  })().then(() => pool.end()).catch((err) => { console.error(err); process.exit(1); });
}
