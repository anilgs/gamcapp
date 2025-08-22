const {
  ValidationError,
  ValidationResult,
  ValidationPatterns,
  Validators,
  SchemaValidator,
  Schemas,
  validateFile,
  Sanitizers
} = require('../../lib/validation')

describe('Validation Utilities', () => {
  describe('ValidationError', () => {
    test('should create error with message, field, and code', () => {
      const error = new ValidationError('Test error', 'testField', 'TEST_CODE')
      
      expect(error.message).toBe('Test error')
      expect(error.field).toBe('testField')
      expect(error.code).toBe('TEST_CODE')
      expect(error.name).toBe('ValidationError')
    })
  })

  describe('ValidationResult', () => {
    test('should initialize as valid with no errors', () => {
      const result = new ValidationResult()
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.hasErrors()).toBe(false)
    })

    test('should add errors and become invalid', () => {
      const result = new ValidationResult()
      
      result.addError('field1', 'Error 1', 'CODE1')
      result.addError('field2', 'Error 2', 'CODE2')
      
      expect(result.isValid).toBe(false)
      expect(result.hasErrors()).toBe(true)
      expect(result.getErrors()).toHaveLength(2)
      expect(result.getErrorsForField('field1')).toHaveLength(1)
    })
  })

  describe('ValidationPatterns', () => {
    test('email pattern should match valid emails', () => {
      expect(ValidationPatterns.email.test('test@example.com')).toBe(true)
      expect(ValidationPatterns.email.test('user.name+tag@domain.co.uk')).toBe(true)
      expect(ValidationPatterns.email.test('invalid-email')).toBe(false)
    })

    test('indianPhone pattern should match valid Indian numbers', () => {
      expect(ValidationPatterns.indianPhone.test('+919876543210')).toBe(true)
      expect(ValidationPatterns.indianPhone.test('919876543210')).toBe(true)
      expect(ValidationPatterns.indianPhone.test('9876543210')).toBe(true)
      expect(ValidationPatterns.indianPhone.test('5876543210')).toBe(false)
    })

    test('passport pattern should match valid passport numbers', () => {
      expect(ValidationPatterns.passport.test('A1234567')).toBe(true)
      expect(ValidationPatterns.passport.test('AB123456')).toBe(true)
      expect(ValidationPatterns.passport.test('invalid')).toBe(false)
    })

    test('otp pattern should match 6-digit codes', () => {
      expect(ValidationPatterns.otp.test('123456')).toBe(true)
      expect(ValidationPatterns.otp.test('000000')).toBe(true)
      expect(ValidationPatterns.otp.test('12345')).toBe(false)
      expect(ValidationPatterns.otp.test('1234567')).toBe(false)
      expect(ValidationPatterns.otp.test('abcdef')).toBe(false)
    })
  })

  describe('Basic Validators', () => {
    describe('required', () => {
      test('should pass for non-empty values', () => {
        expect(Validators.required('test')).toBe('test')
        expect(Validators.required(123)).toBe(123)
        expect(Validators.required(false)).toBe(false)
      })

      test('should throw for empty values', () => {
        expect(() => Validators.required('')).toThrow(ValidationError)
        expect(() => Validators.required(null)).toThrow(ValidationError)
        expect(() => Validators.required(undefined)).toThrow(ValidationError)
      })
    })

    describe('string', () => {
      test('should validate string with constraints', () => {
        expect(Validators.string('test')).toBe('test')
        expect(Validators.string('  test  ')).toBe('test') // Should trim
      })

      test('should enforce minLength', () => {
        expect(() => Validators.string('ab', 'Field', { minLength: 3 }))
          .toThrow(ValidationError)
      })

      test('should enforce maxLength', () => {
        expect(() => Validators.string('abcdef', 'Field', { maxLength: 5 }))
          .toThrow(ValidationError)
      })

      test('should validate against pattern', () => {
        const pattern = /^[A-Z]+$/
        expect(() => Validators.string('abc', 'Field', { pattern }))
          .toThrow(ValidationError)
        expect(Validators.string('ABC', 'Field', { pattern })).toBe('ABC')
      })
    })

    describe('number', () => {
      test('should convert and validate numbers', () => {
        expect(Validators.number('123')).toBe(123)
        expect(Validators.number(456)).toBe(456)
        expect(Validators.number('123.45')).toBe(123.45)
      })

      test('should throw for invalid numbers', () => {
        expect(() => Validators.number('abc')).toThrow(ValidationError)
      })

      test('should enforce min/max constraints', () => {
        expect(() => Validators.number('5', 'Field', { min: 10 }))
          .toThrow(ValidationError)
        expect(() => Validators.number('15', 'Field', { max: 10 }))
          .toThrow(ValidationError)
      })

      test('should enforce integer constraint', () => {
        expect(() => Validators.number('123.45', 'Field', { integer: true }))
          .toThrow(ValidationError)
        expect(Validators.number('123', 'Field', { integer: true })).toBe(123)
      })
    })

    describe('email', () => {
      test('should validate and normalize emails', () => {
        expect(Validators.email('Test@Example.Com')).toBe('test@example.com')
        expect(Validators.email('  user@domain.org  ')).toBe('user@domain.org')
      })

      test('should throw for invalid emails', () => {
        expect(() => Validators.email('invalid-email')).toThrow(ValidationError)
        expect(() => Validators.email('user@')).toThrow(ValidationError)
      })
    })

    describe('phone', () => {
      test('should validate Indian phone numbers', () => {
        expect(Validators.phone('+91 9876543210')).toBe('+919876543210')
        expect(Validators.phone('9876543210')).toBe('9876543210')
      })

      test('should throw for invalid phone numbers', () => {
        expect(() => Validators.phone('5876543210')).toThrow(ValidationError)
        expect(() => Validators.phone('98765')).toThrow(ValidationError)
      })
    })

    describe('name', () => {
      test('should validate names', () => {
        expect(Validators.name('John Doe')).toBe('John Doe')
        expect(Validators.name('  Mary Jane  ')).toBe('Mary Jane')
      })

      test('should throw for invalid names', () => {
        expect(() => Validators.name('J')).toThrow(ValidationError) // Too short
        expect(() => Validators.name('John123')).toThrow(ValidationError) // Contains numbers
      })
    })

    describe('passport', () => {
      test('should validate and normalize passport numbers', () => {
        expect(Validators.passport('a1234567')).toBe('A1234567')
        expect(Validators.passport('AB123456')).toBe('AB123456')
      })

      test('should throw for invalid passport numbers', () => {
        expect(() => Validators.passport('12345')).toThrow(ValidationError) // Too short
        expect(() => Validators.passport('invalid')).toThrow(ValidationError) // Wrong format
      })
    })

    describe('otp', () => {
      test('should validate OTP format', () => {
        expect(Validators.otp('123456')).toBe('123456')
        expect(Validators.otp('000000')).toBe('000000')
      })

      test('should throw for invalid OTP', () => {
        expect(() => Validators.otp('12345')).toThrow(ValidationError) // Too short
        expect(() => Validators.otp('abcdef')).toThrow(ValidationError) // Not numeric
      })
    })

    describe('date', () => {
      test('should validate date strings', () => {
        const date = Validators.date('2023-12-25')
        expect(date).toBeInstanceOf(Date)
        expect(date.getFullYear()).toBe(2023)
      })

      test('should throw for invalid dates', () => {
        expect(() => Validators.date('invalid-date')).toThrow(ValidationError)
        expect(() => Validators.date('2023-13-45')).toThrow(ValidationError)
      })
    })

    describe('futureDate', () => {
      test('should accept future dates', () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dateString = tomorrow.toISOString().split('T')[0]
        
        const result = Validators.futureDate(dateString)
        expect(result).toBeInstanceOf(Date)
      })

      test('should reject past dates', () => {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const dateString = yesterday.toISOString().split('T')[0]
        
        expect(() => Validators.futureDate(dateString)).toThrow(ValidationError)
      })
    })

    describe('enum', () => {
      test('should validate enum values', () => {
        const allowedValues = ['red', 'green', 'blue']
        expect(Validators.enum('red', allowedValues)).toBe('red')
        expect(Validators.enum('blue', allowedValues)).toBe('blue')
      })

      test('should throw for invalid enum values', () => {
        const allowedValues = ['red', 'green', 'blue']
        expect(() => Validators.enum('yellow', allowedValues)).toThrow(ValidationError)
      })
    })
  })

  describe('Schema Validation', () => {
    test('should validate object against schema', () => {
      const schema = new SchemaValidator({
        name: [Validators.required, Validators.name],
        email: [Validators.required, Validators.email],
        age: [(value) => value ? Validators.number(value, 'Age', { min: 18 }) : value]
      })

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: '25'
      }

      const result = schema.validate(validData)
      
      expect(result.isValid).toBe(true)
      expect(result.hasErrors()).toBe(false)
      expect(validData.email).toBe('john@example.com') // Should be normalized
      expect(validData.age).toBe(25) // Should be converted to number
    })

    test('should collect validation errors', () => {
      const schema = new SchemaValidator({
        name: [Validators.required, Validators.name],
        email: [Validators.required, Validators.email]
      })

      const invalidData = {
        name: '',
        email: 'invalid-email'
      }

      const result = schema.validate(invalidData)
      
      expect(result.isValid).toBe(false)
      expect(result.hasErrors()).toBe(true)
      expect(result.getErrors()).toHaveLength(2)
      expect(result.getErrorsForField('name')).toHaveLength(1)
      expect(result.getErrorsForField('email')).toHaveLength(1)
    })
  })

  describe('Predefined Schemas', () => {
    describe('userRegistration', () => {
      test('should validate complete user registration data', () => {
        const userData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '9876543210',
          passport_number: 'A1234567'
        }

        const result = Schemas.userRegistration.validate(userData)
        
        expect(result.isValid).toBe(true)
        expect(userData.passport_number).toBe('A1234567') // Should be normalized
      })
    })

    describe('appointmentBooking', () => {
      test('should validate appointment booking data', () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        const appointmentData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '9876543210',
          passport_number: 'A1234567',
          appointment_type: 'employment_visa',
          preferred_date: tomorrow.toISOString().split('T')[0],
          medical_center: 'mumbai',
          nationality: 'Indian',
          gender: 'Male',
          age: '30'
        }

        const result = Schemas.appointmentBooking.validate(appointmentData)
        
        expect(result.isValid).toBe(true)
        expect(appointmentData.age).toBe(30) // Should be converted to number
      })

      test('should reject invalid appointment types', () => {
        const appointmentData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '9876543210',
          passport_number: 'A1234567',
          appointment_type: 'invalid_type',
          preferred_date: '2024-12-25',
          medical_center: 'mumbai'
        }

        const result = Schemas.appointmentBooking.validate(appointmentData)
        
        expect(result.isValid).toBe(false)
        expect(result.getErrorsForField('appointment_type')).toHaveLength(1)
      })
    })

    describe('otpVerification', () => {
      test('should validate OTP verification data', () => {
        const otpData = {
          phone: '9876543210',
          otp: '123456'
        }

        const result = Schemas.otpVerification.validate(otpData)
        
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('File Validation', () => {
    test('should validate file size and type', () => {
      const validFile = {
        size: 1024 * 1024, // 1MB
        mimetype: 'image/jpeg'
      }

      const result = validateFile(validFile)
      
      expect(result.isValid).toBe(true)
      expect(result.hasErrors()).toBe(false)
    })

    test('should reject oversized files', () => {
      const oversizedFile = {
        size: 10 * 1024 * 1024, // 10MB (default max is 5MB)
        mimetype: 'image/jpeg'
      }

      const result = validateFile(oversizedFile)
      
      expect(result.isValid).toBe(false)
      expect(result.getErrorsForField('file')).toHaveLength(1)
    })

    test('should reject invalid file types', () => {
      const invalidFile = {
        size: 1024,
        mimetype: 'application/x-executable'
      }

      const result = validateFile(invalidFile)
      
      expect(result.isValid).toBe(false)
      expect(result.getErrorsForField('file')).toHaveLength(1)
    })

    test('should accept custom options', () => {
      const file = {
        size: 1024,
        mimetype: 'text/plain'
      }

      const result = validateFile(file, {
        maxSize: 2048,
        allowedTypes: ['text/plain', 'text/csv']
      })
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('Sanitizers', () => {
    test('stripHtml should remove HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>'
      const output = Sanitizers.stripHtml(input)
      
      expect(output).toBe('Hello World')
    })

    test('escapeHtml should escape HTML entities', () => {
      const input = '<script>alert("XSS")</script>'
      const output = Sanitizers.escapeHtml(input)
      
      expect(output).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')
    })

    test('normalizePhone should format phone numbers', () => {
      expect(Sanitizers.normalizePhone('+919876543210')).toBe('9876543210')
      expect(Sanitizers.normalizePhone('919876543210')).toBe('9876543210')
    })

    test('normalizeEmail should lowercase and trim emails', () => {
      expect(Sanitizers.normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com')
    })

    test('normalizeName should trim and normalize spaces', () => {
      expect(Sanitizers.normalizeName('  John   Doe  ')).toBe('John Doe')
    })
  })
})