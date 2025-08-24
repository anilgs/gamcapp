terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Configure your S3 backend here
    bucket = "gamcapp-terraform-state-bucket"
    key    = "gamcapp/terraform.tfstate"
    region = "ap-south-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr

  availability_zones     = var.availability_zones
  public_subnet_cidrs    = var.public_subnet_cidrs
  private_subnet_cidrs   = var.private_subnet_cidrs
  database_subnet_cidrs  = var.database_subnet_cidrs

  enable_nat_gateway     = var.enable_nat_gateway
  enable_vpn_gateway     = var.enable_vpn_gateway
  enable_dns_hostnames   = true
  enable_dns_support     = true
}

# Security Groups Module
module "security_groups" {
  source = "./modules/security-groups"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  vpc_cidr     = var.vpc_cidr
}

# IAM Module
module "iam" {
  source = "./modules/iam"

  project_name = var.project_name
  environment  = var.environment
}

# RDS Module
module "rds" {
  source = "./modules/rds"

  project_name = var.project_name
  environment  = var.environment

  vpc_id               = module.vpc.vpc_id
  database_subnet_ids  = module.vpc.database_subnet_ids
  security_group_ids   = [module.security_groups.rds_security_group_id]

  db_instance_class    = var.db_instance_class
  db_name              = var.db_name
  db_username          = var.db_username
  db_password          = var.db_password
  db_allocated_storage = var.db_allocated_storage
  db_engine_version    = var.db_engine_version

  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  multi_az              = var.multi_az
  skip_final_snapshot   = var.skip_final_snapshot
}

# ElasticBeanstalk Module
module "elasticbeanstalk" {
  source = "./modules/elasticbeanstalk"

  project_name = var.project_name
  environment  = var.environment

  vpc_id                    = module.vpc.vpc_id
  public_subnet_ids         = module.vpc.public_subnet_ids
  private_subnet_ids        = module.vpc.private_subnet_ids
  security_group_ids        = [module.security_groups.eb_security_group_id]
  load_balancer_security_group_ids = [module.security_groups.alb_security_group_id]

  instance_type             = var.eb_instance_type
  min_size                  = var.eb_min_size
  max_size                  = var.eb_max_size
  desired_capacity          = var.eb_desired_capacity

  service_role_arn          = module.iam.eb_service_role_arn
  instance_profile_name     = module.iam.eb_instance_profile_name

  # Environment variables
  environment_variables = merge(
    var.environment_variables,
    {
      DATABASE_URL = module.rds.database_url
      NODE_ENV     = var.environment == "prod" ? "production" : "development"
    }
  )

  # SSL Configuration
  ssl_certificate_arn = var.ssl_certificate_arn
  domain_name        = var.domain_name
}