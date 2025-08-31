# GAMCAPP Deployment Guide

## Enhanced Automated Deployment

The GAMCAPP project now includes comprehensive automated deployment with database initialization and PHP server configuration.

### Features

✅ **Automatic Database Setup**
- Checks if database exists and needs initialization
- Creates database tables using `schema.sql`
- Applies seed data including default admin user
- Verifies successful installation

✅ **PHP Environment Configuration**
- Optimizes Composer autoloader for production performance
- Ensures all PHP dependencies are properly packaged
- Validates autoloader functionality before deployment
- Creates environment files with encrypted secrets

✅ **Shared Hosting Compatibility**
- Works without SSH access (compatible with most shared hosts)
- Relies on FTP deployment for file transfer
- Leverages hosting provider's native PHP configuration
- Includes optimized vendor directory for dependencies

✅ **Comprehensive Health Checks**
- Tests API endpoints
- Verifies database connectivity
- Validates frontend routing
- Checks static asset serving

### Deployment Environments

#### Development (`develop` branch)
- Deploys to `/public_html/dev/`
- Uses development environment variables
- Includes debug settings

#### Production (`main` branch)
- Deploys to `/domains/{DOMAIN}/public_html/`
- Uses production environment variables
- Optimized for performance

### Database Initialization Logic

1. **Database Existence Check**: Verifies if target database exists
2. **Schema Validation**: Counts existing tables (minimum 4 required)
3. **Conditional Setup**: Only initializes if database is empty or missing
4. **Verification**: Lists created tables and confirms success

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DB_HOST` | Database server hostname |
| `DB_PORT` | Database port (usually 3306) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user with admin privileges |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | JWT signing secret |
| `RAZORPAY_KEY_ID` | Payment gateway key |
| `RAZORPAY_KEY_SECRET` | Payment gateway secret |
| `FTP_PASSWORD` | FTP deployment password |

### Manual Database Setup (Alternative)

If you prefer manual database setup:

```bash
cd backend/database
chmod +x init.sql

# Set environment variables
export DB_HOST="your-db-host"
export DB_NAME="gamcapp"
export DB_USER="your-db-user"
export DB_PASSWORD="your-password"

# Run initialization
./init.sql
```

### Troubleshooting

#### Database Connection Issues
- Verify database credentials in GitHub secrets
- Check if database server allows remote connections
- Ensure firewall allows MySQL port (3306)

#### PHP Environment Issues  
- **Shared Hosting Compatibility**: This workflow is optimized for shared hosting without SSH access
- **Composer Dependencies**: All PHP dependencies are pre-installed during CI/CD and deployed via FTP
- **File Permissions**: Hosting providers typically handle PHP file permissions automatically
- **No SSH Required**: The deployment works entirely through FTP and MySQL connections

#### Deployment Failures
- Check GitHub Actions logs for specific error messages
- Verify FTP credentials and server paths
- Ensure all required secrets are configured

### Default Admin Access

After successful deployment:
- **Username**: `admin`
- **Password**: `admin123`
- **⚠️ Important**: Change the default password immediately in production!

### Health Check Endpoints

- **API Health**: `https://yourdomain.com/api/health`
- **Database Test**: `https://yourdomain.com/api/auth/send-otp` (POST)
- **Frontend**: `https://yourdomain.com/`

For support, check the main README or create an issue in the repository.