module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'models/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  // These files are standalone scripts (run via `node`) that define their own
  // describe/it/expect helpers and call process.exit(). They must not be picked
  // up by Jest, otherwise the process.exit() call aborts the whole test run.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/enterprise.test.js',
    '<rootDir>/tests/enterprise-services.test.js'
  ],
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
