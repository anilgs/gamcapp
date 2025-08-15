const { query, transaction } = require('../db');

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.passport_number = data.passport_number;
    this.appointment_details = data.appointment_details;
    this.payment_status = data.payment_status;
    this.payment_id = data.payment_id;
    this.appointment_slip_path = data.appointment_slip_path;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new user
  static async create(userData) {
    const {
      name,
      email,
      phone,
      passport_number,
      appointment_details = {},
      payment_status = 'pending'
    } = userData;

    try {
      const result = await query(
        `INSERT INTO users (name, email, phone, passport_number, appointment_details, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, email, phone, passport_number, JSON.stringify(appointment_details), payment_status]
      );

      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find user by phone
  static async findByPhone(phone) {
    try {
      const result = await query('SELECT * FROM users WHERE phone = $1', [phone]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by phone:', error);
      throw error;
    }
  }

  // Get all users with pagination
  static async findAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    let params = [];
    let paramCount = 0;

    // Build where clause based on filters
    if (filters.payment_status) {
      paramCount++;
      whereClause += `WHERE payment_status = $${paramCount}`;
      params.push(filters.payment_status);
    }

    if (filters.search) {
      paramCount++;
      const searchClause = `${whereClause ? 'AND' : 'WHERE'} (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      whereClause += searchClause;
      params.push(`%${filters.search}%`);
    }

    try {
      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) FROM users ${whereClause}`,
        params
      );
      const totalCount = parseInt(countResult.rows[0].count);

      // Get paginated results
      params.push(limit, offset);
      const result = await query(
        `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      const users = result.rows.map(row => new User(row));

      return {
        users,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  // Update user
  async update(updateData) {
    const allowedFields = ['name', 'email', 'phone', 'passport_number', 'appointment_details', 'payment_status', 'payment_id', 'appointment_slip_path'];
    const updates = [];
    const values = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        values.push(key === 'appointment_details' ? JSON.stringify(value) : value);
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(this.id);
    paramCount++;

    try {
      const result = await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Update current instance
      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Update payment status
  async updatePaymentStatus(paymentStatus, paymentId = null) {
    try {
      const result = await query(
        'UPDATE users SET payment_status = $1, payment_id = $2 WHERE id = $3 RETURNING *',
        [paymentStatus, paymentId, this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  // Update appointment slip path
  async updateAppointmentSlip(slipPath) {
    try {
      const result = await query(
        'UPDATE users SET appointment_slip_path = $1 WHERE id = $2 RETURNING *',
        [slipPath, this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      console.error('Error updating appointment slip:', error);
      throw error;
    }
  }

  // Delete user
  async delete() {
    try {
      const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [this.id]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get user dashboard data with related information
  static async getDashboardData(userId) {
    try {
      const result = await query(
        'SELECT * FROM user_dashboard_view WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting user dashboard data:', error);
      throw error;
    }
  }

  // Get admin dashboard data with pagination
  static async getAdminDashboardData(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    let params = [];
    let paramCount = 0;

    // Build where clause based on filters
    if (filters.payment_status) {
      paramCount++;
      whereClause += `WHERE payment_status = $${paramCount}`;
      params.push(filters.payment_status);
    }

    if (filters.search) {
      paramCount++;
      const searchClause = `${whereClause ? 'AND' : 'WHERE'} (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      whereClause += searchClause;
      params.push(`%${filters.search}%`);
    }

    try {
      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) FROM admin_dashboard_view ${whereClause}`,
        params
      );
      const totalCount = parseInt(countResult.rows[0].count);

      // Get paginated results
      params.push(limit, offset);
      const result = await query(
        `SELECT * FROM admin_dashboard_view ${whereClause} LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return {
        users: result.rows,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting admin dashboard data:', error);
      throw error;
    }
  }

  // Convert to JSON (for API responses)
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      passport_number: this.passport_number,
      appointment_details: this.appointment_details,
      payment_status: this.payment_status,
      payment_id: this.payment_id,
      appointment_slip_path: this.appointment_slip_path,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = User;
