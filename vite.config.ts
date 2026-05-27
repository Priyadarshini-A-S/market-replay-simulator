import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages project sites, `base` must be `/<repo-name>/`.
// Set VITE_BASE in your CI / locally to override (e.g. "/market-simulate/").
// Defaults to "./" so the built site also works when opened from a file path
// or hosted from a sub-directory you do not know in advance.
const base = process.env.VITE_BASE ?? './';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
