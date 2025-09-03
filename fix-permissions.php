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
    // Determine if we're in development or production based on current path
    $current_path = __DIR__;
    $is_dev = strpos($current_path, '/dev') !== false;
    
    // Set base backend path based on environment
    if ($is_dev) {
        $backend_base = dirname(__DIR__) . '/dev/backend';
    } else {
        // Production: backend is in separate secure directory
        $backend_base = '/domains/' . ($_SERVER['HTTP_HOST'] ?? 'gamca-wafid.com') . '/backend';
        
        // Alternative paths if the above doesn't work
        $possible_paths = [
            '/domains/gamca-wafid.com/backend',
            dirname(dirname(__DIR__)) . '/backend',
            '../backend'
        ];
        
        foreach ($possible_paths as $path) {
            if (is_dir($path)) {
                $backend_base = $path;
                break;
            }
        }
    }
    
    $results['environment'] = $is_dev ? 'development' : 'production';
    $results['backend_base_path'] = $backend_base;
    $results['current_directory'] = $current_path;
    
    // Check if backend directory exists
    if (!is_dir($backend_base)) {
        echo json_encode([
            'success' => false,
            'error' => 'Backend directory not found',
            'backend_base' => $backend_base,
            'environment' => $results['environment'],
            'current_directory' => $current_path
        ]);
        exit;
    }
    
    // Backend directories that need execute permissions
    $backend_dirs = [
        $backend_base,
        $backend_base . '/public',
        $backend_base . '/src',
        $backend_base . '/src/Controllers',
        $backend_base . '/src/Core', 
        $backend_base . '/src/Lib',
        $backend_base . '/src/Middleware',
        $backend_base . '/src/Models',
        $backend_base . '/vendor'
    ];
    
    // PHP files that need execute permissions
    $php_files = [
        $backend_base . '/public/index.php'
    ];
    
    // Find all PHP files in source directories
    $src_dirs = [
        $backend_base . '/src/Controllers',
        $backend_base . '/src/Core',
        $backend_base . '/src/Lib', 
        $backend_base . '/src/Middleware',
        $backend_base . '/src/Models'
    ];
    
    foreach ($src_dirs as $dir) {
        if (is_dir($dir)) {
            $files = glob($dir . '/*.php');
            if ($files) {
                $php_files = array_merge($php_files, $files);
            }
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
    $env_file = $backend_base . '/.env';
    if (is_file($env_file)) {
        $success = chmod($env_file, 0644);
        $results['env_file'] = $success ? 'success' : 'failed';
    } else {
        $results['env_file'] = 'not_found';
    }
    
    // Check current permissions
    $results['verification'] = [];
    $main_index = $backend_base . '/public/index.php';
    $results['verification']['backend_index'] = is_executable($main_index) ? 'executable' : 'not_executable';
    $results['verification']['backend_dir'] = is_readable($backend_base) ? 'readable' : 'not_readable';
    $results['verification']['main_index_path'] = $main_index;
    $results['verification']['main_index_exists'] = file_exists($main_index) ? 'exists' : 'missing';
    
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