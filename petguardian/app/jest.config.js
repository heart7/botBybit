/**
 * Unit tests for pure logic (e.g. validation). Uses ts-jest so no React Native
 * runtime is required. Component/RN tests can move to the jest-expo preset later.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {}],
  },
};
