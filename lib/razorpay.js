const Razorpay = require('razorpay');
const crypto = require('crypto');

// RazorPay configuration
const razorpayConfig = {
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
};

// Validate RazorPay configuration
if (!razorpayConfig.key_id || !razorpayConfig.key_secret) {
  console.warn('RazorPay configuration missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
}

// Initialize RazorPay instance
const razorpay = new Razorpay(razorpayConfig);

// Payment amounts (in paise - smallest currency unit)
const PAYMENT_AMOUNTS = {
  employment_visa: 350000, // ₹3,500
  family_visa: 300000,     // ₹3,000
  visit_visa: 250000,      // ₹2,500
  student_visa: 300000,    // ₹3,000
  business_visa: 400000,   // ₹4,000
  other: 350000           // ₹3,500 (default)
};

// Get payment amount based on appointment type
const getPaymentAmount = (appointmentType) => {
  return PAYMENT_AMOUNTS[appointmentType] || PAYMENT_AMOUNTS.other;
};

// Create RazorPay order
const createOrder = async (orderData) => {
  try {
    const { amount, currency = 'INR', receipt, notes = {} } = orderData;

    const options = {
      amount: amount, // Amount in paise
      currency: currency,
      receipt: receipt,
      notes: notes,
      payment_capture: 1 // Auto capture payment
    };

    const order = await razorpay.orders.create(options);
    console.log('RazorPay order created:', order.id);
    
    return {
      success: true,
      order: order
    };
  } catch (error) {
    console.error('Error creating RazorPay order:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payment order'
    };
  }
};

// Verify payment signature
const verifyPaymentSignature = (paymentData) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        success: false,
        error: 'Missing required payment verification data'
      };
    }

    // Create signature string
    const signatureString = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', razorpayConfig.key_secret)
      .update(signatureString)
      .digest('hex');

    // Compare signatures
    const isSignatureValid = expectedSignature === razorpay_signature;

    if (isSignatureValid) {
      console.log('Payment signature verified successfully:', razorpay_payment_id);
      return {
        success: true,
        verified: true
      };
    } else {
      console.error('Payment signature verification failed:', {
        expected: expectedSignature,
        received: razorpay_signature
      });
      return {
        success: false,
        error: 'Payment signature verification failed'
      };
    }
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return {
      success: false,
      error: 'Payment verification error'
    };
  }
};

// Fetch payment details from RazorPay
const fetchPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    console.log('Payment details fetched:', paymentId);
    
    return {
      success: true,
      payment: payment
    };
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch payment details'
    };
  }
};

// Fetch order details from RazorPay
const fetchOrderDetails = async (orderId) => {
  try {
    const order = await razorpay.orders.fetch(orderId);
    console.log('Order details fetched:', orderId);
    
    return {
      success: true,
      order: order
    };
  } catch (error) {
    console.error('Error fetching order details:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch order details'
    };
  }
};

// Create refund
const createRefund = async (paymentId, refundData = {}) => {
  try {
    const { amount, notes = {} } = refundData;
    
    const refundOptions = {
      payment_id: paymentId,
      notes: notes
    };

    // Add amount if specified (partial refund)
    if (amount) {
      refundOptions.amount = amount;
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    console.log('Refund created:', refund.id);
    
    return {
      success: true,
      refund: refund
    };
  } catch (error) {
    console.error('Error creating refund:', error);
    return {
      success: false,
      error: error.message || 'Failed to create refund'
    };
  }
};

// Generate receipt ID
const generateReceiptId = (userId, appointmentType) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `GAMCA_${appointmentType.toUpperCase()}_${userId.substring(0, 8)}_${timestamp}_${random}`;
};

// Format amount for display (convert paise to rupees)
const formatAmount = (amountInPaise) => {
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(rupees);
};

// Get payment method details
const getPaymentMethodDetails = (payment) => {
  if (!payment || !payment.method) {
    return { method: 'unknown', details: {} };
  }

  const method = payment.method;
  const details = {};

  switch (method) {
    case 'card':
      details.card_type = payment.card?.type;
      details.card_network = payment.card?.network;
      details.card_last4 = payment.card?.last4;
      break;
    case 'upi':
      details.upi_id = payment.upi?.payer_account_type;
      break;
    case 'netbanking':
      details.bank = payment.bank;
      break;
    case 'wallet':
      details.wallet = payment.wallet;
      break;
    default:
      break;
  }

  return { method, details };
};

// Validate webhook signature (for webhook endpoints)
const validateWebhookSignature = (webhookBody, webhookSignature, webhookSecret) => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    return expectedSignature === webhookSignature;
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return false;
  }
};

module.exports = {
  razorpay,
  razorpayConfig,
  PAYMENT_AMOUNTS,
  getPaymentAmount,
  createOrder,
  verifyPaymentSignature,
  fetchPaymentDetails,
  fetchOrderDetails,
  createRefund,
  generateReceiptId,
  formatAmount,
  getPaymentMethodDetails,
  validateWebhookSignature
};
