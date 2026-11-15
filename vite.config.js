import { defineConfig } from 'vite';

// base './' makes the built game work from any folder (needed for GitHub Pages).
export default defineConfig({ base: './', server: { port: 5173 }, build: { chunkSizeWarningLimit: 2500 } });
