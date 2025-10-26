-- Migration: Fix UPI payment constraint violation
-- Makes razorpay_order_id nullable and removes problematic unique constraint
-- This allows UPI payments to coexist with Razorpay payments

-- First, add appointment_id column if it doesn't exist (from payment tracking migration)
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS appointment_id INT DEFAULT NULL AFTER user_id,
ADD INDEX IF NOT EXISTS idx_appointment_id (appointment_id);

-- Make razorpay_order_id nullable to support UPI payments
ALTER TABLE payment_transactions 
MODIFY COLUMN razorpay_order_id VARCHAR(255) DEFAULT NULL;

-- Drop the existing unique constraint that causes issues with UPI payments
ALTER TABLE payment_transactions 
DROP INDEX IF EXISTS unique_razorpay_order;

-- Log the migration
INSERT INTO migration_log (migration_name, executed_at) 
VALUES ('fix_upi_payment_constraints', NOW())
ON DUPLICATE KEY UPDATE executed_at = NOW();

SELECT 'UPI payment constraint fix migration completed successfully' as message;