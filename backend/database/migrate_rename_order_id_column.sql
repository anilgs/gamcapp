-- Migration to rename razorpay_order_id to order_id for better generic naming
-- This makes the column name payment-method agnostic

-- Rename the column from razorpay_order_id to order_id
ALTER TABLE payment_transactions 
CHANGE COLUMN razorpay_order_id order_id VARCHAR(255) NULL;

-- Update any existing unique constraints if they exist
-- (This is safe even if the constraint doesn't exist)
ALTER TABLE payment_transactions 
DROP INDEX IF EXISTS unique_razorpay_order;

-- Add a more generic unique constraint for order_id (excluding NULL values)
-- This ensures each order_id is unique but allows multiple NULL values
CREATE UNIQUE INDEX unique_order_id ON payment_transactions (order_id) 
WHERE order_id IS NOT NULL;