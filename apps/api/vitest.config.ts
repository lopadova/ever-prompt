import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@everprompt/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@everprompt/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Exclude routes/services that require CF Worker bindings at runtime
    include: ['src/__tests__/**/*.test.ts'],
  },
});
