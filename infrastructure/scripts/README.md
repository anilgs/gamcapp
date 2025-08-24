# GAMCAPP Infrastructure Scripts

This directory contains automated scripts for managing GAMCAPP AWS infrastructure. All scripts include comprehensive error handling, logging, and safety features.

## 📁 Script Overview

| Script | Purpose | Safety Level | Use Case |
|--------|---------|--------------|----------|
| `build.sh` | Build application for deployment | ✅ Safe | Normal deployment |
| `deploy.sh` | Deploy infrastructure to AWS | ✅ Safe | Normal deployment |
| `import_resources.sh` | Import existing AWS resources | ✅ Safe | Fix "already exists" errors |
| `cleanup_eips.sh` | Manage Elastic IP addresses | ⚠️ Moderate | Fix EIP limit errors |
| `verify_state.sh` | Verify Terraform state sync | ✅ Safe | Troubleshooting |
| `teardown.sh` | Safe infrastructure destruction | ⚠️ Destructive | End-of-life cleanup |
| `emergency_cleanup.sh` | Force cleanup via AWS CLI | 🚨 Dangerous | Last resort cleanup |

## 🚀 Deployment Scripts

### `build.sh`
**Purpose**: Build and package the application for deployment
```bash
./scripts/build.sh
```
- Installs Node.js dependencies
- Runs TypeScript compilation
- Creates deployment package
- Validates build output

### `deploy.sh`
**Purpose**: Deploy infrastructure to specified environment
```bash
./scripts/deploy.sh <environment> <git_sha>

# Examples
./scripts/deploy.sh dev abc123
./scripts/deploy.sh prod def456
```
- Validates environment configuration
- Runs Terraform apply
- Deploys to ElasticBeanstalk
- Performs health checks

## 🔧 Troubleshooting Scripts

### `import_resources.sh`
**Purpose**: Import existing AWS resources into Terraform state
```bash
./scripts/import_resources.sh
```
**When to use**: "Resource already exists" errors
**Safety**: Safe (only imports, doesn't modify resources)

### `cleanup_eips.sh`
**Purpose**: Manage Elastic IP addresses and resolve limits
```bash
./scripts/cleanup_eips.sh [--list|--check|--release-unused]

# Interactive mode
./scripts/cleanup_eips.sh

# Command line usage
./scripts/cleanup_eips.sh --list
./scripts/cleanup_eips.sh --release-unused
```
**When to use**: EIP limit exceeded errors
**Safety**: Moderate (can release unused EIPs)

### `verify_state.sh`
**Purpose**: Comprehensive Terraform state and AWS resource verification
```bash
./scripts/verify_state.sh [--state-only|--plan-only|--aws-only]

# Full verification
./scripts/verify_state.sh

# Check only specific aspects
./scripts/verify_state.sh --state-only
./scripts/verify_state.sh --plan-only
```
**When to use**: Diagnosing deployment issues
**Safety**: Safe (read-only operations)

## 🔥 Destruction Scripts

### `teardown.sh` (Recommended for teardown)
**Purpose**: Safe, comprehensive infrastructure destruction
```bash
./scripts/teardown.sh <environment> [--dry-run|--force|--backup-only]

# Safe interactive teardown
./scripts/teardown.sh prod

# Preview what would be destroyed
./scripts/teardown.sh dev --dry-run

# Create backups without destroying
./scripts/teardown.sh staging --backup-only
```
**Features**:
- Three-stage confirmation process
- Automatic data backups
- RDS snapshot options
- S3 data preservation
- Comprehensive logging

**Safety**: Destructive but with extensive safety measures

### `emergency_cleanup.sh` (Last resort)
**Purpose**: Force cleanup when Terraform destroy fails
```bash
./scripts/emergency_cleanup.sh <environment> [--dry-run]

# Preview emergency cleanup
./scripts/emergency_cleanup.sh prod --dry-run

# Force cleanup (bypasses Terraform)
./scripts/emergency_cleanup.sh prod
```
**When to use**:
- Terraform destroy fails or hangs
- Resources stuck in deleting state
- Terraform state corruption
- Manual cleanup needed

**Safety**: Dangerous (bypasses Terraform, may leave state inconsistent)

## 🛡️ Safety Features

All scripts include:
- **Colored output** for easy reading
- **Error handling** with clear messages
- **Logging** to files for troubleshooting
- **Confirmation prompts** for destructive operations
- **Dry-run modes** where applicable
- **Progress tracking** for long operations
- **Rollback guidance** when things go wrong

## 📋 Common Workflows

### Initial Deployment
```bash
./scripts/build.sh
./scripts/deploy.sh dev $(git rev-parse HEAD)
./scripts/verify_state.sh
```

### Fix "Already Exists" Errors
```bash
./scripts/import_resources.sh
./scripts/verify_state.sh
terraform apply -var-file="environments/prod/terraform.tfvars"
```

### Fix EIP Limit Issues
```bash
./scripts/cleanup_eips.sh --list
./scripts/cleanup_eips.sh --release-unused
terraform apply -var-file="environments/prod/terraform.tfvars"
```

### Safe Infrastructure Teardown
```bash
./scripts/teardown.sh prod --dry-run  # Preview
./scripts/teardown.sh prod            # Execute
```

### Emergency Cleanup (Last Resort)
```bash
./scripts/emergency_cleanup.sh prod --dry-run  # Preview
./scripts/emergency_cleanup.sh prod            # Execute
terraform state list  # Check remaining state
terraform state rm <stale_resources>  # Clean up state
```

## 📝 Script Requirements

### Prerequisites
- **Terraform** >= 1.0
- **AWS CLI** >= 2.0 with configured credentials
- **Node.js** >= 18 (for build scripts)
- **jq** (optional, for enhanced JSON processing)
- **Bash** >= 4.0

### AWS Permissions
Scripts require comprehensive AWS permissions including:
- Full access to: S3, RDS, ElasticBeanstalk, VPC, IAM, CloudWatch
- Administrative permissions for resource creation/deletion
- See [IMPORT_GUIDE.md](../IMPORT_GUIDE.md) for detailed permission requirements

### Environment Variables
- `AWS_DEFAULT_REGION` or configured via `aws configure`
- `TF_VAR_*` variables for Terraform (set in CI/CD or environment files)

## 🔍 Troubleshooting

### Script Fails to Run
1. Check file permissions: `chmod +x scripts/*.sh`
2. Verify prerequisites are installed
3. Check AWS credentials: `aws sts get-caller-identity`

### Script Hangs or Times Out
1. Check AWS service status
2. Verify network connectivity
3. Look for resource dependencies causing delays

### Unexpected Behavior
1. Check script log files (created in infrastructure directory)
2. Run with increased verbosity if available
3. Use dry-run mode to preview actions

## 📞 Getting Help

1. **Check log files**: All scripts create detailed logs
2. **Use dry-run modes**: Preview actions before executing
3. **Read documentation**: See [IMPORT_GUIDE.md](../IMPORT_GUIDE.md) and [TEARDOWN_GUIDE.md](../TEARDOWN_GUIDE.md)
4. **Verify AWS permissions**: Ensure proper IAM roles and policies

## ⚠️ Important Notes

- **Always backup critical data** before running destructive operations
- **Use dry-run modes** to preview changes
- **Read script output carefully** - all scripts provide detailed status information
- **Keep logs** - all operations are logged for troubleshooting
- **Verify results** - check AWS Console after script completion

---

**Remember**: These scripts are designed to be safe and comprehensive, but infrastructure management always carries risks. Always review what actions will be taken before proceeding with destructive operations.