const { requireAuth } = require('../../../lib/auth');
const { query, transaction } = require('../../../lib/db');
const fileStorage = require('../../../lib/fileStorage');
const multer = require('multer');

// Configure multer for memory storage (we'll handle file saving manually)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Validate file type
    if (fileStorage.isValidAppointmentSlipType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, JPG, PNG, and GIF files are allowed.'), false);
    }
  },
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

    const userId = req.user.id;
    const { notes = '', replaceExisting = false } = req.body;

    // Validate file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Appointment slip file is required'
      });
    }

    // Validate file size
    if (!fileStorage.isValidFileSize(req.file.size)) {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB.'
      });
    }

    // Get user details and validate payment status
    const userResult = await query(
      'SELECT id, name, email, phone, payment_status, appointment_slip_path FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Check if user has completed payment
    if (user.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot upload appointment slip. Payment must be completed first.'
      });
    }

    // Check if user already has an appointment slip and replaceExisting is false
    if (user.appointment_slip_path && !replaceExisting) {
      return res.status(400).json({
        success: false,
        error: 'Appointment slip already exists. Set replaceExisting to true to replace it.',
        data: {
          existing_slip: true,
          current_slip_path: user.appointment_slip_path
        }
      });
    }

    // Generate unique filename
    const filename = fileStorage.generateUniqueFilename(
      req.file.originalname,
      userId,
      'user_upload'
    );

    // Save file and update database in a transaction
    const result = await transaction(async (client) => {
      // Save file to storage
      const relativePath = await fileStorage.saveAppointmentSlip(req.file.buffer, filename);

      // Update user record
      const updateResult = await client.query(
        `UPDATE users 
         SET appointment_slip_path = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, name, email, phone, appointment_slip_path, updated_at`,
        [relativePath, userId]
      );

      // Log the upload activity (if we have an activity log table)
      try {
        await client.query(
          `INSERT INTO user_activity_log (user_id, action, details, created_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [
            userId,
            'upload_appointment_slip',
            JSON.stringify({
              filename: filename,
              original_name: req.file.originalname,
              file_size: req.file.size,
              mimetype: req.file.mimetype,
              notes: notes.trim(),
              replaced_existing: !!user.appointment_slip_path
            })
          ]
        );
      } catch (logError) {
        // Don't fail the transaction if logging fails
        console.error('Error logging user activity:', logError);
      }

      // Delete old appointment slip file if it exists
      if (user.appointment_slip_path && replaceExisting) {
        try {
          await fileStorage.deleteFile(user.appointment_slip_path);
        } catch (deleteError) {
          console.error('Error deleting old appointment slip:', deleteError);
          // Don't fail the transaction for this
        }
      }

      return updateResult.rows[0];
    });

    // Get file information for response
    const fileInfo = {
      filename: filename,
      original_name: req.file.originalname,
      size: req.file.size,
      size_formatted: `${Math.round(req.file.size / 1024)} KB`,
      mimetype: req.file.mimetype,
      upload_date: new Date().toISOString(),
      path: result.appointment_slip_path
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
        notes: notes.trim(),
        replaced_existing: !!user.appointment_slip_path
      }
    });

  } catch (error) {
    console.error('Appointment slip upload error:', error);

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

    if (error.message.includes('Failed to save appointment slip')) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save file. Please try again.'
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

export default requireAuth(handler);
