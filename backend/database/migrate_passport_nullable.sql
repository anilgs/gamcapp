-- Migration: Make passport_number nullable for better user onboarding
-- This allows users to register with email verification and add passport details later

-- Make passport_number nullable
ALTER TABLE users MODIFY COLUMN passport_number VARCHAR(50) NULL;

-- Add a comment explaining the change
ALTER TABLE users MODIFY COLUMN passport_number VARCHAR(50) NULL COMMENT 'Passport number - nullable to allow phased user registration';