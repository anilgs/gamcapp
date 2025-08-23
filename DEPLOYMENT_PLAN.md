# GAMCAPP Deployment Configuration Checklist

Based on my review of the repository, here are the configurations required before the application can be deployed:

## 🔧 **Required Pre-Deployment Configurations**

### 1. **Environment Variables (.env file)**
Create `.env` file from `.env.example` with these **REQUIRED** values:

```env
# Database (CRITICAL)
DATABASE_URL=postgresql://username:password@host:5432/gamcapp

# Payment Gateway (REQUIRED)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id

# Authentication (CRITICAL)
JWT_SECRET=your_jwt_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret

# Email Configuration (REQUIRED)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ADMIN_EMAIL=admin@yourdomain.com
FROM_EMAIL=noreply@yourdomain.com

# Application URL (REQUIRED)
NEXTAUTH_URL=https://yourdomain.com
```

### 2. **Terraform Configuration**
Create `infrastructure/terraform.tfvars` from `terraform.tfvars.example`:

```hcl
# Project settings
project_name = "gamcapp"
environment  = "prod"  # or dev, staging
aws_region   = "ap-south-1"

# Database (CRITICAL - Set secure password)
db_password = "your-secure-database-password"

# All environment variables from .env file
environment_variables = { /* copy from .env */ }
```

### 3. **AWS Prerequisites**
- ✅ **AWS Account** with appropriate permissions
- ✅ **AWS CLI** configured (`aws configure`)
- ✅ **SSL Certificate** in AWS Certificate Manager (for production)
- ✅ **Domain** registered (for production)

### 4. **GitHub Secrets (for CI/CD)**
Configure these in your GitHub repository:
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
DEV_DB_PASSWORD
STAGING_DB_PASSWORD
PROD_DB_PASSWORD
```

### 5. **Third-Party Services**
- ✅ **Razorpay** account with API keys
- ✅ **Email provider** (Gmail App Password or SMTP service)
- ✅ **SMS provider** for OTP (optional)

### 6. **Database Setup**
- PostgreSQL instance will be created by Terraform
- Initial schema from `scripts/init-db.sql` needs to be applied
- Default admin user: `admin/admin123` (change in production)

## 🚀 **Deployment Process**

### Manual Deployment:
```bash
# 1. Setup infrastructure
cd infrastructure
terraform init
terraform apply -var-file="environments/prod/terraform.tfvars"

# 2. Build and deploy app
./scripts/build.sh
./scripts/deploy.sh prod

# 3. Initialize database
./scripts/migrate-db.sh prod
```

### Automated Deployment:
- Push to `develop` → Development environment
- Push to `release/*` → Staging environment  
- Push to `main` → Production environment

## ⚠️ **Critical Security Notes**
- Change default admin password (`admin123`)
- Use strong, unique passwords for all services
- Never commit secrets to version control
- Enable SSL/HTTPS in production
- Configure proper IAM permissions

## 📁 **Key Configuration Files**
- `.env` - Application environment variables
- `infrastructure/terraform.tfvars` - Infrastructure configuration
- `.ebextensions/` - Elastic Beanstalk configuration
- `scripts/init-db.sql` - Database schema initialization

## 🔍 **Verification Steps**
1. Verify all required environment variables are set
2. Test database connectivity
3. Validate Razorpay integration in test mode
4. Confirm email delivery functionality
5. Run health check endpoint: `/api/health`

The application is well-structured for deployment with comprehensive infrastructure-as-code setup using Terraform and AWS Elastic Beanstalk.