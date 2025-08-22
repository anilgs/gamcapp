const {
  generateToken,
  verifyToken,
  generateOTP,
  storeOTP,
  verifyOTP,
  formatPhoneNumber,
  sendSMS
} = require('../../lib/auth')

const User = require('../../lib/models/User')

// Mock the database and external services
jest.mock('../../lib/db')
jest.mock('../../lib/models/User')

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete User Authentication Flow', () => {
    test('should complete full OTP authentication flow', async () => {
      const phoneNumber = '9876543210'
      const formattedPhone = '+919876543210'
      const otpCode = '123456'

      // Step 1: Format phone number
      const formatted = formatPhoneNumber(phoneNumber)
      expect(formatted).toBe(formattedPhone)

      // Step 2: Generate and store OTP
      const otp = generateOTP()
      expect(otp).toMatch(/^\d{6}$/)

      // Mock database operations for OTP storage
      const mockQuery = require('../../lib/db').query
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 }) // DELETE existing OTPs
        .mockResolvedValueOnce({ // INSERT new OTP
          rows: [{
            id: 'otp123',
            phone: formattedPhone,
            otp: otp,
            expires_at: new Date(Date.now() + 10 * 60 * 1000)
          }]
        })

      await storeOTP(formattedPhone, otp)

      // Step 3: Send SMS (mock)
      const smsResult = await sendSMS(formattedPhone, `Your OTP is: ${otp}`)
      expect(smsResult.success).toBe(true)

      // Step 4: Verify OTP
      mockQuery
        .mockResolvedValueOnce({ // SELECT OTP
          rows: [{
            id: 'otp123',
            phone: formattedPhone,
            otp: otp,
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
            used: false
          }]
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE used flag

      const isValidOTP = await verifyOTP(formattedPhone, otp)
      expect(isValidOTP).toBe(true)

      // Step 5: Find or create user
      User.findByPhone.mockResolvedValue(null) // User doesn't exist

      const newUser = {
        id: 'user123',
        phone: formattedPhone,
        name: '',
        email: '',
        payment_status: 'pending',
        appointment_details: {}
      }

      User.create.mockResolvedValue(newUser)
      const user = await User.create({
        name: '',
        email: '',
        phone: formattedPhone,
        passport_number: '',
        appointment_details: {},
        payment_status: 'pending'
      })

      // Step 6: Generate JWT token
      const token = generateToken({
        id: user.id,
        phone: user.phone,
        type: 'user'
      })

      expect(token).toBeTruthy()

      // Step 7: Verify token works
      const decoded = verifyToken(token)
      expect(decoded.id).toBe(user.id)
      expect(decoded.phone).toBe(user.phone)
      expect(decoded.type).toBe('user')
    })

    test('should handle existing user authentication', async () => {
      const phoneNumber = '+919876543210'
      const otpCode = '123456'

      // Mock existing user
      const existingUser = {
        id: 'user123',
        phone: phoneNumber,
        name: 'John Doe',
        email: 'john@example.com',
        payment_status: 'completed',
        appointment_details: { appointment_type: 'employment_visa' }
      }

      User.findByPhone.mockResolvedValue(existingUser)

      // Mock OTP verification
      const mockQuery = require('../../lib/db').query
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'otp123',
            phone: phoneNumber,
            otp: otpCode,
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
            used: false
          }]
        })
        .mockResolvedValueOnce({ rowCount: 1 })

      const isValidOTP = await verifyOTP(phoneNumber, otpCode)
      expect(isValidOTP).toBe(true)

      const user = await User.findByPhone(phoneNumber)
      expect(user).toBe(existingUser)
      expect(User.create).not.toHaveBeenCalled()

      const token = generateToken({
        id: user.id,
        phone: user.phone,
        type: 'user'
      })

      const decoded = verifyToken(token)
      expect(decoded.id).toBe(existingUser.id)
    })

    test('should handle authentication failures', async () => {
      const phoneNumber = '+919876543210'
      const wrongOTP = '000000'

      // Mock OTP verification failure
      const mockQuery = require('../../lib/db').query
      mockQuery.mockResolvedValueOnce({ rows: [] }) // No matching OTP

      const isValidOTP = await verifyOTP(phoneNumber, wrongOTP)
      expect(isValidOTP).toBe(false)

      // Should not proceed to user creation or token generation
      expect(User.findByPhone).not.toHaveBeenCalled()
      expect(User.create).not.toHaveBeenCalled()
    })

    test('should handle expired OTP', async () => {
      const phoneNumber = '+919876543210'
      const expiredOTP = '123456'

      // Mock expired OTP
      const mockQuery = require('../../lib/db').query
      mockQuery.mockResolvedValueOnce({ rows: [] }) // No valid OTP (expired ones filtered out by query)

      const isValidOTP = await verifyOTP(phoneNumber, expiredOTP)
      expect(isValidOTP).toBe(false)
    })
  })

  describe('Complete Admin Authentication Flow', () => {
    test('should complete admin login flow', async () => {
      const Admin = require('../../lib/models/Admin')
      const bcrypt = require('bcryptjs')

      // Mock admin user
      const adminUser = {
        id: 'admin123',
        username: 'admin',
        password_hash: 'hashed_password',
        validatePassword: jest.fn().mockResolvedValue(true)
      }

      Admin.findByUsername = jest.fn().mockResolvedValue(adminUser)

      // Step 1: Find admin by username
      const admin = await Admin.findByUsername('admin')
      expect(admin).toBe(adminUser)

      // Step 2: Validate password
      const isValidPassword = await admin.validatePassword('admin123')
      expect(isValidPassword).toBe(true)

      // Step 3: Generate admin token
      const token = generateToken({
        id: admin.id,
        username: admin.username,
        type: 'admin'
      })

      // Step 4: Verify admin token
      const decoded = verifyToken(token)
      expect(decoded.type).toBe('admin')
      expect(decoded.id).toBe(admin.id)
    })

    test('should reject invalid admin credentials', async () => {
      const Admin = require('../../lib/models/Admin')

      Admin.findByUsername = jest.fn().mockResolvedValue(null)

      const admin = await Admin.findByUsername('nonexistent')
      expect(admin).toBeNull()

      // Should not proceed to token generation
    })

    test('should reject incorrect admin password', async () => {
      const Admin = require('../../lib/models/Admin')

      const adminUser = {
        id: 'admin123',
        username: 'admin',
        validatePassword: jest.fn().mockResolvedValue(false)
      }

      Admin.findByUsername = jest.fn().mockResolvedValue(adminUser)

      const admin = await Admin.findByUsername('admin')
      const isValidPassword = await admin.validatePassword('wrongpassword')

      expect(isValidPassword).toBe(false)
    })
  })

  describe('Token Management', () => {
    test('should handle token refresh scenario', async () => {
      const user = { id: 'user123', phone: '+919876543210', type: 'user' }

      // Generate initial token
      const initialToken = generateToken(user)
      expect(verifyToken(initialToken)).toBeTruthy()

      // Simulate token refresh
      const refreshedToken = generateToken(user)
      expect(verifyToken(refreshedToken)).toBeTruthy()

      // Both tokens should be valid (until expiry)
      expect(verifyToken(initialToken)).toBeTruthy()
      expect(verifyToken(refreshedToken)).toBeTruthy()
    })

    test('should handle token expiry', () => {
      const jwt = require('jsonwebtoken')
      const user = { id: 'user123', type: 'user' }

      // Create expired token
      const expiredToken = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '-1s' })

      const decoded = verifyToken(expiredToken)
      expect(decoded).toBeNull()
    })

    test('should handle invalid token signatures', () => {
      const jwt = require('jsonwebtoken')
      const user = { id: 'user123', type: 'user' }

      // Create token with wrong secret
      const invalidToken = jwt.sign(user, 'wrong-secret', { expiresIn: '1h' })

      const decoded = verifyToken(invalidToken)
      expect(decoded).toBeNull()
    })
  })

  describe('Security Considerations', () => {
    test('should prevent OTP reuse', async () => {
      const phoneNumber = '+919876543210'
      const otp = '123456'

      const mockQuery = require('../../lib/db').query

      // First verification (should succeed)
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'otp123',
            phone: phoneNumber,
            otp: otp,
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
            used: false
          }]
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // Mark as used

      const firstVerification = await verifyOTP(phoneNumber, otp)
      expect(firstVerification).toBe(true)

      // Second verification (should fail - OTP already used)
      mockQuery.mockResolvedValueOnce({ rows: [] }) // No unused OTP found

      const secondVerification = await verifyOTP(phoneNumber, otp)
      expect(secondVerification).toBe(false)
    })

    test('should handle rate limiting', () => {
      const { checkOTPRateLimit } = require('../../lib/auth')
      const phoneNumber = '+919876543210'

      // Should allow first 3 requests
      expect(checkOTPRateLimit(phoneNumber)).toBe(true)
      expect(checkOTPRateLimit(phoneNumber)).toBe(true)
      expect(checkOTPRateLimit(phoneNumber)).toBe(true)

      // Should block 4th request
      expect(checkOTPRateLimit(phoneNumber)).toBe(false)
    })

    test('should validate phone number format', () => {
      const { formatPhoneNumber, isValidPhoneNumber } = require('../../lib/auth')

      // Valid formats
      expect(isValidPhoneNumber(formatPhoneNumber('9876543210'))).toBe(true)
      expect(isValidPhoneNumber(formatPhoneNumber('919876543210'))).toBe(true)
      expect(isValidPhoneNumber(formatPhoneNumber('+919876543210'))).toBe(true)

      // Invalid formats
      expect(isValidPhoneNumber('123456')).toBe(false)
      expect(isValidPhoneNumber('+1234567890')).toBe(false)
      expect(isValidPhoneNumber('5876543210')).toBe(false) // Doesn't start with 6-9
    })
  })

  describe('Error Recovery', () => {
    test('should handle database connection failures during authentication', async () => {
      const phoneNumber = '+919876543210'
      const otp = '123456'

      const mockQuery = require('../../lib/db').query
      mockQuery.mockRejectedValue(new Error('Database connection failed'))

      await expect(storeOTP(phoneNumber, otp)).rejects.toThrow('Database connection failed')
      await expect(verifyOTP(phoneNumber, otp)).rejects.toThrow('Database connection failed')
    })

    test('should handle SMS service failures gracefully', async () => {
      const phoneNumber = '+919876543210'
      const message = 'Your OTP is: 123456'

      // In development mode, should continue even if SMS fails
      process.env.NODE_ENV = 'development'

      const result = await sendSMS(phoneNumber, message)
      expect(result.success).toBe(true)
      expect(result.messageId).toContain('placeholder-')
    })
  })
})