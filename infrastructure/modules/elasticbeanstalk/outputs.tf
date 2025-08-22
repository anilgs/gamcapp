output "application_name" {
  description = "Name of the ElasticBeanstalk application"
  value       = aws_elastic_beanstalk_application.main.name
}

output "environment_name" {
  description = "Name of the ElasticBeanstalk environment"
  value       = aws_elastic_beanstalk_environment.main.name
}

output "environment_id" {
  description = "ID of the ElasticBeanstalk environment"
  value       = aws_elastic_beanstalk_environment.main.id
}

output "environment_url" {
  description = "URL of the ElasticBeanstalk environment"
  value       = "http://${aws_elastic_beanstalk_environment.main.endpoint_url}"
}

output "load_balancer_url" {
  description = "Load balancer URL"
  value       = aws_elastic_beanstalk_environment.main.endpoint_url
}

output "s3_bucket_versions" {
  description = "S3 bucket for application versions"
  value       = aws_s3_bucket.eb_versions.id
}

output "s3_bucket_uploads" {
  description = "S3 bucket for file uploads"
  value       = aws_s3_bucket.uploads.id
}

output "s3_bucket_uploads_arn" {
  description = "ARN of S3 bucket for file uploads"
  value       = aws_s3_bucket.uploads.arn
}