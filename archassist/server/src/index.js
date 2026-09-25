import { config } from './config.js';
import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { activeProvider } from './services/llm.js';
import { embeddingModelId } from './services/embeddings.js';

await migrate();
createApp().listen(config.port, () => {
  console.log(`Archassist API on http://localhost:${config.port}`);
  console.log(`LLM provider: ${activeProvider()} | embeddings: ${embeddingModelId()}`);
});
