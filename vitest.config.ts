import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'simplex-noise': path.resolve(__dirname, 'client/node_modules/simplex-noise/dist/esm/simplex-noise.js'),
    },
  },
  test: {
    environment: 'node',
  },
});
