const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileStorage {
  constructor() {
    this.baseUploadDir = path.join(process.cwd(), 'uploads');
    this.appointmentSlipsDir = path.join(this.baseUploadDir, 'appointment-slips');
  }

  /**
   * Ensure upload directories exist
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.baseUploadDir, { recursive: true });
      await fs.mkdir(this.appointmentSlipsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directories:', error);
      throw new Error('Failed to create upload directories');
    }
  }

  /**
   * Generate a unique filename for uploaded files
   * @param {string} originalName - Original filename
   * @param {string} userId - User ID
   * @param {string} prefix - Optional prefix
   * @returns {string} Unique filename
   */
  generateUniqueFilename(originalName, userId, prefix = '') {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
    
    const prefixPart = prefix ? `${prefix}_` : '';
    return `${prefixPart}${userId}_${timestamp}_${randomString}_${baseName}${ext}`;
  }

  /**
   * Get the full path for appointment slip storage
   * @param {string} filename - Filename
   * @returns {string} Full file path
   */
  getAppointmentSlipPath(filename) {
    return path.join(this.appointmentSlipsDir, filename);
  }

  /**
   * Get relative path from project root
   * @param {string} fullPath - Full file path
   * @returns {string} Relative path
   */
  getRelativePath(fullPath) {
    return path.relative(process.cwd(), fullPath);
  }

  /**
   * Validate file type for appointment slips
   * @param {string} mimetype - File MIME type
   * @returns {boolean} Whether file type is allowed
   */
  isValidAppointmentSlipType(mimetype) {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];
    return allowedTypes.includes(mimetype);
  }

  /**
   * Validate file size
   * @param {number} size - File size in bytes
   * @param {number} maxSize - Maximum allowed size in bytes (default: 5MB)
   * @returns {boolean} Whether file size is acceptable
   */
  isValidFileSize(size, maxSize = 5 * 1024 * 1024) {
    return size <= maxSize;
  }

  /**
   * Save uploaded file to appointment slips directory
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} filename - Filename
   * @returns {Promise<string>} Relative file path
   */
  async saveAppointmentSlip(fileBuffer, filename) {
    try {
      await this.ensureDirectories();
      const fullPath = this.getAppointmentSlipPath(filename);
      await fs.writeFile(fullPath, fileBuffer);
      return this.getRelativePath(fullPath);
    } catch (error) {
      console.error('Error saving appointment slip:', error);
      throw new Error('Failed to save appointment slip');
    }
  }

  /**
   * Delete a file
   * @param {string} filePath - File path (can be relative or absolute)
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(filePath) {
    try {
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(process.cwd(), filePath);
      
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Check if file exists
   * @param {string} filePath - File path (can be relative or absolute)
   * @returns {Promise<boolean>} Whether file exists
   */
  async fileExists(filePath) {
    try {
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(process.cwd(), filePath);
      
      await fs.access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file information
   * @param {string} filePath - File path (can be relative or absolute)
   * @returns {Promise<Object>} File stats and info
   */
  async getFileInfo(filePath) {
    try {
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(process.cwd(), filePath);
      
      const stats = await fs.stat(fullPath);
      const filename = path.basename(fullPath);
      const ext = path.extname(filename);
      
      return {
        filename,
        extension: ext,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      throw new Error('Failed to get file information');
    }
  }

  /**
   * Read file as buffer
   * @param {string} filePath - File path (can be relative or absolute)
   * @returns {Promise<Buffer>} File buffer
   */
  async readFile(filePath) {
    try {
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(process.cwd(), filePath);
      
      return await fs.readFile(fullPath);
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error('Failed to read file');
    }
  }

  /**
   * Get file download headers
   * @param {string} filename - Original filename
   * @param {string} mimetype - File MIME type
   * @returns {Object} HTTP headers for file download
   */
  getDownloadHeaders(filename, mimetype) {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return {
      'Content-Type': mimetype || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  /**
   * Clean up old files (older than specified days)
   * @param {number} daysOld - Number of days (default: 30)
   * @returns {Promise<number>} Number of files deleted
   */
  async cleanupOldFiles(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const files = await fs.readdir(this.appointmentSlipsDir);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.appointmentSlipsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      return 0;
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage usage statistics
   */
  async getStorageStats() {
    try {
      const files = await fs.readdir(this.appointmentSlipsDir);
      let totalSize = 0;
      let fileCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.appointmentSlipsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
          fileCount++;
        }
      }
      
      return {
        fileCount,
        totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        averageFileSize: fileCount > 0 ? Math.round(totalSize / fileCount) : 0
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        fileCount: 0,
        totalSize: 0,
        totalSizeMB: 0,
        averageFileSize: 0
      };
    }
  }
}

// Export singleton instance
const fileStorage = new FileStorage();

module.exports = fileStorage;
