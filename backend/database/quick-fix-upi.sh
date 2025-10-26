#!/bin/bash

# Quick fix for UPI payment constraint violation
# This script runs the specific migration needed to fix the issue

echo "Applying UPI payment constraint fix..."

# The fix: Make razorpay_order_id nullable and remove unique constraint
mysql_commands="
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS appointment_id INT DEFAULT NULL AFTER user_id;

ALTER TABLE payment_transactions 
MODIFY COLUMN razorpay_order_id VARCHAR(255) DEFAULT NULL;

ALTER TABLE payment_transactions 
DROP INDEX IF EXISTS unique_razorpay_order;
"

echo "Executing SQL commands to fix UPI payment constraints..."
echo "$mysql_commands"

echo ""
echo "To apply this fix, run these commands in your MySQL database:"
echo "Or source this SQL in your database console"