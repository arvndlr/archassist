import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Ports are configurable via client/.env (see .env.example):
//   CLIENT_PORT – port for this dev server (default 5173; Vite picks the next free one if taken)
//   API_URL     – where the Archassist API runs (default http://localhost:4000)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: Number(env.CLIENT_PORT || 5173),
      proxy: { '/api': env.API_URL || 'http://localhost:4000' },
    },
  };
});
