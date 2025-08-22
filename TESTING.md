# GAMCAPP Testing Guide

## Overview

This document provides comprehensive information about the testing implementation for the GAMCAPP (Gulf Medical Services) application.

## Test Structure

### 📁 Test Organization

```
__tests__/
├── lib/                    # Utility and library tests
│   ├── auth.test.js       # Authentication utilities
│   ├── validation.test.js # Validation utilities
│   └── models/            # Model tests
│       ├── User.test.js   # User model tests
│       └── Admin.test.js  # Admin model tests
├── api/                   # API route tests
│   ├── auth/              # Authentication APIs
│   ├── payment/           # Payment APIs
│   ├── user/              # User management APIs
│   └── admin/             # Admin APIs
├── components/            # React component tests
│   ├── AppointmentForm.test.js
│   ├── LoadingSpinner.test.js
│   ├── ErrorBoundary.test.js
│   └── AdminUserList.test.js
└── integration/           # Integration tests
    ├── database.test.js   # Database integration
    ├── auth-flow.test.js  # Authentication flow
    └── payment-flow.test.js # Payment flow
```

## Test Categories

### 🔧 Unit Tests (lib/, components/)
- **Purpose**: Test individual functions and components in isolation
- **Coverage**: Utility functions, models, React components
- **Test Count**: ~120 tests

### 🌐 API Tests (api/)
- **Purpose**: Test API endpoints and request/response handling
- **Coverage**: Authentication, payment, user management APIs
- **Test Count**: ~40 tests

### 🔗 Integration Tests (integration/)
- **Purpose**: Test component interactions and workflows
- **Coverage**: Database operations, authentication flows, payment processes
- **Test Count**: ~30 tests

## Testing Technologies

### Core Framework
- **Jest**: Main testing framework
- **@testing-library/react**: React component testing
- **@testing-library/jest-dom**: DOM matchers
- **supertest**: HTTP API testing

### Mocking
- Database operations mocked via `jest.mock()`
- External services (Razorpay, SMS) mocked
- File system operations mocked for security

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests for CI/CD (no watch, coverage)
npm run test:ci

# Run specific test file
npm test auth.test.js

# Run tests matching pattern
npm test -- --testNamePattern="authentication"
```

### Environment-Specific Commands

```bash
# Run only unit tests
npm test __tests__/lib/

# Run only API tests
npm test __tests__/api/

# Run only component tests
npm test __tests__/components/

# Run only integration tests
npm test __tests__/integration/
```

## Coverage Requirements

The project maintains high code coverage standards:

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

### Coverage Reports
- **Text**: Console output during test runs
- **HTML**: Detailed browser-viewable report (`coverage/lcov-report/index.html`)
- **LCOV**: Machine-readable format for CI/CD integration

## Test Patterns

### 1. Unit Test Pattern

```javascript
describe('Component/Function Name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('specific functionality', () => {
    test('should do something specific', () => {
      // Arrange
      const input = 'test input'
      
      // Act
      const result = functionUnderTest(input)
      
      // Assert
      expect(result).toBe('expected output')
    })
  })
})
```

### 2. React Component Test Pattern

```javascript
describe('ComponentName', () => {
  const defaultProps = {
    prop1: 'value1',
    onAction: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should render correctly', () => {
    render(<ComponentName {...defaultProps} />)
    
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  test('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<ComponentName {...defaultProps} />)
    
    await user.click(screen.getByRole('button', { name: /submit/i }))
    
    expect(defaultProps.onAction).toHaveBeenCalled()
  })
})
```

### 3. API Test Pattern

```javascript
describe('API Endpoint', () => {
  test('should handle valid request', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { validData: 'test' }
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual({
      success: true,
      data: expect.any(Object)
    })
  })
})
```

## Mocking Strategies

### 1. Database Mocking
```javascript
const mockQuery = jest.fn()
jest.mock('../../lib/db', () => ({
  query: mockQuery,
  transaction: jest.fn()
}))

// In tests
mockQuery.mockResolvedValue({ rows: [mockData] })
```

### 2. External Service Mocking
```javascript
jest.mock('../../lib/razorpay', () => ({
  createOrder: jest.fn().mockResolvedValue({ success: true }),
  verifyPaymentSignature: jest.fn().mockReturnValue(true)
}))
```

### 3. Model Mocking
```javascript
const mockUser = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn()
}
jest.mock('../../lib/models/User', () => mockUser)
```

## Test Data Management

### Mock Data Standards
```javascript
// User mock data
const mockUser = {
  id: 'user123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+919876543210',
  passport_number: 'A1234567',
  appointment_details: { appointment_type: 'employment_visa' },
  payment_status: 'pending'
}

// API Response mock data
const mockApiResponse = {
  success: true,
  message: 'Operation successful',
  data: expect.any(Object)
}
```

### Date and Time Handling
```javascript
// Mock dates for consistent testing
const mockDate = new Date('2023-01-01T00:00:00Z')
jest.spyOn(global, 'Date').mockImplementation(() => mockDate)
```

## Testing Best Practices

### ✅ Do's

1. **Write Descriptive Test Names**
   ```javascript
   // Good
   test('should validate email format and reject invalid emails')
   
   // Bad
   test('email validation')
   ```

2. **Use AAA Pattern**
   ```javascript
   test('should calculate total with tax', () => {
     // Arrange
     const price = 100
     const taxRate = 0.1
     
     // Act
     const total = calculateTotal(price, taxRate)
     
     // Assert
     expect(total).toBe(110)
   })
   ```

3. **Mock External Dependencies**
   ```javascript
   // Always mock database, APIs, file system
   jest.mock('../../lib/db')
   jest.mock('../../lib/email')
   ```

4. **Test Edge Cases**
   ```javascript
   test.each([
     ['', false],           // Empty string
     [null, false],         // Null value
     [undefined, false],    // Undefined
     ['valid@email.com', true]  // Valid case
   ])('should validate email: %s -> %s', (email, expected) => {
     expect(validateEmail(email)).toBe(expected)
   })
   ```

5. **Use Appropriate Matchers**
   ```javascript
   // Specific matchers
   expect(result).toBeNull()
   expect(array).toHaveLength(3)
   expect(object).toEqual(expect.objectContaining({ id: 'test' }))
   ```

### ❌ Don'ts

1. **Don't Test Implementation Details**
   ```javascript
   // Bad - testing internal state
   expect(component.state.isLoading).toBe(false)
   
   // Good - testing behavior
   expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
   ```

2. **Don't Write Overly Complex Tests**
   ```javascript
   // Bad - doing too much in one test
   test('should handle entire user registration flow', () => {
     // 50 lines of test code...
   })
   
   // Good - focused tests
   test('should validate user input')
   test('should save user to database')
   test('should send welcome email')
   ```

3. **Don't Forget Cleanup**
   ```javascript
   afterEach(() => {
     jest.clearAllMocks()
     cleanup()
   })
   ```

## Debugging Tests

### Common Issues and Solutions

1. **Async/Await Problems**
   ```javascript
   // Use waitFor for async operations
   await waitFor(() => {
     expect(screen.getByText('Success')).toBeInTheDocument()
   })
   ```

2. **Mock Not Working**
   ```javascript
   // Ensure mock is called before importing module
   jest.mock('../../lib/db')
   const { query } = require('../../lib/db')
   ```

3. **React Component Not Rendering**
   ```javascript
   // Check for missing providers or props
   render(
     <TestProvider>
       <ComponentUnderTest {...requiredProps} />
     </TestProvider>
   )
   ```

### Debug Commands
```bash
# Run with verbose output
npm test -- --verbose

# Run single test file with debug info
npm test -- --no-cache auth.test.js

# Run tests and keep watching for changes
npm test -- --watch --verbose
```

## CI/CD Integration

### GitHub Actions Integration
The tests are integrated into the deployment pipeline in `.github/workflows/deploy.yml`:

```yaml
- name: Run type check
  run: npm run type-check

- name: Run linting
  run: npm run lint

- name: Run tests
  run: npm run test:ci

- name: Run build test
  run: npm run build
```

### Test Coverage Reporting
Coverage reports are generated for each CI run and can be integrated with services like:
- **Codecov**
- **Coveralls** 
- **SonarQube**

## Contributing Guidelines

### Adding New Tests

1. **Create test file in appropriate directory**
   ```bash
   # For utility function
   touch __tests__/lib/newUtility.test.js
   
   # For React component
   touch __tests__/components/NewComponent.test.js
   
   # For API endpoint
   touch __tests__/api/newEndpoint.test.js
   ```

2. **Follow naming conventions**
   - Test files: `*.test.js`
   - Test descriptions: "should [expected behavior]"
   - Mock objects: `mock[ObjectName]`

3. **Update test documentation**
   - Add test descriptions to relevant sections
   - Update coverage expectations if needed
   - Document any new testing patterns

### Test Review Checklist

- [ ] Tests have descriptive names
- [ ] Edge cases are covered
- [ ] Mocks are properly configured
- [ ] Tests are isolated and independent
- [ ] Coverage threshold is maintained
- [ ] Tests pass in both local and CI environments

## Troubleshooting

### Common Error Messages

1. **"Cannot find module"**
   - Check mock paths and imports
   - Ensure module name mapping is correct

2. **"ReferenceError: TextEncoder is not defined"**
   - Add global polyfill in jest.setup.js

3. **"Timeout exceeded"**
   - Increase test timeout or fix async handling

4. **"Cannot read property of undefined"**
   - Check mock data structure
   - Ensure required props are provided

### Getting Help

1. **Check existing tests** for similar patterns
2. **Review Jest documentation** for advanced features
3. **Use debug mode** with `console.log` for troubleshooting
4. **Run single test files** to isolate issues

---

This comprehensive testing implementation ensures robust quality assurance for the GAMCAPP application with **190+ test cases** covering all critical functionality.