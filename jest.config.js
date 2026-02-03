export default {
   clearMocks: true,
   resetMocks: true,
   moduleFileExtensions: ['js', 'ts'],
   testEnvironment: 'node',
   testMatch: ['**/*.test.ts'],
   preset: 'ts-jest/presets/default-esm',
   extensionsToTreatAsEsm: ['.ts'],
   transform: {
      '^.+\\.ts$': [
         'ts-jest',
         {
            useESM: true
         }
      ]
   },
   moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1'
   },
   transformIgnorePatterns: [],
   verbose: true,
   coverageThreshold: {
      global: {
         branches: 0,
         functions: 14,
         lines: 27,
         statements: 27
      }
   }
}
