const { createMocks } = require('node-mocks-http')
const sendOtpHandler = require('../../../pages/api/auth/send-otp')
const verifyOtpHandler = require('../../../pages/api/auth/verify-otp')
const adminLoginHandler = require('../../../pages/api/auth/admin-login')

// Mock the auth lib
const mockAuth = {
  generateOTP: jest.fn(),
  storeOTP: jest.fn(),
  verifyOTP: jest.fn(),
  formatPhoneNumber: jest.fn(),
  isValidPhoneNumber: jest.fn(),
  checkOTPRateLimit: jest.fn(),
  generateToken: jest.fn(),
  sendSMS: jest.fn()
}

jest.mock('../../../lib/auth', () => mockAuth)

// Mock the User model
const mockUser = {
  findByPhone: jest.fn(),
  create: jest.fn()
}
jest.mock('../../../lib/models/User', () => mockUser)

// Mock the Admin model  
const mockAdmin = {
  findByUsername: jest.fn(),
  validatePassword: jest.fn()
}
jest.mock('../../../lib/models/Admin', () => mockAdmin)

describe('Authentication APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/send-otp', () => {
    test('should send OTP for valid phone number', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { phone: '9876543210' }
      })

      mockAuth.formatPhoneNumber.mockReturnValue('+919876543210')
      mockAuth.isValidPhoneNumber.mockReturnValue(true)
      mockAuth.checkOTPRateLimit.mockReturnValue(true)
      mockAuth.generateOTP.mockReturnValue('123456')
      mockAuth.storeOTP.mockResolvedValue({ id: '1' })
      mockAuth.sendSMS.mockResolvedValue({
        success: true,
        messageId: 'msg123'
      })

      await sendOtpHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        message: 'OTP sent successfully',
        data: {
          phone: '+919876543210',
          messageId: 'msg123',
          expiresIn: 600
        }
      })

      expect(mockAuth.storeOTP).toHaveBeenCalledWith('+919876543210', '123456')
      expect(mockAuth.sendSMS).toHaveBeenCalled()
    })

    test('should reject invalid phone number', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { phone: 'invalid' }
      })

      mockAuth.formatPhoneNumber.mockReturnValue('invalid')
      mockAuth.isValidPhoneNumber.mockReturnValue(false)

      await sendOtpHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Invalid phone number format'
      })
    })

    test('should enforce rate limiting', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { phone: '9876543210' }
      })

      mockAuth.formatPhoneNumber.mockReturnValue('+919876543210')
      mockAuth.isValidPhoneNumber.mockReturnValue(true)
      mockAuth.checkOTPRateLimit.mockReturnValue(false)

      await sendOtpHandler(req, res)

      expect(res._getStatusCode()).toBe(429)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Too many OTP requests. Please try again later.'
      })
    })

    test('should return development OTP in dev mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const { req, res } = createMocks({
        method: 'POST',
        body: { phone: '9876543210' }
      })

      mockAuth.formatPhoneNumber.mockReturnValue('+919876543210')
      mockAuth.isValidPhoneNumber.mockReturnValue(true)
      mockAuth.checkOTPRateLimit.mockReturnValue(true)
      mockAuth.generateOTP.mockReturnValue('123456')
      mockAuth.storeOTP.mockResolvedValue({ id: '1' })
      mockAuth.sendSMS.mockRejectedValue(new Error('SMS failed'))

      await sendOtpHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(true)
      expect(responseData.data.otp).toBe('123456')

      process.env.NODE_ENV = originalEnv
    })

    test('should reject non-POST methods', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      })

      await sendOtpHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Method not allowed'
      })
    })

    test('should handle missing phone number', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {}
      })

      await sendOtpHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Phone number is required'
      })
    })
  })

  describe('POST /api/auth/verify-otp', () => {
    test('should verify valid OTP and create new user', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { phone: '9876543210', otp: '123456' }
      })

      mockAuth.formatPhoneNumber.mockReturnValue('+919876543210')
      mockAuth.isValidPhoneNumber.mockReturnValue(true)
      mockAuth.verifyOTP.mockResolvedValue(true)
      mockUser.findByPhone.mockResolvedValue(null) // User doesn't exist
      
      const newUser = {
        id: 'user123',
        phone: '+919876543210',
        name: '',
        email: '',
        payment_status: 'pending',
        appointment_details: {}
      }
      mockUser.create.mockResolvedValue(newUser)
      mockAuth.generateToken.mockReturnValue('jwt.token.here')

      await verifyOtpHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        message: 'OTP verified successfully',
        data: {
          token: 'jwt.token.here',
          user: {
            id: 'user123',
            phone: '+919876543210',
            name: '',
            email: '',
            payment_status: 'pending',
            has_appointment_details: false
          }
        }
      })

      expect(mockUser.create).toHaveBeenCalledWith({
        name: '',
        email: '',
        phone: '+919876543210',
        passport_number: '',
        appointment_details: {},
        payment_status: 'pending'
      })
      expect(mockAuth.generateToken).toHaveBeenCalledWith({
        id: 'user123',
        phone: '+919876543210',
        type: 'user'
      })
    })

    test('should verify valid OTP for existing user', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { phone: '9876543210', otp: '123456' }
      })

      mockAuth.formatPhoneNumber.mockReturnValue('+919876543210')
      mockAuth.isValidPhoneNumber.mockReturnValue(true)
      mockAuth.verifyOTP.mockResolvedValue(true)
      
      const existingUser = {
        id: 'user123',
        phone: '+919876543210',
        name: 'John Doe',
        email: 'john@example.com',
        payment_status: 'completed',
        appointment_details: { type: 'employment_visa' }
      }
      mockUser.findByPhone.mockResolvedValue(existingUser)
      mockAuth.generateToken.mockReturnValue('jwt.token.here')

      await verifyOtpHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(true)
      expect(responseData.data.user.has_appointment_details).toBe(true)
      expect(mockUser.create).not.toHaveBeenCalled()
    })

    test('should reject invalid OTP', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { phone: '9876543210', otp: '123456' }
      })

      mockAuth.formatPhoneNumber.mockReturnValue('+919876543210')
      mockAuth.isValidPhoneNumber.mockReturnValue(true)
      mockAuth.verifyOTP.mockResolvedValue(false)

      await verifyOtpHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Invalid or expired OTP'
      })
    })

    test('should validate OTP format', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { phone: '9876543210', otp: '12345' } // 5 digits
      })

      mockAuth.formatPhoneNumber.mockReturnValue('+919876543210')
      mockAuth.isValidPhoneNumber.mockReturnValue(true)

      await verifyOtpHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Invalid OTP format'
      })
    })

    test('should handle missing required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { phone: '9876543210' } // Missing OTP
      })

      await verifyOtpHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Phone number and OTP are required'
      })
    })
  })

  describe('POST /api/auth/admin-login', () => {
    test('should login with valid credentials', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { username: 'admin', password: 'admin123' }
      })

      const mockAdminUser = {
        id: 'admin123',
        username: 'admin'
      }
      mockAdmin.findByUsername.mockResolvedValue(mockAdminUser)
      mockAdmin.validatePassword.mockResolvedValue(true)
      mockAuth.generateToken.mockReturnValue('admin.jwt.token')

      await adminLoginHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          token: 'admin.jwt.token',
          admin: {
            id: 'admin123',
            username: 'admin'
          }
        }
      })

      expect(mockAuth.generateToken).toHaveBeenCalledWith({
        id: 'admin123',
        username: 'admin',
        type: 'admin'
      })
    })

    test('should reject invalid credentials', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { username: 'admin', password: 'wrongpassword' }
      })

      const mockAdminUser = {
        id: 'admin123',
        username: 'admin'
      }
      mockAdmin.findByUsername.mockResolvedValue(mockAdminUser)
      mockAdmin.validatePassword.mockResolvedValue(false)

      await adminLoginHandler(req, res)

      expect(res._getStatusCode()).toBe(401)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Invalid credentials'
      })
    })

    test('should reject non-existent user', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { username: 'nonexistent', password: 'password' }
      })

      mockAdmin.findByUsername.mockResolvedValue(null)

      await adminLoginHandler(req, res)

      expect(res._getStatusCode()).toBe(401)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Invalid credentials'
      })
    })

    test('should handle missing credentials', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { username: 'admin' } // Missing password
      })

      await adminLoginHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Username and password are required'
      })
    })

    test('should reject non-POST methods', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      })

      await adminLoginHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Method not allowed'
      })
    })
  })
})