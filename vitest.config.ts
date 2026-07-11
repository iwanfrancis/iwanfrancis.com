import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Two projects, routed by file extension: pure logic and route handlers run in
 * a plain node environment (`*.test.ts`), anything rendering React runs in
 * jsdom (`*.test.tsx`) with the shared setup (jest-dom, RTL cleanup, Radix
 * shims).
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['src/testing/setup.ts'],
        },
      },
    ],
  },
})
