import { defineConfig } from 'vite';

// Base path for GitHub Pages project sites: /<repo>/
// Override with: VITE_BASE_PATH=/my-repo/ npm run build
const base = process.env.VITE_BASE_PATH || './';

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});
