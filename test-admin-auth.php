<?php
declare(strict_types=1);

// Test admin authentication directly
require_once 'backend/vendor/autoload.php';

use Gamcapp\Models\Admin;

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();

echo "Testing Admin Authentication\n";
echo "=============================\n\n";

try {
    // Test 1: Check if admin user exists
    echo "1. Testing if admin user exists:\n";
    $admin = Admin::findByUsername('admin');
    if ($admin) {
        echo "   ✓ Admin user 'admin' found (ID: {$admin->id})\n";
        echo "   ✓ Email: {$admin->email}\n";
        echo "   ✓ Active: " . ($admin->is_active ? 'Yes' : 'No') . "\n";
    } else {
        echo "   ✗ Admin user 'admin' not found\n";
        exit(1);
    }
    
    echo "\n";
    
    // Test 2: Test password verification with correct password
    echo "2. Testing password verification with 'admin123':\n";
    $authResult = Admin::authenticate('admin', 'admin123');
    if ($authResult) {
        echo "   ✓ Authentication successful with 'admin123'\n";
        echo "   ✓ Authenticated admin ID: {$authResult->id}\n";
        echo "   ✓ Username: {$authResult->username}\n";
    } else {
        echo "   ✗ Authentication failed with 'admin123'\n";
    }
    
    echo "\n";
    
    // Test 3: Test password verification with wrong password
    echo "3. Testing password verification with wrong password:\n";
    $wrongAuthResult = Admin::authenticate('admin', 'wrongpassword');
    if ($wrongAuthResult) {
        echo "   ✗ Authentication unexpectedly succeeded with wrong password\n";
    } else {
        echo "   ✓ Authentication correctly failed with wrong password\n";
    }
    
    echo "\n";
    
    // Test 4: Direct password hash verification
    echo "4. Testing password hash verification directly:\n";
    $storedHash = '$argon2id$v=19$m=1024,t=2,p=2$WTVBQjYwS3FvcHNyY1JzUA$+3vzlfS0Vilea8C2BV/4ugt3VdHjbOUbCfLgj7xSp0M';
    $isValid = password_verify('admin123', $storedHash);
    echo "   Password 'admin123' against stored hash: " . ($isValid ? '✓ Valid' : '✗ Invalid') . "\n";
    
    echo "\n";
    echo "Test completed successfully!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}