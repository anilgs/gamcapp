const { verifyToken } = require('../../../lib/auth');
const User = require('../../../lib/models/User');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user details
    if (decoded.type === 'user') {
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          payment_status: user.payment_status,
          has_appointment_details: Object.keys(user.appointment_details || {}).length > 0
        }
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid token type'
    });

  } catch (error) {
    console.error('Verify token error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
