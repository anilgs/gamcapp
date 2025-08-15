const { verifyOTP, generateToken, formatPhoneNumber, isValidPhoneNumber } = require('../../../lib/auth');
const User = require('../../../lib/models/User');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { phone, otp } = req.body;

    // Validate input
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required'
      });
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phone);
    
    if (!isValidPhoneNumber(formattedPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP format'
      });
    }

    // Verify OTP
    const isValidOTP = await verifyOTP(formattedPhone, otp);

    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP'
      });
    }

    // Find or create user
    let user = await User.findByPhone(formattedPhone);

    if (!user) {
      // If user doesn't exist, create a basic user record
      // This will be completed when they fill out the appointment form
      user = await User.create({
        name: '', // Will be filled later
        email: '', // Will be filled later
        phone: formattedPhone,
        passport_number: '', // Will be filled later
        appointment_details: {},
        payment_status: 'pending'
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      phone: user.phone,
      type: 'user'
    });

    // Log successful authentication
    console.log(`User authenticated successfully: ${formattedPhone}`);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          payment_status: user.payment_status,
          has_appointment_details: Object.keys(user.appointment_details || {}).length > 0
        }
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
