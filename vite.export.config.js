import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// One-off export config: bundles the whole app into a single self-contained
// HTML file for download-and-open review (the in-app viewer can't render HTML).
// Usage: npm run export  →  writes dist-export/atlas.html
// The normal `npm run build` (CI / GitHub Pages) is untouched.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    outDir: 'dist-export',
    // singlefile inlines everything; keep one chunk so nothing is left behind.
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
