-- GAMCA App Database Schema
-- This script initializes the PostgreSQL database with all required tables

-- Create database (run this manually if needed)
-- CREATE DATABASE gamcapp;

-- Connect to the database
-- \c gamcapp;

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores customer information and appointment details
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    passport_number VARCHAR(50) NOT NULL,
    appointment_details JSONB NOT NULL DEFAULT '{}',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_id VARCHAR(255),
    appointment_slip_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admins table - stores admin user credentials
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OTP tokens table - stores temporary OTP codes for user authentication
CREATE TABLE IF NOT EXISTS otp_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE
);

-- Payment transactions table - stores payment transaction details
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    razorpay_order_id VARCHAR(255) NOT NULL,
    razorpay_payment_id VARCHAR(255),
    razorpay_signature VARCHAR(255),
    amount INTEGER NOT NULL, -- Amount in paise (smallest currency unit)
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointment slips table - stores uploaded appointment slip information
CREATE TABLE IF NOT EXISTS appointment_slips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by_admin BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_payment_status ON users(payment_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

CREATE INDEX IF NOT EXISTS idx_otp_tokens_phone ON otp_tokens(phone);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_expires_at ON otp_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_used ON otp_tokens(used);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_razorpay_order_id ON payment_transactions(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_appointment_slips_user_id ON appointment_slips(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123 - should be changed in production)
-- Password hash for 'admin123' using bcrypt with salt rounds 12
INSERT INTO admins (username, password_hash) 
VALUES ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uDfm')
ON CONFLICT (username) DO NOTHING;

-- Create a view for user dashboard data
CREATE OR REPLACE VIEW user_dashboard_view AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    u.passport_number,
    u.appointment_details,
    u.payment_status,
    u.created_at,
    pt.amount,
    pt.razorpay_payment_id,
    pt.status as payment_transaction_status,
    as_table.file_name as appointment_slip_filename,
    as_table.file_path as appointment_slip_path,
    as_table.uploaded_at as slip_uploaded_at
FROM users u
LEFT JOIN payment_transactions pt ON u.id = pt.user_id AND pt.status = 'paid'
LEFT JOIN appointment_slips as_table ON u.id = as_table.user_id;

-- Create a view for admin dashboard data
CREATE OR REPLACE VIEW admin_dashboard_view AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    u.passport_number,
    u.appointment_details,
    u.payment_status,
    u.created_at,
    pt.amount,
    pt.razorpay_payment_id,
    pt.status as payment_transaction_status,
    CASE WHEN as_table.id IS NOT NULL THEN TRUE ELSE FALSE END as has_appointment_slip,
    as_table.file_name as appointment_slip_filename,
    as_table.uploaded_at as slip_uploaded_at
FROM users u
LEFT JOIN payment_transactions pt ON u.id = pt.user_id
LEFT JOIN appointment_slips as_table ON u.id = as_table.user_id
ORDER BY u.created_at DESC;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gamcapp_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gamcapp_user;

COMMENT ON TABLE users IS 'Stores customer information and appointment booking details';
COMMENT ON TABLE admins IS 'Stores admin user credentials for system access';
COMMENT ON TABLE otp_tokens IS 'Stores temporary OTP codes for user authentication';
COMMENT ON TABLE payment_transactions IS 'Stores payment transaction details from RazorPay';
COMMENT ON TABLE appointment_slips IS 'Stores uploaded appointment slip file information';

COMMENT ON COLUMN users.appointment_details IS 'JSON object containing appointment type, preferred date, medical center, etc.';
COMMENT ON COLUMN payment_transactions.amount IS 'Payment amount in paise (smallest currency unit)';
COMMENT ON COLUMN otp_tokens.expires_at IS 'Timestamp when the OTP expires (typically 10 minutes from creation)';

-- End of schema initialization
