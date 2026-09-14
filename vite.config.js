import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Root ('/') suits Vercel and user/org GitHub Pages. For a GitHub *project*
  // page served at user.github.io/<repo>/, set VITE_BASE=/<repo>/ at build time.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  // The scratch workspace lives under a Windows packaged-app path that gets
  // virtualized to a LocalCache\Roaming realpath. Following the symlink there
  // makes Vite's readFile miss the file and serve raw JSX. Keep the original
  // path and relax the fs allowlist so the transform pipeline runs.
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    fs: {
      strict: false,
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own chunks for better caching.
        manualChunks: {
          react: ['react', 'react-dom'],
          recharts: ['recharts'],
        },
      },
    },
  },
})
