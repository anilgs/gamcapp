# Payment Management Testing Guide

## Overview
This guide covers testing the new admin payment management functionality that allows administrators to manually mark UPI payments as complete.

## Prerequisites
1. Database must have the payment tracking fields added - run migration:
   ```bash
   cd backend/database
   mysql -u [user] -p [database] < migrate_payment_tracking.sql
   ```

2. Ensure backend is running:
   ```bash
   cd backend/public
   php -S localhost:8000
   ```

3. Ensure frontend is running:
   ```bash
   cd frontend
   npm run dev
   ```

## Test Scenarios

### 1. Database Migration Test
**Verify the migration was applied:**
```sql
DESCRIBE appointments;
```
**Expected fields:**
- `payment_amount` (DECIMAL(10,2))
- `payment_reference` (VARCHAR(255))
- `admin_notes` (TEXT)

### 2. Backend API Testing

**Test GET /admin/payments/pending**
```bash
curl -X GET "http://localhost:8000/admin/payments/pending" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "payments": [...],
    "pagination": {...}
  }
}
```

**Test POST /admin/payments/mark-complete**
```bash
curl -X POST "http://localhost:8000/admin/payments/mark-complete" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": "APPOINTMENT_UUID",
    "admin_notes": "Verified payment manually"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "appointment_id": "...",
    "new_status": "confirmed",
    "updated_by": "admin_username",
    "updated_at": "2024-..."
  }
}
```

### 3. Frontend UI Testing

**Access Admin Dashboard:**
1. Navigate to `/admin-login`
2. Login with admin credentials
3. Should see two tabs: "Appointments Management" and "Payment Management"

**Test Payment Management Tab:**
1. Click "Payment Management" tab
2. Should show list of pending payments with:
   - Customer name, email, phone
   - Payment amount (formatted as currency)
   - Payment method (UPI)
   - Payment status (pending/pending_confirmation)
   - Payment reference
   - Created date
   - "Mark Complete" button

**Test Mark Complete Functionality:**
1. Click "Mark Complete" on a pending payment
2. Should show confirmation modal with:
   - Customer details
   - Payment amount
   - Optional admin notes field
3. Fill in admin notes (optional)
4. Click "Mark Complete" in modal
5. Should show success message
6. Payment should disappear from pending list

### 4. Error Handling Tests

**Test unauthorized access:**
- Access endpoints without admin token
- Should return 401 Unauthorized

**Test invalid appointment ID:**
- Try to mark non-existent appointment as complete
- Should return appropriate error

**Test missing required fields:**
- Send incomplete data to mark-complete endpoint
- Should return validation errors

### 5. Database Verification

**After marking payment complete, verify in database:**
```sql
SELECT 
  id, 
  customer_name, 
  payment_status, 
  status, 
  admin_notes,
  updated_at 
FROM appointments 
WHERE id = 'APPOINTMENT_UUID';
```

**Expected changes:**
- `payment_status` should be 'paid'
- `status` should be 'confirmed'
- `admin_notes` should contain the notes entered
- `updated_at` should be recent timestamp

## Test Data Setup

**Create test appointments with pending payments:**
```sql
INSERT INTO appointments (
  id, user_id, customer_name, email, phone, 
  payment_status, payment_method, payment_amount, payment_reference,
  appointment_type, appointment_date, status, created_at, updated_at
) VALUES (
  UUID(), 'test-user-id', 'Test Customer', 'test@example.com', '+1234567890',
  'pending', 'upi', 2500.00, 'UPI-REF-12345',
  'passport', '2024-01-15 10:00:00', 'pending', NOW(), NOW()
);
```

## Expected Behavior

### Success Cases:
1. Admin can view all pending payments in a clean table format
2. Payment amounts are displayed in INR currency format
3. Admin can mark payments as complete with optional notes
4. Status updates immediately in the UI
5. Success messages are shown clearly
6. Pagination works for large numbers of pending payments

### Error Cases:
1. Non-admin users cannot access payment management
2. Invalid appointment IDs return appropriate errors
3. Network errors are handled gracefully
4. UI shows loading states during API calls

## Security Considerations
- Ensure admin authentication is required for all payment endpoints
- Audit trail is maintained with admin username and notes
- Payment status changes are logged with timestamps
- No sensitive payment information is exposed in logs

## Performance Considerations
- Test with large numbers of pending payments (100+)
- Verify pagination performance
- Check response times for payment status updates
- Monitor database query performance for payment searches