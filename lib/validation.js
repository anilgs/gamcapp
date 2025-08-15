/**
 * Comprehensive validation utilities for GAMCA Medical Services
 */

// Validation error class
export class ValidationError extends Error {
  constructor(message, field = null, code = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

// Validation result interface
export class ValidationResult {
  constructor() {
    this.isValid = true;
    this.errors = [];
  }

  addError(field, message, code = null) {
    this.isValid = false;
    this.errors.push({ field, message, code });
  }

  hasErrors() {
    return !this.isValid;
  }

  getErrors() {
    return this.errors;
  }

  getErrorsForField(field) {
    return this.errors.filter(error => error.field === field);
  }
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+]?[\d\s\-\(\)]{10,15}$/,
  indianPhone: /^[+]?91?[6-9]\d{9}$/,
  passport: /^[A-Z]{1,2}[0-9]{6,8}$/,
  name: /^[a-zA-Z\s]{2,50}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  otp: /^\d{6}$/,
  razorpayId: /^[a-zA-Z0-9_]{10,}$/
};

// Validation functions
export const Validators = {
  // Required field validation
  required: (value, fieldName = 'Field') => {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${fieldName} is required`, fieldName, 'REQUIRED');
    }
    return value;
  },

  // String validations
  string: (value, fieldName = 'Field', options = {}) => {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, 'INVALID_TYPE');
    }

    if (options.minLength && value.length < options.minLength) {
      throw new ValidationError(
        `${fieldName} must be at least ${options.minLength} characters long`,
        fieldName,
        'MIN_LENGTH'
      );
    }

    if (options.maxLength && value.length > options.maxLength) {
      throw new ValidationError(
        `${fieldName} must be no more than ${options.maxLength} characters long`,
        fieldName,
        'MAX_LENGTH'
      );
    }

    if (options.pattern && !options.pattern.test(value)) {
      throw new ValidationError(
        `${fieldName} format is invalid`,
        fieldName,
        'INVALID_FORMAT'
      );
    }

    return value.trim();
  },

  // Number validations
  number: (value, fieldName = 'Field', options = {}) => {
    const num = Number(value);
    if (isNaN(num)) {
      throw new ValidationError(`${fieldName} must be a valid number`, fieldName, 'INVALID_NUMBER');
    }

    if (options.min !== undefined && num < options.min) {
      throw new ValidationError(
        `${fieldName} must be at least ${options.min}`,
        fieldName,
        'MIN_VALUE'
      );
    }

    if (options.max !== undefined && num > options.max) {
      throw new ValidationError(
        `${fieldName} must be no more than ${options.max}`,
        fieldName,
        'MAX_VALUE'
      );
    }

    if (options.integer && !Number.isInteger(num)) {
      throw new ValidationError(`${fieldName} must be an integer`, fieldName, 'NOT_INTEGER');
    }

    return num;
  },

  // Email validation
  email: (value, fieldName = 'Email') => {
    const email = Validators.string(value, fieldName, { maxLength: 255 });
    if (!ValidationPatterns.email.test(email)) {
      throw new ValidationError(`${fieldName} format is invalid`, fieldName, 'INVALID_EMAIL');
    }
    return email.toLowerCase();
  },

  // Phone validation
  phone: (value, fieldName = 'Phone') => {
    const phone = Validators.string(value, fieldName, { minLength: 10, maxLength: 15 });
    if (!ValidationPatterns.indianPhone.test(phone.replace(/\s/g, ''))) {
      throw new ValidationError(
        `${fieldName} must be a valid Indian phone number`,
        fieldName,
        'INVALID_PHONE'
      );
    }
    return phone.replace(/\s/g, '');
  },

  // Name validation
  name: (value, fieldName = 'Name') => {
    const name = Validators.string(value, fieldName, { 
      minLength: 2, 
      maxLength: 50,
      pattern: ValidationPatterns.name 
    });
    return name;
  },

  // Passport validation
  passport: (value, fieldName = 'Passport Number') => {
    const passport = Validators.string(value, fieldName, { 
      minLength: 6, 
      maxLength: 10,
      pattern: ValidationPatterns.passport 
    });
    return passport.toUpperCase();
  },

  // OTP validation
  otp: (value, fieldName = 'OTP') => {
    const otp = Validators.string(value, fieldName, { 
      minLength: 6, 
      maxLength: 6,
      pattern: ValidationPatterns.otp 
    });
    return otp;
  },

  // Date validation
  date: (value, fieldName = 'Date') => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new ValidationError(`${fieldName} must be a valid date`, fieldName, 'INVALID_DATE');
    }
    return date;
  },

  // Future date validation
  futureDate: (value, fieldName = 'Date') => {
    const date = Validators.date(value, fieldName);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    if (date < now) {
      throw new ValidationError(`${fieldName} must be in the future`, fieldName, 'PAST_DATE');
    }
    return date;
  },

  // Enum validation
  enum: (value, allowedValues, fieldName = 'Field') => {
    if (!allowedValues.includes(value)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        fieldName,
        'INVALID_ENUM'
      );
    }
    return value;
  },

  // Array validation
  array: (value, fieldName = 'Field', options = {}) => {
    if (!Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName, 'INVALID_TYPE');
    }

    if (options.minLength && value.length < options.minLength) {
      throw new ValidationError(
        `${fieldName} must have at least ${options.minLength} items`,
        fieldName,
        'MIN_ITEMS'
      );
    }

    if (options.maxLength && value.length > options.maxLength) {
      throw new ValidationError(
        `${fieldName} must have no more than ${options.maxLength} items`,
        fieldName,
        'MAX_ITEMS'
      );
    }

    return value;
  },

  // Object validation
  object: (value, fieldName = 'Field') => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an object`, fieldName, 'INVALID_TYPE');
    }
    return value;
  },

  // Boolean validation
  boolean: (value, fieldName = 'Field') => {
    if (typeof value !== 'boolean') {
      throw new ValidationError(`${fieldName} must be a boolean`, fieldName, 'INVALID_TYPE');
    }
    return value;
  }
};

// Schema validation
export class SchemaValidator {
  constructor(schema) {
    this.schema = schema;
  }

  validate(data) {
    const result = new ValidationResult();
    
    for (const [field, rules] of Object.entries(this.schema)) {
      try {
        let value = data[field];
        
        // Apply each rule in sequence
        for (const rule of rules) {
          if (typeof rule === 'function') {
            value = rule(value, field);
          } else if (typeof rule === 'object' && rule.validator) {
            value = rule.validator(value, field, rule.options);
          }
        }
        
        // Update the validated value
        data[field] = value;
        
      } catch (error) {
        if (error instanceof ValidationError) {
          result.addError(error.field || field, error.message, error.code);
        } else {
          result.addError(field, `Validation error: ${error.message}`, 'VALIDATION_ERROR');
        }
      }
    }
    
    return result;
  }
}

// Predefined schemas for common use cases
export const Schemas = {
  // User registration schema
  userRegistration: new SchemaValidator({
    name: [Validators.required, Validators.name],
    email: [Validators.required, Validators.email],
    phone: [Validators.required, Validators.phone],
    passport_number: [
      (value) => value ? Validators.passport(value) : value
    ]
  }),

  // Appointment booking schema
  appointmentBooking: new SchemaValidator({
    name: [Validators.required, Validators.name],
    email: [Validators.required, Validators.email],
    phone: [Validators.required, Validators.phone],
    passport_number: [Validators.required, Validators.passport],
    appointment_type: [
      Validators.required,
      (value) => Validators.enum(value, [
        'employment_visa', 'family_visa', 'visit_visa', 
        'student_visa', 'business_visa', 'other'
      ], 'Appointment Type')
    ],
    preferred_date: [Validators.required, Validators.futureDate],
    medical_center: [
      Validators.required,
      (value) => Validators.enum(value, [
        'bangalore', 'chennai', 'delhi', 'hyderabad',
        'kochi', 'kolkata', 'mumbai', 'pune'
      ], 'Medical Center')
    ],
    nationality: [Validators.string],
    gender: [
      (value) => value ? Validators.enum(value, ['Male', 'Female', 'Other'], 'Gender') : value
    ],
    age: [
      (value) => value ? Validators.number(value, 'Age', { min: 1, max: 120, integer: true }) : value
    ],
    destination_country: [Validators.string],
    special_requirements: [
      (value) => value ? Validators.string(value, 'Special Requirements', { maxLength: 500 }) : value
    ]
  }),

  // OTP verification schema
  otpVerification: new SchemaValidator({
    phone: [Validators.required, Validators.phone],
    otp: [Validators.required, Validators.otp]
  }),

  // Admin login schema
  adminLogin: new SchemaValidator({
    username: [
      Validators.required,
      (value) => Validators.string(value, 'Username', { 
        minLength: 3, 
        maxLength: 20,
        pattern: ValidationPatterns.username 
      })
    ],
    password: [
      Validators.required,
      (value) => Validators.string(value, 'Password', { minLength: 6, maxLength: 100 })
    ]
  }),

  // Payment verification schema
  paymentVerification: new SchemaValidator({
    razorpay_order_id: [
      Validators.required,
      (value) => Validators.string(value, 'Order ID', { pattern: ValidationPatterns.razorpayId })
    ],
    razorpay_payment_id: [
      Validators.required,
      (value) => Validators.string(value, 'Payment ID', { pattern: ValidationPatterns.razorpayId })
    ],
    razorpay_signature: [Validators.required, Validators.string]
  }),

  // File upload schema
  fileUpload: new SchemaValidator({
    file: [Validators.required, Validators.object],
    upload_type: [
      (value) => value ? Validators.enum(value, [
        'appointment_slip', 'document', 'other'
      ], 'Upload Type') : 'other'
    ]
  }),

  // Pagination schema
  pagination: new SchemaValidator({
    page: [
      (value) => value ? Validators.number(value, 'Page', { min: 1, integer: true }) : 1
    ],
    limit: [
      (value) => value ? Validators.number(value, 'Limit', { min: 1, max: 100, integer: true }) : 10
    ]
  })
};

// Validation middleware for API routes
export const validateRequest = (schema) => {
  return (handler) => {
    return async (req, res) => {
      try {
        // Validate request body
        const validationResult = schema.validate(req.body);
        
        if (validationResult.hasErrors()) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors: validationResult.getErrors()
          });
        }

        // Continue to the actual handler
        return await handler(req, res);
        
      } catch (error) {
        console.error('Validation middleware error:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  };
};

// Query parameter validation
export const validateQuery = (req, schema) => {
  const result = schema.validate(req.query);
  if (result.hasErrors()) {
    throw new ValidationError('Query parameter validation failed', null, 'QUERY_VALIDATION');
  }
  return req.query;
};

// File validation
export const validateFile = (file, options = {}) => {
  const result = new ValidationResult();
  
  if (!file) {
    result.addError('file', 'File is required', 'REQUIRED');
    return result;
  }

  // Check file size
  const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default
  if (file.size > maxSize) {
    result.addError('file', `File size must be less than ${maxSize / 1024 / 1024}MB`, 'FILE_TOO_LARGE');
  }

  // Check file type
  const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.mimetype)) {
    result.addError('file', `File type must be one of: ${allowedTypes.join(', ')}`, 'INVALID_FILE_TYPE');
  }

  return result;
};

// Sanitization functions
export const Sanitizers = {
  // Remove HTML tags
  stripHtml: (value) => {
    return value.replace(/<[^>]*>/g, '');
  },

  // Escape HTML entities
  escapeHtml: (value) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return value.replace(/[&<>"']/g, (m) => map[m]);
  },

  // Normalize phone number
  normalizePhone: (phone) => {
    return phone.replace(/\D/g, '').replace(/^91/, '');
  },

  // Normalize email
  normalizeEmail: (email) => {
    return email.toLowerCase().trim();
  },

  // Normalize name
  normalizeName: (name) => {
    return name.trim().replace(/\s+/g, ' ');
  }
};

export default {
  ValidationError,
  ValidationResult,
  ValidationPatterns,
  Validators,
  SchemaValidator,
  Schemas,
  validateRequest,
  validateQuery,
  validateFile,
  Sanitizers
};
