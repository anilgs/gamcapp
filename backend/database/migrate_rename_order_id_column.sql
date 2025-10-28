-- Migration to rename razorpay_order_id to order_id for better generic naming
-- This makes the column name payment-method agnostic
-- This migration is idempotent - safe to run multiple times

-- Check if we need to rename the column (only if razorpay_order_id exists)
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payment_transactions' 
        AND COLUMN_NAME = 'razorpay_order_id'
);

-- Only rename if the old column exists
SET @sql = IF(@column_exists > 0, 
    'ALTER TABLE payment_transactions CHANGE COLUMN razorpay_order_id order_id VARCHAR(255) NULL',
    'SELECT "Column razorpay_order_id does not exist, skipping rename" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update any existing unique constraints if they exist
-- (This is safe even if the constraint doesn't exist)
ALTER TABLE payment_transactions 
DROP INDEX IF EXISTS unique_razorpay_order;

-- Check if unique_order_id index already exists
SET @index_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payment_transactions' 
        AND INDEX_NAME = 'unique_order_id'
);

-- Only create index if it doesn't exist
SET @sql = IF(@index_exists = 0, 
    'CREATE UNIQUE INDEX unique_order_id ON payment_transactions (order_id)',
    'SELECT "Index unique_order_id already exists, skipping creation" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;