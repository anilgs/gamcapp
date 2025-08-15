const { requireAuth } = require('../../../lib/auth');
const User = require('../../../lib/models/User');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const {
      name,
      email,
      phone,
      passport_number,
      appointment_type,
      preferred_date,
      medical_center,
      additional_notes
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !passport_number || !appointment_type || !preferred_date || !medical_center) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided'
      });
    }

    // Get user from token
    const userId = req.user.id;

    // Prepare appointment details
    const appointmentDetails = {
      appointment_type,
      preferred_date,
      medical_center,
      additional_notes: additional_notes || ''
    };

    // Update user with appointment details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user information
    await user.update({
      name,
      email,
      phone,
      passport_number,
      appointment_details: appointmentDetails
    });

    console.log(`Appointment created for user: ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Appointment details saved successfully',
      data: {
        appointmentId: user.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          appointment_details: user.appointment_details,
          payment_status: user.payment_status
        }
      }
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default requireAuth(handler);
