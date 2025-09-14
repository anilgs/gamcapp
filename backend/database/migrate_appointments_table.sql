-- Migration: Add appointments table
-- This migration creates a dedicated appointments table to persist appointment data before payment processing
-- Date: 2025-09-14

-- Create appointments table
CREATE TABLE appointments (
    id VARCHAR(36) PRIMARY KEY,  -- UUID for security
    user_id INT NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    nationality VARCHAR(50) NOT NULL,
    gender ENUM('Male', 'Female') NOT NULL,
    marital_status ENUM('Single', 'Married', 'Divorced', 'Widowed') NOT NULL,
    
    -- Passport Information
    passport_number VARCHAR(50) NOT NULL,
    passport_issue_date DATE NOT NULL,
    passport_issue_place VARCHAR(100) NOT NULL,
    passport_expiry_date DATE NOT NULL,
    visa_type VARCHAR(50) NOT NULL,
    position_applied_for VARCHAR(100),
    
    -- Contact Information
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    national_id VARCHAR(50),
    
    -- Location & Travel
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    country_traveling_to VARCHAR(100) NOT NULL,
    
    -- Appointment Details
    appointment_type ENUM('standard', 'premium') NOT NULL,
    medical_center VARCHAR(100) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME,
    
    -- Status & Payment
    status ENUM('draft', 'payment_pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'draft',
    payment_order_id VARCHAR(255),
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for better performance
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_appointment_date (appointment_date),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at),
    INDEX idx_passport_number (passport_number),
    INDEX idx_email (email),
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update payment_transactions table to reference appointments
ALTER TABLE payment_transactions 
ADD COLUMN appointment_id VARCHAR(36) DEFAULT NULL,
ADD INDEX idx_appointment_id (appointment_id),
ADD FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;