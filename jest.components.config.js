# Test Configuration for React Components

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  testMatch: [
    '**/__tests__/components/**/*.test.{js,jsx,ts,tsx}',
  ],
  
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    '!components/**/*.d.ts',
  ],
  
  coverageReporters: ['text', 'lcov', 'html'],
}