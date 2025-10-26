# Orphaned Payment Fixer - Deployment Script

## Overview

The `fix-orphaned-payments.php` script repairs orphaned payment records by linking them to their corresponding appointments. This addresses the issue where payments were created without `appointment_id`, causing admin dashboard to show incorrect amounts.

## Automated Deployment

**✅ The script is now automatically executed during GitHub Actions deployment!**

The script runs automatically:
- **Development**: After deploying to `/dev` environment
- **Production**: After deploying to main environment
- **Mode**: Live mode (`--live`) - actual changes are applied
- **Timing**: After database migrations, before health checks

### Deployment Integration

When you push to `main` or `develop` branches, the deployment workflow will:

1. Deploy all files including `fix-orphaned-payments.php`
2. Run database migrations
3. **Automatically run the orphaned payment fix** via web request
4. Continue with health checks

You can monitor the results in the GitHub Actions logs:

```
Running orphaned payment fix script...
Orphaned payment fix response:
{"success":true,"message":"Orphaned payment fix completed","stats":{"orphaned_payments_found":3,"successful_matches":3,"failed_matches":0}}
✅ Orphaned payment fix completed successfully
```

## Manual Usage (If Needed)

### 1. Dry Run (Safe - No Changes Made)
```bash
cd /path/to/gamcapp
php fix-orphaned-payments.php
```

### 2. Live Run (Apply Changes)
```bash
cd /path/to/gamcapp
php fix-orphaned-payments.php --live
```

### 3. Web Access (Production/Development)
```
# Dry run
https://yourdomain.com/fix-orphaned-payments.php

# Live run  
https://yourdomain.com/fix-orphaned-payments.php?live=1
```

### 4. Help
```bash
php fix-orphaned-payments.php --help
```

## Expected Output

```
=== Starting Orphaned Payment Fixer ===
Mode: DRY RUN (no changes will be made)
Found 5 orphaned payment records
Processing payment ID 123 (Order: order_xyz, Amount: ₹10, User: John Doe)
  ✅ Successfully linked payment 123 to appointment abc-123
...
=== Orphaned Payment Fixer Results ===
orphaned_payments_found: 5
potential_matches_found: 5
successful_matches: 5
failed_matches: 0
skipped_multiple_matches: 0
=== DRY RUN COMPLETED - No actual changes were made ===
```

## What It Fixes

1. **Links orphaned payments** to their correct appointments
2. **Updates payment amounts** in appointments table with actual paid amounts
3. **Updates payment status** to 'completed' for successful payments
4. **Preserves payment references** for tracking

## Prerequisites

- PHP 8.1+
- MySQL database with GAMCAPP schema
- Properly configured `backend/.env` file
- Composer dependencies installed (`cd backend && composer install`)

## Database Requirements

The script expects these tables:
- `payment_transactions` (with `appointment_id` column)
- `appointments` 
- `users`

## Testing Recommendations

1. **Always run dry-run first** to see what will be changed
2. **Backup database** before running live mode
3. **Test on staging environment** if available
4. **Review logs** after execution

## Troubleshooting

### Database Connection Error
```
Database connection error: SQLSTATE[HY000] [1698] Access denied
```
**Solution**: Check `backend/.env` database credentials

### No Orphaned Payments Found
```
No orphaned payments found. Nothing to fix.
```
**Result**: This is good - means all payments are properly linked

### Multiple Matches Skipped
```
Multiple appointment matches found for payment X, but no clear best match. Skipping for safety.
```
**Result**: Script is being conservative - manual review may be needed

## Manual Review Cases

If the script skips payments due to multiple matches, manually investigate:

1. Check the payment creation time
2. Check appointment creation times for the user
3. Manually link using database UPDATE if confident about the match

## Post-Execution Verification

After running the script:

1. **Check admin dashboard** - Custom amounts should now display correctly
2. **Review logs** - Ensure all expected matches were made
3. **Test payment flow** - Verify new payments still work correctly

## Integration with Existing Fix

This script complements the PaymentController validation fix:
- **PaymentController**: Prevents new orphaned payments 
- **This script**: Fixes existing orphaned payments
- **GitHub Actions**: Automatically runs the script on every deployment

The complete solution ensures payment integrity by:
1. **Preventing** new orphaned payments (PaymentController validation)
2. **Fixing** existing orphaned payments (automated script execution)
3. **Monitoring** via deployment logs and admin dashboard verification

**Result**: Admin dashboard will correctly display custom payment amounts (₹10, ₹15, etc.) instead of falling back to hardcoded ₹350.