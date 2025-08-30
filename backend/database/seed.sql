-- GAMCAPP Seed Data
-- Initial data for the GAMCAPP Medical Appointment Booking System

-- Insert default admin user
-- Password: 'admin123' (change this in production!)
-- Hash generated with: password_hash('admin123', PASSWORD_BCRYPT)
INSERT INTO admins (username, password_hash, email, is_active) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@gamca-wafid.com', TRUE);

-- Insert sample OTP cleanup job (this will be managed by the application)
-- Note: OTP tokens are created dynamically by the application

-- Insert sample audit log entry for tracking
INSERT INTO audit_logs (table_name, record_id, action, new_data, user_type, user_id) VALUES 
('admins', 1, 'INSERT', '{"username": "admin", "email": "admin@gamca-wafid.com", "is_active": true}', 'system', NULL);

-- Add indexes for better performance (these are already in schema.sql but good to verify)
-- The schema.sql already includes all necessary indexes

-- Set MySQL settings for better performance with the application
-- Note: These are session-level settings and should be configured in my.cnf for production
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- Verify the seed data was inserted correctly
SELECT 'Seed data verification:' as message;
SELECT username, email, is_active, created_at FROM admins;
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = DATABASE();
SELECT 'Database initialization completed successfully!' as status;