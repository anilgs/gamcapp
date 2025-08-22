// Global test setup
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-key-for-testing'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/gamcapp_test'
process.env.RAZORPAY_KEY_ID = 'test_razorpay_key'
process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret'
process.env.SMTP_HOST = 'smtp.test.com'
process.env.SMTP_PORT = '587'
process.env.SMTP_USER = 'test@test.com'
process.env.SMTP_PASS = 'test_password'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'

// Global test utilities
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock fetch globally
global.fetch = jest.fn()

// Mock database connection
jest.mock('./lib/db', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
  pool: {
    connect: jest.fn(),
    end: jest.fn(),
  }
}))

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
  },
  createWriteStream: jest.fn(),
}))

// Setup and teardown
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks()
})

afterEach(() => {
  // Cleanup after each test
  jest.clearAllTimers()
})