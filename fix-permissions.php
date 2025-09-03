<?php
/**
 * Permission Fix Script for Backend Files
 * This script fixes file permissions for PHP execution on shared hosting
 */

header('Content-Type: application/json');

// Security check
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['action'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$action = $_POST['action'];
$results = [];

if ($action === 'fix_backend_permissions') {
    // Backend directories that need execute permissions
    $backend_dirs = [
        '../backend',
        '../backend/public',
        '../backend/src',
        '../backend/src/Controllers',
        '../backend/src/Core', 
        '../backend/src/Lib',
        '../backend/src/Middleware',
        '../backend/src/Models',
        '../backend/vendor'
    ];
    
    // PHP files that need execute permissions
    $php_files = [
        '../backend/public/index.php'
    ];
    
    // Find all PHP files in source directories
    $src_dirs = [
        '../backend/src/Controllers',
        '../backend/src/Core',
        '../backend/src/Lib', 
        '../backend/src/Middleware',
        '../backend/src/Models'
    ];
    
    foreach ($src_dirs as $dir) {
        if (is_dir($dir)) {
            $files = glob($dir . '/*.php');
            $php_files = array_merge($php_files, $files);
        }
    }
    
    // Set directory permissions
    foreach ($backend_dirs as $dir) {
        if (is_dir($dir)) {
            $success = chmod($dir, 0755);
            $results['directories'][$dir] = $success ? 'success' : 'failed';
        } else {
            $results['directories'][$dir] = 'not_found';
        }
    }
    
    // Set PHP file permissions  
    foreach ($php_files as $file) {
        if (is_file($file)) {
            $success = chmod($file, 0755);
            $results['php_files'][$file] = $success ? 'success' : 'failed';
        } else {
            $results['php_files'][$file] = 'not_found';
        }
    }
    
    // Set .env file permissions (read-only)
    $env_file = '../backend/.env';
    if (is_file($env_file)) {
        $success = chmod($env_file, 0644);
        $results['env_file'] = $success ? 'success' : 'failed';
    } else {
        $results['env_file'] = 'not_found';
    }
    
    // Check current permissions
    $results['verification'] = [];
    $results['verification']['backend_index'] = is_executable('../backend/public/index.php') ? 'executable' : 'not_executable';
    $results['verification']['backend_dir'] = is_readable('../backend') ? 'readable' : 'not_readable';
    
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid action']);
    exit;
}

echo json_encode([
    'success' => true,
    'action' => $action,
    'results' => $results,
    'timestamp' => date('Y-m-d H:i:s')
]);
?>