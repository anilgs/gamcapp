const { requireAuth } = require('../../../lib/auth');
const { query } = require('../../../lib/db');
const emailService = require('../../../lib/email');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { user_id, payment_id, order_id } = req.body;

    // Validate required fields
    if (!user_id || !payment_id) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Payment ID are required'
      });
    }

    // Get comprehensive user and payment data
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
        u.created_at,
        u.updated_at,
        pt.razorpay_order_id,
        pt.razorpay_payment_id,
        pt.amount as payment_amount,
        pt.status as transaction_status,
        pt.created_at as payment_created_at
      FROM users u
      LEFT JOIN payment_transactions pt ON u.id = pt.user_id
      WHERE u.id = $1 AND u.payment_id = $2
      ORDER BY pt.created_at DESC
      LIMIT 1
    `;

    const userResult = await query(userQuery, [user_id, payment_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User or payment not found'
      });
    }

    const userData = userResult.rows[0];

    // Verify payment is completed
    if (userData.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Payment is not completed'
      });
    }

    // Prepare user details for email
    const userDetails = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      passport_number: userData.passport_number
    };

    // Prepare payment details for email
    const appointmentDetails = userData.appointment_details || {};
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

    const paymentDetails = {
      payment_id: userData.payment_id,
      order_id: userData.razorpay_order_id || order_id,
      amount: userData.payment_amount,
      amount_formatted: userData.payment_amount ? 
        new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(userData.payment_amount / 100) : 'N/A',
      status: userData.transaction_status,
      appointment_type: appointmentDetails.appointment_type,
      appointment_type_label: appointmentDetails.appointment_type ? 
        getAppointmentTypeLabel(appointmentDetails.appointment_type) : 'Medical Examination',
      preferred_date: appointmentDetails.preferred_date,
      medical_center: appointmentDetails.medical_center
    };

    // Send email notifications
    const emailResults = {
      user_confirmation: null,
      admin_notification: null
    };

    try {
      // Send payment confirmation email to user
      console.log(`Sending payment confirmation email to ${userDetails.email}...`);
      emailResults.user_confirmation = await emailService.sendPaymentConfirmation(
        userDetails, 
        paymentDetails
      );

      if (emailResults.user_confirmation.success) {
        console.log('Payment confirmation email sent successfully');
      } else {
        console.error('Failed to send payment confirmation email:', emailResults.user_confirmation.error);
      }
    } catch (error) {
      console.error('Error sending payment confirmation email:', error);
      emailResults.user_confirmation = { success: false, error: error.message };
    }

    try {
      // Send admin notification email
      console.log('Sending admin notification email...');
      emailResults.admin_notification = await emailService.sendAdminNotification(
        userDetails, 
        paymentDetails
      );

      if (emailResults.admin_notification.success) {
        console.log('Admin notification email sent successfully');
      } else {
        console.error('Failed to send admin notification email:', emailResults.admin_notification.error);
      }
    } catch (error) {
      console.error('Error sending admin notification email:', error);
      emailResults.admin_notification = { success: false, error: error.message };
    }

    // Log email notification activity
    try {
      await query(
        `INSERT INTO email_notifications_log (
          user_id, 
          payment_id, 
          notification_type, 
          recipient_email, 
          status, 
          details, 
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [
          user_id,
          payment_id,
          'payment_success',
          userDetails.email,
          emailResults.user_confirmation.success ? 'sent' : 'failed',
          JSON.stringify({
            user_confirmation: emailResults.user_confirmation,
            admin_notification: emailResults.admin_notification,
            payment_details: paymentDetails
          })
        ]
      );
    } catch (logError) {
      console.error('Failed to log email notification:', logError);
      // Don't fail the request if logging fails
    }

    // Determine overall success
    const overallSuccess = emailResults.user_confirmation.success || emailResults.admin_notification.success;
    const statusCode = overallSuccess ? 200 : 500;

    // Prepare response
    const response = {
      success: overallSuccess,
      message: overallSuccess ? 'Email notifications processed' : 'All email notifications failed',
      data: {
        user_details: {
          id: userDetails.id,
          name: userDetails.name,
          email: userDetails.email
        },
        payment_details: {
          payment_id: paymentDetails.payment_id,
          order_id: paymentDetails.order_id,
          amount: paymentDetails.amount_formatted,
          appointment_type: paymentDetails.appointment_type_label
        },
        email_results: {
          user_confirmation: {
            success: emailResults.user_confirmation.success,
            message_id: emailResults.user_confirmation.messageId,
            error: emailResults.user_confirmation.error
          },
          admin_notification: {
            success: emailResults.admin_notification.success,
            message_id: emailResults.admin_notification.messageId,
            error: emailResults.admin_notification.error
          }
        }
      }
    };

    // Include preview URLs for development
    if (process.env.NODE_ENV !== 'production') {
      if (emailResults.user_confirmation.previewUrl) {
        response.data.email_results.user_confirmation.preview_url = emailResults.user_confirmation.previewUrl;
      }
      if (emailResults.admin_notification.previewUrl) {
        response.data.email_results.admin_notification.preview_url = emailResults.admin_notification.previewUrl;
      }
    }

    return res.status(statusCode).json(response);

  } catch (error) {
    console.error('Payment success notification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default requireAuth(handler);
