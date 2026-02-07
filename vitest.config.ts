import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/admin'),
      '@pages': path.resolve(__dirname, 'src/admin/components/pages'),
      '@components': path.resolve(__dirname, 'src/admin/components'),
      '@hooks': path.resolve(__dirname, 'src/admin/hooks'),
      '@ui': path.resolve(__dirname, 'src/admin/components/ui'),
      '@utils': path.resolve(__dirname, 'src/admin/utils'),
      '@el': path.resolve(__dirname, 'src/admin/components/elements'),
      '@functions': path.resolve(__dirname, 'src/admin/functions'),
      '@const': path.resolve(__dirname, 'src/admin/const'),
    },
  },
});
