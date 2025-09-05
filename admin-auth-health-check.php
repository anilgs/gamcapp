<?php
declare(strict_types=1);

// Simple Admin Authentication Test for Deployment Health Check
// This is a streamlined version designed specifically for deployment verification

header('Content-Type: application/json');

$result = [
    'success' => false,
    'message' => '',
    'tests' => [],
    'debug_info' => [],
    'timestamp' => date('Y-m-d H:i:s')
];

try {
    // Debug: Document search paths
    $result['debug_info']['current_dir'] = __DIR__;
    $result['debug_info']['server_name'] = $_SERVER['HTTP_HOST'] ?? 'unknown';
    
    // Get Hostinger user ID from environment or default
    $hostingerUserId = $_ENV['HOSTINGER_USER_ID'] ?? getenv('HOSTINGER_USER_ID') ?? null;
    
    // If no environment variable, use default
    if (!$hostingerUserId) {
        $hostingerUserId = '605445218';
    }
    
    $result['debug_info']['hostinger_user_id'] = $hostingerUserId;
    $result['debug_info']['env_check'] = [
        'ENV_var' => $_ENV['HOSTINGER_USER_ID'] ?? 'not_set',
        'getenv_result' => getenv('HOSTINGER_USER_ID') ?: 'not_set'
    ];
    
    // Try to find autoloader
    $autoloaderPaths = [
        __DIR__ . '/backend/vendor/autoload.php',           // Local development (from root)
        __DIR__ . '/vendor/autoload.php',                   // Root level  
        __DIR__ . '/../backend/vendor/autoload.php',        // From public_html -> backend/vendor (MOST LIKELY FOR HOSTINGER)
        __DIR__ . '/../vendor/autoload.php',                // From backend/public -> backend/vendor
        __DIR__ . '/../../backend/vendor/autoload.php',     // From nested public_html -> backend
        dirname(__DIR__) . '/vendor/autoload.php',          // From backend/public -> backend/vendor
        dirname(dirname(__DIR__)) . '/backend/vendor/autoload.php', // From nested structure
        "/home/u{$hostingerUserId}/domains/" . ($_SERVER['HTTP_HOST'] ?? '') . '/backend/vendor/autoload.php', // Hostinger structure explicit
    ];
    
    $autoloaderFound = false;
    $result['debug_info']['autoloader_paths_tried'] = [];
    
    foreach ($autoloaderPaths as $path) {
        $result['debug_info']['autoloader_paths_tried'][] = [
            'path' => $path,
            'exists' => file_exists($path)
        ];
        
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
    
    $result['tests'][] = [
        'name' => 'autoloader',
        'success' => true,
        'message' => 'Autoloader loaded successfully'
    ];
    
} catch (Exception $e) {
    $result['success'] = false;
    $result['message'] = 'Autoloader error: ' . $e->getMessage();
    echo json_encode($result, JSON_PRETTY_PRINT);
    exit;
}

// Load Admin model
use Gamcapp\Models\Admin;

try {
    
    // Try to find environment file
    $envPaths = [
        __DIR__ . '/backend/.env',                           // From root
        __DIR__ . '/.env',                                   // Current dir
        __DIR__ . '/../backend/.env',                        // From public_html -> backend/.env (MOST LIKELY FOR HOSTINGER)
        __DIR__ . '/../.env',                                // From backend/public -> backend/.env
        __DIR__ . '/../../backend/.env',                     // From nested public_html -> backend
        dirname(__DIR__) . '/.env',                          // From backend/public -> backend/.env
        dirname(dirname(__DIR__)) . '/backend/.env',         // From nested structure
        "/home/u{$hostingerUserId}/domains/" . ($_SERVER['HTTP_HOST'] ?? '') . '/backend/.env', // Hostinger explicit
    ];
    
    $envFound = false;
    $result['debug_info']['env_paths_tried'] = [];
    
    foreach ($envPaths as $envPath) {
        $result['debug_info']['env_paths_tried'][] = [
            'path' => $envPath,
            'exists' => file_exists($envPath)
        ];
        
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
    
    $result['tests'][] = [
        'name' => 'environment',
        'success' => true,
        'message' => 'Environment file loaded successfully'
    ];
    
    // Test database connection by trying to find admin
    $admin = Admin::findByUsername('admin');
    
    if (!$admin) {
        throw new Exception('Admin user not found in database');
    }
    
    $result['tests'][] = [
        'name' => 'admin_exists',
        'success' => true,
        'message' => "Admin user found (ID: {$admin->id})"
    ];
    
    // Test authentication
    $authResult = Admin::authenticate('admin', 'admin123');
    
    if (!$authResult) {
        // Add more debug info for authentication failure
        $result['debug_info']['auth_debug'] = [
            'admin_found' => $admin ? true : false,
            'admin_id' => $admin ? $admin->id : null,
            'admin_username' => $admin ? $admin->username : null,
            'admin_is_active' => $admin ? $admin->is_active : null,
            'password_provided' => 'admin123',
            'password_hash_exists' => $admin && !empty($admin->password_hash),
            'password_verify_test' => $admin ? password_verify('admin123', $admin->password_hash) : null,
            'auth_result' => $authResult,
            'auth_result_type' => gettype($authResult)
        ];
        throw new Exception('Admin authentication failed - check auth_debug for details');
    }
    
    $result['tests'][] = [
        'name' => 'admin_auth',
        'success' => true,
        'message' => 'Admin authentication successful'
    ];
    
    // All tests passed
    $result['success'] = true;
    $result['message'] = 'All admin authentication tests passed';
    
} catch (Exception $e) {
    $result['success'] = false;
    $result['message'] = 'Admin authentication test failed: ' . $e->getMessage();
    $result['error'] = $e->getMessage();
}

echo json_encode($result, JSON_PRETTY_PRINT);