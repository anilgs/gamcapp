# GAMCAPP Database Documentation

This folder contains all database-related files for the GAMCAPP Medical Appointment Booking System.

## Files

### `schema.sql`
Complete MySQL database schema with all tables, indexes, and constraints.

**Tables created:**
- `users` - Main user data with appointment details and payment information
- `admins` - Admin user credentials for backend access
- `otp_tokens` - OTP verification tokens for email/phone authentication
- `payment_transactions` - Payment processing records with RazorPay integration
- `audit_logs` - System audit trail for tracking changes

### `init.sql`
Automated initialization script that:
- Creates the database and user (if needed)
- Applies the schema
- Runs seed data
- Verifies the installation

**Usage:**
```bash
# Basic usage
./init.sql

# With custom database settings
DB_NAME=gamcapp DB_USER=admin ./init.sql

# View help
./init.sql --help
```

### `seed.sql`
Initial data insertion including:
- Default admin user (`admin` / `admin123`)
- System configuration data
- Initial audit log entries

### `migrate_otp_table.sql`
Database migration script to update OTP tokens table for email/phone support.
Adds `identifier` and `type` columns while maintaining backward compatibility.

### `run-migrations.sh`
Migration runner script that executes all pending database migrations.
Safe to run multiple times - migrations are idempotent.

**Usage:**
```bash
# Run all migrations
./run-migrations.sh

# Or set environment variables first
export DB_HOST=localhost DB_NAME=gamcapp DB_USER=admin DB_PASSWORD=password
./run-migrations.sh
```

## Database Migrations

Migrations are automatically run during deployment. The system supports both email and phone-based OTP verification:

### Email-based OTP (Default)
- Users register with email address
- OTP codes sent via SMTP
- 6-digit verification codes
- 15-minute expiration

### Phone-based OTP (Legacy)
- Users register with phone number  
- OTP codes sent via SMS
- 6-digit verification codes
- 15-minute expiration

## Environment Variables

The initialization script supports these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | Database server host |
| `DB_PORT` | 3306 | Database server port |
| `DB_NAME` | gamcapp | Database name |
| `DB_USER` | root | MySQL admin user for setup |
| `DB_PASSWORD` | (empty) | MySQL admin password |
| `ADMIN_DB_USER` | gamcapp_user | App database user to create |
| `ADMIN_DB_PASSWORD` | (empty) | App database user password |

## Database Schema Overview

### Users Table
Stores user registration and appointment data:
- Personal information (name, email, phone, passport)
- Appointment details (JSON format)
- Payment status and references
- Appointment slip file paths

### Admins Table
Admin user management:
- Username/password authentication
- Activity tracking
- Role-based access control

### OTP Tokens Table
Email/phone number verification system:
- Support for both email and phone verification
- Time-limited OTP codes
- Usage tracking and rate limiting
- Security audit trail

### Payment Transactions Table
Complete payment processing records:
- RazorPay integration data
- Transaction status tracking
- Amount and currency details
- Payment method information

### Audit Logs Table
System activity monitoring:
- All database changes
- User action tracking
- Security event logging
- Performance monitoring

## Security Features

1. **Data Encryption**: UTF8MB4 charset with Unicode support
2. **Foreign Key Constraints**: Referential integrity enforcement
3. **Indexes**: Optimized query performance
4. **Audit Trail**: Complete change tracking
5. **User Separation**: Dedicated application database user

## Backup and Maintenance

### Backup
```bash
# Full backup
mysqldump -u root -p gamcapp > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema only
mysqldump -u root -p --no-data gamcapp > schema_backup.sql
```

### Restore
```bash
# Restore from backup
mysql -u root -p gamcapp < backup_file.sql

# Fresh installation
./init.sql
```

### Maintenance
```bash
# Check table integrity
mysql -u root -p gamcapp -e "CHECK TABLE users, admins, otp_tokens, payment_transactions;"

# Optimize tables
mysql -u root -p gamcapp -e "OPTIMIZE TABLE users, admins, otp_tokens, payment_transactions;"

# Clean old OTP tokens (run periodically)
mysql -u root -p gamcapp -e "DELETE FROM otp_tokens WHERE expires_at < NOW() - INTERVAL 24 HOUR;"
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x init.sql
   chmod +x run-migrations.sh
   ```

2. **MySQL Access Denied**
   ```bash
   # Check MySQL is running
   sudo systemctl status mysql
   
   # Reset MySQL root password if needed
   sudo mysql_secure_installation
   ```

3. **Database Already Exists**
   - The init script handles existing databases gracefully
   - Use `DROP DATABASE gamcapp;` to start fresh if needed

4. **Character Set Issues**
   - All tables use `utf8mb4` for full Unicode support
   - Ensure MySQL server supports `utf8mb4`

5. **Migration Issues**
   - Migrations are idempotent and safe to run multiple times
   - Check database permissions if migrations fail
   - Verify all required environment variables are set

### Logs and Debugging

- MySQL error logs: `/var/log/mysql/error.log`
- Application logs: Check PHP error logs
- Audit logs: Query the `audit_logs` table

## Production Considerations

1. **Change Default Passwords**: Update the admin password in `seed.sql`
2. **Database User**: Create dedicated application user with minimal privileges
3. **Backups**: Set up automated backups
4. **Monitoring**: Monitor table sizes and query performance
5. **Security**: Regular security updates and access audits
6. **Migrations**: Always test migrations in staging before production

For support, see the main project README or create an issue in the repository.