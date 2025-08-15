const { generateToken } = require('../../../lib/auth');
const Admin = require('../../../lib/models/Admin');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Validate input format
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid input format'
      });
    }

    // Trim whitespace
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      return res.status(400).json({
        success: false,
        error: 'Username and password cannot be empty'
      });
    }

    // Validate username length and format
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Username must be between 3 and 50 characters'
      });
    }

    // Validate password length
    if (trimmedPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Authenticate admin
    const admin = await Admin.authenticate(trimmedUsername, trimmedPassword);

    if (!admin) {
      // Log failed login attempt
      console.log(`Failed admin login attempt for username: ${trimmedUsername} from IP: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Generate JWT token for admin
    const token = generateToken({
      id: admin.id,
      username: admin.username,
      type: 'admin'
    });

    // Log successful login
    console.log(`Admin logged in successfully: ${admin.username} from IP: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`);

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          created_at: admin.created_at
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
