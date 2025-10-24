-- Migration: Add UPI payment support while retaining Razorpay fields
-- This migration extends the payment system to support multiple payment methods
-- Razorpay fields are preserved for backward compatibility

-- Add payment method support to payment_transactions table
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS payment_method ENUM('razorpay', 'upi') DEFAULT 'razorpay' AFTER razorpay_payment_id,
ADD COLUMN IF NOT EXISTS upi_transaction_id VARCHAR(255) DEFAULT NULL AFTER payment_method,
ADD COLUMN IF NOT EXISTS upi_reference_id VARCHAR(255) DEFAULT NULL AFTER upi_transaction_id,
ADD COLUMN IF NOT EXISTS upi_vpa VARCHAR(255) DEFAULT NULL AFTER upi_reference_id,
ADD INDEX IF NOT EXISTS idx_payment_method (payment_method),
ADD INDEX IF NOT EXISTS idx_upi_transaction_id (upi_transaction_id),
ADD INDEX IF NOT EXISTS idx_upi_reference_id (upi_reference_id);

-- Update users table to support payment method preference
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_payment_method ENUM('razorpay', 'upi') DEFAULT 'upi' AFTER payment_id;

-- Add payment method to appointments table for tracking
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_method ENUM('razorpay', 'upi') DEFAULT 'upi' AFTER payment_status;

-- Create a view for easier payment method reporting
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    pt.id,
    pt.user_id,
    pt.appointment_id,
    pt.payment_method,
    pt.amount,
    pt.currency,
    pt.status,
    pt.created_at,
    pt.updated_at,
    -- Razorpay fields
    pt.razorpay_order_id,
    pt.razorpay_payment_id,
    -- UPI fields
    pt.upi_transaction_id,
    pt.upi_reference_id,
    pt.upi_vpa,
    -- User details
    u.name as user_name,
    u.email as user_email,
    u.phone as user_phone,
    -- Appointment details
    a.appointment_type,
    a.appointment_date,
    a.medical_center
FROM payment_transactions pt
LEFT JOIN users u ON pt.user_id = u.id
LEFT JOIN appointments a ON pt.appointment_id = a.id;

-- Create migration_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Log the migration
INSERT INTO migration_log (migration_name, executed_at) 
VALUES ('add_upi_payment_support', NOW())
ON DUPLICATE KEY UPDATE executed_at = NOW();

SELECT 'UPI payment support migration completed successfully' as message;