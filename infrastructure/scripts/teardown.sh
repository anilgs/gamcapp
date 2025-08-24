#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_danger() {
    echo -e "${RED}[DANGER]${NC} $1"
}

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Global variables
ENVIRONMENT=""
REGION="ap-south-1"
PROJECT_NAME="gamcapp"
BACKUP_BUCKET=""
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
SCRIPT_DIR=$(dirname "$0")
TERRAFORM_DIR="$SCRIPT_DIR/.."

# Function to show banner
show_banner() {
    echo ""
    echo -e "${RED}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                          ║${NC}"
    echo -e "${RED}║           🔥 GAMCAPP INFRASTRUCTURE TEARDOWN 🔥          ║${NC}"
    echo -e "${RED}║                                                          ║${NC}"
    if [[ "$TEARDOWN_AUTOMATED" == "true" ]]; then
        echo -e "${RED}║                    🤖 CI/CD MODE 🤖                      ║${NC}"
    else
        echo -e "${RED}║                    ⚠️  WARNING ⚠️                         ║${NC}"
    fi
    echo -e "${RED}║                                                          ║${NC}"
    echo -e "${RED}║     This script will PERMANENTLY DELETE all AWS         ║${NC}"
    echo -e "${RED}║     resources for the specified environment!            ║${NC}"
    echo -e "${RED}║                                                          ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to validate environment
validate_environment() {
    local env=$1
    
    case $env in
        dev|development)
            ENVIRONMENT="dev"
            ;;
        staging|stage)
            ENVIRONMENT="staging"
            ;;
        prod|production)
            ENVIRONMENT="prod"
            ;;
        *)
            print_error "Invalid environment: $env"
            print_status "Valid environments: dev, staging, prod"
            exit 1
            ;;
    esac
    
    print_status "Environment set to: $ENVIRONMENT"
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [[ ! -f "$TERRAFORM_DIR/main.tf" ]]; then
        print_error "Cannot find main.tf. Please run this script from infrastructure/scripts/"
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform not found. Please install Terraform."
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Please install AWS CLI."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check if terraform is initialized
    if [[ ! -d "$TERRAFORM_DIR/.terraform" ]]; then
        print_warning "Terraform not initialized. Initializing..."
        cd "$TERRAFORM_DIR"
        terraform init
        cd - >/dev/null
    fi
    
    print_success "Prerequisites validated"
}

# Function to show current infrastructure
show_current_infrastructure() {
    print_step "Analyzing current infrastructure..."
    
    cd "$TERRAFORM_DIR"
    
    # Show current state
    if terraform state list 2>/dev/null | grep -q "${PROJECT_NAME}-${ENVIRONMENT}"; then
        print_status "Current resources in Terraform state:"
        terraform state list | grep "${PROJECT_NAME}-${ENVIRONMENT}" | sort
        
        echo ""
        print_status "Resource count by type:"
        terraform state list | grep "${PROJECT_NAME}-${ENVIRONMENT}" | \
            sed 's/module\.[^.]*\.aws_/aws_/' | \
            cut -d'.' -f1 | sort | uniq -c | sort -nr
    else
        print_warning "No resources found in Terraform state for ${PROJECT_NAME}-${ENVIRONMENT}"
    fi
    
    cd - >/dev/null
}

# Function to backup critical data
backup_critical_data() {
    print_step "Backing up critical data..."
    
    local backup_dir="/tmp/gamcapp_backup_${ENVIRONMENT}_${TIMESTAMP}"
    mkdir -p "$backup_dir"
    
    print_status "Creating backup directory: $backup_dir"
    
    # Backup Terraform state
    if [[ -f "$TERRAFORM_DIR/terraform.tfstate" ]]; then
        cp "$TERRAFORM_DIR/terraform.tfstate" "$backup_dir/"
        print_success "✓ Backed up local Terraform state"
    fi
    
    # Backup environment configuration
    if [[ -f "$TERRAFORM_DIR/environments/${ENVIRONMENT}/terraform.tfvars" ]]; then
        cp "$TERRAFORM_DIR/environments/${ENVIRONMENT}/terraform.tfvars" "$backup_dir/"
        print_success "✓ Backed up environment configuration"
    fi
    
    # Export RDS snapshots list (if any exist)
    print_status "Checking for RDS snapshots..."
    aws rds describe-db-snapshots \
        --region "$REGION" \
        --query "DBSnapshots[?contains(DBSnapshotIdentifier, '${PROJECT_NAME}-${ENVIRONMENT}')].[DBSnapshotIdentifier,SnapshotCreateTime,Status]" \
        --output table > "$backup_dir/rds_snapshots.txt" 2>/dev/null || true
    
    # Export S3 bucket contents list
    print_status "Checking S3 bucket contents..."
    for bucket in "${PROJECT_NAME}-${ENVIRONMENT}-uploads" "${PROJECT_NAME}-${ENVIRONMENT}-eb-versions"; do
        if aws s3api head-bucket --bucket "$bucket" --region "$REGION" >/dev/null 2>&1; then
            aws s3 ls "s3://$bucket" --recursive > "$backup_dir/${bucket}_contents.txt" 2>/dev/null || true
            print_success "✓ Listed contents of $bucket"
        fi
    done
    
    # Export Secrets Manager secrets
    print_status "Backing up secrets metadata..."
    aws secretsmanager list-secrets \
        --region "$REGION" \
        --query "SecretList[?contains(Name, '${PROJECT_NAME}-${ENVIRONMENT}')].[Name,Description,CreatedDate]" \
        --output table > "$backup_dir/secrets_list.txt" 2>/dev/null || true
    
    # Create backup summary
    cat > "$backup_dir/backup_info.txt" << EOF
GAMCAPP Infrastructure Backup
=============================
Environment: $ENVIRONMENT
Timestamp: $(date)
Region: $REGION
Project: $PROJECT_NAME

This backup was created before infrastructure teardown.
It contains:
- Terraform state files
- Environment configuration
- RDS snapshots list
- S3 bucket contents list
- Secrets Manager metadata

To restore infrastructure, use the Terraform state and configuration files.
EOF
    
    print_success "Backup created at: $backup_dir"
    echo "$backup_dir" > "/tmp/gamcapp_last_backup_${ENVIRONMENT}.txt"
}

# Function to handle data preservation
handle_data_preservation() {
    print_step "Data preservation options..."
    
    echo ""
    echo "What would you like to do with your data?"
    echo "1. Create final RDS snapshot before deletion (RECOMMENDED)"
    echo "2. Skip RDS snapshot (faster deletion, data will be lost)"
    echo "3. Cancel teardown"
    echo ""
    
    while true; do
        read -p "Choose an option (1-3): " -r data_choice
        case $data_choice in
            1)
                print_status "Will create RDS snapshot before deletion"
                export TF_VAR_skip_final_snapshot=false
                break
                ;;
            2)
                print_warning "RDS data will be permanently lost!"
                read -p "Are you absolutely sure? Type 'yes' to confirm: " -r confirm
                if [[ "$confirm" == "yes" ]]; then
                    export TF_VAR_skip_final_snapshot=true
                    break
                else
                    print_status "Returning to data preservation menu..."
                fi
                ;;
            3)
                print_status "Teardown cancelled by user"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please choose 1-3."
                ;;
        esac
    done
    
    # Handle S3 data
    echo ""
    print_warning "S3 buckets may contain uploaded files and application data."
    
    for bucket in "${PROJECT_NAME}-${ENVIRONMENT}-uploads" "${PROJECT_NAME}-${ENVIRONMENT}-eb-versions"; do
        if aws s3api head-bucket --bucket "$bucket" --region "$REGION" >/dev/null 2>&1; then
            local object_count=$(aws s3 ls "s3://$bucket" --recursive | wc -l)
            if [[ $object_count -gt 0 ]]; then
                print_warning "Bucket $bucket contains $object_count objects"
                
                while true; do
                    echo "What to do with bucket $bucket?"
                    echo "1. Download all files to local backup (RECOMMENDED)"
                    echo "2. Just delete the bucket and all contents"
                    echo "3. Skip this bucket (teardown will fail)"
                    
                    read -p "Choose option (1-3): " -r bucket_choice
                    case $bucket_choice in
                        1)
                            local backup_dir="/tmp/gamcapp_s3_backup_${ENVIRONMENT}_${TIMESTAMP}/${bucket}"
                            mkdir -p "$backup_dir"
                            print_status "Downloading $bucket contents to $backup_dir..."
                            if aws s3 sync "s3://$bucket" "$backup_dir" --region "$REGION"; then
                                print_success "✓ Successfully backed up $bucket"
                            else
                                print_error "Failed to backup $bucket"
                            fi
                            break
                            ;;
                        2)
                            print_warning "All data in $bucket will be permanently lost"
                            break
                            ;;
                        3)
                            print_warning "Skipping $bucket - you'll need to empty it manually"
                            break
                            ;;
                        *)
                            print_error "Invalid option. Please choose 1-3."
                            ;;
                    esac
                done
            fi
        fi
    done
}

# Function to show destruction plan
show_destruction_plan() {
    print_step "Generating destruction plan..."
    
    cd "$TERRAFORM_DIR"
    
    # Create destruction plan
    if terraform plan -destroy -var-file="environments/${ENVIRONMENT}/terraform.tfvars" -no-color > "destroy_plan_${ENVIRONMENT}_${TIMESTAMP}.txt" 2>&1; then
        print_success "Destruction plan generated"
        
        # Show summary
        echo ""
        print_status "Resources to be destroyed:"
        grep "# module\." "destroy_plan_${ENVIRONMENT}_${TIMESTAMP}.txt" | head -10
        
        local resource_count=$(grep -c "# module\." "destroy_plan_${ENVIRONMENT}_${TIMESTAMP}.txt" 2>/dev/null || echo "0")
        print_warning "Total resources to destroy: $resource_count"
        
    else
        print_error "Failed to generate destruction plan"
        cat "destroy_plan_${ENVIRONMENT}_${TIMESTAMP}.txt"
        exit 1
    fi
    
    cd - >/dev/null
}

# Function to confirm destruction
confirm_destruction() {
    # Check if running in CI/CD automated mode
    if [[ "$TEARDOWN_AUTOMATED" == "true" ]]; then
        print_status "🤖 CI/CD Automation Mode Detected"
        print_status "Verifying automated confirmation parameters..."
        
        # Verify environment variables are set for automation
        if [[ "$TEARDOWN_CONFIRM_ENV" == "$ENVIRONMENT" ]] && 
           [[ "$TEARDOWN_CONFIRM_PROJECT" == "$PROJECT_NAME" ]] &&
           [[ "$TEARDOWN_CONFIRM_DESTROY" == "DESTROY" ]]; then
            
            print_success "✅ CI/CD automation confirmation verified"
            print_status "Requested by: ${TEARDOWN_ACTOR:-Unknown}"
            print_status "Reason: ${TEARDOWN_REASON:-Not provided}"
            return 0
        else
            print_error "❌ CI/CD automation confirmation failed"
            print_error "Expected: env=$ENVIRONMENT, project=$PROJECT_NAME, destroy=DESTROY"
            print_error "Received: env=$TEARDOWN_CONFIRM_ENV, project=$TEARDOWN_CONFIRM_PROJECT, destroy=$TEARDOWN_CONFIRM_DESTROY"
            exit 1
        fi
    fi
    
    # Interactive mode confirmation
    print_danger "⚠️  FINAL CONFIRMATION REQUIRED ⚠️"
    echo ""
    print_danger "This will PERMANENTLY DELETE all infrastructure for: ${PROJECT_NAME}-${ENVIRONMENT}"
    print_danger "Including:"
    echo "  • RDS Database (with all data)"
    echo "  • S3 Buckets (with all uploaded files)"
    echo "  • ElasticBeanstalk Application"
    echo "  • VPC and all networking components"
    echo "  • IAM Roles and Policies"
    echo "  • CloudWatch Logs"
    echo "  • All other associated resources"
    echo ""
    print_danger "THIS ACTION CANNOT BE UNDONE!"
    echo ""
    
    # Three-stage confirmation
    print_step "Three-stage confirmation required:"
    
    echo ""
    echo "1. Type the environment name to confirm:"
    read -p "Environment ($ENVIRONMENT): " -r env_confirm
    if [[ "$env_confirm" != "$ENVIRONMENT" ]]; then
        print_error "Environment confirmation failed. Exiting."
        exit 1
    fi
    
    echo ""
    echo "2. Type the project name to confirm:"
    read -p "Project ($PROJECT_NAME): " -r project_confirm
    if [[ "$project_confirm" != "$PROJECT_NAME" ]]; then
        print_error "Project confirmation failed. Exiting."
        exit 1
    fi
    
    echo ""
    echo "3. Final confirmation - type 'DESTROY' in capital letters:"
    read -p "Confirmation: " -r final_confirm
    if [[ "$final_confirm" != "DESTROY" ]]; then
        print_error "Final confirmation failed. Exiting."
        exit 1
    fi
    
    print_warning "All confirmations received. Proceeding with destruction..."
}

# Function to execute destruction
execute_destruction() {
    print_step "Executing infrastructure destruction..."
    
    cd "$TERRAFORM_DIR"
    
    # Set timeout for destruction (30 minutes)
    local timeout_seconds=1800
    
    print_status "Starting terraform destroy with ${timeout_seconds}s timeout..."
    print_status "This may take 10-30 minutes depending on resources..."
    
    # Execute destruction with timeout
    if timeout $timeout_seconds terraform destroy \
        -var-file="environments/${ENVIRONMENT}/terraform.tfvars" \
        -auto-approve \
        -no-color > "destroy_log_${ENVIRONMENT}_${TIMESTAMP}.txt" 2>&1; then
        
        print_success "✅ Infrastructure destruction completed successfully!"
        
    else
        local exit_code=$?
        
        if [[ $exit_code -eq 124 ]]; then
            print_error "❌ Destruction timed out after ${timeout_seconds} seconds"
            print_status "Some resources may still be destroying. Check AWS Console."
        else
            print_error "❌ Destruction failed with exit code: $exit_code"
        fi
        
        print_status "Check destroy log: destroy_log_${ENVIRONMENT}_${TIMESTAMP}.txt"
        print_status "Last 20 lines of output:"
        tail -20 "destroy_log_${ENVIRONMENT}_${TIMESTAMP}.txt"
        
        exit $exit_code
    fi
    
    cd - >/dev/null
}

# Function to cleanup remaining resources
cleanup_remaining_resources() {
    print_step "Checking for remaining resources..."
    
    # Check for any remaining resources that might not be in Terraform state
    print_status "Scanning for orphaned resources..."
    
    # Check S3 buckets
    local remaining_buckets=$(aws s3api list-buckets --region "$REGION" --query "Buckets[?contains(Name, '${PROJECT_NAME}-${ENVIRONMENT}')].Name" --output text 2>/dev/null || echo "")
    if [[ -n "$remaining_buckets" ]]; then
        print_warning "Found remaining S3 buckets: $remaining_buckets"
        print_status "You may need to delete these manually from AWS Console"
    fi
    
    # Check IAM roles
    local remaining_roles=$(aws iam list-roles --query "Roles[?contains(RoleName, '${PROJECT_NAME}-${ENVIRONMENT}')].RoleName" --output text 2>/dev/null || echo "")
    if [[ -n "$remaining_roles" ]]; then
        print_warning "Found remaining IAM roles: $remaining_roles"
        print_status "These should be cleaned up automatically, but check AWS Console if needed"
    fi
    
    # Check ElasticBeanstalk applications
    local remaining_apps=$(aws elasticbeanstalk describe-applications --region "$REGION" --query "Applications[?contains(ApplicationName, '${PROJECT_NAME}-${ENVIRONMENT}')].ApplicationName" --output text 2>/dev/null || echo "")
    if [[ -n "$remaining_apps" ]]; then
        print_warning "Found remaining ElasticBeanstalk applications: $remaining_apps"
    fi
    
    print_success "Resource cleanup check completed"
}

# Function to show teardown summary
show_teardown_summary() {
    print_step "Teardown Summary"
    
    echo ""
    print_success "🎉 Infrastructure teardown completed for ${PROJECT_NAME}-${ENVIRONMENT}!"
    echo ""
    print_status "What was destroyed:"
    echo "  ✅ All Terraform-managed resources"
    echo "  ✅ RDS Database (with snapshot if requested)"
    echo "  ✅ S3 Buckets (with backup if requested)"
    echo "  ✅ ElasticBeanstalk Application"
    echo "  ✅ VPC and networking components"
    echo "  ✅ IAM Roles and Security Groups"
    echo "  ✅ CloudWatch resources"
    echo ""
    
    if [[ -f "/tmp/gamcapp_last_backup_${ENVIRONMENT}.txt" ]]; then
        local backup_path=$(cat "/tmp/gamcapp_last_backup_${ENVIRONMENT}.txt")
        print_status "📁 Backup location: $backup_path"
    fi
    
    echo ""
    print_status "📋 Log files created:"
    ls -la "$TERRAFORM_DIR"/*_${ENVIRONMENT}_${TIMESTAMP}.txt 2>/dev/null || echo "No log files found"
    
    echo ""
    print_warning "⚠️  Post-teardown checklist:"
    echo "  1. Verify all resources are deleted in AWS Console"
    echo "  2. Check for any unexpected charges"
    echo "  3. Remove backup files when no longer needed"
    echo "  4. Update DNS records if they pointed to this infrastructure"
    echo ""
    
    print_success "Teardown process completed successfully! 🚀"
}

# Function to show help
show_help() {
    echo "GAMCAPP Infrastructure Teardown Script"
    echo ""
    echo "Usage: $0 <environment> [options]"
    echo ""
    echo "Environments:"
    echo "  dev, development    - Development environment"
    echo "  staging, stage      - Staging environment"  
    echo "  prod, production    - Production environment"
    echo ""
    echo "Options:"
    echo "  --help              - Show this help message"
    echo "  --dry-run           - Show what would be destroyed (plan only)"
    echo "  --force             - Skip all confirmations (DANGEROUS)"
    echo "  --backup-only       - Only create backups, don't destroy"
    echo ""
    echo "Examples:"
    echo "  $0 dev                    # Interactive teardown of dev environment"
    echo "  $0 prod --dry-run         # Show what would be destroyed in prod"
    echo "  $0 staging --backup-only  # Only backup staging environment"
    echo ""
    echo "Safety Features:"
    echo "  • Multiple confirmation prompts"
    echo "  • Automatic data backup before destruction"
    echo "  • Comprehensive logging"
    echo "  • Resource validation"
    echo ""
}

# Main function
main() {
    local dry_run=false
    local force=false
    local backup_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help)
                show_help
                exit 0
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            --backup-only)
                backup_only=true
                shift
                ;;
            -*)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
            *)
                if [[ -z "$ENVIRONMENT" ]]; then
                    validate_environment "$1"
                else
                    print_error "Multiple environments specified"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Check if environment was provided
    if [[ -z "$ENVIRONMENT" ]]; then
        print_error "Environment not specified"
        show_help
        exit 1
    fi
    
    # Show banner
    show_banner
    
    # Check prerequisites
    check_prerequisites
    
    # Show current infrastructure
    show_current_infrastructure
    
    # Always create backup
    backup_critical_data
    
    # If backup-only mode, exit here
    if [[ "$backup_only" == true ]]; then
        print_success "Backup completed. Exiting without destruction."
        exit 0
    fi
    
    # Handle data preservation
    if [[ "$force" != true ]]; then
        handle_data_preservation
    fi
    
    # Show destruction plan
    show_destruction_plan
    
    # If dry-run mode, exit here
    if [[ "$dry_run" == true ]]; then
        print_success "Dry-run completed. No resources were destroyed."
        exit 0
    fi
    
    # Confirm destruction (unless forced)
    if [[ "$force" != true ]]; then
        confirm_destruction
    else
        print_warning "Force mode enabled - skipping confirmations"
    fi
    
    # Execute destruction
    execute_destruction
    
    # Cleanup remaining resources
    cleanup_remaining_resources
    
    # Show summary
    show_teardown_summary
}

# Handle script interruption
trap 'print_error "Script interrupted. Some resources may be partially destroyed."; exit 1' INT TERM

# Run main function with all arguments
main "$@"