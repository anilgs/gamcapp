<?php
declare(strict_types=1);

// Test admin authentication directly
// This script can be run standalone or via API for deployment health checks

// Function to output results in both CLI and JSON format
function outputResult($test, $success, $message, $details = []) {
    global $isApiMode;
    
    if ($isApiMode) {
        return [
            'test' => $test,
            'success' => $success,
            'message' => $message,
            'details' => $details
        ];
    } else {
        $status = $success ? '✓' : '✗';
        echo "   {$status} {$message}\n";
        foreach ($details as $detail) {
            echo "   ✓ {$detail}\n";
        }
    }
}

// Detect if this is being called via API
$isApiMode = isset($_GET['api']) || isset($_POST['api']) || 
             (isset($_SERVER['HTTP_USER_AGENT']) && strpos($_SERVER['HTTP_USER_AGENT'], 'curl') !== false && 
              !isset($_SERVER['TERM']));

$results = [];

// Initialize autoloader
try {
    if (file_exists('backend/vendor/autoload.php')) {
        require_once 'backend/vendor/autoload.php';
    } elseif (file_exists('vendor/autoload.php')) {
        require_once 'vendor/autoload.php';
    } else {
        throw new Exception('Composer autoloader not found');
    }
} catch (Exception $e) {
    if ($isApiMode) {
        echo json_encode([
            'success' => false,
            'error' => 'Autoloader error: ' . $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        echo "Autoloader error: " . $e->getMessage() . "\n";
    }
    exit(1);
}

use Gamcapp\Models\Admin;

try {

    // Load environment variables
    if (file_exists('backend/.env')) {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
    } elseif (file_exists('.env')) {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    } else {
        throw new Exception('Environment file not found');
    }
    $dotenv->load();

    if (!$isApiMode) {
        echo "Testing Admin Authentication\n";
        echo "=============================\n\n";
    }

    // Test 1: Check if admin user exists
    if (!$isApiMode) echo "1. Testing if admin user exists:\n";
    $admin = Admin::findByUsername('admin');
    if ($admin) {
        $result = outputResult('admin_exists', true, "Admin user 'admin' found", [
            "ID: {$admin->id}",
            "Email: {$admin->email}",
            "Active: " . ($admin->is_active ? 'Yes' : 'No')
        ]);
        if ($isApiMode) $results[] = $result;
    } else {
        $result = outputResult('admin_exists', false, "Admin user 'admin' not found");
        if ($isApiMode) {
            $results[] = $result;
            echo json_encode(['success' => false, 'tests' => $results]);
            exit(1);
        } else {
            exit(1);
        }
    }
    
    if (!$isApiMode) echo "\n";
    
    // Test 2: Test password verification with correct password
    if (!$isApiMode) echo "2. Testing password verification with 'admin123':\n";
    $authResult = Admin::authenticate('admin', 'admin123');
    if ($authResult) {
        $result = outputResult('password_auth', true, "Authentication successful with 'admin123'", [
            "Authenticated admin ID: {$authResult->id}",
            "Username: {$authResult->username}"
        ]);
        if ($isApiMode) $results[] = $result;
    } else {
        $result = outputResult('password_auth', false, "Authentication failed with 'admin123'");
        if ($isApiMode) $results[] = $result;
    }
    
    if (!$isApiMode) echo "\n";
    
    // Test 3: Test password verification with wrong password
    if (!$isApiMode) echo "3. Testing password verification with wrong password:\n";
    $wrongAuthResult = Admin::authenticate('admin', 'wrongpassword');
    if ($wrongAuthResult) {
        $result = outputResult('wrong_password', false, "Authentication unexpectedly succeeded with wrong password");
        if ($isApiMode) $results[] = $result;
    } else {
        $result = outputResult('wrong_password', true, "Authentication correctly failed with wrong password");
        if ($isApiMode) $results[] = $result;
    }
    
    if (!$isApiMode) echo "\n";
    
    // Test 4: Direct password hash verification
    if (!$isApiMode) echo "4. Testing password hash verification directly:\n";
    $storedHash = '$argon2id$v=19$m=1024,t=2,p=2$WTVBQjYwS3FvcHNyY1JzUA$+3vzlfS0Vilea8C2BV/4ugt3VdHjbOUbCfLgj7xSp0M';
    $isValid = password_verify('admin123', $storedHash);
    $result = outputResult('hash_verification', $isValid, 
        "Password 'admin123' against stored hash: " . ($isValid ? 'Valid' : 'Invalid'));
    if ($isApiMode) $results[] = $result;
    
    // Test 5: API endpoint test
    if (!$isApiMode) echo "\n5. Testing API endpoint:\n";
    $apiTestResult = testAdminLoginApi();
    $result = outputResult('api_endpoint', $apiTestResult['success'], $apiTestResult['message'], 
        $apiTestResult['details'] ?? []);
    if ($isApiMode) $results[] = $result;
    
    if ($isApiMode) {
        $allPassed = true;
        foreach ($results as $result) {
            if (!$result['success']) {
                $allPassed = false;
                break;
            }
        }
        
        echo json_encode([
            'success' => $allPassed,
            'message' => $allPassed ? 'All admin authentication tests passed' : 'Some admin authentication tests failed',
            'tests' => $results,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        echo "\n";
        echo "Test completed successfully!\n";
    }
    
} catch (Exception $e) {
    if ($isApiMode) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'tests' => $results,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        echo "Error: " . $e->getMessage() . "\n";
        echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    }
    exit(1);
}

function testAdminLoginApi() {
    // Try to make internal API call to test admin login
    $postData = json_encode(['username' => 'admin', 'password' => 'admin123']);
    
    // Get current domain for API call
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $apiUrl = "{$protocol}://{$host}/api/auth/admin-login";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $postData,
            'timeout' => 10
        ]
    ]);
    
    try {
        $response = @file_get_contents($apiUrl, false, $context);
        if ($response === false) {
            return [
                'success' => false,
                'message' => 'API endpoint not reachable',
                'details' => ["URL: {$apiUrl}"]
            ];
        }
        
        $decoded = json_decode($response, true);
        if ($decoded && isset($decoded['success']) && $decoded['success']) {
            return [
                'success' => true,
                'message' => 'API endpoint authentication successful',
                'details' => ["Token generated successfully"]
            ];
        } else {
            return [
                'success' => false,
                'message' => 'API endpoint authentication failed',
                'details' => ["Response: " . substr($response, 0, 100)]
            ];
        }
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'API test error: ' . $e->getMessage()
        ];
    }
}