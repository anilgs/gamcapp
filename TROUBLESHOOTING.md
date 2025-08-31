# Deployment Troubleshooting Guide

## Current Issue: API Health Check Failures

### Symptoms
- ❌ API health check failed
- ❌ Direct backend failed  
- ❌ Frontend routing test failed
- ❌ Backend index.php not accessible

### Diagnostic Steps Added

The enhanced deployment now includes comprehensive diagnostics:

1. **Deployment Package Verification**
   - Verifies all files are properly packaged before FTP upload
   - Checks for critical files (.htaccess, index.html, index.php, .env, vendor/)

2. **File Structure Tests**
   - Tests domain accessibility
   - Checks if backend directories are accessible
   - Verifies PHP execution with simple test file

3. **PHP Execution Test**
   - New `test.php` file provides detailed server information
   - Shows PHP version, file permissions, directory structure
   - Confirms autoloader and environment file presence

### Common Issues & Solutions

#### Issue 1: Files Not Deployed
**Symptoms**: Backend directory not accessible
**Check**: Deployment package verification step
**Solution**: Verify FTP credentials and deployment paths

#### Issue 2: PHP Not Executing
**Symptoms**: PHP files return HTML instead of JSON
**Check**: Simple PHP test file response
**Solution**: Contact hosting provider to enable PHP execution

#### Issue 3: Missing Dependencies  
**Symptoms**: "Class not found" or autoloader errors
**Check**: Composer vendor directory in deployment package
**Solution**: Ensure `composer install` completes successfully in CI

#### Issue 4: Environment Variables
**Symptoms**: Database connection failures
**Check**: Backend .env file presence and contents
**Solution**: Verify all required secrets are configured in GitHub

#### Issue 5: Apache Routing
**Symptoms**: API endpoints return 404
**Check**: .htaccess file deployed and mod_rewrite enabled
**Solution**: Contact hosting provider to enable mod_rewrite

### Required GitHub Secrets

Ensure these are configured in your repository secrets:

| Secret | Status | Description |
|--------|--------|-------------|
| `DB_HOST` | ✅ | Database hostname (srv1947.hstgr.io) |
| `DB_PORT` | ✅ | Database port (3306) |
| `DB_NAME` | ✅ | Database name (u605445218_gamcapp) |
| `DB_USER` | ✅ | Database user (u605445218_admin) |
| `DB_PASSWORD` | ✅ | Database password |
| `JWT_SECRET` | ✅ | JWT signing secret |
| `FTP_PASSWORD` | ✅ | FTP deployment password |
| `RAZORPAY_KEY_ID` | ❓ | Payment gateway key |
| `RAZORPAY_KEY_SECRET` | ❓ | Payment gateway secret |

### Required GitHub Variables

Ensure these are configured in your repository variables:

| Variable | Status | Current Value |
|----------|--------|---------------|
| `FRONTEND_URL` | ❓ | Should be `https://gamca-wafid.com` |
| `FTP_HOST` | ✅ | ftp.gamca-wafid.com |
| `FTP_USERNAME` | ✅ | u605445218 |
| `DOMAIN` | ✅ | gamca-wafid.com |

### Next Steps

1. **Deploy with Enhanced Diagnostics**: Push changes to trigger new deployment
2. **Review Diagnostic Output**: Check GitHub Actions logs for detailed information
3. **Contact Hosting Support**: If PHP execution fails, verify hosting configuration
4. **Verify File Permissions**: Ensure .htaccess and PHP files have correct permissions

### Direct Testing URLs

Once deployed, test these URLs directly:

- **Simple PHP Test**: `https://gamca-wafid.com/backend/public/test.php`
- **Backend Index**: `https://gamca-wafid.com/backend/public/index.php`  
- **Health Endpoint**: `https://gamca-wafid.com/api/health`
- **Debug Endpoint**: `https://gamca-wafid.com/api/health?debug=1`

The enhanced diagnostic workflow will provide detailed information about exactly what's failing and why.