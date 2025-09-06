-- Migration script to update OTP tokens table for email/phone support
-- Run this script to update existing installations

-- First, check if the new schema is already applied
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'otp_tokens' 
    AND COLUMN_NAME = 'identifier'
);

-- Only run migration if the new column doesn't exist
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE otp_tokens 
     ADD COLUMN identifier VARCHAR(255) NOT NULL COMMENT "Email address or phone number" AFTER id,
     ADD COLUMN type ENUM("email", "phone") NOT NULL DEFAULT "email" COMMENT "Type of verification: email or phone" AFTER identifier,
     ADD INDEX idx_identifier (identifier),
     ADD INDEX idx_type (type),
     ADD INDEX idx_identifier_type (identifier, type),
     ADD INDEX idx_identifier_otp_type (identifier, otp, type)',
    'SELECT "OTP table already migrated" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migrate existing phone data to new structure (if any exists)
SET @phone_data_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'otp_tokens' 
    AND COLUMN_NAME = 'phone'
);

SET @migrate_sql = IF(@phone_data_exists > 0 AND @column_exists = 0,
    'UPDATE otp_tokens SET identifier = phone, type = "phone" WHERE phone IS NOT NULL AND phone != ""',
    'SELECT "No phone data to migrate" as message'
);

PREPARE migrate_stmt FROM @migrate_sql;
EXECUTE migrate_stmt;
DEALLOCATE PREPARE migrate_stmt;

-- Drop old phone column if it exists and migration was successful
SET @drop_sql = IF(@phone_data_exists > 0 AND @column_exists = 0,
    'ALTER TABLE otp_tokens 
     DROP INDEX IF EXISTS idx_phone,
     DROP INDEX IF EXISTS idx_phone_otp,
     DROP COLUMN IF EXISTS phone',
    'SELECT "No old phone column to drop" as message'
);

PREPARE drop_stmt FROM @drop_sql;
EXECUTE drop_stmt;
DEALLOCATE PREPARE drop_stmt;

-- Ensure identifier column is NOT NULL (required for new records)
SET @fix_sql = IF(@column_exists = 0,
    'ALTER TABLE otp_tokens MODIFY COLUMN identifier VARCHAR(255) NOT NULL',
    'SELECT "Identifier column already configured" as message'
);

PREPARE fix_stmt FROM @fix_sql;
EXECUTE fix_stmt;
DEALLOCATE PREPARE fix_stmt;

SELECT 'OTP table migration completed successfully' as result;