import {defineConfig} from 'vitest/config'
import {fileURLToPath} from 'url'

export default defineConfig({
   server: {
      deps: {
         inline: [fileURLToPath(new URL('./src/run.ts', import.meta.url))]
      }
   },
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
