import { config } from './config.js';
import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { seedIfEmpty } from './db/seed.js';
import { activeProvider } from './services/llm.js';
import { embeddingModelId } from './services/embeddings.js';

await migrate();
// First start on a fresh database (e.g. a new cloud deployment): load the knowledge base.
if (process.env.AUTO_SEED !== 'false') {
  const added = await seedIfEmpty();
  if (added) console.log(`Seeded ${added} knowledge entries.`);
}
createApp().listen(config.port, () => {
  console.log(`Archassist API on http://localhost:${config.port}`);
  console.log(`LLM provider: ${activeProvider()} | embeddings: ${embeddingModelId()}`);
  if (config.serveClient) console.log(`Serving web app from ${config.clientDist}`);
});
