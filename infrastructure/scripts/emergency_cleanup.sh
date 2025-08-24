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
DRY_RUN=false

# Function to show banner
show_banner() {
    echo ""
    echo -e "${RED}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                          ║${NC}"
    echo -e "${RED}║          🚨 EMERGENCY RESOURCE CLEANUP 🚨                ║${NC}"
    echo -e "${RED}║                                                          ║${NC}"
    echo -e "${RED}║     Use this when terraform destroy fails or            ║${NC}"
    echo -e "${RED}║     when you need to manually clean up resources        ║${NC}"
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
    
    # Check jq for JSON processing
    if ! command -v jq &> /dev/null; then
        print_warning "jq not found. Some features will be limited."
    fi
    
    print_success "Prerequisites validated"
}

# Function to find and delete ElasticBeanstalk resources
cleanup_elasticbeanstalk() {
    print_step "Cleaning up ElasticBeanstalk resources..."
    
    # Find applications
    local apps=$(aws elasticbeanstalk describe-applications \
        --region "$REGION" \
        --query "Applications[?contains(ApplicationName, '${PROJECT_NAME}-${ENVIRONMENT}')].ApplicationName" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$apps" ]]; then
        for app in $apps; do
            print_status "Found ElasticBeanstalk application: $app"
            
            # Find environments for this application
            local envs=$(aws elasticbeanstalk describe-environments \
                --region "$REGION" \
                --application-name "$app" \
                --query "Environments[?Status!='Terminated'].EnvironmentName" \
                --output text 2>/dev/null || echo "")
            
            if [[ -n "$envs" ]]; then
                for env in $envs; do
                    print_warning "Terminating ElasticBeanstalk environment: $env"
                    if [[ "$DRY_RUN" != true ]]; then
                        aws elasticbeanstalk terminate-environment \
                            --region "$REGION" \
                            --environment-name "$env" >/dev/null 2>&1 || true
                        print_success "✓ Initiated termination of $env"
                    else
                        print_status "[DRY RUN] Would terminate environment: $env"
                    fi
                done
                
                # Wait for environments to terminate before deleting application
                if [[ "$DRY_RUN" != true ]]; then
                    print_status "Waiting for environments to terminate (this may take several minutes)..."
                    sleep 30
                fi
            fi
            
            # Delete application
            print_warning "Deleting ElasticBeanstalk application: $app"
            if [[ "$DRY_RUN" != true ]]; then
                aws elasticbeanstalk delete-application \
                    --region "$REGION" \
                    --application-name "$app" \
                    --terminate-env-by-force >/dev/null 2>&1 || true
                print_success "✓ Deleted application $app"
            else
                print_status "[DRY RUN] Would delete application: $app"
            fi
        done
    else
        print_success "No ElasticBeanstalk applications found"
    fi
}

# Function to cleanup RDS resources
cleanup_rds() {
    print_step "Cleaning up RDS resources..."
    
    # Find DB instances
    local db_instances=$(aws rds describe-db-instances \
        --region "$REGION" \
        --query "DBInstances[?contains(DBInstanceIdentifier, '${PROJECT_NAME}-${ENVIRONMENT}')].DBInstanceIdentifier" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$db_instances" ]]; then
        for db in $db_instances; do
            print_warning "Deleting RDS instance: $db"
            if [[ "$DRY_RUN" != true ]]; then
                aws rds delete-db-instance \
                    --region "$REGION" \
                    --db-instance-identifier "$db" \
                    --skip-final-snapshot \
                    --delete-automated-backups >/dev/null 2>&1 || true
                print_success "✓ Initiated deletion of RDS instance $db"
            else
                print_status "[DRY RUN] Would delete RDS instance: $db"
            fi
        done
    else
        print_success "No RDS instances found"
    fi
    
    # Find DB subnet groups
    local subnet_groups=$(aws rds describe-db-subnet-groups \
        --region "$REGION" \
        --query "DBSubnetGroups[?contains(DBSubnetGroupName, '${PROJECT_NAME}-${ENVIRONMENT}')].DBSubnetGroupName" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$subnet_groups" ]]; then
        for sg in $subnet_groups; do
            print_warning "Deleting DB subnet group: $sg"
            if [[ "$DRY_RUN" != true ]]; then
                # Wait a bit for DB instances to start deleting
                sleep 10
                aws rds delete-db-subnet-group \
                    --region "$REGION" \
                    --db-subnet-group-name "$sg" >/dev/null 2>&1 || true
                print_success "✓ Deleted DB subnet group $sg"
            else
                print_status "[DRY RUN] Would delete DB subnet group: $sg"
            fi
        done
    fi
    
    # Find DB parameter groups
    local param_groups=$(aws rds describe-db-parameter-groups \
        --region "$REGION" \
        --query "DBParameterGroups[?contains(DBParameterGroupName, '${PROJECT_NAME}-${ENVIRONMENT}')].DBParameterGroupName" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$param_groups" ]]; then
        for pg in $param_groups; do
            print_warning "Deleting DB parameter group: $pg"
            if [[ "$DRY_RUN" != true ]]; then
                aws rds delete-db-parameter-group \
                    --region "$REGION" \
                    --db-parameter-group-name "$pg" >/dev/null 2>&1 || true
                print_success "✓ Deleted DB parameter group $pg"
            else
                print_status "[DRY RUN] Would delete DB parameter group: $pg"
            fi
        done
    fi
}

# Function to cleanup S3 buckets
cleanup_s3() {
    print_step "Cleaning up S3 resources..."
    
    # Find S3 buckets
    local buckets=$(aws s3api list-buckets \
        --region "$REGION" \
        --query "Buckets[?contains(Name, '${PROJECT_NAME}-${ENVIRONMENT}')].Name" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$buckets" ]]; then
        for bucket in $buckets; do
            print_warning "Processing S3 bucket: $bucket"
            
            # Check if bucket has versioning enabled
            local versioning=$(aws s3api get-bucket-versioning \
                --bucket "$bucket" \
                --query "Status" \
                --output text 2>/dev/null || echo "")
            
            if [[ "$versioning" == "Enabled" ]]; then
                print_status "Bucket has versioning enabled, removing all versions..."
                if [[ "$DRY_RUN" != true ]]; then
                    # Delete all versions
                    aws s3api delete-objects \
                        --bucket "$bucket" \
                        --delete "$(aws s3api list-object-versions \
                            --bucket "$bucket" \
                            --query '{Objects: Versions[].{Key: Key, VersionId: VersionId}}' \
                            --max-items 1000)" >/dev/null 2>&1 || true
                    
                    # Delete delete markers
                    aws s3api delete-objects \
                        --bucket "$bucket" \
                        --delete "$(aws s3api list-object-versions \
                            --bucket "$bucket" \
                            --query '{Objects: DeleteMarkers[].{Key: Key, VersionId: VersionId}}' \
                            --max-items 1000)" >/dev/null 2>&1 || true
                fi
            fi
            
            # Delete all objects
            if [[ "$DRY_RUN" != true ]]; then
                aws s3 rm "s3://$bucket" --recursive >/dev/null 2>&1 || true
                print_status "✓ Emptied bucket $bucket"
                
                # Delete bucket
                aws s3api delete-bucket \
                    --bucket "$bucket" \
                    --region "$REGION" >/dev/null 2>&1 || true
                print_success "✓ Deleted bucket $bucket"
            else
                print_status "[DRY RUN] Would empty and delete bucket: $bucket"
            fi
        done
    else
        print_success "No S3 buckets found"
    fi
}

# Function to cleanup IAM resources
cleanup_iam() {
    print_step "Cleaning up IAM resources..."
    
    # Find IAM roles
    local roles=$(aws iam list-roles \
        --query "Roles[?contains(RoleName, '${PROJECT_NAME}-${ENVIRONMENT}')].RoleName" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$roles" ]]; then
        for role in $roles; do
            print_warning "Processing IAM role: $role"
            
            if [[ "$DRY_RUN" != true ]]; then
                # Detach all managed policies
                local policies=$(aws iam list-attached-role-policies \
                    --role-name "$role" \
                    --query "AttachedPolicies[].PolicyArn" \
                    --output text 2>/dev/null || echo "")
                
                for policy in $policies; do
                    aws iam detach-role-policy \
                        --role-name "$role" \
                        --policy-arn "$policy" >/dev/null 2>&1 || true
                    print_status "✓ Detached policy $policy from $role"
                done
                
                # Delete inline policies
                local inline_policies=$(aws iam list-role-policies \
                    --role-name "$role" \
                    --query "PolicyNames" \
                    --output text 2>/dev/null || echo "")
                
                for policy in $inline_policies; do
                    aws iam delete-role-policy \
                        --role-name "$role" \
                        --policy-name "$policy" >/dev/null 2>&1 || true
                    print_status "✓ Deleted inline policy $policy from $role"
                done
                
                # Delete instance profiles
                local instance_profiles=$(aws iam list-instance-profiles-for-role \
                    --role-name "$role" \
                    --query "InstanceProfiles[].InstanceProfileName" \
                    --output text 2>/dev/null || echo "")
                
                for profile in $instance_profiles; do
                    aws iam remove-role-from-instance-profile \
                        --instance-profile-name "$profile" \
                        --role-name "$role" >/dev/null 2>&1 || true
                    aws iam delete-instance-profile \
                        --instance-profile-name "$profile" >/dev/null 2>&1 || true
                    print_status "✓ Deleted instance profile $profile"
                done
                
                # Delete the role
                aws iam delete-role --role-name "$role" >/dev/null 2>&1 || true
                print_success "✓ Deleted IAM role $role"
            else
                print_status "[DRY RUN] Would delete IAM role: $role"
            fi
        done
    else
        print_success "No IAM roles found"
    fi
}

# Function to cleanup VPC resources
cleanup_vpc() {
    print_step "Cleaning up VPC resources..."
    
    # Find VPCs
    local vpcs=$(aws ec2 describe-vpcs \
        --region "$REGION" \
        --filters "Name=tag:Name,Values=*${PROJECT_NAME}-${ENVIRONMENT}*" \
        --query "Vpcs[].VpcId" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$vpcs" ]]; then
        for vpc in $vpcs; do
            print_warning "Processing VPC: $vpc"
            
            if [[ "$DRY_RUN" != true ]]; then
                # Delete NAT gateways first
                local nat_gateways=$(aws ec2 describe-nat-gateways \
                    --region "$REGION" \
                    --filter "Name=vpc-id,Values=$vpc" \
                    --query "NatGateways[?State=='available'].NatGatewayId" \
                    --output text 2>/dev/null || echo "")
                
                for nat in $nat_gateways; do
                    aws ec2 delete-nat-gateway \
                        --region "$REGION" \
                        --nat-gateway-id "$nat" >/dev/null 2>&1 || true
                    print_status "✓ Deleted NAT gateway $nat"
                done
                
                # Wait for NAT gateways to delete
                if [[ -n "$nat_gateways" ]]; then
                    print_status "Waiting for NAT gateways to delete..."
                    sleep 30
                fi
                
                # Delete internet gateway
                local igws=$(aws ec2 describe-internet-gateways \
                    --region "$REGION" \
                    --filters "Name=attachment.vpc-id,Values=$vpc" \
                    --query "InternetGateways[].InternetGatewayId" \
                    --output text 2>/dev/null || echo "")
                
                for igw in $igws; do
                    aws ec2 detach-internet-gateway \
                        --region "$REGION" \
                        --internet-gateway-id "$igw" \
                        --vpc-id "$vpc" >/dev/null 2>&1 || true
                    aws ec2 delete-internet-gateway \
                        --region "$REGION" \
                        --internet-gateway-id "$igw" >/dev/null 2>&1 || true
                    print_status "✓ Deleted internet gateway $igw"
                done
                
                # Delete subnets
                local subnets=$(aws ec2 describe-subnets \
                    --region "$REGION" \
                    --filters "Name=vpc-id,Values=$vpc" \
                    --query "Subnets[].SubnetId" \
                    --output text 2>/dev/null || echo "")
                
                for subnet in $subnets; do
                    aws ec2 delete-subnet \
                        --region "$REGION" \
                        --subnet-id "$subnet" >/dev/null 2>&1 || true
                    print_status "✓ Deleted subnet $subnet"
                done
                
                # Delete security groups (except default)
                local sgs=$(aws ec2 describe-security-groups \
                    --region "$REGION" \
                    --filters "Name=vpc-id,Values=$vpc" \
                    --query "SecurityGroups[?GroupName!='default'].GroupId" \
                    --output text 2>/dev/null || echo "")
                
                for sg in $sgs; do
                    aws ec2 delete-security-group \
                        --region "$REGION" \
                        --group-id "$sg" >/dev/null 2>&1 || true
                    print_status "✓ Deleted security group $sg"
                done
                
                # Delete VPC
                aws ec2 delete-vpc \
                    --region "$REGION" \
                    --vpc-id "$vpc" >/dev/null 2>&1 || true
                print_success "✓ Deleted VPC $vpc"
            else
                print_status "[DRY RUN] Would delete VPC: $vpc and all associated resources"
            fi
        done
    else
        print_success "No VPCs found"
    fi
}

# Function to cleanup CloudWatch resources
cleanup_cloudwatch() {
    print_step "Cleaning up CloudWatch resources..."
    
    # Find log groups
    local log_groups=$(aws logs describe-log-groups \
        --region "$REGION" \
        --query "logGroups[?contains(logGroupName, '${PROJECT_NAME}') || contains(logGroupName, '${ENVIRONMENT}')].logGroupName" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$log_groups" ]]; then
        for lg in $log_groups; do
            print_warning "Deleting CloudWatch log group: $lg"
            if [[ "$DRY_RUN" != true ]]; then
                aws logs delete-log-group \
                    --region "$REGION" \
                    --log-group-name "$lg" >/dev/null 2>&1 || true
                print_success "✓ Deleted log group $lg"
            else
                print_status "[DRY RUN] Would delete log group: $lg"
            fi
        done
    else
        print_success "No CloudWatch log groups found"
    fi
}

# Function to cleanup Secrets Manager
cleanup_secrets() {
    print_step "Cleaning up Secrets Manager resources..."
    
    # Find secrets
    local secrets=$(aws secretsmanager list-secrets \
        --region "$REGION" \
        --query "SecretList[?contains(Name, '${PROJECT_NAME}-${ENVIRONMENT}')].Name" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$secrets" ]]; then
        for secret in $secrets; do
            print_warning "Deleting secret: $secret"
            if [[ "$DRY_RUN" != true ]]; then
                aws secretsmanager delete-secret \
                    --region "$REGION" \
                    --secret-id "$secret" \
                    --force-delete-without-recovery >/dev/null 2>&1 || true
                print_success "✓ Deleted secret $secret"
            else
                print_status "[DRY RUN] Would delete secret: $secret"
            fi
        done
    else
        print_success "No secrets found"
    fi
}

# Function to cleanup Elastic IPs
cleanup_eips() {
    print_step "Cleaning up unattached Elastic IPs..."
    
    # Find unattached EIPs
    local eips=$(aws ec2 describe-addresses \
        --region "$REGION" \
        --query "Addresses[?AssociationId==null].AllocationId" \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$eips" ]]; then
        for eip in $eips; do
            # Check if EIP might belong to our project (by tags or naming)
            local tags=$(aws ec2 describe-addresses \
                --region "$REGION" \
                --allocation-ids "$eip" \
                --query "Addresses[0].Tags[?Key=='Name'].Value" \
                --output text 2>/dev/null || echo "")
            
            if [[ "$tags" == *"$PROJECT_NAME"* ]] || [[ "$tags" == *"$ENVIRONMENT"* ]]; then
                print_warning "Releasing Elastic IP: $eip (tagged with project/environment)"
                if [[ "$DRY_RUN" != true ]]; then
                    aws ec2 release-address \
                        --region "$REGION" \
                        --allocation-id "$eip" >/dev/null 2>&1 || true
                    print_success "✓ Released EIP $eip"
                else
                    print_status "[DRY RUN] Would release EIP: $eip"
                fi
            else
                print_status "Skipping EIP $eip (no project tags found)"
            fi
        done
    else
        print_success "No unattached Elastic IPs found"
    fi
}

# Function to show summary
show_cleanup_summary() {
    print_step "Emergency Cleanup Summary"
    
    echo ""
    if [[ "$DRY_RUN" == true ]]; then
        print_success "🔍 DRY RUN completed for ${PROJECT_NAME}-${ENVIRONMENT}!"
        print_status "No resources were actually deleted."
    else
        print_success "🧹 Emergency cleanup completed for ${PROJECT_NAME}-${ENVIRONMENT}!"
        print_status "Resources have been forcefully deleted."
    fi
    
    echo ""
    print_warning "⚠️  Important notes:"
    echo "  • This script uses AWS CLI directly, bypassing Terraform"
    echo "  • Your Terraform state may now be out of sync"
    echo "  • Some resources may take time to fully delete"
    echo "  • Check AWS Console to verify all resources are gone"
    echo "  • You may need to run 'terraform state rm' for remaining state entries"
    echo ""
    
    print_status "Recommended next steps:"
    echo "  1. Check AWS Console for any remaining resources"
    echo "  2. Clean up Terraform state if needed"
    echo "  3. Verify no unexpected charges on AWS billing"
    echo ""
}

# Function to show help
show_help() {
    echo "GAMCAPP Emergency Resource Cleanup Script"
    echo ""
    echo "This script forcefully deletes AWS resources using AWS CLI when"
    echo "terraform destroy fails or when you need manual cleanup."
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
    echo "  --dry-run           - Show what would be deleted (no actual deletion)"
    echo ""
    echo "Examples:"
    echo "  $0 dev --dry-run     # Show what would be deleted in dev"
    echo "  $0 prod              # Emergency cleanup of prod environment"
    echo ""
    echo "⚠️  WARNING: This script is destructive and bypasses Terraform!"
    echo "   Only use when terraform destroy fails or in emergencies."
    echo ""
}

# Main function
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help)
                show_help
                exit 0
                ;;
            --dry-run)
                DRY_RUN=true
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
    
    # Confirm operation unless dry run
    if [[ "$DRY_RUN" != true ]]; then
        echo ""
        print_danger "⚠️  EMERGENCY CLEANUP CONFIRMATION ⚠️"
        print_danger "This will forcefully delete ALL AWS resources for: ${PROJECT_NAME}-${ENVIRONMENT}"
        print_danger "This operation bypasses Terraform and cannot be undone!"
        echo ""
        read -p "Type 'EMERGENCY' to confirm: " -r confirm
        if [[ "$confirm" != "EMERGENCY" ]]; then
            print_error "Confirmation failed. Exiting."
            exit 1
        fi
        print_warning "Emergency cleanup confirmed. Proceeding..."
    else
        print_status "Running in DRY RUN mode - no resources will be deleted"
    fi
    
    echo ""
    print_step "Starting emergency cleanup for ${PROJECT_NAME}-${ENVIRONMENT}..."
    
    # Run cleanup functions in order (least dependent to most dependent)
    cleanup_secrets
    cleanup_cloudwatch
    cleanup_elasticbeanstalk
    cleanup_rds
    cleanup_s3
    cleanup_eips
    cleanup_iam
    cleanup_vpc
    
    # Show summary
    show_cleanup_summary
}

# Handle script interruption
trap 'print_error "Script interrupted. Some resources may be partially deleted."; exit 1' INT TERM

# Run main function with all arguments
main "$@"