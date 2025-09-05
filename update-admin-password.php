<?php
declare(strict_types=1);

// Admin Password Update Script for Deployment
// Updates admin password hash once during database initialization

header('Content-Type: application/json');

$result = [
    'success' => false,
    'message' => '',
    'timestamp' => date('Y-m-d H:i:s'),
    'debug_info' => []
];

try {
    // Get Hostinger user ID from environment or default
    $hostingerUserId = $_ENV['HOSTINGER_USER_ID'] ?? getenv('HOSTINGER_USER_ID') ?? null;
    
    if (!$hostingerUserId) {
        $hostingerUserId = '605445218';
    }
    
    $result['debug_info']['hostinger_user_id'] = $hostingerUserId;
    $result['debug_info']['current_dir'] = __DIR__;
    
    // Try to find autoloader
    $autoloaderPaths = [
        __DIR__ . '/backend/vendor/autoload.php',           // Local development
        __DIR__ . '/vendor/autoload.php',                   // Root level  
        __DIR__ . '/../backend/vendor/autoload.php',        // From public_html -> backend (HOSTINGER)
        __DIR__ . '/../vendor/autoload.php',                // From backend/public
        __DIR__ . '/../../backend/vendor/autoload.php',     // From nested public_html
        dirname(__DIR__) . '/vendor/autoload.php',          // From backend/public
        dirname(dirname(__DIR__)) . '/backend/vendor/autoload.php', // From nested structure
        "/home/u{$hostingerUserId}/domains/" . ($_SERVER['HTTP_HOST'] ?? '') . '/backend/vendor/autoload.php', // Hostinger explicit
    ];
    
    $autoloaderFound = false;
    foreach ($autoloaderPaths as $path) {
        if (file_exists($path)) {
            require_once $path;
            $autoloaderFound = true;
            $result['debug_info']['autoloader_used'] = $path;
            break;
        }
    }
    
    if (!$autoloaderFound) {
        throw new Exception('Composer autoloader not found');
    }
    
    // Try to find environment file
    $envPaths = [
        __DIR__ . '/backend/.env',                           // From root
        __DIR__ . '/.env',                                   // Current dir
        __DIR__ . '/../backend/.env',                        // From public_html -> backend (HOSTINGER)
        __DIR__ . '/../.env',                                // From backend/public
        __DIR__ . '/../../backend/.env',                     // From nested public_html
        dirname(__DIR__) . '/.env',                          // From backend/public
        dirname(dirname(__DIR__)) . '/backend/.env',         // From nested structure
        "/home/u{$hostingerUserId}/domains/" . ($_SERVER['HTTP_HOST'] ?? '') . '/backend/.env', // Hostinger explicit
    ];
    
    $envFound = false;
    foreach ($envPaths as $envPath) {
        if (file_exists($envPath)) {
            $envDir = dirname($envPath);
            $dotenv = Dotenv\Dotenv::createImmutable($envDir);
            $dotenv->load();
            $envFound = true;
            $result['debug_info']['env_used'] = $envPath;
            break;
        }
    }
    
    if (!$envFound) {
        throw new Exception('Environment file not found');
    }
    
} catch (Exception $e) {
    $result['success'] = false;
    $result['message'] = 'Setup error: ' . $e->getMessage();
    echo json_encode($result, JSON_PRETTY_PRINT);
    exit;
}

// Load required classes
use Gamcapp\Core\Database;

try {
    // Check if admin user exists and needs password update
    $stmt = Database::query(
        "SELECT id, username, password_hash, created_at FROM admins WHERE username = ?",
        ['admin']
    );
    
    $admin = $stmt->fetch();
    
    if (!$admin) {
        throw new Exception('Admin user not found in database');
    }
    
    $result['debug_info']['admin_found'] = [
        'id' => $admin['id'],
        'username' => $admin['username'],
        'created_at' => $admin['created_at'],
        'has_password_hash' => !empty($admin['password_hash'])
    ];
    
    // Test current password hash
    $currentPasswordWorks = password_verify('admin123', $admin['password_hash']);
    $result['debug_info']['current_password_works'] = $currentPasswordWorks;
    
    if ($currentPasswordWorks) {
        $result['success'] = true;
        $result['message'] = 'Admin password already works correctly, no update needed';
        echo json_encode($result, JSON_PRETTY_PRINT);
        exit;
    }
    
    // Generate new password hash
    $newPasswordHash = password_hash('admin123', PASSWORD_ARGON2ID, [
        'memory_cost' => 1024,
        'time_cost' => 2, 
        'threads' => 2
    ]);
    
    // Update password hash
    $updateStmt = Database::query(
        "UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?",
        [$newPasswordHash, 'admin']
    );
    
    if ($updateStmt->rowCount() === 0) {
        throw new Exception('Failed to update admin password - no rows affected');
    }
    
    // Verify the update worked
    $verifyStmt = Database::query(
        "SELECT password_hash FROM admins WHERE username = ?",
        ['admin']
    );
    
    $updatedAdmin = $verifyStmt->fetch();
    $verificationResult = password_verify('admin123', $updatedAdmin['password_hash']);
    
    if (!$verificationResult) {
        throw new Exception('Password update failed - verification failed');
    }
    
    $result['success'] = true;
    $result['message'] = 'Admin password hash updated successfully';
    $result['debug_info']['password_updated'] = true;
    $result['debug_info']['verification_passed'] = true;
    
} catch (Exception $e) {
    $result['success'] = false;
    $result['message'] = 'Password update failed: ' . $e->getMessage();
    $result['error'] = $e->getMessage();
}

echo json_encode($result, JSON_PRETTY_PRINT);