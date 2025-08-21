#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { query } = require('../lib/db');

/**
 * CLI utility to create admin users for GAMCA Medical Services
 * Usage: node scripts/create-admin.js <username> <password>
 */

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to print colored output
function printColor(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to print banner
function printBanner() {
  console.log('');
  printColor('cyan', '╔══════════════════════════════════════════════════════════╗');
  printColor('cyan', '║                 GAMCA Admin User Creator                 ║');
  printColor('cyan', '║              Medical Services Platform                   ║');
  printColor('cyan', '╚══════════════════════════════════════════════════════════╝');
  console.log('');
}

// Helper function to validate username
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (username.length > 50) {
    return { valid: false, error: 'Username must be less than 50 characters long' };
  }
  
  // Check for valid characters (alphanumeric, underscore, hyphen)
  const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!validUsernameRegex.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { valid: true };
}

// Helper function to validate password
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters long' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  
  return { valid: true };
}

// Helper function to check if admin already exists
async function checkAdminExists(username) {
  try {
    const result = await query('SELECT id FROM admins WHERE username = $1', [username]);
    return result.rows.length > 0;
  } catch (error) {
    throw new Error(`Database error while checking admin existence: ${error.message}`);
  }
}

// Helper function to create or update admin user
async function createOrUpdateAdmin(username, password) {
  try {
    // Hash the password
    printColor('blue', '🔐 Hashing password...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Check if admin exists
    const existingAdmin = await query('SELECT id FROM admins WHERE username = $1', [username]);
    
    if (existingAdmin.rows.length > 0) {
      // Update existing admin password
      printColor('yellow', '🔄 Admin exists, updating password...');
      const result = await query(
        `UPDATE admins 
         SET password_hash = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE username = $1 
         RETURNING id, username, created_at, updated_at`,
        [username, passwordHash]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Failed to update admin user');
      }
      
      return { ...result.rows[0], updated: true };
    } else {
      // Create new admin
      printColor('blue', '💾 Creating new admin user in database...');
      const result = await query(
        `INSERT INTO admins (username, password_hash, created_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP) 
         RETURNING id, username, created_at`,
        [username, passwordHash]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Failed to create admin user');
      }
      
      return { ...result.rows[0], updated: false };
    }
  } catch (error) {
    throw new Error(`Database error while creating/updating admin: ${error.message}`);
  }
}

// Helper function to print usage information
function printUsage() {
  console.log('');
  printColor('yellow', 'Usage:');
  console.log('  node scripts/create-admin.js <username> <password>');
  console.log('');
  printColor('yellow', 'Arguments:');
  console.log('  username    Admin username (3-50 characters, alphanumeric, _, -)');
  console.log('  password    Admin password (8+ characters, must include uppercase, lowercase, number, and special character)');
  console.log('');
  printColor('yellow', 'Examples:');
  console.log('  node scripts/create-admin.js admin SecurePass123!');
  console.log('  node scripts/create-admin.js john_doe MyPassword456@');
  console.log('');
  printColor('yellow', 'Password Requirements:');
  console.log('  • At least 8 characters long');
  console.log('  • At least one uppercase letter (A-Z)');
  console.log('  • At least one lowercase letter (a-z)');
  console.log('  • At least one number (0-9)');
  console.log('  • At least one special character (!@#$%^&*()_+-=[]{}|;\':"\\,.<>?/)');
  console.log('');
}

// Main function
async function main() {
  try {
    printBanner();
    
    // Get command line arguments
    const args = process.argv.slice(2);
    
    // Check if help is requested
    if (args.includes('--help') || args.includes('-h')) {
      printUsage();
      process.exit(0);
    }
    
    // Validate arguments
    if (args.length !== 2) {
      printColor('red', '❌ Error: Invalid number of arguments');
      printUsage();
      process.exit(1);
    }
    
    const [username, password] = args;
    
    // Validate username
    printColor('blue', '🔍 Validating username...');
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      printColor('red', `❌ Username validation failed: ${usernameValidation.error}`);
      process.exit(1);
    }
    printColor('green', '✅ Username is valid');
    
    // Validate password
    printColor('blue', '🔍 Validating password...');
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      printColor('red', `❌ Password validation failed: ${passwordValidation.error}`);
      process.exit(1);
    }
    printColor('green', '✅ Password meets security requirements');
    
    // Check if admin already exists
    printColor('blue', '🔍 Checking if admin user already exists...');
    const adminExists = await checkAdminExists(username);
    if (adminExists) {
      printColor('red', `❌ Error: Admin user '${username}' already exists`);
      printColor('yellow', '💡 Tip: Choose a different username or delete the existing admin first');
      process.exit(1);
    }
    printColor('green', '✅ Username is available');
    
    // Create admin user
    const adminUser = await createAdmin(username, password);
    
    // Success message
    console.log('');
    printColor('green', '🎉 Admin user created successfully!');
    console.log('');
    printColor('cyan', '📋 Admin Details:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Created: ${new Date(adminUser.created_at).toLocaleString()}`);
    console.log('');
    printColor('yellow', '🔐 Security Notes:');
    console.log('   • Password has been securely hashed using bcrypt');
    console.log('   • Store the password securely - it cannot be recovered');
    console.log('   • The admin can now log in to the admin panel');
    console.log('');
    printColor('blue', '🌐 Next Steps:');
    console.log('   1. Start the application: npm run dev');
    console.log('   2. Navigate to: http://localhost:3000/admin/login');
    console.log(`   3. Log in with username: ${username}`);
    console.log('');
    
  } catch (error) {
    console.log('');
    printColor('red', '❌ Error creating admin user:');
    console.log(`   ${error.message}`);
    console.log('');
    
    // Provide helpful error messages
    if (error.message.includes('database') || error.message.includes('connection')) {
      printColor('yellow', '💡 Troubleshooting Tips:');
      console.log('   • Ensure PostgreSQL is running');
      console.log('   • Check your DATABASE_URL in .env file');
      console.log('   • Verify database connection settings');
      console.log('   • Run database migrations if needed');
    } else if (error.message.includes('already exists')) {
      printColor('yellow', '💡 Troubleshooting Tips:');
      console.log('   • Choose a different username');
      console.log('   • Check existing admin users in the database');
      console.log('   • Delete the existing admin if appropriate');
    }
    
    console.log('');
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('');
  printColor('yellow', '⚠️  Process interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('');
  printColor('yellow', '⚠️  Process terminated');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('');
  printColor('red', '❌ Unhandled Promise Rejection:');
  console.log(`   ${reason}`);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  validateUsername,
  validatePassword,
  checkAdminExists,
  createAdmin
};
