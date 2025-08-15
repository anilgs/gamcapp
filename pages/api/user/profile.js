const { requireAuth } = require('../../../lib/auth');
const User = require('../../../lib/models/User');
const { query } = require('../../../lib/db');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const userId = req.user.id;

    // Get comprehensive user data with payment information
    const userQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.passport_number,
        u.appointment_details,
        u.payment_status,
        u.payment_id,
        u.appointment_slip_path,
        u.created_at,
        u.updated_at,
        pt.razorpay_order_id,
        pt.razorpay_payment_id,
        pt.amount as payment_amount,
        pt.status as transaction_status,
        pt.created_at as payment_created_at,
        pt.updated_at as payment_updated_at
      FROM users u
      LEFT JOIN payment_transactions pt ON u.id = pt.user_id
      WHERE u.id = $1
      ORDER BY pt.created_at DESC
      LIMIT 1
    `;

    const userResult = await query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = userResult.rows[0];

    // Format appointment details
    const appointmentDetails = userData.appointment_details || {};
    
    // Get appointment type label
    const getAppointmentTypeLabel = (type) => {
      const labels = {
        employment_visa: 'Employment Visa Medical',
        family_visa: 'Family Visa Medical',
        visit_visa: 'Visit Visa Medical',
        student_visa: 'Student Visa Medical',
        business_visa: 'Business Visa Medical',
        other: 'Other'
      };
      return labels[type] || type;
    };

    // Format payment information
    const paymentInfo = userData.razorpay_order_id ? {
      order_id: userData.razorpay_order_id,
      payment_id: userData.razorpay_payment_id,
      amount: userData.payment_amount,
      amount_formatted: userData.payment_amount ? 
        new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(userData.payment_amount / 100) : null,
      status: userData.transaction_status,
      created_at: userData.payment_created_at,
      updated_at: userData.payment_updated_at
    } : null;

    // Check if appointment slip exists and get file info
    let appointmentSlipInfo = null;
    if (userData.appointment_slip_path) {
      try {
        const fileStorage = require('../../../lib/fileStorage');
        const fileExists = await fileStorage.fileExists(userData.appointment_slip_path);
        
        if (fileExists) {
          const fileInfo = await fileStorage.getFileInfo(userData.appointment_slip_path);
          appointmentSlipInfo = {
            available: true,
            filename: fileInfo.filename,
            size: fileInfo.size,
            size_formatted: `${Math.round(fileInfo.size / 1024)} KB`,
            uploaded_at: fileInfo.created,
            download_url: `/api/user/download-slip`
          };
        } else {
          appointmentSlipInfo = {
            available: false,
            error: 'File not found on server'
          };
        }
      } catch (error) {
        console.error('Error checking appointment slip:', error);
        appointmentSlipInfo = {
          available: false,
          error: 'Unable to verify file status'
        };
      }
    }

    // Determine user status and next steps
    const getUserStatus = () => {
      if (userData.payment_status === 'pending') {
        return {
          status: 'payment_pending',
          message: 'Payment is pending. Please complete your payment to proceed.',
          next_steps: ['Complete payment', 'Wait for appointment confirmation']
        };
      } else if (userData.payment_status === 'completed' && !userData.appointment_slip_path) {
        return {
          status: 'processing',
          message: 'Payment completed. Your appointment is being processed.',
          next_steps: ['Wait for appointment slip', 'Check back in 24-48 hours']
        };
      } else if (userData.payment_status === 'completed' && userData.appointment_slip_path) {
        return {
          status: 'ready',
          message: 'Your appointment slip is ready for download.',
          next_steps: ['Download appointment slip', 'Attend appointment on scheduled date']
        };
      } else if (userData.payment_status === 'failed') {
        return {
          status: 'payment_failed',
          message: 'Payment failed. Please try again.',
          next_steps: ['Retry payment', 'Contact support if issue persists']
        };
      } else {
        return {
          status: 'unknown',
          message: 'Status unknown. Please contact support.',
          next_steps: ['Contact support']
        };
      }
    };

    const userStatus = getUserStatus();

    // Prepare response data
    const responseData = {
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        passport_number: userData.passport_number,
        payment_status: userData.payment_status,
        payment_id: userData.payment_id,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      },
      appointment: {
        type: appointmentDetails.appointment_type,
        type_label: appointmentDetails.appointment_type ? 
          getAppointmentTypeLabel(appointmentDetails.appointment_type) : null,
        preferred_date: appointmentDetails.preferred_date,
        medical_center: appointmentDetails.medical_center,
        details: appointmentDetails
      },
      payment: paymentInfo,
      appointment_slip: appointmentSlipInfo,
      status: userStatus
    };

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('User profile fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default requireAuth(handler);
