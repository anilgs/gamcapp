-- Migration: Add payment tracking fields to appointments table
-- Adds fields needed for admin payment management

-- Add payment tracking fields to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT NULL AFTER payment_status,
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255) DEFAULT NULL AFTER payment_amount,
ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL AFTER payment_reference;

-- Add index for better payment reference lookups
ALTER TABLE appointments
ADD INDEX IF NOT EXISTS idx_payment_reference (payment_reference);

SELECT 'Payment tracking fields migration completed successfully' as message;