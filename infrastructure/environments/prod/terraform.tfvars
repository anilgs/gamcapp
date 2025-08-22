environment = "prod"
aws_region  = "us-east-1"

# VPC Configuration
vpc_cidr                = "10.2.0.0/16"
availability_zones      = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs     = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
private_subnet_cidrs    = ["10.2.11.0/24", "10.2.12.0/24", "10.2.13.0/24"]
database_subnet_cidrs   = ["10.2.21.0/24", "10.2.22.0/24", "10.2.23.0/24"]

# Database Configuration
db_instance_class       = "db.t3.medium"
db_allocated_storage    = 100
multi_az               = true
skip_final_snapshot    = false
deletion_protection    = true
backup_retention_period = 30
performance_insights_enabled = true
monitoring_interval    = 60

# ElasticBeanstalk Configuration
eb_instance_type       = "t3.medium"
eb_min_size           = 2
eb_max_size           = 6
eb_desired_capacity   = 3

# SSL Configuration (update with your certificate ARN)
# ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
# domain_name = "gamca-wafid.com"

# Environment Variables (add your specific values)
environment_variables = {
  SMTP_HOST     = "smtp.gmail.com"
  SMTP_PORT     = "587"
  SMTP_SECURE   = "false"
  ADMIN_EMAIL   = "admin@gamca-wafid.com"
  FROM_EMAIL    = "noreply@gamca-wafid.com"
  FROM_NAME     = "GAMCA Medical Services"
  UPLOAD_DIR    = "/tmp/uploads"
  MAX_FILE_SIZE = "10485760"
}