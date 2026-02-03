module.exports = {
   clearMocks: true,
   resetMocks: true,
   restoreMocks: true,
   moduleFileExtensions: ['js', 'ts'],
   testEnvironment: 'node',
   testMatch: ['**/*.test.ts'],
   transform: {
      '^.+\\.ts$': 'ts-jest'
   },
   preset: 'ts-jest',
   moduleNameMapper: {
      '^@actions/core$': '<rootDir>/__mocks__/@actions/core.js',
      '^@actions/exec$': '<rootDir>/__mocks__/@actions/exec.js',
      '^@actions/io$': '<rootDir>/__mocks__/@actions/io.js'
   },
   setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
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
