const { requireAdminAuth } = require('../../../lib/auth');
const { query, transaction } = require('../../../lib/db');
const wafidIntegration = require('../../../lib/wafidIntegration');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { user_id, force_booking = false, test_mode = false } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Get comprehensive user data
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
        pt.status as transaction_status
      FROM users u
      LEFT JOIN payment_transactions pt ON u.id = pt.user_id
      WHERE u.id = $1
      ORDER BY pt.created_at DESC
      LIMIT 1
    `;

    const userResult = await query(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = userResult.rows[0];

    // Validate user eligibility for wafid booking
    if (!force_booking) {
      // Check if payment is completed
      if (userData.payment_status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'User payment must be completed before booking with wafid.com',
          details: {
            current_status: userData.payment_status,
            user_id: user_id
          }
        });
      }

      // Check if appointment details are available
      if (!userData.appointment_details || Object.keys(userData.appointment_details).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'User appointment details are incomplete',
          details: {
            user_id: user_id,
            has_appointment_details: !!userData.appointment_details
          }
        });
      }

      // Check if already booked with wafid (if we track this)
      const existingBookingQuery = `
        SELECT id, booking_reference, status, created_at 
        FROM wafid_bookings 
        WHERE user_id = $1 AND status IN ('pending', 'confirmed')
        ORDER BY created_at DESC
        LIMIT 1
      `;

      try {
        const existingBookingResult = await query(existingBookingQuery, [user_id]);
        if (existingBookingResult.rows.length > 0) {
          const existingBooking = existingBookingResult.rows[0];
          return res.status(400).json({
            success: false,
            error: 'User already has an active wafid.com booking',
            details: {
              existing_booking: {
                id: existingBooking.id,
                reference: existingBooking.booking_reference,
                status: existingBooking.status,
                created_at: existingBooking.created_at
              }
            }
          });
        }
      } catch (bookingCheckError) {
        // If table doesn't exist, continue (we'll create the booking record later)
        console.log('Wafid bookings table may not exist, continuing...');
      }
    }

    // Prepare user data for wafid integration
    const appointmentDetails = userData.appointment_details || {};
    const wafidUserData = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      passport_number: userData.passport_number
    };

    const wafidAppointmentData = {
      appointment_type: appointmentDetails.appointment_type || 'employment_visa',
      preferred_date: appointmentDetails.preferred_date,
      medical_center: appointmentDetails.medical_center,
      nationality: appointmentDetails.nationality || 'Indian',
      gender: appointmentDetails.gender || 'Male',
      age: appointmentDetails.age || '30',
      destination_country: appointmentDetails.destination_country || 'Saudi Arabia',
      special_requirements: appointmentDetails.special_requirements
    };

    let bookingResult;

    if (test_mode) {
      // Test mode - don't actually submit to wafid.com
      console.log('Running in test mode - testing wafid integration...');
      bookingResult = await wafidIntegration.testIntegration();
      
      if (bookingResult.success) {
        bookingResult.message = 'Test mode: Integration test successful';
        bookingResult.bookingReference = 'TEST-' + Date.now();
      }
    } else {
      // Production mode - submit actual booking
      console.log(`Submitting wafid.com booking for user ${user_id}...`);
      bookingResult = await wafidIntegration.submitBooking(wafidUserData, wafidAppointmentData);
    }

    // Log the booking attempt and result
    const bookingLogData = {
      user_id: user_id,
      admin_id: req.admin.id,
      booking_data: {
        user_data: wafidUserData,
        appointment_data: wafidAppointmentData
      },
      result: bookingResult,
      test_mode: test_mode,
      force_booking: force_booking,
      timestamp: new Date().toISOString()
    };

    // Store booking result in database
    try {
      await transaction(async (client) => {
        // Insert into wafid_bookings table (create if doesn't exist)
        try {
          await client.query(`
            INSERT INTO wafid_bookings (
              user_id, 
              admin_id, 
              booking_reference, 
              status, 
              booking_data, 
              response_data, 
              test_mode,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
          `, [
            user_id,
            req.admin.id,
            bookingResult.bookingReference || null,
            bookingResult.success ? 'confirmed' : 'failed',
            JSON.stringify(bookingLogData.booking_data),
            JSON.stringify(bookingResult),
            test_mode
          ]);
        } catch (tableError) {
          // If table doesn't exist, create it
          if (tableError.code === '42P01') {
            await client.query(`
              CREATE TABLE IF NOT EXISTS wafid_bookings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                admin_id INTEGER REFERENCES admins(id),
                booking_reference VARCHAR(100),
                status VARCHAR(20) DEFAULT 'pending',
                booking_data JSONB,
                response_data JSONB,
                test_mode BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
            
            // Retry the insert
            await client.query(`
              INSERT INTO wafid_bookings (
                user_id, 
                admin_id, 
                booking_reference, 
                status, 
                booking_data, 
                response_data, 
                test_mode,
                created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            `, [
              user_id,
              req.admin.id,
              bookingResult.bookingReference || null,
              bookingResult.success ? 'confirmed' : 'failed',
              JSON.stringify(bookingLogData.booking_data),
              JSON.stringify(bookingResult),
              test_mode
            ]);
          } else {
            throw tableError;
          }
        }

        // Log admin activity
        await client.query(`
          INSERT INTO admin_activity_log (
            admin_id, 
            action, 
            target_type, 
            target_id, 
            details, 
            created_at
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `, [
          req.admin.id,
          'wafid_booking',
          'user',
          user_id,
          JSON.stringify({
            success: bookingResult.success,
            booking_reference: bookingResult.bookingReference,
            test_mode: test_mode,
            force_booking: force_booking,
            message: bookingResult.message
          })
        ]);

        // Update user record if booking was successful
        if (bookingResult.success && !test_mode) {
          await client.query(`
            UPDATE users 
            SET appointment_details = appointment_details || $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [
            JSON.stringify({
              wafid_booking_reference: bookingResult.bookingReference,
              wafid_booking_date: new Date().toISOString(),
              wafid_booking_status: 'confirmed'
            }),
            user_id
          ]);
        }
      });
    } catch (dbError) {
      console.error('Database error while storing booking result:', dbError);
      // Don't fail the request if database logging fails
    }

    // Prepare response
    const response = {
      success: bookingResult.success,
      message: bookingResult.message || (bookingResult.success ? 'Booking submitted successfully' : 'Booking submission failed'),
      data: {
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone
        },
        booking: {
          reference: bookingResult.bookingReference,
          status: bookingResult.success ? 'confirmed' : 'failed',
          test_mode: test_mode,
          appointment_details: bookingResult.appointmentDetails
        },
        admin: {
          id: req.admin.id,
          username: req.admin.username,
          action_time: new Date().toISOString()
        }
      }
    };

    // Include error details if booking failed
    if (!bookingResult.success) {
      response.error_details = {
        error: bookingResult.error,
        details: bookingResult.details
      };
    }

    // Include raw response in development mode
    if (process.env.NODE_ENV === 'development' && bookingResult.rawResponse) {
      response.debug = {
        raw_response: bookingResult.rawResponse
      };
    }

    const statusCode = bookingResult.success ? 200 : 400;
    return res.status(statusCode).json(response);

  } catch (error) {
    console.error('Wafid booking API error:', error);

    // Log the error for admin review
    try {
      await query(`
        INSERT INTO admin_activity_log (
          admin_id, 
          action, 
          target_type, 
          target_id, 
          details, 
          created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [
        req.admin?.id || null,
        'wafid_booking_error',
        'user',
        req.body.user_id || null,
        JSON.stringify({
          error: error.message,
          stack: error.stack,
          request_body: req.body
        })
      ]);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process wafid.com booking request',
      details: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack
      } : undefined
    });
  }
}

export default requireAdminAuth(handler);
