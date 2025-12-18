import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit', '<rootDir>/tests/integration'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: [
    '**/tests/unit/**/*.test.(ts|js)',
    '**/tests/integration/**/*.test.(ts|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/types/**',
    '!src/utils/logger.ts'
  ],
  coverageDirectory: '<rootDir>/coverage',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json',
    },
  },
  // Support for jsforce mocking via manual mocks or jest.mock
  // See tests/helpers/mocks.ts for jsforce stubs
};

export default config;
