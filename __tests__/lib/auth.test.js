const jwt = require('jsonwebtoken')
const {
  generateToken,
  verifyToken,
  generateOTP,
  storeOTP,
  verifyOTP,
  formatPhoneNumber,
  isValidPhoneNumber,
  checkOTPRateLimit,
  requireAuth,
  requireAdminAuth,
  cleanupExpiredOTPs,
  extractTokenFromRequest,
  getUserFromToken,
} = require('../../lib/auth')

// Mock the database
const { query } = require('../../lib/db')
jest.mock('../../lib/db')

describe('Authentication Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear rate limit map
    const auth = require('../../lib/auth')
    if (auth.otpRateLimit) {
      auth.otpRateLimit.clear()
    }
  })

  describe('Token Management', () => {
    test('generateToken should create valid JWT token', () => {
      const payload = { id: '123', phone: '+919876543210', type: 'user' }
      const token = generateToken(payload)
      
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      
      // Verify the token contains correct payload
      const decoded = jwt.decode(token)
      expect(decoded.id).toBe(payload.id)
      expect(decoded.phone).toBe(payload.phone)
      expect(decoded.type).toBe(payload.type)
    })

    test('verifyToken should validate JWT token', () => {
      const payload = { id: '123', type: 'user' }
      const token = generateToken(payload)
      
      const decoded = verifyToken(token)
      
      expect(decoded).toBeTruthy()
      expect(decoded.id).toBe(payload.id)
      expect(decoded.type).toBe(payload.type)
    })

    test('verifyToken should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here'
      const result = verifyToken(invalidToken)
      
      expect(result).toBeNull()
    })

    test('verifyToken should return null for expired token', () => {
      const payload = { id: '123', type: 'user' }
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1s' })
      
      const result = verifyToken(token)
      
      expect(result).toBeNull()
    })
  })

  describe('OTP Management', () => {
    test('generateOTP should create 6-digit numeric OTP', () => {
      const otp = generateOTP()
      
      expect(otp).toMatch(/^\d{6}$/)
      expect(otp.length).toBe(6)
    })

    test('generateOTP should generate different OTPs', () => {
      const otp1 = generateOTP()
      const otp2 = generateOTP()
      
      // While they could be the same, it's statistically unlikely
      expect(otp1).toMatch(/^\d{6}$/)
      expect(otp2).toMatch(/^\d{6}$/)
    })

    test('storeOTP should save OTP to database with expiry', async () => {
      const phone = '+919876543210'
      const otp = '123456'
      const mockResult = { rows: [{ id: '1', phone, otp, expires_at: new Date() }] }
      
      query.mockResolvedValueOnce({ rowCount: 1 }) // DELETE existing OTPs
      query.mockResolvedValueOnce(mockResult) // INSERT new OTP
      
      const result = await storeOTP(phone, otp)
      
      expect(query).toHaveBeenCalledTimes(2)
      expect(query).toHaveBeenCalledWith('DELETE FROM otp_tokens WHERE phone = $1', [phone])
      expect(query).toHaveBeenCalledWith(
        'INSERT INTO otp_tokens (phone, otp, expires_at) VALUES ($1, $2, $3) RETURNING *',
        expect.arrayContaining([phone, otp, expect.any(Date)])
      )
      expect(result).toEqual(mockResult.rows[0])
    })

    test('verifyOTP should validate correct OTP', async () => {
      const phone = '+919876543210'
      const otp = '123456'
      const mockResult = { rows: [{ id: '1', phone, otp }] }
      
      query.mockResolvedValueOnce(mockResult) // SELECT OTP
      query.mockResolvedValueOnce({ rowCount: 1 }) // UPDATE used flag
      
      const result = await verifyOTP(phone, otp)
      
      expect(result).toBe(true)
      expect(query).toHaveBeenCalledWith(
        'SELECT * FROM otp_tokens WHERE phone = $1 AND otp = $2 AND expires_at > NOW() AND used = FALSE',
        [phone, otp]
      )
      expect(query).toHaveBeenCalledWith('UPDATE otp_tokens SET used = TRUE WHERE id = $1', ['1'])
    })

    test('verifyOTP should reject expired/invalid OTP', async () => {
      const phone = '+919876543210'
      const otp = '123456'
      
      query.mockResolvedValueOnce({ rows: [] }) // No matching OTP
      
      const result = await verifyOTP(phone, otp)
      
      expect(result).toBe(false)
    })

    test('cleanupExpiredOTPs should remove expired OTPs', async () => {
      query.mockResolvedValueOnce({ rowCount: 5 })
      
      const result = await cleanupExpiredOTPs()
      
      expect(result).toBe(5)
      expect(query).toHaveBeenCalledWith('DELETE FROM otp_tokens WHERE expires_at < NOW()')
    })
  })

  describe('Phone Number Validation', () => {
    test('formatPhoneNumber should add +91 country code', () => {
      expect(formatPhoneNumber('9876543210')).toBe('+919876543210')
      expect(formatPhoneNumber('919876543210')).toBe('+919876543210')
      expect(formatPhoneNumber('+919876543210')).toBe('+919876543210')
    })

    test('formatPhoneNumber should handle various input formats', () => {
      expect(formatPhoneNumber('98765 43210')).toBe('+919876543210')
      expect(formatPhoneNumber('91-98765-43210')).toBe('+919876543210')
      expect(formatPhoneNumber('(+91) 98765-43210')).toBe('+919876543210')
    })

    test('isValidPhoneNumber should validate Indian phone numbers', () => {
      expect(isValidPhoneNumber('+919876543210')).toBe(true)
      expect(isValidPhoneNumber('919876543210')).toBe(true)
      expect(isValidPhoneNumber('9876543210')).toBe(true)
      expect(isValidPhoneNumber('+918876543210')).toBe(true) // Starts with 8
      expect(isValidPhoneNumber('+917876543210')).toBe(true) // Starts with 7
      expect(isValidPhoneNumber('+916876543210')).toBe(true) // Starts with 6
    })

    test('isValidPhoneNumber should reject invalid formats', () => {
      expect(isValidPhoneNumber('+915876543210')).toBe(false) // Starts with 5
      expect(isValidPhoneNumber('876543210')).toBe(false) // Too short
      expect(isValidPhoneNumber('+9198765432100')).toBe(false) // Too long
      expect(isValidPhoneNumber('+1234567890')).toBe(false) // Wrong country code
      expect(isValidPhoneNumber('abcd')).toBe(false) // Non-numeric
    })
  })

  describe('Rate Limiting', () => {
    test('checkOTPRateLimit should allow initial requests', () => {
      const phone = '+919876543210'
      
      expect(checkOTPRateLimit(phone)).toBe(true)
    })

    test('checkOTPRateLimit should block excessive requests', () => {
      const phone = '+919876543210'
      
      // First 3 requests should be allowed
      expect(checkOTPRateLimit(phone)).toBe(true)
      expect(checkOTPRateLimit(phone)).toBe(true)
      expect(checkOTPRateLimit(phone)).toBe(true)
      
      // 4th request should be blocked
      expect(checkOTPRateLimit(phone)).toBe(false)
    })

    test('checkOTPRateLimit should reset after time window', () => {
      const phone = '+919876543210'
      
      // Mock Date.now to simulate time passage
      const originalNow = Date.now
      Date.now = jest.fn(() => 1000000000000) // Initial time
      
      // Exhaust the limit
      checkOTPRateLimit(phone)
      checkOTPRateLimit(phone)
      checkOTPRateLimit(phone)
      expect(checkOTPRateLimit(phone)).toBe(false)
      
      // Simulate time passage (1 minute + 1ms)
      Date.now = jest.fn(() => 1000000000000 + 60001)
      
      // Should allow again
      expect(checkOTPRateLimit(phone)).toBe(true)
      
      // Restore original Date.now
      Date.now = originalNow
    })
  })

  describe('Middleware Functions', () => {
    let mockReq, mockRes, mockNext

    beforeEach(() => {
      mockReq = {
        headers: {},
        cookies: {}
      }
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }
      mockNext = jest.fn()
    })

    test('requireAuth should allow valid tokens', async () => {
      const payload = { id: '123', type: 'user' }
      const token = generateToken(payload)
      mockReq.headers.authorization = `Bearer ${token}`
      
      const mockHandler = jest.fn().mockResolvedValue('success')
      const middleware = requireAuth(mockHandler)
      
      await middleware(mockReq, mockRes)
      
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes)
      expect(mockReq.user).toEqual(expect.objectContaining(payload))
    })

    test('requireAuth should reject missing tokens', async () => {
      const mockHandler = jest.fn()
      const middleware = requireAuth(mockHandler)
      
      await middleware(mockReq, mockRes)
      
      expect(mockHandler).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'No token provided'
      })
    })

    test('requireAuth should reject invalid tokens', async () => {
      mockReq.headers.authorization = 'Bearer invalid.token'
      
      const mockHandler = jest.fn()
      const middleware = requireAuth(mockHandler)
      
      await middleware(mockReq, mockRes)
      
      expect(mockHandler).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      })
    })

    test('requireAdminAuth should validate admin tokens', async () => {
      const payload = { id: '123', type: 'admin' }
      const token = generateToken(payload)
      mockReq.headers.authorization = `Bearer ${token}`
      
      const mockHandler = jest.fn().mockResolvedValue('success')
      const middleware = requireAdminAuth(mockHandler)
      
      await middleware(mockReq, mockRes)
      
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes)
      expect(mockReq.admin).toEqual(expect.objectContaining(payload))
    })

    test('requireAdminAuth should reject user tokens', async () => {
      const payload = { id: '123', type: 'user' }
      const token = generateToken(payload)
      mockReq.headers.authorization = `Bearer ${token}`
      
      const mockHandler = jest.fn()
      const middleware = requireAdminAuth(mockHandler)
      
      await middleware(mockReq, mockRes)
      
      expect(mockHandler).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Admin access required'
      })
    })
  })

  describe('Utility Functions', () => {
    test('extractTokenFromRequest should extract from Authorization header', () => {
      const token = 'test.token.here'
      const req = {
        headers: { authorization: `Bearer ${token}` },
        cookies: {}
      }
      
      expect(extractTokenFromRequest(req)).toBe(token)
    })

    test('extractTokenFromRequest should extract from cookies', () => {
      const token = 'test.token.here'
      const req = {
        headers: {},
        cookies: { token }
      }
      
      expect(extractTokenFromRequest(req)).toBe(token)
    })

    test('extractTokenFromRequest should return null if no token', () => {
      const req = {
        headers: {},
        cookies: {}
      }
      
      expect(extractTokenFromRequest(req)).toBeNull()
    })

    test('getUserFromToken should return user for valid user token', async () => {
      const payload = { id: '123', type: 'user' }
      const token = generateToken(payload)
      
      // Mock User.findById
      const mockUser = { id: '123', name: 'Test User' }
      jest.doMock('../../lib/models/User', () => ({
        findById: jest.fn().mockResolvedValue(mockUser)
      }))
      
      const User = require('../../lib/models/User')
      const result = await getUserFromToken(token)
      
      expect(User.findById).toHaveBeenCalledWith('123')
      expect(result).toBe(mockUser)
    })
  })
})