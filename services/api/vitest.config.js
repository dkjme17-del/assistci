const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test_secret_key_for_assistci_suite_only',
      LOG_LEVEL: 'silent',
    },
    hookTimeout: 20000,
    testTimeout: 20000,
  },
});
