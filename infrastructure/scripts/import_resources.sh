#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to safely import resources
safe_import() {
    local resource_address=$1
    local resource_id=$2
    
    print_status "Importing $resource_address with ID: $resource_id"
    
    if terraform import "$resource_address" "$resource_id" 2>/dev/null; then
        print_success "Successfully imported $resource_address"
    else
        print_warning "Failed to import $resource_address (may already exist in state or resource not found)"
    fi
}

# Function to check if resource exists in state
check_state() {
    local resource_address=$1
    
    if terraform state show "$resource_address" >/dev/null 2>&1; then
        return 0  # Resource exists in state
    else
        return 1  # Resource doesn't exist in state
    fi
}

print_status "Starting Terraform resource import for gamcapp-prod..."
print_status "Current working directory: $(pwd)"

# Navigate to infrastructure directory if not already there
if [[ ! -f "main.tf" ]]; then
    print_status "Navigating to infrastructure directory..."
    cd infrastructure
fi

# Verify we're in the right directory
if [[ ! -f "main.tf" ]]; then
    print_error "Cannot find main.tf. Please run this script from the project root or infrastructure directory."
    exit 1
fi

# Initialize Terraform if .terraform directory doesn't exist
if [[ ! -d ".terraform" ]]; then
    print_status "Initializing Terraform..."
    terraform init
else
    print_status "Terraform already initialized"
fi

print_status "Starting resource imports..."

# Import S3 Buckets
print_status "=== IMPORTING S3 BUCKETS ==="
safe_import "module.elasticbeanstalk.aws_s3_bucket.eb_versions" "gamcapp-prod-eb-versions"
safe_import "module.elasticbeanstalk.aws_s3_bucket.uploads" "gamcapp-prod-uploads"

# Import IAM Roles
print_status "=== IMPORTING IAM ROLES ==="
safe_import "module.iam.aws_iam_role.eb_service_role" "gamcapp-prod-eb-service-role"
safe_import "module.iam.aws_iam_role.eb_instance_role" "gamcapp-prod-eb-instance-role"
safe_import "module.iam.aws_iam_role.codedeploy_service_role" "gamcapp-prod-codedeploy-service-role"
safe_import "module.vpc.aws_iam_role.flow_log" "gamcapp-prod-vpc-flow-log-role"

# Import RDS Resources
print_status "=== IMPORTING RDS RESOURCES ==="
safe_import "module.rds.aws_db_subnet_group.main" "gamcapp-prod-db-subnet-group"
safe_import "module.rds.aws_db_parameter_group.main" "gamcapp-prod-db-params"
safe_import "module.vpc.aws_db_subnet_group.database" "gamcapp-prod-database-subnet-group"

# Import Secrets Manager
print_status "=== IMPORTING SECRETS MANAGER ==="
safe_import "module.rds.aws_secretsmanager_secret.db_password" "gamcapp-prod-db-password"

# Import CloudWatch Log Groups
print_status "=== IMPORTING CLOUDWATCH RESOURCES ==="
safe_import "module.vpc.aws_cloudwatch_log_group.vpc" "/aws/vpc/gamcapp-prod"

# Additional resources that might exist (try to import, but don't fail if they don't exist)
print_status "=== IMPORTING ADDITIONAL RESOURCES (IF THEY EXIST) ==="

# Try to identify and import VPC resources if they exist
print_status "Checking for existing VPC resources..."

# Function to find VPC ID by name tag
find_vpc_id() {
    aws ec2 describe-vpcs --region ap-south-1 --filters "Name=tag:Name,Values=gamcapp-prod-vpc" --query "Vpcs[0].VpcId" --output text 2>/dev/null || echo "None"
}

VPC_ID=$(find_vpc_id)
if [[ "$VPC_ID" != "None" && "$VPC_ID" != "null" ]]; then
    print_status "Found VPC with ID: $VPC_ID"
    safe_import "module.vpc.aws_vpc.main" "$VPC_ID"
else
    print_warning "No existing VPC found with name gamcapp-prod-vpc"
fi

# Try to import ElasticBeanstalk application if it exists
print_status "Checking for existing ElasticBeanstalk application..."
EB_APP_EXISTS=$(aws elasticbeanstalk describe-applications --region ap-south-1 --application-names "gamcapp-prod" --query "Applications[0].ApplicationName" --output text 2>/dev/null || echo "None")

if [[ "$EB_APP_EXISTS" != "None" && "$EB_APP_EXISTS" != "null" ]]; then
    print_status "Found ElasticBeanstalk application: $EB_APP_EXISTS"
    safe_import "module.elasticbeanstalk.aws_elastic_beanstalk_application.main" "gamcapp-prod"
else
    print_warning "No existing ElasticBeanstalk application found"
fi

print_success "Import process completed!"

# Verify imports by running terraform plan
print_status "=== RUNNING TERRAFORM PLAN TO VERIFY IMPORTS ==="
print_status "This will show what changes Terraform wants to make after imports..."

if terraform plan -var-file="environments/prod/terraform.tfvars" -no-color > plan_output.txt 2>&1; then
    print_success "Terraform plan completed successfully!"
    print_status "Plan output saved to plan_output.txt"
    
    # Show summary of plan
    echo ""
    echo "=== TERRAFORM PLAN SUMMARY ==="
    grep -E "(Plan:|No changes)" plan_output.txt || echo "Check plan_output.txt for full details"
    
else
    print_warning "Terraform plan encountered issues. Check plan_output.txt for details."
    echo "Common issues after import:"
    echo "1. Resource configuration mismatches"
    echo "2. Missing resource dependencies"
    echo "3. Parameter differences between Terraform config and actual resources"
fi

print_status "=== NEXT STEPS ==="
echo "1. Review plan_output.txt for any remaining issues"
echo "2. If plan looks good, run: terraform apply -var-file=\"environments/prod/terraform.tfvars\""
echo "3. If there are configuration mismatches, update your Terraform files to match existing resources"
echo "4. If you encounter the EIP limit error, run the EIP cleanup script first"

print_success "Resource import script completed!"