-- GAMCAPP Database Schema
-- MySQL Schema for Medical Appointment Booking System

-- Drop tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS otp_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS migration_log;

-- Users table - Main user data with appointment details
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    passport_number VARCHAR(50) NOT NULL,
    appointment_details JSON DEFAULT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_id VARCHAR(255) DEFAULT NULL,
    appointment_slip_path VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for better performance
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at),
    
    -- Unique constraints
    UNIQUE KEY unique_email_phone (email, phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admins table - Admin login credentials
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_username (username),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OTP tokens table - OTP verification tokens for both email and phone
CREATE TABLE otp_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL COMMENT 'Email address or phone number',
    type ENUM('email', 'phone') NOT NULL DEFAULT 'email' COMMENT 'Type of verification: email or phone',
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_identifier (identifier),
    INDEX idx_type (type),
    INDEX idx_identifier_type (identifier, type),
    INDEX idx_expires_at (expires_at),
    INDEX idx_identifier_otp_type (identifier, otp, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment transactions table - Payment processing records
CREATE TABLE payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    appointment_id INT DEFAULT NULL,
    order_id VARCHAR(255) DEFAULT NULL,
    razorpay_payment_id VARCHAR(255) DEFAULT NULL,
    razorpay_signature VARCHAR(500) DEFAULT NULL,
    payment_method ENUM('razorpay', 'upi') DEFAULT 'razorpay',
    upi_transaction_id VARCHAR(255) DEFAULT NULL,
    upi_reference_id VARCHAR(255) DEFAULT NULL,
    upi_vpa VARCHAR(255) DEFAULT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status ENUM('created', 'attempted', 'paid', 'failed', 'cancelled', 'refunded') DEFAULT 'created',
    failure_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_order_id (order_id),
    INDEX idx_razorpay_payment_id (razorpay_payment_id),
    INDEX idx_payment_method (payment_method),
    INDEX idx_upi_transaction_id (upi_transaction_id),
    INDEX idx_upi_reference_id (upi_reference_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create audit log table for tracking changes
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_data JSON DEFAULT NULL,
    new_data JSON DEFAULT NULL,
    user_type ENUM('admin', 'user', 'system') DEFAULT 'system',
    user_id INT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create migration log table for tracking database migrations
CREATE TABLE migration_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;