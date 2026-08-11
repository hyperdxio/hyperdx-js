import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          // Needed for Jest/jsdom compatibility
          module: 'commonjs',
          target: 'es2019',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          strictNullChecks: false,
          skipLibCheck: true,
          lib: ['esnext', 'dom'],
          types: ['jest', '@types/intercom-web'],
        },
      },
    ],
  },
  // Don't try to transform node_modules JS files
  transformIgnorePatterns: ['/node_modules/'],
  testRegex: '(/__tests__/.*\\.(test|spec))\\.ts$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  // Polyfill TextEncoder/TextDecoder for jsdom
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  // Force exit due to SDK timers (batch processor intervals) that aren't cleaned up
  forceExit: true,
};

export default config;
