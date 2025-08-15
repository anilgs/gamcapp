const { requireAdminAuth } = require('../../../lib/auth');
const { query, transaction } = require('../../../lib/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'appointment-slips');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId_timestamp_originalname
    const userId = req.body.userId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${userId}_${timestamp}_${name}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only PDF and image files
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, JPG, and PNG files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

// Middleware to handle multipart/form-data
const uploadMiddleware = upload.single('appointmentSlip');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Handle file upload
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              reject(new Error('File size too large. Maximum size is 5MB.'));
            } else if (err.code === 'LIMIT_FILE_COUNT') {
              reject(new Error('Too many files. Only one file is allowed.'));
            } else {
              reject(new Error(`Upload error: ${err.message}`));
            }
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      });
    });

    const { userId, notes = '' } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Appointment slip file is required'
      });
    }

    // Validate user exists and has completed payment
    const userResult = await query(
      'SELECT id, name, email, phone, payment_status FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      // Clean up uploaded file if user doesn't exist
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
      
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    if (user.payment_status !== 'completed') {
      // Clean up uploaded file if payment not completed
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
      
      return res.status(400).json({
        success: false,
        error: 'Cannot upload appointment slip. Payment not completed.'
      });
    }

    // Get relative path for database storage
    const relativePath = path.relative(process.cwd(), req.file.path);

    // Update user record with appointment slip path
    const result = await transaction(async (client) => {
      // Check if user already has an appointment slip
      const existingUser = await client.query(
        'SELECT appointment_slip_path FROM users WHERE id = $1',
        [userId]
      );

      const oldSlipPath = existingUser.rows[0]?.appointment_slip_path;

      // Update user with new appointment slip
      const updateResult = await client.query(
        `UPDATE users 
         SET appointment_slip_path = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, name, email, phone, appointment_slip_path, updated_at`,
        [relativePath, userId]
      );

      // Log the upload activity
      await client.query(
        `INSERT INTO admin_activity_log (admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          req.admin.id,
          'upload_appointment_slip',
          'user',
          userId,
          JSON.stringify({
            filename: req.file.filename,
            original_name: req.file.originalname,
            file_size: req.file.size,
            notes: notes.trim(),
            replaced_existing: !!oldSlipPath
          })
        ]
      );

      // Delete old appointment slip file if it exists
      if (oldSlipPath) {
        try {
          const oldFilePath = path.join(process.cwd(), oldSlipPath);
          await fs.unlink(oldFilePath);
        } catch (deleteError) {
          console.error('Error deleting old appointment slip:', deleteError);
          // Don't fail the transaction for this
        }
      }

      return updateResult.rows[0];
    });

    // Prepare file information for response
    const fileInfo = {
      filename: req.file.filename,
      original_name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      upload_date: new Date().toISOString(),
      path: relativePath
    };

    // Send success response
    return res.status(200).json({
      success: true,
      message: 'Appointment slip uploaded successfully',
      data: {
        user: {
          id: result.id,
          name: result.name,
          email: result.email,
          phone: result.phone,
          appointment_slip_path: result.appointment_slip_path,
          updated_at: result.updated_at
        },
        file: fileInfo,
        admin: {
          id: req.admin.id,
          username: req.admin.username
        },
        notes: notes.trim()
      }
    });

  } catch (error) {
    console.error('Appointment slip upload error:', error);

    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file after error:', unlinkError);
      }
    }

    // Handle specific error types
    if (error.message.includes('File size too large')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Disable Next.js body parser for multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default requireAdminAuth(handler);
