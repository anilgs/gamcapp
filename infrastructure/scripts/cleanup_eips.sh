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

print_status "EIP (Elastic IP) Cleanup Script for gamcapp-prod"
print_status "This script will help you identify and release unused Elastic IP addresses"

# Set AWS region
REGION="ap-south-1"
print_status "Using AWS region: $REGION"

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed or not in PATH"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    print_error "AWS credentials not configured or invalid"
    print_status "Please run 'aws configure' or set AWS environment variables"
    exit 1
fi

print_success "AWS credentials verified"

# Function to describe all EIPs
describe_eips() {
    print_status "Listing all Elastic IP addresses in region $REGION..."
    
    EIP_OUTPUT=$(aws ec2 describe-addresses --region "$REGION" --output table 2>/dev/null || echo "ERROR")
    
    if [[ "$EIP_OUTPUT" == "ERROR" ]]; then
        print_error "Failed to retrieve Elastic IP addresses"
        return 1
    fi
    
    echo "$EIP_OUTPUT"
    
    # Get JSON output for processing
    EIP_JSON=$(aws ec2 describe-addresses --region "$REGION" --output json 2>/dev/null)
    
    if [[ -z "$EIP_JSON" ]] || [[ "$EIP_JSON" == "null" ]]; then
        print_status "No Elastic IP addresses found in region $REGION"
        return 0
    fi
    
    # Count total EIPs
    TOTAL_EIPS=$(echo "$EIP_JSON" | jq '.Addresses | length' 2>/dev/null || echo "0")
    
    # Count unused EIPs (not associated with instances)
    UNUSED_EIPS=$(echo "$EIP_JSON" | jq '.Addresses | map(select(.AssociationId == null)) | length' 2>/dev/null || echo "0")
    
    print_status "Total EIPs in account: $TOTAL_EIPS"
    print_warning "Unused EIPs (not associated): $UNUSED_EIPS"
    
    if [[ "$UNUSED_EIPS" -gt 0 ]]; then
        echo ""
        print_warning "Unused Elastic IP addresses:"
        echo "$EIP_JSON" | jq -r '.Addresses[] | select(.AssociationId == null) | "AllocationId: \(.AllocationId), PublicIP: \(.PublicIp), Domain: \(.Domain)"' 2>/dev/null || echo "Error parsing unused EIPs"
    fi
    
    return 0
}

# Function to release specific EIP
release_eip() {
    local allocation_id=$1
    
    print_status "Attempting to release EIP with AllocationId: $allocation_id"
    
    if aws ec2 release-address --region "$REGION" --allocation-id "$allocation_id" 2>/dev/null; then
        print_success "Successfully released EIP: $allocation_id"
        return 0
    else
        print_error "Failed to release EIP: $allocation_id"
        return 1
    fi
}

# Function to release all unused EIPs
release_unused_eips() {
    print_warning "This will release ALL unused Elastic IP addresses in region $REGION"
    print_warning "This action cannot be undone!"
    
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_status "Operation cancelled"
        return 0
    fi
    
    # Get unused EIPs
    UNUSED_EIP_IDS=$(aws ec2 describe-addresses --region "$REGION" --output json | jq -r '.Addresses[] | select(.AssociationId == null) | .AllocationId' 2>/dev/null)
    
    if [[ -z "$UNUSED_EIP_IDS" ]]; then
        print_status "No unused EIPs found to release"
        return 0
    fi
    
    # Release each unused EIP
    while IFS= read -r allocation_id; do
        if [[ -n "$allocation_id" ]]; then
            release_eip "$allocation_id"
            sleep 1  # Brief pause between releases
        fi
    done <<< "$UNUSED_EIP_IDS"
    
    print_success "Finished releasing unused EIPs"
}

# Function to check EIP limits
check_eip_limits() {
    print_status "Checking EIP limits and usage..."
    
    # Get current EIP count
    CURRENT_EIPS=$(aws ec2 describe-addresses --region "$REGION" --output json | jq '.Addresses | length' 2>/dev/null || echo "0")
    
    print_status "Current EIPs in use: $CURRENT_EIPS"
    print_status "Default AWS EIP limit per region: 5"
    
    if [[ "$CURRENT_EIPS" -ge 5 ]]; then
        print_warning "You are at or near the default EIP limit!"
        print_status "Consider releasing unused EIPs or requesting a limit increase from AWS Support"
    else
        REMAINING=$((5 - CURRENT_EIPS))
        print_success "You have $REMAINING EIPs remaining before hitting the default limit"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "=== EIP Management Options ==="
    echo "1. List all Elastic IP addresses"
    echo "2. Check EIP limits and usage"
    echo "3. Release specific EIP by AllocationId"
    echo "4. Release ALL unused EIPs (DANGEROUS)"
    echo "5. Exit"
    echo ""
}

# Main script logic
main() {
    print_status "Starting EIP management..."
    
    # First, show current status
    describe_eips
    check_eip_limits
    
    while true; do
        show_menu
        read -p "Choose an option (1-5): " -r choice
        
        case $choice in
            1)
                describe_eips
                ;;
            2)
                check_eip_limits
                ;;
            3)
                read -p "Enter AllocationId to release: " -r allocation_id
                if [[ -n "$allocation_id" ]]; then
                    release_eip "$allocation_id"
                else
                    print_error "AllocationId cannot be empty"
                fi
                ;;
            4)
                release_unused_eips
                ;;
            5)
                print_status "Exiting EIP management script"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please choose 1-5."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..." -r
    done
}

# Check for command line arguments
if [[ $# -gt 0 ]]; then
    case "$1" in
        --list)
            describe_eips
            exit 0
            ;;
        --check)
            check_eip_limits
            exit 0
            ;;
        --release-unused)
            release_unused_eips
            exit 0
            ;;
        --help)
            echo "Usage: $0 [--list|--check|--release-unused|--help]"
            echo "  --list            List all EIPs"
            echo "  --check           Check EIP limits"
            echo "  --release-unused  Release all unused EIPs (interactive)"
            echo "  --help            Show this help"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for available options"
            exit 1
            ;;
    esac
fi

# Run interactive menu if no arguments provided
main