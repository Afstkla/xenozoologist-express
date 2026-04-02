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
      '/api': 'http://localhost:7750',
      '/ws': {
        target: 'ws://localhost:7750',
        ws: true,
      },
    },
  },
});
