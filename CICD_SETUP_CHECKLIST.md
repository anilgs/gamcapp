# CI/CD Teardown Setup Checklist

This checklist helps you implement the CI/CD teardown integration for GAMCAPP step by step.

## ✅ Pre-Implementation Checklist

### 1. Repository Access
- [ ] Admin access to GitHub repository
- [ ] AWS permissions for IAM role creation/modification
- [ ] Access to repository secrets management

### 2. AWS Configuration  
- [ ] ElasticBeanstalkAdmin IAM role exists
- [ ] OIDC provider configured for GitHub Actions
- [ ] Comprehensive permissions attached to IAM role
- [ ] AWS region set to ap-south-1

### 3. Environment Secrets
- [ ] `DEV_DB_PASSWORD` secret configured
- [ ] `STAGING_DB_PASSWORD` secret configured
- [ ] `PROD_DB_PASSWORD` secret configured
- [ ] `SLACK_WEBHOOK_URL` secret (optional)
- [ ] `TEAMS_WEBHOOK_URL` secret (optional)

## 🚀 Implementation Steps

### Step 1: Deploy Workflow Files
- [ ] Commit `.github/workflows/teardown.yml`
- [ ] Commit `.github/workflows/maintenance.yml`
- [ ] Push changes to main branch
- [ ] Verify workflows appear in GitHub Actions tab

### Step 2: Configure Environment Protection
Navigate to: Repository Settings → Environments

#### Development Environment
- [ ] Create "development" environment
- [ ] Set protection rules: None (immediate execution)
- [ ] Test teardown workflow with dev environment

#### Staging Environment
- [ ] Create "staging" environment  
- [ ] Set required reviewers: 1 team member
- [ ] Set wait timer: 5 minutes
- [ ] Restrict to protected branches only

#### Production Environment
- [ ] Create "production" environment
- [ ] Set required reviewers: 2+ senior team members
- [ ] Set wait timer: 30 minutes
- [ ] Restrict to protected branches only
- [ ] Enable deployment protection rules

### Step 3: Test Workflows

#### Manual Dispatch Test (Dev)
- [ ] Go to Actions → Infrastructure Teardown
- [ ] Click "Run workflow"
- [ ] Select dev environment
- [ ] Fill in all required fields
- [ ] Verify execution completes successfully
- [ ] Check artifacts are uploaded

#### Manual Dispatch Test (Staging) 
- [ ] Trigger staging teardown workflow
- [ ] Verify approval process works
- [ ] Check wait timer functionality
- [ ] Confirm reviewer notifications

#### Maintenance Workflow Test
- [ ] Trigger maintenance workflow manually
- [ ] Test different cleanup types
- [ ] Verify automatic triggering after deployments

### Step 4: Notification Setup (Optional)

#### Slack Integration
- [ ] Create Slack app and webhook
- [ ] Add `SLACK_WEBHOOK_URL` secret
- [ ] Test notification by running teardown
- [ ] Customize notification format if needed

#### Teams Integration  
- [ ] Create Teams webhook
- [ ] Add `TEAMS_WEBHOOK_URL` secret
- [ ] Test notification functionality
- [ ] Adjust message formatting

### Step 5: Documentation Updates
- [ ] Update team documentation with new procedures
- [ ] Train team members on workflow usage
- [ ] Create emergency contact procedures
- [ ] Document approval process for production

## 🛡️ Safety Verification

### Validation Tests
- [ ] Confirm environment mismatch prevention works
- [ ] Verify production requires backups
- [ ] Test timeout functionality (30-minute limit)
- [ ] Validate artifact creation and retention
- [ ] Check emergency cleanup dry-run mode

### Permission Tests
- [ ] Verify dev environment has no protection
- [ ] Test staging approval requirements
- [ ] Confirm production multi-approval process
- [ ] Check branch restrictions work properly

### Backup Tests
- [ ] Verify RDS snapshot creation options
- [ ] Test S3 data download functionality
- [ ] Check Terraform state backup
- [ ] Validate artifact download from GitHub

## 📋 Post-Implementation Checklist

### Team Training
- [ ] Document new teardown procedures
- [ ] Train team on GitHub Actions workflows
- [ ] Establish approval process for production teardowns
- [ ] Create emergency procedures documentation

### Monitoring Setup
- [ ] Configure workflow failure notifications
- [ ] Set up billing alerts for unexpected AWS charges
- [ ] Create monitoring for stuck resources
- [ ] Establish regular maintenance schedules

### Backup Strategy
- [ ] Document artifact retention policy (30 days default)
- [ ] Create external backup procedures if needed
- [ ] Establish data recovery processes
- [ ] Test backup restoration procedures

## 🚨 Testing Scenarios

Before going live with production teardowns, test these scenarios:

### Positive Tests
- [ ] Successful dev teardown with backups
- [ ] Successful staging teardown with approval
- [ ] Maintenance workflow after deployment
- [ ] Emergency cleanup dry-run

### Negative Tests
- [ ] Reject mismatched environment confirmation
- [ ] Block production teardown without backups
- [ ] Handle timeout gracefully (simulate long-running destroy)
- [ ] Test emergency cleanup when terraform fails

### Edge Cases
- [ ] Workflow cancellation mid-execution
- [ ] Multiple concurrent teardown attempts
- [ ] Workflow runs with missing secrets
- [ ] Network connectivity issues during execution

## 📞 Support Resources

### Documentation
- **CI/CD Guide**: [CI_CD_TEARDOWN_GUIDE.md](./CI_CD_TEARDOWN_GUIDE.md)
- **Local Teardown**: [TEARDOWN_GUIDE.md](./TEARDOWN_GUIDE.md)
- **Script Reference**: [infrastructure/scripts/README.md](./infrastructure/scripts/README.md)

### Emergency Contacts
- [ ] Define primary on-call contact
- [ ] Establish backup contact procedures
- [ ] Document AWS support escalation process
- [ ] Create Slack/Teams emergency channels

### Recovery Procedures
- [ ] Document manual cleanup procedures
- [ ] Create infrastructure rebuild guides
- [ ] Establish data recovery protocols
- [ ] Test disaster recovery scenarios

## ✅ Go-Live Checklist

### Final Verification
- [ ] All tests completed successfully
- [ ] Team trained on new procedures
- [ ] Emergency procedures documented
- [ ] Monitoring and alerting configured

### Production Readiness
- [ ] Production environment protection fully configured
- [ ] Required reviewers identified and notified
- [ ] Backup and recovery procedures tested
- [ ] Communication plan for production teardowns

### Ongoing Maintenance
- [ ] Schedule regular workflow testing
- [ ] Plan quarterly review of procedures
- [ ] Monitor artifact storage usage
- [ ] Review and update permissions regularly

---

## 🎉 Implementation Complete!

Once all checklist items are completed, your CI/CD teardown integration is ready for production use with comprehensive safety measures and automation features.

**Remember**: Always test thoroughly in development environments before using on production infrastructure!