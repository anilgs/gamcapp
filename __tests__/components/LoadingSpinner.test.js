import React from 'react'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '../../../components/LoadingSpinner'

describe('LoadingSpinner Component', () => {
  test('should render loading spinner', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByRole('status') || screen.getByTestId('loading-spinner') || document.querySelector('[class*="animate-spin"]')
    expect(spinner).toBeInTheDocument()
  })

  test('should show default loading message', () => {
    render(<LoadingSpinner />)
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  test('should show custom message if provided', () => {
    const customMessage = 'Processing your request...'
    render(<LoadingSpinner message={customMessage} />)
    
    expect(screen.getByText(customMessage)).toBeInTheDocument()
  })

  test('should have spinning animation class', () => {
    render(<LoadingSpinner />)
    
    const spinner = document.querySelector('[class*="animate-spin"]')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass(/animate-spin/)
  })

  test('should render with proper accessibility attributes', () => {
    render(<LoadingSpinner />)
    
    const element = screen.getByRole('status') || document.querySelector('[aria-label*="loading"]')
    expect(element).toBeInTheDocument()
  })
})