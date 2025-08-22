# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "List of database subnet IDs"
  value       = module.vpc.database_subnet_ids
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = module.security_groups.alb_security_group_id
}

output "eb_security_group_id" {
  description = "ID of the ElasticBeanstalk security group"
  value       = module.security_groups.eb_security_group_id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = module.security_groups.rds_security_group_id
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.db_port
}

output "database_url" {
  description = "Database connection URL"
  value       = module.rds.database_url
  sensitive   = true
}

# ElasticBeanstalk Outputs
output "eb_application_name" {
  description = "Name of the ElasticBeanstalk application"
  value       = module.elasticbeanstalk.application_name
}

output "eb_environment_name" {
  description = "Name of the ElasticBeanstalk environment"
  value       = module.elasticbeanstalk.environment_name
}

output "eb_environment_url" {
  description = "URL of the ElasticBeanstalk environment"
  value       = module.elasticbeanstalk.environment_url
}

output "eb_load_balancer_url" {
  description = "Load balancer URL"
  value       = module.elasticbeanstalk.load_balancer_url
}

# IAM Outputs
output "eb_service_role_arn" {
  description = "ARN of the ElasticBeanstalk service role"
  value       = module.iam.eb_service_role_arn
}

output "eb_instance_profile_name" {
  description = "Name of the ElasticBeanstalk instance profile"
  value       = module.iam.eb_instance_profile_name
}