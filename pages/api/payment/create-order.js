const { requireAuth } = require('../../../lib/auth');
const { createOrder, getPaymentAmount, generateReceiptId } = require('../../../lib/razorpay');
const User = require('../../../lib/models/User');
const { query } = require('../../../lib/db');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { appointmentId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: 'Appointment ID is required'
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate that the appointment belongs to the user
    if (user.id !== appointmentId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to appointment'
      });
    }

    // Check if user has appointment details
    if (!user.appointment_details || Object.keys(user.appointment_details).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please complete appointment details first'
      });
    }

    // Check if payment is already completed
    if (user.payment_status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Payment already completed for this appointment'
      });
    }

    // Get appointment type and calculate amount
    const appointmentType = user.appointment_details.appointment_type;
    if (!appointmentType) {
      return res.status(400).json({
        success: false,
        error: 'Appointment type not specified'
      });
    }

    const amount = getPaymentAmount(appointmentType);
    const receipt = generateReceiptId(userId, appointmentType);

    // Create RazorPay order
    const orderResult = await createOrder({
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      notes: {
        user_id: userId,
        appointment_id: appointmentId,
        appointment_type: appointmentType,
        user_name: user.name,
        user_email: user.email,
        user_phone: user.phone
      }
    });

    if (!orderResult.success) {
      console.error('Failed to create RazorPay order:', orderResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment order'
      });
    }

    const order = orderResult.order;

    // Store payment transaction in database
    try {
      await query(
        `INSERT INTO payment_transactions (user_id, razorpay_order_id, amount, currency, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, order.id, amount, 'INR', 'created']
      );
    } catch (dbError) {
      console.error('Failed to store payment transaction:', dbError);
      // Continue anyway, as the order was created successfully
    }

    // Update user payment status to pending
    await user.updatePaymentStatus('pending');

    console.log(`Payment order created for user ${userId}: ${order.id}`);

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
    });

  } catch (error) {
    console.error('Create payment order error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default requireAuth(handler);
