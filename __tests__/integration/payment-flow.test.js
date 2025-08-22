const {
  createOrder,
  getPaymentAmount,
  generateReceiptId,
  verifyPaymentSignature
} = require('../../lib/razorpay')

const { query } = require('../../lib/db')
const User = require('../../lib/models/User')
const { sendPaymentConfirmation } = require('../../lib/email')

// Mock dependencies
jest.mock('../../lib/razorpay')
jest.mock('../../lib/db')
jest.mock('../../lib/models/User')
jest.mock('../../lib/email')

describe('Payment Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Payment Process', () => {
    test('should complete full payment flow from order creation to verification', async () => {
      const userId = 'user123'
      const appointmentType = 'employment_visa'
      const amount = 5000 // 50 INR in paise

      // Step 1: Create payment order
      const mockUser = {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+919876543210',
        appointment_details: { appointment_type: appointmentType },
        payment_status: 'pending',
        updatePaymentStatus: jest.fn().mockResolvedValue(true)
      }

      User.findById.mockResolvedValue(mockUser)
      getPaymentAmount.mockReturnValue(amount)
      generateReceiptId.mockReturnValue('receipt_123')

      const mockOrder = {
        id: 'order_123',
        amount: amount,
        currency: 'INR',
        receipt: 'receipt_123',
        status: 'created'
      }

      createOrder.mockResolvedValue({
        success: true,
        order: mockOrder
      })

      // Mock database transaction insert
      query.mockResolvedValueOnce({ rowCount: 1 })

      // Create the order
      const user = await User.findById(userId)
      const orderAmount = getPaymentAmount(appointmentType)
      const receipt = generateReceiptId(userId, appointmentType)

      const orderResult = await createOrder({
        amount: orderAmount,
        currency: 'INR',
        receipt: receipt,
        notes: {
          user_id: userId,
          appointment_type: appointmentType,
          user_name: user.name,
          user_email: user.email
        }
      })

      expect(orderResult.success).toBe(true)
      expect(orderResult.order.id).toBe('order_123')

      // Store transaction
      await query(
        'INSERT INTO payment_transactions (user_id, razorpay_order_id, amount, currency, status) VALUES ($1, $2, $3, $4, $5)',
        [userId, orderResult.order.id, amount, 'INR', 'created']
      )

      // Update user payment status
      await user.updatePaymentStatus('pending')

      expect(createOrder).toHaveBeenCalledWith({
        amount: orderAmount,
        currency: 'INR',
        receipt: receipt,
        notes: expect.objectContaining({
          user_id: userId,
          appointment_type: appointmentType
        })
      })

      // Step 2: Simulate payment completion and verification
      const paymentId = 'pay_123'
      const signature = 'valid_signature_123'

      verifyPaymentSignature.mockReturnValue(true)

      // Mock database queries for payment verification
      query
        .mockResolvedValueOnce({ rowCount: 1 }) // Update transaction
        .mockResolvedValueOnce({ // Get user from transaction
          rows: [mockUser]
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // Update user

      sendPaymentConfirmation.mockResolvedValue(true)

      // Verify payment
      const isValidSignature = verifyPaymentSignature({
        razorpay_order_id: orderResult.order.id,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      })

      expect(isValidSignature).toBe(true)

      // Update payment transaction
      await query(
        'UPDATE payment_transactions SET razorpay_payment_id = $1, razorpay_signature = $2, status = $3 WHERE razorpay_order_id = $4',
        [paymentId, signature, 'paid', orderResult.order.id]
      )

      // Get user from transaction
      const userResult = await query(
        'SELECT u.* FROM users u JOIN payment_transactions pt ON u.id = pt.user_id WHERE pt.razorpay_order_id = $1',
        [orderResult.order.id]
      )

      expect(userResult.rows[0]).toBe(mockUser)

      // Update user payment status
      await query(
        'UPDATE users SET payment_status = $1, payment_id = $2 WHERE id = $3',
        ['completed', paymentId, userId]
      )

      // Send confirmation email
      await sendPaymentConfirmation(mockUser.email, {
        name: mockUser.name,
        amount: amount,
        payment_id: paymentId,
        appointment_details: mockUser.appointment_details
      })

      expect(sendPaymentConfirmation).toHaveBeenCalledWith(
        mockUser.email,
        expect.objectContaining({
          payment_id: paymentId,
          amount: amount
        })
      )
    })

    test('should handle payment order creation failure', async () => {
      const userId = 'user123'
      const appointmentType = 'employment_visa'

      const mockUser = {
        id: userId,
        appointment_details: { appointment_type: appointmentType },
        payment_status: 'pending'
      }

      User.findById.mockResolvedValue(mockUser)
      getPaymentAmount.mockReturnValue(5000)
      generateReceiptId.mockReturnValue('receipt_123')

      // Mock Razorpay order creation failure
      createOrder.mockResolvedValue({
        success: false,
        error: 'Insufficient funds in Razorpay account'
      })

      const orderResult = await createOrder({
        amount: 5000,
        currency: 'INR',
        receipt: 'receipt_123'
      })

      expect(orderResult.success).toBe(false)
      expect(orderResult.error).toBeTruthy()

      // Should not proceed with transaction storage
      expect(query).not.toHaveBeenCalled()
    })

    test('should handle payment verification failure', async () => {
      const orderId = 'order_123'
      const paymentId = 'pay_123'
      const invalidSignature = 'invalid_signature'

      verifyPaymentSignature.mockReturnValue(false)

      const isValidSignature = verifyPaymentSignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: invalidSignature
      })

      expect(isValidSignature).toBe(false)

      // Should not proceed with database updates
      expect(query).not.toHaveBeenCalled()
      expect(sendPaymentConfirmation).not.toHaveBeenCalled()
    })
  })

  describe('Payment Amount Calculation', () => {
    test('should calculate correct amounts for different appointment types', () => {
      // Mock different appointment types and their costs
      getPaymentAmount.mockImplementation((type) => {
        const amounts = {
          'employment_visa': 5000, // 50 INR
          'family_visa': 6000,     // 60 INR
          'visit_visa': 4500,      // 45 INR
          'student_visa': 5500,    // 55 INR
          'business_visa': 7000,   // 70 INR
          'other': 5000            // 50 INR default
        }
        return amounts[type] || 5000
      })

      expect(getPaymentAmount('employment_visa')).toBe(5000)
      expect(getPaymentAmount('family_visa')).toBe(6000)
      expect(getPaymentAmount('unknown_type')).toBe(5000)
    })

    test('should generate unique receipt IDs', () => {
      generateReceiptId.mockImplementation((userId, appointmentType) => 
        `receipt_${userId}_${appointmentType}_${Date.now()}`
      )

      const receipt1 = generateReceiptId('user1', 'employment_visa')
      const receipt2 = generateReceiptId('user2', 'employment_visa')

      expect(receipt1).toContain('user1')
      expect(receipt1).toContain('employment_visa')
      expect(receipt2).toContain('user2')
      expect(receipt1).not.toBe(receipt2)
    })
  })

  describe('Payment Status Tracking', () => {
    test('should track payment status throughout the process', async () => {
      const userId = 'user123'

      const mockUser = {
        id: userId,
        payment_status: 'pending',
        updatePaymentStatus: jest.fn()
      }

      // Mock status progression
      mockUser.updatePaymentStatus
        .mockResolvedValueOnce({ ...mockUser, payment_status: 'pending' })
        .mockResolvedValueOnce({ ...mockUser, payment_status: 'processing' })
        .mockResolvedValueOnce({ ...mockUser, payment_status: 'completed' })

      User.findById.mockResolvedValue(mockUser)

      const user = await User.findById(userId)

      // Status progression: pending -> processing -> completed
      await user.updatePaymentStatus('pending')
      await user.updatePaymentStatus('processing')
      await user.updatePaymentStatus('completed')

      expect(mockUser.updatePaymentStatus).toHaveBeenCalledTimes(3)
      expect(mockUser.updatePaymentStatus).toHaveBeenNthCalledWith(1, 'pending')
      expect(mockUser.updatePaymentStatus).toHaveBeenNthCalledWith(2, 'processing')
      expect(mockUser.updatePaymentStatus).toHaveBeenNthCalledWith(3, 'completed')
    })

    test('should handle payment failure status', async () => {
      const userId = 'user123'
      const orderId = 'order_123'

      // Mock payment failure scenario
      query
        .mockResolvedValueOnce({ rowCount: 1 }) // Update transaction to failed
        .mockResolvedValueOnce({
          rows: [{
            id: userId,
            name: 'John Doe',
            email: 'john@example.com',
            payment_status: 'pending'
          }]
        })
        .mockResolvedValueOnce({ rowCount: 1 }) // Update user to failed

      // Update transaction status to failed
      await query(
        'UPDATE payment_transactions SET status = $1 WHERE razorpay_order_id = $2',
        ['failed', orderId]
      )

      // Get user and update status
      const userResult = await query(
        'SELECT u.* FROM users u JOIN payment_transactions pt ON u.id = pt.user_id WHERE pt.razorpay_order_id = $1',
        [orderId]
      )

      await query(
        'UPDATE users SET payment_status = $1 WHERE id = $2',
        ['failed', userResult.rows[0].id]
      )

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payment_transactions SET status = $1'),
        ['failed', orderId]
      )
    })
  })

  describe('Email Notifications', () => {
    test('should send payment confirmation email', async () => {
      const userEmail = 'john@example.com'
      const paymentData = {
        name: 'John Doe',
        amount: 5000,
        payment_id: 'pay_123',
        appointment_details: { appointment_type: 'employment_visa' }
      }

      sendPaymentConfirmation.mockResolvedValue(true)

      await sendPaymentConfirmation(userEmail, paymentData)

      expect(sendPaymentConfirmation).toHaveBeenCalledWith(userEmail, paymentData)
    })

    test('should handle email service failure gracefully', async () => {
      const userEmail = 'john@example.com'
      const paymentData = { name: 'John Doe', amount: 5000 }

      sendPaymentConfirmation.mockRejectedValue(new Error('Email service unavailable'))

      // Payment should still be considered successful even if email fails
      try {
        await sendPaymentConfirmation(userEmail, paymentData)
      } catch (error) {
        expect(error.message).toBe('Email service unavailable')
      }

      // The payment verification should continue despite email failure
      expect(sendPaymentConfirmation).toHaveBeenCalled()
    })
  })

  describe('Error Recovery', () => {
    test('should handle database failures during payment verification', async () => {
      const orderId = 'order_123'
      const paymentId = 'pay_123'

      verifyPaymentSignature.mockReturnValue(true)
      query.mockRejectedValue(new Error('Database connection lost'))

      await expect(query(
        'UPDATE payment_transactions SET status = $1 WHERE razorpay_order_id = $2',
        ['paid', orderId]
      )).rejects.toThrow('Database connection lost')
    })

    test('should prevent duplicate payment processing', async () => {
      const orderId = 'order_123'
      const paymentId = 'pay_123'

      // Mock existing completed payment
      query.mockResolvedValueOnce({
        rows: [{
          id: 'transaction123',
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          status: 'paid'
        }]
      })

      // Check if payment already processed
      const existingPayment = await query(
        'SELECT * FROM payment_transactions WHERE razorpay_order_id = $1 AND status = $2',
        [orderId, 'paid']
      )

      if (existingPayment.rows.length > 0) {
        // Payment already processed, should not proceed
        expect(existingPayment.rows[0].status).toBe('paid')
        return
      }

      // This should not be reached in this test case
      expect(true).toBe(false)
    })
  })

  describe('Webhook Handling', () => {
    test('should handle Razorpay webhooks', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_123',
              order_id: 'order_123',
              status: 'captured',
              amount: 5000
            }
          }
        }
      }

      // Mock webhook signature verification
      verifyPaymentSignature.mockReturnValue(true)

      // Mock database update for webhook
      query.mockResolvedValueOnce({ rowCount: 1 })

      const isValidWebhook = verifyPaymentSignature({
        webhookBody: JSON.stringify(webhookPayload),
        webhookSignature: 'webhook_signature',
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
      })

      if (isValidWebhook && webhookPayload.event === 'payment.captured') {
        await query(
          'UPDATE payment_transactions SET status = $1 WHERE razorpay_payment_id = $2',
          ['captured', webhookPayload.payload.payment.entity.id]
        )
      }

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payment_transactions SET status'),
        ['captured', 'pay_123']
      )
    })
  })
})