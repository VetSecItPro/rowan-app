import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
