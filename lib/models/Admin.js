const { query } = require('../db');
const bcrypt = require('bcryptjs');

class Admin {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.password_hash = data.password_hash;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new admin
  static async create(adminData) {
    const { username, password } = adminData;

    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    try {
      // Hash the password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const result = await query(
        `INSERT INTO admins (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username, created_at, updated_at`,
        [username, password_hash]
      );

      return new Admin({
        ...result.rows[0],
        password_hash: password_hash
      });
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Username already exists');
      }
      console.error('Error creating admin:', error);
      throw error;
    }
  }

  // Find admin by ID
  static async findById(id) {
    try {
      const result = await query('SELECT * FROM admins WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Admin(result.rows[0]);
    } catch (error) {
      console.error('Error finding admin by ID:', error);
      throw error;
    }
  }

  // Find admin by username
  static async findByUsername(username) {
    try {
      const result = await query('SELECT * FROM admins WHERE username = $1', [username]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new Admin(result.rows[0]);
    } catch (error) {
      console.error('Error finding admin by username:', error);
      throw error;
    }
  }

  // Get all admins
  static async findAll() {
    try {
      const result = await query(
        'SELECT id, username, created_at, updated_at FROM admins ORDER BY created_at DESC'
      );

      return result.rows.map(row => new Admin({
        ...row,
        password_hash: null // Don't expose password hash
      }));
    } catch (error) {
      console.error('Error finding all admins:', error);
      throw error;
    }
  }

  // Authenticate admin with username and password
  static async authenticate(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    try {
      const admin = await Admin.findByUsername(username);
      
      if (!admin) {
        return null; // Admin not found
      }

      // Compare password with hash
      const isValidPassword = await bcrypt.compare(password, admin.password_hash);
      
      if (!isValidPassword) {
        return null; // Invalid password
      }

      // Return admin without password hash
      return new Admin({
        id: admin.id,
        username: admin.username,
        created_at: admin.created_at,
        updated_at: admin.updated_at,
        password_hash: null
      });
    } catch (error) {
      console.error('Error authenticating admin:', error);
      throw error;
    }
  }

  // Update admin password
  async updatePassword(newPassword) {
    if (!newPassword) {
      throw new Error('New password is required');
    }

    try {
      // Hash the new password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(newPassword, saltRounds);

      const result = await query(
        'UPDATE admins SET password_hash = $1 WHERE id = $2 RETURNING id, username, created_at, updated_at',
        [password_hash, this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Admin not found');
      }

      // Update current instance (without exposing password hash)
      Object.assign(this, {
        ...result.rows[0],
        password_hash: null
      });
      
      return this;
    } catch (error) {
      console.error('Error updating admin password:', error);
      throw error;
    }
  }

  // Update admin username
  async updateUsername(newUsername) {
    if (!newUsername) {
      throw new Error('New username is required');
    }

    try {
      const result = await query(
        'UPDATE admins SET username = $1 WHERE id = $2 RETURNING id, username, created_at, updated_at',
        [newUsername, this.id]
      );

      if (result.rows.length === 0) {
        throw new Error('Admin not found');
      }

      // Update current instance
      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Username already exists');
      }
      console.error('Error updating admin username:', error);
      throw error;
    }
  }

  // Delete admin
  async delete() {
    try {
      const result = await query('DELETE FROM admins WHERE id = $1 RETURNING *', [this.id]);
      
      if (result.rows.length === 0) {
        throw new Error('Admin not found');
      }

      return true;
    } catch (error) {
      console.error('Error deleting admin:', error);
      throw error;
    }
  }

  // Check if password is valid (for current admin)
  async validatePassword(password) {
    if (!password) {
      return false;
    }

    try {
      // Get the current password hash from database
      const result = await query('SELECT password_hash FROM admins WHERE id = $1', [this.id]);
      
      if (result.rows.length === 0) {
        return false;
      }

      return await bcrypt.compare(password, result.rows[0].password_hash);
    } catch (error) {
      console.error('Error validating admin password:', error);
      return false;
    }
  }

  // Get admin statistics
  static async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_admins,
          MIN(created_at) as first_admin_created,
          MAX(created_at) as last_admin_created
        FROM admins
      `);

      return result.rows[0];
    } catch (error) {
      console.error('Error getting admin stats:', error);
      throw error;
    }
  }

  // Convert to JSON (for API responses) - excludes password hash
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Convert to safe JSON (excludes sensitive information)
  toSafeJSON() {
    return {
      id: this.id,
      username: this.username,
      created_at: this.created_at
    };
  }
}

module.exports = Admin;
