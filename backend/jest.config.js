module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js'
  ],
  coverageDirectory: './coverage',
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['./setupTests.js'],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  clearMocks: true,
  restoreMocks: true
}; 