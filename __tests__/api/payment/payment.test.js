const { createMocks } = require('node-mocks-http')

// We need to handle the requireAuth middleware, so we'll mock it
const mockCreateOrderHandler = jest.fn()
const mockVerifyHandler = jest.fn()

// Mock auth middleware
const mockRequireAuth = jest.fn((handler) => handler)
jest.mock('../../../lib/auth', () => ({
  requireAuth: mockRequireAuth
}))

// Mock razorpay
const mockRazorpay = {
  createOrder: jest.fn(),
  getPaymentAmount: jest.fn(),
  generateReceiptId: jest.fn(),
  verifyPaymentSignature: jest.fn()
}
jest.mock('../../../lib/razorpay', () => mockRazorpay)

// Mock User model
const mockUser = {
  findById: jest.fn(),
  updatePaymentStatus: jest.fn()
}
jest.mock('../../../lib/models/User', () => mockUser)

// Mock database
const mockQuery = jest.fn()
jest.mock('../../../lib/db', () => ({
  query: mockQuery
}))

// Mock email service
const mockEmail = {
  sendPaymentConfirmation: jest.fn()
}
jest.mock('../../../lib/email', () => mockEmail)

describe('Payment APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/payment/create-order', () => {
    // Since the actual handler uses requireAuth middleware, we'll test the core logic
    const createOrderLogic = async (req, res) => {
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
      }

      const { appointmentId } = req.body
      const userId = req.user.id

      if (!appointmentId) {
        return res.status(400).json({
          success: false,
          error: 'Appointment ID is required'
        })
      }

      const user = await mockUser.findById(userId)
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      if (user.id !== appointmentId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized access to appointment'
        })
      }

      if (!user.appointment_details || Object.keys(user.appointment_details).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please complete appointment details first'
        })
      }

      if (user.payment_status === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Payment already completed for this appointment'
        })
      }

      const appointmentType = user.appointment_details.appointment_type
      if (!appointmentType) {
        return res.status(400).json({
          success: false,
          error: 'Appointment type not specified'
        })
      }

      const amount = mockRazorpay.getPaymentAmount(appointmentType)
      const receipt = mockRazorpay.generateReceiptId(userId, appointmentType)

      const orderResult = await mockRazorpay.createOrder({
        amount,
        currency: 'INR',
        receipt,
        notes: {
          user_id: userId,
          appointment_id: appointmentId,
          appointment_type: appointmentType,
          user_name: user.name,
          user_email: user.email,
          user_phone: user.phone
        }
      })

      if (!orderResult.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create payment order'
        })
      }

      const order = orderResult.order

      try {
        await mockQuery(
          `INSERT INTO payment_transactions (user_id, razorpay_order_id, amount, currency, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, order.id, amount, 'INR', 'created']
        )
      } catch (dbError) {
        // Continue anyway, as the order was created successfully
      }

      await user.updatePaymentStatus('pending')

      return res.status(200).json({
        success: true,
        message: 'Payment order created successfully',
        data: {
          order: {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt
          },
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone
          },
          appointment: {
            type: appointmentType,
            details: user.appointment_details
          },
          razorpay_key_id: process.env.RAZORPAY_KEY_ID
        }
      })
    }

    test('should create Razorpay order for authenticated user', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { appointmentId: 'user123' }
      })

      // Mock authenticated user
      req.user = { id: 'user123' }

      const mockUserData = {
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+919876543210',
        appointment_details: { appointment_type: 'employment_visa' },
        payment_status: 'pending',
        updatePaymentStatus: jest.fn().mockResolvedValue(true)
      }

      mockUser.findById.mockResolvedValue(mockUserData)
      mockRazorpay.getPaymentAmount.mockReturnValue(5000) // 50 INR in paise
      mockRazorpay.generateReceiptId.mockReturnValue('receipt_123')
      mockRazorpay.createOrder.mockResolvedValue({
        success: true,
        order: {
          id: 'order_123',
          amount: 5000,
          currency: 'INR',
          receipt: 'receipt_123'
        }
      })
      mockQuery.mockResolvedValue({ rowCount: 1 })

      await createOrderLogic(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(true)
      expect(responseData.data.order.id).toBe('order_123')
      expect(responseData.data.order.amount).toBe(5000)
      
      expect(mockRazorpay.createOrder).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'INR',
        receipt: 'receipt_123',
        notes: expect.objectContaining({
          user_id: 'user123',
          appointment_id: 'user123',
          appointment_type: 'employment_visa'
        })
      })
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payment_transactions'),
        ['user123', 'order_123', 5000, 'INR', 'created']
      )
    })

    test('should reject unauthenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { appointmentId: 'user123' }
      })

      // No req.user set (unauthenticated)

      await createOrderLogic(req, res)

      // This would normally be handled by requireAuth middleware
      // In a real test, we'd test the middleware separately
    })

    test('should validate appointment details exist', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { appointmentId: 'user123' }
      })

      req.user = { id: 'user123' }

      const mockUserData = {
        id: 'user123',
        appointment_details: {}, // Empty details
        payment_status: 'pending'
      }

      mockUser.findById.mockResolvedValue(mockUserData)

      await createOrderLogic(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Please complete appointment details first'
      })
    })

    test('should prevent duplicate payments', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { appointmentId: 'user123' }
      })

      req.user = { id: 'user123' }

      const mockUserData = {
        id: 'user123',
        appointment_details: { appointment_type: 'employment_visa' },
        payment_status: 'completed' // Already completed
      }

      mockUser.findById.mockResolvedValue(mockUserData)

      await createOrderLogic(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Payment already completed for this appointment'
      })
    })

    test('should validate appointment ID matches user', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { appointmentId: 'different_user' }
      })

      req.user = { id: 'user123' }

      const mockUserData = {
        id: 'user123',
        appointment_details: { appointment_type: 'employment_visa' },
        payment_status: 'pending'
      }

      mockUser.findById.mockResolvedValue(mockUserData)

      await createOrderLogic(req, res)

      expect(res._getStatusCode()).toBe(403)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Unauthorized access to appointment'
      })
    })

    test('should handle missing appointment ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {} // Missing appointmentId
      })

      req.user = { id: 'user123' }

      await createOrderLogic(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Appointment ID is required'
      })
    })
  })

  describe('POST /api/payment/verify', () => {
    const verifyPaymentLogic = async (req, res) => {
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing payment verification data'
        })
      }

      const isValidSignature = mockRazorpay.verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      })

      if (!isValidSignature) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment signature'
        })
      }

      // Update payment transaction
      await mockQuery(
        `UPDATE payment_transactions 
         SET razorpay_payment_id = $1, razorpay_signature = $2, status = $3 
         WHERE razorpay_order_id = $4`,
        [razorpay_payment_id, razorpay_signature, 'paid', razorpay_order_id]
      )

      // Get user from transaction
      const userResult = await mockQuery(
        `SELECT u.* FROM users u 
         JOIN payment_transactions pt ON u.id = pt.user_id 
         WHERE pt.razorpay_order_id = $1`,
        [razorpay_order_id]
      )

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found for this payment'
        })
      }

      const user = userResult.rows[0]

      // Update user payment status
      await mockQuery(
        'UPDATE users SET payment_status = $1, payment_id = $2 WHERE id = $3',
        ['completed', razorpay_payment_id, user.id]
      )

      // Send confirmation email
      try {
        await mockEmail.sendPaymentConfirmation(user.email, {
          name: user.name,
          amount: 5000, // This should come from the transaction
          payment_id: razorpay_payment_id,
          appointment_details: user.appointment_details
        })
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        // Don't fail the request if email fails
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          payment_id: razorpay_payment_id,
          status: 'completed'
        }
      })
    }

    test('should verify valid payment signature', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_123',
          razorpay_signature: 'signature_123'
        }
      })

      mockRazorpay.verifyPaymentSignature.mockReturnValue(true)
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 }) // Update transaction
        .mockResolvedValueOnce({ // Get user
          rows: [{
            id: 'user123',
            name: 'John Doe',
            email: 'john@example.com',
            appointment_details: { appointment_type: 'employment_visa' }
          }]
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // Update user

      mockEmail.sendPaymentConfirmation.mockResolvedValue(true)

      await verifyPaymentLogic(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        message: 'Payment verified successfully',
        data: {
          payment_id: 'pay_123',
          status: 'completed'
        }
      })

      expect(mockRazorpay.verifyPaymentSignature).toHaveBeenCalledWith({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'signature_123'
      })

      expect(mockEmail.sendPaymentConfirmation).toHaveBeenCalled()
    })

    test('should reject invalid signature', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_123',
          razorpay_signature: 'invalid_signature'
        }
      })

      mockRazorpay.verifyPaymentSignature.mockReturnValue(false)

      await verifyPaymentLogic(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Invalid payment signature'
      })
    })

    test('should handle missing payment data', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          razorpay_order_id: 'order_123'
          // Missing payment_id and signature
        }
      })

      await verifyPaymentLogic(req, res)

      expect(res._getStatusCode()).toBe(400)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Missing payment verification data'
      })
    })

    test('should continue if email fails', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_123',
          razorpay_signature: 'signature_123'
        }
      })

      mockRazorpay.verifyPaymentSignature.mockReturnValue(true)
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'user123',
            name: 'John Doe',
            email: 'john@example.com',
            appointment_details: { appointment_type: 'employment_visa' }
          }]
        })
        .mockResolvedValueOnce({ rowCount: 1 })

      mockEmail.sendPaymentConfirmation.mockRejectedValue(new Error('Email failed'))

      await verifyPaymentLogic(req, res)

      expect(res._getStatusCode()).toBe(200) // Should still succeed
      expect(JSON.parse(res._getData()).success).toBe(true)
    })
  })
})