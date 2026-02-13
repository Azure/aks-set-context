import {defineConfig} from 'vitest/config'

export default defineConfig({
   test: {
      clearMocks: true,
      environment: 'node',
      include: ['**/*.test.ts'],
      coverage: {
         provider: 'v8',
         thresholds: {
            branches: 0,
            functions: 14,
            lines: 27,
            statements: 27
         }
      }
   }
})
