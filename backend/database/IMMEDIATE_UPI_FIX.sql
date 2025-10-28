-- IMMEDIATE EMERGENCY FIX FOR UPI PAYMENT CONSTRAINT VIOLATION
-- Apply this SQL directly to production database to fix the constraint issue

-- Step 1: Make order_id nullable to support UPI payments (updated from razorpay_order_id)
ALTER TABLE payment_transactions 
MODIFY COLUMN order_id VARCHAR(255) DEFAULT NULL;

-- Step 2: Drop the problematic unique constraint
ALTER TABLE payment_transactions 
DROP INDEX IF EXISTS unique_razorpay_order;

-- Step 3: Add appointment_id column if missing (for tracking)
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS appointment_id INT DEFAULT NULL AFTER user_id,
ADD INDEX IF NOT EXISTS idx_appointment_id (appointment_id);

-- Verify the fix
SELECT 'UPI payment constraint fix applied successfully' as status;
SHOW INDEX FROM payment_transactions;