environment = "staging"
aws_region  = "ap-south-1"

# VPC Configuration
vpc_cidr                = "10.1.0.0/16"
availability_zones      = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
public_subnet_cidrs     = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
private_subnet_cidrs    = ["10.1.11.0/24", "10.1.12.0/24", "10.1.13.0/24"]
database_subnet_cidrs   = ["10.1.21.0/24", "10.1.22.0/24", "10.1.23.0/24"]

# Database Configuration
db_instance_class       = "db.t3.small"
db_allocated_storage    = 50
multi_az               = false
skip_final_snapshot    = false
backup_retention_period = 7

# ElasticBeanstalk Configuration
eb_instance_type       = "t3.small"
eb_min_size           = 1
eb_max_size           = 3
eb_desired_capacity   = 2

# Environment Variables (add your specific values)
environment_variables = {
  SMTP_HOST     = "smtp.gmail.com"
  SMTP_PORT     = "587"
  SMTP_SECURE   = "false"
  ADMIN_EMAIL   = "admin@gamca.staging"
  FROM_EMAIL    = "noreply@gamca.staging"
  FROM_NAME     = "GAMCA Medical Services"
  UPLOAD_DIR    = "/tmp/uploads"
  MAX_FILE_SIZE = "10485760"
}