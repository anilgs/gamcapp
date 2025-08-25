#!/bin/bash
set -e

ENVIRONMENT=${1:-dev}
VERSION=${2:-$(date +%Y%m%d-%H%M%S)}

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

echo "🚀 Deploying GAMCAPP to $ENVIRONMENT environment..."

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "❌ Invalid environment. Use: dev, staging, or prod"
    exit 1
fi

# Check if deployment package exists
if [ ! -d "deploy" ]; then
    echo "❌ Deployment package not found. Run build.sh first."
    exit 1
fi

echo "📦 Deploying version: $VERSION"

# Initialize Terraform if needed
if [ ! -d "infrastructure/.terraform" ]; then
    echo "🏗️ Initializing Terraform..."
    cd infrastructure
    terraform init
    cd ..
fi

# Function to safely import resources
safe_import() {
    local resource_address=$1
    local resource_id=$2
    
    print_status "Checking if $resource_address exists in state..."
    
    if terraform state show "$resource_address" >/dev/null 2>&1; then
        print_status "$resource_address already exists in state, skipping import"
        return 0
    fi
    
    print_status "Importing $resource_address with ID: $resource_id"
    
    if terraform import -var-file="environments/$ENVIRONMENT/terraform.tfvars" "$resource_address" "$resource_id" 2>/dev/null; then
        print_success "Successfully imported $resource_address"
        return 0
    else
        print_warning "Failed to import $resource_address (resource may not exist or already imported)"
        return 1
    fi
}

# Function to check and release unused EIPs if needed
check_and_cleanup_eips() {
    print_status "Checking EIP usage and limits..."
    
    local current_eips
    current_eips=$(aws ec2 describe-addresses --region ap-south-1 --output json | jq '.Addresses | length' 2>/dev/null || echo "0")
    
    print_status "Current EIPs in use: $current_eips"
    print_status "AWS default limit: 5 EIPs per region"
    print_status "This deployment needs: 3 EIPs for NAT gateways"
    
    # Be more aggressive - cleanup if we have 3+ EIPs to ensure we have room for 3 new NAT gateway EIPs
    if [[ "$current_eips" -ge 3 ]]; then
        print_warning "Cleaning up unused EIPs to ensure sufficient capacity for deployment..."
        
        # Get all EIPs with detailed info
        local eip_details
        eip_details=$(aws ec2 describe-addresses --region ap-south-1 --output json 2>/dev/null)
        
        if [[ -n "$eip_details" ]]; then
            # Show current EIP usage
            echo "$eip_details" | jq -r '.Addresses[] | "EIP: \(.PublicIp) | AllocationId: \(.AllocationId) | Associated: \(if .AssociationId then "Yes (\(.AssociationId))" else "No" end)"'
            
            # Get unused EIPs
            local unused_eip_ids
            unused_eip_ids=$(echo "$eip_details" | jq -r '.Addresses[] | select(.AssociationId == null) | .AllocationId' 2>/dev/null)
            
            if [[ -n "$unused_eip_ids" ]] && [[ "$unused_eip_ids" != "" ]]; then
                print_warning "Releasing unused EIPs..."
                while IFS= read -r allocation_id; do
                    if [[ -n "$allocation_id" ]] && [[ "$allocation_id" != "null" ]]; then
                        print_status "Releasing unused EIP: $allocation_id"
                        if aws ec2 release-address --region ap-south-1 --allocation-id "$allocation_id" 2>/dev/null; then
                            print_success "Released EIP: $allocation_id"
                        else
                            print_error "Failed to release EIP: $allocation_id"
                        fi
                        sleep 2
                    fi
                done <<< "$unused_eip_ids"
                
                # Recheck count after cleanup
                current_eips=$(aws ec2 describe-addresses --region ap-south-1 --output json | jq '.Addresses | length' 2>/dev/null || echo "0")
                print_status "EIPs after cleanup: $current_eips"
            fi
            
            # Check if we still don't have enough room
            if [[ "$current_eips" -gt 2 ]]; then
                print_warning "Still have $current_eips EIPs. This may cause issues if deployment needs 3 new NAT gateway EIPs."
                print_warning "Consider releasing more EIPs manually or requesting a limit increase from AWS."
            else
                print_success "EIP cleanup successful. Ready for deployment."
            fi
        fi
    else
        print_success "EIP count is within acceptable range for deployment."
    fi
}

# Function to import existing resources for the environment
import_existing_resources() {
    local env_prefix="gamcapp-${ENVIRONMENT}"
    
    print_status "🔄 Checking for existing AWS resources to import..."
    
    # Only import if we're dealing with prod environment (where the error occurred)
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        print_status "Importing existing prod resources..."
        
        # Import S3 Buckets
        safe_import "module.elasticbeanstalk.aws_s3_bucket.eb_versions" "${env_prefix}-eb-versions"
        safe_import "module.elasticbeanstalk.aws_s3_bucket.uploads" "${env_prefix}-uploads"
        
        # Import IAM Roles
        safe_import "module.iam.aws_iam_role.eb_service_role" "${env_prefix}-eb-service-role"
        safe_import "module.iam.aws_iam_role.eb_instance_role" "${env_prefix}-eb-instance-role"
        safe_import "module.iam.aws_iam_role.codedeploy_service_role" "${env_prefix}-codedeploy-service-role"
        safe_import "module.vpc.aws_iam_role.flow_log" "${env_prefix}-vpc-flow-log-role"
        
        # Import IAM Instance Profile
        safe_import "module.iam.aws_iam_instance_profile.eb_instance_profile" "${env_prefix}-eb-instance-profile"
        
        # Import Secrets Manager
        safe_import "module.rds.aws_secretsmanager_secret.db_password" "${env_prefix}-db-password"
        
        # Import CloudWatch Log Groups
        safe_import "module.vpc.aws_cloudwatch_log_group.vpc" "/aws/vpc/${env_prefix}"
        
        # Check and import VPC and related resources
        local vpc_id
        vpc_id=$(aws ec2 describe-vpcs --region ap-south-1 --filters "Name=tag:Name,Values=${env_prefix}-vpc" --query "Vpcs[0].VpcId" --output text 2>/dev/null || echo "None")
        if [[ "$vpc_id" != "None" && "$vpc_id" != "null" && -n "$vpc_id" ]]; then
            print_status "Found existing VPC: $vpc_id"
            safe_import "module.vpc.aws_vpc.main" "$vpc_id"
            
            # Try to import existing subnets that belong to this VPC
            import_existing_subnets "$vpc_id" "$env_prefix"
            
            # Try to import existing internet gateway
            local igw_id
            igw_id=$(aws ec2 describe-internet-gateways --region ap-south-1 --filters "Name=attachment.vpc-id,Values=$vpc_id" --query "InternetGateways[0].InternetGatewayId" --output text 2>/dev/null || echo "None")
            if [[ "$igw_id" != "None" && "$igw_id" != "null" && -n "$igw_id" ]]; then
                safe_import "module.vpc.aws_internet_gateway.main" "$igw_id"
            fi
        else
            print_warning "No existing VPC found with name ${env_prefix}-vpc"
        fi
        
        # Handle DB subnet groups - try to import them AFTER VPC and subnets
        print_status "Importing database subnet groups..."
        safe_import "module.rds.aws_db_subnet_group.main" "${env_prefix}-db-subnet-group"
        safe_import "module.rds.aws_db_parameter_group.main" "${env_prefix}-db-params"
        safe_import "module.vpc.aws_db_subnet_group.database" "${env_prefix}-database-subnet-group"
        
        # Check and import ElasticBeanstalk application if it exists
        local eb_app_exists
        eb_app_exists=$(aws elasticbeanstalk describe-applications --region ap-south-1 --application-names "${env_prefix}" --query "Applications[0].ApplicationName" --output text 2>/dev/null || echo "None")
        if [[ "$eb_app_exists" != "None" && "$eb_app_exists" != "null" ]]; then
            safe_import "module.elasticbeanstalk.aws_elastic_beanstalk_application.main" "${env_prefix}"
        fi
    fi
    
    print_success "Resource import check completed"
}

# Function to import existing subnets for a VPC
import_existing_subnets() {
    local vpc_id=$1
    local env_prefix=$2
    
    print_status "Checking for existing subnets in VPC: $vpc_id"
    
    # Get all subnets in the VPC
    local subnets
    subnets=$(aws ec2 describe-subnets --region ap-south-1 --filters "Name=vpc-id,Values=$vpc_id" --output json 2>/dev/null)
    
    if [[ -n "$subnets" ]]; then
        # Try to import subnets by their tags/names
        local subnet_ids
        
        # Public subnets
        subnet_ids=$(echo "$subnets" | jq -r '.Subnets[] | select(.Tags[]?.Value | test(".*public.*"; "i")) | .SubnetId' 2>/dev/null)
        local count=0
        while IFS= read -r subnet_id; do
            if [[ -n "$subnet_id" ]] && [[ "$subnet_id" != "null" ]]; then
                safe_import "module.vpc.aws_subnet.public[$count]" "$subnet_id"
                ((count++))
            fi
        done <<< "$subnet_ids"
        
        # Private subnets
        subnet_ids=$(echo "$subnets" | jq -r '.Subnets[] | select(.Tags[]?.Value | test(".*private.*"; "i")) | .SubnetId' 2>/dev/null)
        count=0
        while IFS= read -r subnet_id; do
            if [[ -n "$subnet_id" ]] && [[ "$subnet_id" != "null" ]]; then
                safe_import "module.vpc.aws_subnet.private[$count]" "$subnet_id"
                ((count++))
            fi
        done <<< "$subnet_ids"
        
        # Database subnets
        subnet_ids=$(echo "$subnets" | jq -r '.Subnets[] | select(.Tags[]?.Value | test(".*database.*"; "i")) | .SubnetId' 2>/dev/null)
        count=0
        while IFS= read -r subnet_id; do
            if [[ -n "$subnet_id" ]] && [[ "$subnet_id" != "null" ]]; then
                safe_import "module.vpc.aws_subnet.database[$count]" "$subnet_id"
                ((count++))
            fi
        done <<< "$subnet_ids"
    fi
}

# Deploy infrastructure
echo "🏗️ Deploying infrastructure..."
cd infrastructure

# Set workspace
terraform workspace select $ENVIRONMENT 2>/dev/null || terraform workspace new $ENVIRONMENT

# Check for EIP limits and cleanup if necessary
check_and_cleanup_eips

# Import existing resources to avoid conflicts
import_existing_resources

# Plan with retries in case of transient issues
print_status "Creating Terraform plan..."
PLAN_RETRIES=3
PLAN_SUCCESS=false

for i in $(seq 1 $PLAN_RETRIES); do
    if terraform plan -input=false -var-file="environments/$ENVIRONMENT/terraform.tfvars" -out=tfplan; then
        PLAN_SUCCESS=true
        break
    else
        print_warning "Plan attempt $i failed. Retrying in 10 seconds..."
        sleep 10
    fi
done

if [[ "$PLAN_SUCCESS" != "true" ]]; then
    print_error "Terraform plan failed after $PLAN_RETRIES attempts"
    exit 1
fi

# Apply with error handling
print_status "Applying Terraform changes..."
if ! terraform apply -input=false tfplan; then
    print_error "Terraform apply failed"
    exit 1
fi

# Get ElasticBeanstalk application and environment names
APP_NAME=$(terraform output -raw eb_application_name)
ENV_NAME=$(terraform output -raw eb_environment_name)
cd ..

echo "📦 Application Name: $APP_NAME"
echo "🌍 Environment Name: $ENV_NAME"

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo "❌ EB CLI not found. Please install it first:"
    echo "pip install awsebcli"
    exit 1
fi

# Initialize EB CLI if needed
if [ ! -f ".elasticbeanstalk/config.yml" ]; then
    echo "🔧 Initializing EB CLI..."
    eb init $APP_NAME --region ap-south-1 --platform "Node.js 18 running on 64bit Amazon Linux 2023"
fi

# Create application version
echo "📦 Creating application version..."
cd deploy
zip -r "../gamcapp-$VERSION.zip" . -x "*.git*" "node_modules/.cache/*"
cd ..

# Upload and deploy
echo "🚀 Uploading and deploying to ElasticBeanstalk..."
aws s3 cp "gamcapp-$VERSION.zip" "s3://$(cd infrastructure && terraform output -raw s3_bucket_versions)/"

aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION" \
    --source-bundle S3Bucket="$(cd infrastructure && terraform output -raw s3_bucket_versions)",S3Key="gamcapp-$VERSION.zip"

aws elasticbeanstalk update-environment \
    --environment-name "$ENV_NAME" \
    --version-label "$VERSION"

echo "⏳ Waiting for deployment to complete..."
aws elasticbeanstalk wait environment-updated --environment-names "$ENV_NAME"

# Get environment URL
APP_URL=$(cd infrastructure && terraform output -raw eb_environment_url)
echo "✅ Deployment completed successfully!"
echo "🌐 Application URL: $APP_URL"

# Clean up
rm -f "gamcapp-$VERSION.zip"

echo "🎉 Deployment to $ENVIRONMENT completed!"