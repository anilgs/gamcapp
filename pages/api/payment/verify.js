const { requireAuth } = require('../../../lib/auth');
const { verifyPaymentSignature, fetchPaymentDetails, getPaymentMethodDetails } = require('../../../lib/razorpay');
const User = require('../../../lib/models/User');
const { query, transaction } = require('../../../lib/db');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification data'
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

    // Verify payment signature
    const verificationResult = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!verificationResult.success) {
      console.error('Payment signature verification failed:', verificationResult.error);
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }

    // Fetch payment details from RazorPay
    const paymentDetailsResult = await fetchPaymentDetails(razorpay_payment_id);
    if (!paymentDetailsResult.success) {
      console.error('Failed to fetch payment details:', paymentDetailsResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify payment details'
      });
    }

    const paymentDetails = paymentDetailsResult.payment;

    // Check if payment is successful
    if (paymentDetails.status !== 'captured') {
      return res.status(400).json({
        success: false,
        error: 'Payment not completed successfully'
      });
    }

    // Use transaction to ensure data consistency
    const result = await transaction(async (client) => {
      // Update payment transaction record
      const updateTransactionResult = await client.query(
        `UPDATE payment_transactions 
         SET razorpay_payment_id = $1, razorpay_signature = $2, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE razorpay_order_id = $4 AND user_id = $5
         RETURNING *`,
        [razorpay_payment_id, razorpay_signature, 'paid', razorpay_order_id, userId]
      );

      if (updateTransactionResult.rows.length === 0) {
        throw new Error('Payment transaction not found');
      }

      // Update user payment status
      const updateUserResult = await client.query(
        `UPDATE users 
         SET payment_status = $1, payment_id = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        ['completed', razorpay_payment_id, userId]
      );

      if (updateUserResult.rows.length === 0) {
        throw new Error('User not found');
      }

      return {
        transaction: updateTransactionResult.rows[0],
        user: updateUserResult.rows[0]
      };
    });

    // Get payment method details
    const paymentMethodInfo = getPaymentMethodDetails(paymentDetails);

    // Log successful payment
    console.log(`Payment verified successfully for user ${userId}: ${razorpay_payment_id}`);

    // Prepare response data
    const responseData = {
      payment: {
        id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        status: paymentDetails.status,
        method: paymentMethodInfo.method,
        method_details: paymentMethodInfo.details,
        created_at: new Date(paymentDetails.created_at * 1000).toISOString()
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        payment_status: result.user.payment_status,
        appointment_details: result.user.appointment_details
      },
      transaction: {
        id: result.transaction.id,
        status: result.transaction.status,
        updated_at: result.transaction.updated_at
      }
    };

    // Trigger email notification (async, don't wait for it)
    try {
      await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/notifications/payment-success`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        body: JSON.stringify({
          user_id: userId,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id
        })
      });
    } catch (emailError) {
      console.error('Failed to trigger email notification:', emailError);
      // Don't fail the payment verification if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    
    // If it's a transaction error, provide more specific error message
    if (error.message === 'Payment transaction not found') {
      return res.status(404).json({
        success: false,
        error: 'Payment transaction not found'
      });
    }

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default requireAuth(handler);
