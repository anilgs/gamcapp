<?php
/**
 * API Proxy Script
 * 
 * This script serves as a proxy between frontend requests and the backend API.
 * It automatically detects the backend location and routes requests safely
 * without relying on complex Apache rewrite rules.
 */

declare(strict_types=1);

// Set JSON content type immediately
header('Content-Type: application/json');

// Enable error reporting for debugging (will be overridden by backend)
error_reporting(E_ALL);
ini_set('display_errors', '1');

/**
 * Find the backend directory by checking multiple possible locations
 */
function findBackendPath(): ?string {
    $possible_paths = [
        // Production: backend in secure directory parallel to public_html
        __DIR__ . '/../backend',
        
        // Development: backend in same public directory structure  
        __DIR__ . '/backend',
        
        // Alternative: backend two levels up (some hosting configurations)
        __DIR__ . '/../../backend',
        
        // Fallback: relative path from public_html
        dirname(__DIR__) . '/backend'
    ];
    
    foreach ($possible_paths as $path) {
        $resolved_path = realpath($path);
        if ($resolved_path && file_exists($resolved_path . '/public/index.php')) {
            return $resolved_path;
        }
    }
    
    return null;
}

/**
 * Send error response and exit
 */
function sendError(int $status_code, string $message, array $debug_info = []): void {
    http_response_code($status_code);
    
    $response = [
        'success' => false,
        'error' => $message,
        'timestamp' => date('c')
    ];
    
    // Add debug info if available
    if (!empty($debug_info)) {
        $response['debug'] = $debug_info;
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
}

// Main execution starts here
try {
    // Get the API path from query parameter
    $api_path = $_GET['api_path'] ?? '';
    
    // Debug info for troubleshooting
    $debug_info = [
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'api_path' => $api_path,
        'query_string' => $_SERVER['QUERY_STRING'] ?? '',
        'current_directory' => __DIR__,
        'server_name' => $_SERVER['SERVER_NAME'] ?? 'unknown'
    ];
    
    // Find the backend directory
    $backend_path = findBackendPath();
    
    if (!$backend_path) {
        // Try to provide helpful debugging information
        $attempted_paths = [
            __DIR__ . '/../backend',
            __DIR__ . '/backend', 
            __DIR__ . '/../../backend',
            dirname(__DIR__) . '/backend'
        ];
        
        $path_status = [];
        foreach ($attempted_paths as $path) {
            $resolved = realpath($path);
            $path_status[$path] = [
                'resolved' => $resolved ?: 'path does not exist',
                'index_exists' => $resolved ? file_exists($resolved . '/public/index.php') : false
            ];
        }
        
        sendError(503, 'Backend not found', [
            'attempted_paths' => $path_status,
            'current_dir' => __DIR__,
            'debug_info' => $debug_info
        ]);
    }
    
    $backend_index = $backend_path . '/public/index.php';
    
    // Verify backend index file exists and is readable
    if (!is_readable($backend_index)) {
        sendError(503, 'Backend index file not accessible', [
            'backend_path' => $backend_path,
            'index_path' => $backend_index,
            'file_exists' => file_exists($backend_index),
            'is_readable' => is_readable($backend_index),
            'debug_info' => $debug_info
        ]);
    }
    
    // Set up the environment for the backend
    $original_cwd = getcwd();
    $backend_public_dir = $backend_path . '/public';
    
    // Change to backend public directory
    if (!chdir($backend_public_dir)) {
        sendError(503, 'Cannot change to backend directory', [
            'backend_public_dir' => $backend_public_dir,
            'original_cwd' => $original_cwd,
            'debug_info' => $debug_info
        ]);
    }
    
    // Update server variables to make backend think it's being accessed directly
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['PHP_SELF'] = '/index.php';
    $_SERVER['SCRIPT_FILENAME'] = $backend_index;
    
    // Preserve the original REQUEST_URI but ensure api_path is set
    if (empty($_GET['api_path']) && !empty($api_path)) {
        $_GET['api_path'] = $api_path;
    }
    
    // Optional: Add debug endpoint before including backend
    if ($api_path === 'proxy-debug') {
        echo json_encode([
            'success' => true,
            'message' => 'API Proxy is working',
            'backend_path' => $backend_path,
            'backend_index' => $backend_index,
            'current_directory' => getcwd(),
            'debug_info' => $debug_info,
            'timestamp' => date('c')
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    // Include the backend entry point
    // This will execute the entire backend application
    require_once $backend_index;
    
} catch (Exception $e) {
    // Restore original working directory on error
    if (isset($original_cwd)) {
        chdir($original_cwd);
    }
    
    sendError(500, 'Internal server error: ' . $e->getMessage(), [
        'exception' => [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ],
        'debug_info' => $debug_info ?? []
    ]);
    
} catch (Error $e) {
    // Handle PHP fatal errors
    if (isset($original_cwd)) {
        chdir($original_cwd);
    }
    
    sendError(500, 'PHP Error: ' . $e->getMessage(), [
        'error' => [
            'message' => $e->getMessage(),
            'file' => $e->getFile(), 
            'line' => $e->getLine()
        ],
        'debug_info' => $debug_info ?? []
    ]);
}
?>