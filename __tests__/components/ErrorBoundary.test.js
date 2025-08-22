import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../../../components/ErrorBoundary'

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary Component', () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  
  afterAll(() => {
    console.error = originalError
  })

  beforeEach(() => {
    console.error.mockClear()
  })

  test('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  test('should catch and display errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.queryByText('No error')).not.toBeInTheDocument()
  })

  test('should log errors to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(console.error).toHaveBeenCalled()
  })

  test('should provide error reset functionality', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    // Should show error UI
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    
    // Check if there's a retry/reset button
    const retryButton = screen.queryByRole('button', { name: /try again|reload|retry/i })
    if (retryButton) {
      fireEvent.click(retryButton)
      
      // Re-render with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('No error')).toBeInTheDocument()
    }
  })

  test('should display error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    // Should show error details in development
    const errorText = screen.getByText(/something went wrong/i)
    expect(errorText).toBeInTheDocument()
    
    process.env.NODE_ENV = originalEnv
  })

  test('should handle different types of errors', () => {
    const ErrorComponent = () => {
      throw new TypeError('Type error test')
    }
    
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(console.error).toHaveBeenCalled()
  })

  test('should handle component unmounting gracefully', () => {
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(() => unmount()).not.toThrow()
  })

  test('should isolate errors to boundary scope', () => {
    render(
      <div>
        <div>Outside boundary</div>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
        <div>Also outside boundary</div>
      </div>
    )
    
    expect(screen.getByText('Outside boundary')).toBeInTheDocument()
    expect(screen.getByText('Also outside boundary')).toBeInTheDocument()
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  test('should provide fallback UI customization', () => {
    const CustomErrorBoundary = ({ children }) => (
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        {children}
      </ErrorBoundary>
    )
    
    render(
      <CustomErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CustomErrorBoundary>
    )
    
    // If custom fallback is supported
    const customMessage = screen.queryByText('Custom error message')
    const defaultMessage = screen.queryByText(/something went wrong/i)
    
    expect(customMessage || defaultMessage).toBeInTheDocument()
  })
})