output "eb_service_role_arn" {
  description = "ARN of the ElasticBeanstalk service role"
  value       = aws_iam_role.eb_service_role.arn
}

output "eb_instance_role_arn" {
  description = "ARN of the ElasticBeanstalk instance role"
  value       = aws_iam_role.eb_instance_role.arn
}

output "eb_instance_profile_name" {
  description = "Name of the ElasticBeanstalk instance profile"
  value       = aws_iam_instance_profile.eb_instance_profile.name
}

output "eb_instance_profile_arn" {
  description = "ARN of the ElasticBeanstalk instance profile"
  value       = aws_iam_instance_profile.eb_instance_profile.arn
}

output "codedeploy_service_role_arn" {
  description = "ARN of the CodeDeploy service role"
  value       = aws_iam_role.codedeploy_service_role.arn
}