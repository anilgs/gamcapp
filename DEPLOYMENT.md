# GAMCAPP Infrastructure Deployment Guide

This guide provides complete instructions for deploying the GAMCAPP Next.js application to AWS using Terraform and ElasticBeanstalk.

## 🏗️ Architecture Overview

The infrastructure consists of:

- **VPC** with public, private, and database subnets across multiple AZs
- **Application Load Balancer** for traffic distribution and SSL termination  
- **ElasticBeanstalk** environment with auto-scaling EC2 instances
- **RDS PostgreSQL** database with automated backups
- **S3 buckets** for application versions and file uploads
- **CloudWatch** for logging and monitoring
- **IAM roles** with least-privilege access

## 📋 Prerequisites

### Required Tools
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- [Terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli) (>= 1.0)
- [EB CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html)
- [Node.js 18](https://nodejs.org/)
- [Git](https://git-scm.com/)

### AWS Account Setup
1. **AWS Account** with appropriate permissions
2. **S3 bucket** for Terraform state (optional but recommended)
3. **AWS credentials** configured (`aws configure`)
4. **SSL certificate** in AWS Certificate Manager (for production)

### Domain Setup (Production)
- Domain registered and configured with Route 53 or external DNS
- SSL certificate issued through AWS Certificate Manager

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd gamcapp
npm install
```

### 2. Configure Infrastructure
```bash
# Copy and customize Terraform variables
cp infrastructure/terraform.tfvars.example infrastructure/terraform.tfvars

# Edit the file with your specific values
nano infrastructure/terraform.tfvars
```

### 3. Deploy Infrastructure
```bash
# Initialize Terraform
cd infrastructure
terraform init

# Create workspace for environment
terraform workspace new dev  # or staging, prod

# Plan and apply
terraform plan -var-file="environments/dev/terraform.tfvars"
terraform apply -var-file="environments/dev/terraform.tfvars"
```

### 4. Build and Deploy Application
```bash
# Return to project root
cd ..

# Build application
./infrastructure/scripts/build.sh

# Deploy to environment
./infrastructure/scripts/deploy.sh dev
```

## 🔧 Environment Configuration

### Development Environment
- **Instance Type**: t3.micro
- **Database**: db.t3.micro, single AZ
- **Auto Scaling**: 1-2 instances
- **SSL**: Not required
- **Domain**: Uses EB generated URL

### Staging Environment  
- **Instance Type**: t3.small
- **Database**: db.t3.small, single AZ with backups
- **Auto Scaling**: 1-3 instances
- **SSL**: Optional
- **Domain**: staging.yourdomain.com

### Production Environment
- **Instance Type**: t3.medium
- **Database**: db.t3.medium, Multi-AZ with enhanced monitoring
- **Auto Scaling**: 2-6 instances
- **SSL**: Required with custom certificate
- **Domain**: yourdomain.com

## 📁 Project Structure

```
infrastructure/
├── main.tf                    # Main Terraform configuration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── terraform.tfvars.example   # Example variables file
├── modules/                   # Reusable Terraform modules
│   ├── vpc/                   # VPC and networking
│   ├── rds/                   # PostgreSQL database
│   ├── elasticbeanstalk/      # EB application and environment
│   ├── iam/                   # IAM roles and policies
│   └── security-groups/       # Security groups
├── environments/              # Environment-specific configs
│   ├── dev/terraform.tfvars
│   ├── staging/terraform.tfvars
│   └── prod/terraform.tfvars
└── scripts/                   # Deployment scripts
    ├── build.sh               # Build application
    ├── deploy.sh              # Deploy to environment
    └── migrate-db.sh          # Database migrations

.ebextensions/                 # ElasticBeanstalk configuration
├── 01_nodejs.config           # Node.js and dependencies
├── 02_nginx.config            # Web server configuration  
└── 03_logging.config          # Logging setup

.github/workflows/             # CI/CD pipeline
└── deploy.yml                 # GitHub Actions workflow
```

## ⚙️ Configuration Details

### Required Environment Variables

Update `infrastructure/terraform.tfvars` with these required values:

```hcl
# Database (REQUIRED)
db_password = "your-secure-password"

# Environment Variables (REQUIRED)  
environment_variables = {
  JWT_SECRET          = "your-jwt-secret-key"
  RAZORPAY_KEY_ID     = "your-razorpay-key-id"
  RAZORPAY_KEY_SECRET = "your-razorpay-secret"
  SMTP_USER           = "your-email@gmail.com"
  SMTP_PASS           = "your-app-password"
  ADMIN_EMAIL         = "admin@yourdomain.com"
  FROM_EMAIL          = "noreply@yourdomain.com"
  NEXTAUTH_URL        = "https://yourdomain.com"
  NEXTAUTH_SECRET     = "your-nextauth-secret"
}
```

### GitHub Secrets

For CI/CD pipeline, configure these secrets in your GitHub repository:

```
AWS_ACCESS_KEY_ID           # AWS access key
AWS_SECRET_ACCESS_KEY       # AWS secret key
DEV_DB_PASSWORD            # Development database password
STAGING_DB_PASSWORD        # Staging database password  
PROD_DB_PASSWORD           # Production database password
```

## 🚀 Deployment Process

### Manual Deployment

1. **Build Application**
   ```bash
   ./infrastructure/scripts/build.sh
   ```

2. **Deploy Infrastructure**
   ```bash
   cd infrastructure
   terraform apply -var-file="environments/prod/terraform.tfvars"
   ```

3. **Deploy Application**
   ```bash
   ./infrastructure/scripts/deploy.sh prod
   ```

4. **Run Database Migrations**
   ```bash
   ./infrastructure/scripts/migrate-db.sh prod
   ```

### Automated Deployment (GitHub Actions)

The CI/CD pipeline automatically deploys based on branch:

- **`develop`** branch → Development environment
- **`release/*`** branches → Staging environment  
- **`main`** branch → Production environment

## 🗃️ Database Management

### Initial Setup
The RDS instance is created with basic configuration. Run database migrations:

```bash
./infrastructure/scripts/migrate-db.sh <environment>
```

### Backups
- **Development**: No automated backups
- **Staging**: 7-day retention
- **Production**: 30-day retention with point-in-time recovery

### Access
Database is only accessible from within the VPC. To connect directly:

1. Create a bastion host or use AWS Session Manager
2. Use the database credentials from AWS Secrets Manager
3. Connect using PostgreSQL client

## 🔒 Security Features

- **VPC Isolation**: Resources deployed in private subnets
- **Security Groups**: Restrictive inbound/outbound rules
- **IAM Roles**: Least-privilege access policies
- **Secrets Manager**: Secure credential storage
- **SSL/TLS**: HTTPS encryption (production)
- **WAF**: Web application firewall (optional)

## 📊 Monitoring and Logging

### CloudWatch Integration
- Application logs streamed to CloudWatch
- ElasticBeanstalk health monitoring
- Custom metrics and alarms
- VPC flow logs

### Health Checks
- Load balancer health checks on `/api/health`
- Database connectivity verification
- Environment variable validation

### Alerts (Recommended)
Set up CloudWatch alarms for:
- High CPU usage (>80%)
- Database connection errors
- Application error rates
- Disk usage
- Memory usage

## 🛠️ Troubleshooting

### Common Issues

**Deployment Fails**
- Check AWS credentials and permissions
- Verify Terraform state and locks
- Review CloudWatch logs for errors

**Database Connection Issues**  
- Verify security group rules
- Check DATABASE_URL environment variable
- Confirm VPC and subnet configuration

**Build Failures**
- Ensure Node.js 18 is installed
- Check for TypeScript errors
- Verify all dependencies are installed

### Debugging Commands

```bash
# Check Terraform state
terraform show
terraform state list

# View ElasticBeanstalk logs
eb logs

# Check application health
curl https://your-domain.com/api/health

# View CloudWatch logs
aws logs tail /aws/elasticbeanstalk/gamcapp-prod-env/var/log/web.stdout.log
```

## 🧹 Cleanup

To destroy resources and avoid charges:

```bash
cd infrastructure
terraform destroy -var-file="environments/dev/terraform.tfvars"
```

**Warning**: This will permanently delete all resources including the database!

## 📞 Support

For issues with:
- **Infrastructure**: Check Terraform documentation
- **ElasticBeanstalk**: Review AWS EB documentation  
- **Application**: See application-specific logs
- **CI/CD**: Check GitHub Actions workflow logs

## 📚 Additional Resources

- [AWS ElasticBeanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)