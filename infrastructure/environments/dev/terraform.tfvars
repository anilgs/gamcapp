environment = "dev"
aws_region  = "ap-south-1"

# VPC Configuration
vpc_cidr                = "10.0.0.0/16"
availability_zones      = ["ap-south-1a", "ap-south-1b"]
public_subnet_cidrs     = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs    = ["10.0.11.0/24", "10.0.12.0/24"]
database_subnet_cidrs   = ["10.0.21.0/24", "10.0.22.0/24"]

# Database Configuration
db_instance_class       = "db.t3.micro"
db_allocated_storage    = 20
multi_az               = false
skip_final_snapshot    = true

# ElasticBeanstalk Configuration
eb_instance_type       = "t3.micro"
eb_min_size           = 1
eb_max_size           = 2
eb_desired_capacity   = 1

# Environment Variables (add your specific values)
environment_variables = {
  SMTP_HOST     = "smtp.gmail.com"
  SMTP_PORT     = "587"
  SMTP_SECURE   = "false"
  ADMIN_EMAIL   = "admin@gamca.dev"
  FROM_EMAIL    = "noreply@gamca.dev"
  FROM_NAME     = "GAMCA Medical Services"
  UPLOAD_DIR    = "/tmp/uploads"
  MAX_FILE_SIZE = "10485760"
}