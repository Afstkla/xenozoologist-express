import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5180,
    proxy: {
      '/api': 'http://localhost:7755',
      '/ws': {
        target: 'ws://localhost:7755',
        ws: true,
      },
    },
  },
});
