# ElasticBeanstalk Application
resource "aws_elastic_beanstalk_application" "main" {
  name        = "${var.project_name}-${var.environment}"
  description = "ElasticBeanstalk application for ${var.project_name} ${var.environment}"

  appversion_lifecycle {
    service_role          = var.service_role_arn
    max_count             = 128
    delete_source_from_s3 = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-app"
  }
}

# S3 Bucket for application versions
resource "aws_s3_bucket" "eb_versions" {
  bucket = "${var.project_name}-${var.environment}-eb-versions"

  tags = {
    Name = "${var.project_name}-${var.environment}-eb-versions"
  }
}

resource "aws_s3_bucket_versioning" "eb_versions" {
  bucket = aws_s3_bucket.eb_versions.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "eb_versions" {
  bucket = aws_s3_bucket.eb_versions.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "eb_versions" {
  bucket = aws_s3_bucket.eb_versions.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket for file uploads
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.project_name}-${var.environment}-uploads"

  tags = {
    Name = "${var.project_name}-${var.environment}-uploads"
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ElasticBeanstalk Environment
resource "aws_elastic_beanstalk_environment" "main" {
  name         = "${var.project_name}-${var.environment}-env"
  application  = aws_elastic_beanstalk_application.main.name
  solution_stack_name = "64bit Amazon Linux 2023 v6.1.2 running Node.js 18"

  # General settings
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "NODE_ENV"
    value     = var.environment == "prod" ? "production" : "development"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "PORT"
    value     = "80"
  }

  # Environment variables
  dynamic "setting" {
    for_each = nonsensitive(var.environment_variables)
    content {
      namespace = "aws:elasticbeanstalk:application:environment"
      name      = setting.key
      value     = setting.value
    }
  }

  # VPC Configuration
  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = var.vpc_id
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = join(",", var.private_subnet_ids)
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "ELBSubnets"
    value     = join(",", var.public_subnet_ids)
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "ELBScheme"
    value     = "public"
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "AssociatePublicIpAddress"
    value     = "false"
  }

  # Instance Configuration
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = var.instance_type
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = var.instance_profile_name
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "SecurityGroups"
    value     = join(",", var.security_group_ids)
  }

  dynamic "setting" {
    for_each = var.key_name != "" ? [1] : []
    content {
      namespace = "aws:autoscaling:launchconfiguration"
      name      = "EC2KeyName"
      value     = var.key_name
    }
  }

  # Auto Scaling Configuration
  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MinSize"
    value     = var.min_size
  }

  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MaxSize"
    value     = var.max_size
  }

  setting {
    namespace = "aws:autoscaling:asg"
    name      = "Availability Zones"
    value     = "Any"
  }

  # Load Balancer Configuration
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "EnvironmentType"
    value     = "LoadBalanced"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerType"
    value     = "application"
  }

  setting {
    namespace = "aws:elbv2:loadbalancer"
    name      = "SecurityGroups"
    value     = join(",", var.load_balancer_security_group_ids)
  }

  setting {
    namespace = "aws:elbv2:loadbalancer"
    name      = "ManagedSecurityGroup"
    value     = ""
  }

  # HTTPS Configuration (if SSL certificate is provided)
  dynamic "setting" {
    for_each = var.ssl_certificate_arn != "" ? [1] : []
    content {
      namespace = "aws:elbv2:listener:443"
      name      = "Protocol"
      value     = "HTTPS"
    }
  }

  dynamic "setting" {
    for_each = var.ssl_certificate_arn != "" ? [1] : []
    content {
      namespace = "aws:elbv2:listener:443"
      name      = "SSLCertificateArns"
      value     = var.ssl_certificate_arn
    }
  }

  # Health Check Configuration
  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name      = "SystemType"
    value     = "enhanced"
  }

  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name      = "HealthCheckSuccessThreshold"
    value     = "Ok"
  }

  # Rolling Updates and Deployments
  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name      = "RollingUpdateEnabled"
    value     = "true"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name      = "RollingUpdateType"
    value     = "Health"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "DeploymentPolicy"
    value     = "Rolling"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSizeType"
    value     = "Percentage"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSize"
    value     = "30"
  }

  # Logging
  setting {
    namespace = "aws:elasticbeanstalk:hostmanager"
    name      = "LogPublicationControl"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "StreamLogs"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "DeleteOnTerminate"
    value     = "false"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "RetentionInDays"
    value     = "30"
  }

  # Service Role
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = var.service_role_arn
  }

  # Platform-specific settings
  setting {
    namespace = "aws:elasticbeanstalk:container:nodejs"
    name      = "NodeCommand"
    value     = "npm start"
  }

  setting {
    namespace = "aws:elasticbeanstalk:container:nodejs"
    name      = "NodeVersion"
    value     = "18.19.0"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-env"
  }

  depends_on = [
    aws_elastic_beanstalk_application.main
  ]
}