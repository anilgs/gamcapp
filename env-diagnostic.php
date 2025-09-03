<?php
/**
 * Environment Diagnostic Script
 * Tests .env file parsing and reports any issues
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

if ($action === 'test_env_parsing') {
    // Find the backend directory
    $possible_paths = [
        __DIR__ . '/../backend',
        __DIR__ . '/backend', 
        __DIR__ . '/../../backend',
        dirname(__DIR__) . '/backend'
    ];
    
    $backend_path = null;
    foreach ($possible_paths as $path) {
        $resolved_path = realpath($path);
        if ($resolved_path && file_exists($resolved_path . '/.env')) {
            $backend_path = $resolved_path;
            break;
        }
    }
    
    if (!$backend_path) {
        echo json_encode([
            'success' => false,
            'error' => 'Backend .env file not found',
            'attempted_paths' => $possible_paths
        ]);
        exit;
    }
    
    $env_file = $backend_path . '/.env';
    $results['env_file_path'] = $env_file;
    $results['env_file_exists'] = file_exists($env_file);
    $results['env_file_readable'] = is_readable($env_file);
    
    if (!is_readable($env_file)) {
        echo json_encode([
            'success' => false,
            'error' => '.env file not readable',
            'results' => $results
        ]);
        exit;
    }
    
    // Read and parse the .env file manually
    $env_content = file_get_contents($env_file);
    $results['env_file_size'] = strlen($env_content);
    $results['env_lines'] = [];
    $results['problematic_lines'] = [];
    
    $lines = explode("\n", $env_content);
    foreach ($lines as $line_number => $line) {
        $line = trim($line);
        
        if (empty($line) || strpos($line, '#') === 0) {
            continue; // Skip empty lines and comments
        }
        
        $results['env_lines'][] = [
            'line_number' => $line_number + 1,
            'content' => $line
        ];
        
        // Check for problematic patterns
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            
            // Check if value has spaces but no quotes
            if (preg_match('/\s/', $value) && !preg_match('/^".*"$/', $value) && !preg_match('/^\'.*\'$/', $value)) {
                $results['problematic_lines'][] = [
                    'line_number' => $line_number + 1,
                    'content' => $line,
                    'issue' => 'Value contains spaces but is not quoted',
                    'suggested_fix' => $key . '="' . $value . '"'
                ];
            }
        }
    }
    
    // Try to parse with Dotenv
    $results['dotenv_test'] = [];
    
    try {
        // Change to backend directory for testing
        $original_cwd = getcwd();
        chdir($backend_path);
        
        // Temporarily suppress errors
        $old_error_reporting = error_reporting(0);
        $old_display_errors = ini_get('display_errors');
        ini_set('display_errors', '0');
        
        try {
            if (class_exists('Dotenv\Dotenv')) {
                $dotenv = Dotenv\Dotenv::createImmutable($backend_path);
                $dotenv->load();
                $results['dotenv_test']['success'] = true;
                $results['dotenv_test']['message'] = 'Dotenv parsing successful';
            } else {
                $results['dotenv_test']['success'] = false;
                $results['dotenv_test']['message'] = 'Dotenv class not available';
            }
        } catch (Exception $e) {
            $results['dotenv_test']['success'] = false;
            $results['dotenv_test']['error'] = $e->getMessage();
            $results['dotenv_test']['file'] = $e->getFile();
            $results['dotenv_test']['line'] = $e->getLine();
        }
        
        // Restore error reporting
        error_reporting($old_error_reporting);
        ini_set('display_errors', $old_display_errors);
        chdir($original_cwd);
        
    } catch (Exception $e) {
        $results['dotenv_test']['success'] = false;
        $results['dotenv_test']['error'] = 'Failed to test dotenv: ' . $e->getMessage();
    }
    
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
], JSON_PRETTY_PRINT);
?>