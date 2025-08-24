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

print_status "Terraform State Verification Script for gamcapp-prod"

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

# Function to check if Terraform is initialized
check_terraform_init() {
    if [[ ! -d ".terraform" ]]; then
        print_warning "Terraform not initialized. Running terraform init..."
        terraform init
    else
        print_success "Terraform is initialized"
    fi
}

# Function to verify specific resource in state
check_resource_in_state() {
    local resource_address=$1
    local resource_name=$2
    
    if terraform state show "$resource_address" >/dev/null 2>&1; then
        print_success "✓ $resource_name is in Terraform state"
        return 0
    else
        print_warning "✗ $resource_name is NOT in Terraform state"
        return 1
    fi
}

# Function to run comprehensive state verification
verify_state() {
    print_status "=== VERIFYING TERRAFORM STATE ==="
    
    local total_resources=0
    local missing_resources=0
    
    # List of resources to check (based on our import script)
    declare -A resources=(
        ["module.elasticbeanstalk.aws_s3_bucket.eb_versions"]="S3 Bucket (EB Versions)"
        ["module.elasticbeanstalk.aws_s3_bucket.uploads"]="S3 Bucket (Uploads)"
        ["module.iam.aws_iam_role.eb_service_role"]="IAM Role (EB Service)"
        ["module.iam.aws_iam_role.eb_instance_role"]="IAM Role (EB Instance)"
        ["module.iam.aws_iam_role.codedeploy_service_role"]="IAM Role (CodeDeploy)"
        ["module.vpc.aws_iam_role.flow_log"]="IAM Role (VPC Flow Log)"
        ["module.rds.aws_db_subnet_group.main"]="RDS DB Subnet Group"
        ["module.rds.aws_db_parameter_group.main"]="RDS DB Parameter Group"
        ["module.vpc.aws_db_subnet_group.database"]="VPC DB Subnet Group"
        ["module.rds.aws_secretsmanager_secret.db_password"]="Secrets Manager Secret"
        ["module.vpc.aws_cloudwatch_log_group.vpc"]="CloudWatch Log Group"
    )
    
    for resource_address in "${!resources[@]}"; do
        resource_name="${resources[$resource_address]}"
        ((total_resources++))
        
        if ! check_resource_in_state "$resource_address" "$resource_name"; then
            ((missing_resources++))
        fi
    done
    
    echo ""
    print_status "=== STATE VERIFICATION SUMMARY ==="
    print_status "Total resources checked: $total_resources"
    print_success "Resources in state: $((total_resources - missing_resources))"
    
    if [[ $missing_resources -gt 0 ]]; then
        print_warning "Missing resources: $missing_resources"
        echo ""
        print_warning "Missing resources need to be imported or may not exist in AWS"
    else
        print_success "All expected resources are in Terraform state!"
    fi
}

# Function to show current state list
show_state_list() {
    print_status "=== CURRENT TERRAFORM STATE LIST ==="
    
    if terraform state list | grep -E "(gamcapp|prod)" | sort; then
        echo ""
        print_success "Found gamcapp-prod resources in state"
    else
        print_warning "No gamcapp-prod resources found in current Terraform state"
        print_status "This might indicate that resources need to be imported"
    fi
}

# Function to run terraform plan and analyze output
run_plan_check() {
    print_status "=== RUNNING TERRAFORM PLAN ==="
    print_status "This will show what changes Terraform wants to make..."
    
    local plan_file="verification_plan.txt"
    
    if terraform plan -var-file="environments/prod/terraform.tfvars" -no-color > "$plan_file" 2>&1; then
        print_success "Terraform plan completed successfully"
        
        # Analyze plan output
        if grep -q "No changes" "$plan_file"; then
            print_success "✓ No changes needed - infrastructure matches Terraform configuration"
        elif grep -q "Plan:" "$plan_file"; then
            local changes_line=$(grep "Plan:" "$plan_file")
            print_warning "Terraform wants to make changes: $changes_line"
            
            # Show summary of changes
            echo ""
            print_status "Change summary:"
            grep -E "(# [a-zA-Z_]+ will be|Error:|Warning:)" "$plan_file" | head -10
        fi
        
        # Check for common issues
        if grep -qi "resource.*already exists" "$plan_file"; then
            print_error "Found 'already exists' errors - some resources may need importing"
        fi
        
        if grep -qi "EIP.*limit" "$plan_file"; then
            print_error "Found EIP limit errors - run cleanup_eips.sh script first"
        fi
        
        print_status "Full plan output saved to: $plan_file"
        
    else
        print_error "Terraform plan failed - check $plan_file for details"
        
        # Show last few lines of error
        echo ""
        print_status "Last 10 lines of plan output:"
        tail -10 "$plan_file"
    fi
}

# Function to check AWS connectivity and permissions
check_aws_connectivity() {
    print_status "=== CHECKING AWS CONNECTIVITY ==="
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found"
        return 1
    fi
    
    # Check AWS credentials
    if aws sts get-caller-identity >/dev/null 2>&1; then
        local account_id=$(aws sts get-caller-identity --query Account --output text)
        local user_arn=$(aws sts get-caller-identity --query Arn --output text)
        print_success "✓ AWS credentials valid"
        print_status "Account ID: $account_id"
        print_status "User/Role: $user_arn"
    else
        print_error "AWS credentials invalid or not configured"
        return 1
    fi
    
    # Check region
    local region=$(aws configure get region 2>/dev/null || echo "not set")
    if [[ "$region" == "ap-south-1" ]] || [[ "$AWS_DEFAULT_REGION" == "ap-south-1" ]]; then
        print_success "✓ Using correct AWS region: ap-south-1"
    else
        print_warning "AWS region may not be set to ap-south-1 (current: $region)"
        print_status "Set with: aws configure set region ap-south-1"
    fi
}

# Function to check for existing resources in AWS
check_aws_resources() {
    print_status "=== CHECKING EXISTING AWS RESOURCES ==="
    
    # Check some key resources
    print_status "Checking S3 buckets..."
    if aws s3api head-bucket --bucket "gamcapp-prod-eb-versions" --region ap-south-1 >/dev/null 2>&1; then
        print_success "✓ S3 bucket gamcapp-prod-eb-versions exists"
    else
        print_warning "✗ S3 bucket gamcapp-prod-eb-versions not found"
    fi
    
    if aws s3api head-bucket --bucket "gamcapp-prod-uploads" --region ap-south-1 >/dev/null 2>&1; then
        print_success "✓ S3 bucket gamcapp-prod-uploads exists"
    else
        print_warning "✗ S3 bucket gamcapp-prod-uploads not found"
    fi
    
    print_status "Checking IAM roles..."
    if aws iam get-role --role-name "gamcapp-prod-eb-service-role" >/dev/null 2>&1; then
        print_success "✓ IAM role gamcapp-prod-eb-service-role exists"
    else
        print_warning "✗ IAM role gamcapp-prod-eb-service-role not found"
    fi
    
    print_status "Checking RDS resources..."
    if aws rds describe-db-parameter-groups --db-parameter-group-name "gamcapp-prod-db-params" --region ap-south-1 >/dev/null 2>&1; then
        print_success "✓ RDS parameter group gamcapp-prod-db-params exists"
    else
        print_warning "✗ RDS parameter group gamcapp-prod-db-params not found"
    fi
}

# Main verification function
main() {
    print_status "Starting comprehensive verification..."
    echo ""
    
    # Step 1: Check basic setup
    check_terraform_init
    echo ""
    
    # Step 2: Check AWS connectivity
    check_aws_connectivity
    echo ""
    
    # Step 3: Show current state
    show_state_list
    echo ""
    
    # Step 4: Verify expected resources in state
    verify_state
    echo ""
    
    # Step 5: Check existing AWS resources
    check_aws_resources
    echo ""
    
    # Step 6: Run terraform plan
    run_plan_check
    echo ""
    
    # Step 7: Provide recommendations
    print_status "=== RECOMMENDATIONS ==="
    
    if [[ -f "verification_plan.txt" ]]; then
        if grep -q "No changes" "verification_plan.txt"; then
            print_success "✓ Your Terraform state is synchronized with AWS resources"
            print_status "You can safely run: terraform apply"
        elif grep -qi "already exists" "verification_plan.txt"; then
            print_warning "⚠ Some resources exist in AWS but not in Terraform state"
            print_status "Next steps:"
            echo "1. Run: ./scripts/import_resources.sh"
            echo "2. Then run this verification script again"
        elif grep -qi "EIP.*limit" "verification_plan.txt"; then
            print_error "✗ Hit EIP (Elastic IP) limit"
            print_status "Next steps:"
            echo "1. Run: ./scripts/cleanup_eips.sh"
            echo "2. Then run: terraform apply"
        else
            print_warning "⚠ Terraform wants to make changes"
            print_status "Review verification_plan.txt and then run:"
            echo "terraform apply -var-file=\"environments/prod/terraform.tfvars\""
        fi
    fi
    
    echo ""
    print_success "Verification completed!"
}

# Check for command line arguments
if [[ $# -gt 0 ]]; then
    case "$1" in
        --state-only)
            check_terraform_init
            verify_state
            show_state_list
            exit 0
            ;;
        --plan-only)
            check_terraform_init
            run_plan_check
            exit 0
            ;;
        --aws-only)
            check_aws_connectivity
            check_aws_resources
            exit 0
            ;;
        --help)
            echo "Usage: $0 [--state-only|--plan-only|--aws-only|--help]"
            echo "  --state-only  Check only Terraform state"
            echo "  --plan-only   Run only terraform plan"
            echo "  --aws-only    Check only AWS connectivity and resources"
            echo "  --help        Show this help"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for available options"
            exit 1
            ;;
    esac
fi

# Run full verification if no arguments provided
main