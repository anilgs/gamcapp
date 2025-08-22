import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppointmentForm from '../../../components/AppointmentForm'

describe('AppointmentForm Component', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    userPhone: null
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('should render all form fields', () => {
      render(<AppointmentForm {...defaultProps} />)

      // Personal Information fields
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/passport number/i)).toBeInTheDocument()

      // Appointment Details fields
      expect(screen.getByLabelText(/appointment type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/preferred date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/preferred medical center/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/additional notes/i)).toBeInTheDocument()

      // Submit button
      expect(screen.getByRole('button', { name: /proceed to payment/i })).toBeInTheDocument()
    })

    test('should pre-populate phone if provided', () => {
      const userPhone = '+919876543210'
      render(<AppointmentForm {...defaultProps} userPhone={userPhone} />)

      const phoneInput = screen.getByLabelText(/phone number/i)
      expect(phoneInput).toHaveValue(userPhone)
      expect(phoneInput).toBeDisabled()
      expect(screen.getByText(/phone number verified via otp/i)).toBeInTheDocument()
    })

    test('should show appointment type options', () => {
      render(<AppointmentForm {...defaultProps} />)

      const appointmentSelect = screen.getByLabelText(/appointment type/i)
      fireEvent.click(appointmentSelect)

      expect(screen.getByRole('option', { name: /employment visa medical/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /family visa medical/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /visit visa medical/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /student visa medical/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /business visa medical/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /other/i })).toBeInTheDocument()
    })

    test('should show medical center options', () => {
      render(<AppointmentForm {...defaultProps} />)

      const centerSelect = screen.getByLabelText(/preferred medical center/i)
      fireEvent.click(centerSelect)

      expect(screen.getByRole('option', { name: /gamca mumbai/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /gamca delhi/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /gamca chennai/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /gamca hyderabad/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /gamca kochi/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /gamca bangalore/i })).toBeInTheDocument()
    })

    test('should show important information section', () => {
      render(<AppointmentForm {...defaultProps} />)

      expect(screen.getByText(/important information/i)).toBeInTheDocument()
      expect(screen.getByText(/arrive 30 minutes before/i)).toBeInTheDocument()
      expect(screen.getByText(/fasting for 8-12 hours/i)).toBeInTheDocument()
      expect(screen.getByText(/non-refundable once payment/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    const user = userEvent.setup()

    test('should validate required fields', async () => {
      render(<AppointmentForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/email address is required/i)).toBeInTheDocument()
        expect(screen.getByText(/phone number is required/i)).toBeInTheDocument()
        expect(screen.getByText(/passport number is required/i)).toBeInTheDocument()
        expect(screen.getByText(/please select an appointment type/i)).toBeInTheDocument()
        expect(screen.getByText(/please select a preferred date/i)).toBeInTheDocument()
        expect(screen.getByText(/please select a medical center/i)).toBeInTheDocument()
      })

      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    test('should validate email format', async () => {
      render(<AppointmentForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    test('should validate phone format', async () => {
      render(<AppointmentForm {...defaultProps} />)

      const phoneInput = screen.getByLabelText(/phone number/i)
      await user.type(phoneInput, '123456')

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid indian phone number/i)).toBeInTheDocument()
      })
    })

    test('should validate passport format', async () => {
      render(<AppointmentForm {...defaultProps} />)

      const passportInput = screen.getByLabelText(/passport number/i)
      await user.type(passportInput, '123')

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/passport number must be at least 6 characters/i)).toBeInTheDocument()
      })
    })

    test('should validate name format', async () => {
      render(<AppointmentForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/full name/i)
      await user.type(nameInput, 'J')

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters long/i)).toBeInTheDocument()
      })
    })

    test('should reject names with numbers', async () => {
      render(<AppointmentForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/full name/i)
      await user.type(nameInput, 'John123')

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name can only contain letters and spaces/i)).toBeInTheDocument()
      })
    })

    test('should validate future dates only', async () => {
      render(<AppointmentForm {...defaultProps} />)

      const dateInput = screen.getByLabelText(/preferred date/i)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = yesterday.toISOString().split('T')[0]

      await user.type(dateInput, yesterdayString)

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/date cannot be in the past/i)).toBeInTheDocument()
      })
    })

    test('should validate date range limits', async () => {
      render(<AppointmentForm {...defaultProps} />)

      const dateInput = screen.getByLabelText(/preferred date/i)
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 4) // 4 months ahead
      const futureDateString = futureDate.toISOString().split('T')[0]

      await user.type(dateInput, futureDateString)

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/date cannot be more than 3 months from today/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Interaction', () => {
    const user = userEvent.setup()

    test('should clear errors on input change', async () => {
      render(<AppointmentForm {...defaultProps} />)

      // Trigger validation error
      const nameInput = screen.getByLabelText(/full name/i)
      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
      })

      // Type in the field to clear error
      await user.type(nameInput, 'John Doe')

      await waitFor(() => {
        expect(screen.queryByText(/full name is required/i)).not.toBeInTheDocument()
      })
    })

    test('should disable phone field if pre-filled', () => {
      const userPhone = '+919876543210'
      render(<AppointmentForm {...defaultProps} userPhone={userPhone} />)

      const phoneInput = screen.getByLabelText(/phone number/i)
      expect(phoneInput).toBeDisabled()
    })

    test('should disable form during submission', async () => {
      const mockOnSubmit = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      render(<AppointmentForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill valid form data
      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/passport number/i), 'A1234567')
      
      await user.selectOptions(screen.getByLabelText(/appointment type/i), 'employment_visa')
      await user.selectOptions(screen.getByLabelText(/preferred medical center/i), 'gamca_mumbai')
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowString = tomorrow.toISOString().split('T')[0]
      await user.type(screen.getByLabelText(/preferred date/i), tomorrowString)

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      // Check if form is disabled during submission
      await waitFor(() => {
        expect(screen.getByText(/processing.../i)).toBeInTheDocument()
        expect(screen.getByLabelText(/full name/i)).toBeDisabled()
        expect(submitButton).toBeDisabled()
      })
    })

    test('should call onSubmit with formatted data', async () => {
      render(<AppointmentForm {...defaultProps} />)

      // Fill form with valid data
      await user.type(screen.getByLabelText(/full name/i), '  John Doe  ')
      await user.type(screen.getByLabelText(/email address/i), 'John@Example.Com')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/passport number/i), 'a1234567')
      await user.type(screen.getByLabelText(/additional notes/i), '  Special requirements  ')
      
      await user.selectOptions(screen.getByLabelText(/appointment type/i), 'employment_visa')
      await user.selectOptions(screen.getByLabelText(/preferred medical center/i), 'gamca_mumbai')
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowString = tomorrow.toISOString().split('T')[0]
      await user.type(screen.getByLabelText(/preferred date/i), tomorrowString)

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          name: 'John Doe', // Trimmed
          email: 'john@example.com', // Lowercase
          phone: '9876543210', // Trimmed
          passport_number: 'A1234567', // Uppercase
          appointment_type: 'employment_visa',
          preferred_date: tomorrowString,
          medical_center: 'gamca_mumbai',
          additional_notes: 'Special requirements' // Trimmed
        })
      })
    })

    test('should format passport to uppercase on input', async () => {
      render(<AppointmentForm {...defaultProps} />)

      const passportInput = screen.getByLabelText(/passport number/i)
      await user.type(passportInput, 'a1234567')

      // The input should show uppercase due to CSS textTransform
      expect(passportInput).toHaveStyle({ textTransform: 'uppercase' })
    })
  })

  describe('Date Validation', () => {
    test('should set correct min and max dates', () => {
      render(<AppointmentForm {...defaultProps} />)

      const dateInput = screen.getByLabelText(/preferred date/i)
      const today = new Date().toISOString().split('T')[0]
      const maxDate = new Date()
      maxDate.setMonth(maxDate.getMonth() + 3)
      const maxDateString = maxDate.toISOString().split('T')[0]

      expect(dateInput).toHaveAttribute('min', today)
      expect(dateInput).toHaveAttribute('max', maxDateString)
    })

    test('should show date availability info', () => {
      render(<AppointmentForm {...defaultProps} />)

      expect(screen.getByText(/appointments available up to 3 months in advance/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    const user = userEvent.setup()

    test('should handle form submission errors gracefully', async () => {
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'))
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
      
      render(<AppointmentForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill valid form data
      await user.type(screen.getByLabelText(/full name/i), 'John Doe')
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com')
      await user.type(screen.getByLabelText(/phone number/i), '9876543210')
      await user.type(screen.getByLabelText(/passport number/i), 'A1234567')
      
      await user.selectOptions(screen.getByLabelText(/appointment type/i), 'employment_visa')
      await user.selectOptions(screen.getByLabelText(/preferred medical center/i), 'gamca_mumbai')
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowString = tomorrow.toISOString().split('T')[0]
      await user.type(screen.getByLabelText(/preferred date/i), tomorrowString)

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to submit appointment. Please try again.')
        expect(submitButton).not.toBeDisabled() // Should re-enable after error
      })

      alertSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    test('should have proper form labels', () => {
      render(<AppointmentForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email address/i)
      const phoneInput = screen.getByLabelText(/phone number/i)

      expect(nameInput).toHaveAttribute('id')
      expect(emailInput).toHaveAttribute('id')
      expect(phoneInput).toHaveAttribute('id')
    })

    test('should show error messages with proper accessibility', async () => {
      const user = userEvent.setup()
      render(<AppointmentForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
      await user.click(submitButton)

      await waitFor(() => {
        const errorMessages = screen.getAllByText(/required|select/i)
        errorMessages.forEach(error => {
          expect(error).toHaveClass('text-red-600')
        })
      })
    })

    test('should have proper form structure', () => {
      render(<AppointmentForm {...defaultProps} />)

      const form = screen.getByRole('form') || screen.getByTestId('appointment-form') || document.querySelector('form')
      expect(form).toBeInTheDocument()
      
      const sections = screen.getAllByRole('heading', { level: 3 })
      expect(sections).toHaveLength(2) // Personal Information and Appointment Details
    })
  })
})