<?php
// Simple backend test without framework dependencies
header('Content-Type: application/json');

$tests = [];

// Test 1: Basic PHP
$tests['php_basic'] = [
    'working' => true,
    'php_version' => phpversion()
];

// Test 2: File system
$tests['file_system'] = [
    'current_dir' => __DIR__,
    'parent_exists' => is_dir(__DIR__ . '/..'),
    'vendor_exists' => file_exists(__DIR__ . '/../vendor/autoload.php'),
    'env_exists' => file_exists(__DIR__ . '/../.env')
];

// Test 3: Autoloader
try {
    if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
        require_once __DIR__ . '/../vendor/autoload.php';
        $tests['autoloader'] = ['status' => 'loaded_successfully'];
    } else {
        $tests['autoloader'] = ['status' => 'file_not_found'];
    }
} catch (Exception $e) {
    $tests['autoloader'] = ['status' => 'error', 'message' => $e->getMessage()];
}

// Test 4: Environment
try {
    if (file_exists(__DIR__ . '/../.env')) {
        $envContent = file_get_contents(__DIR__ . '/../.env');
        $tests['environment'] = [
            'status' => 'file_found',
            'file_size' => strlen($envContent),
            'has_db_host' => strpos($envContent, 'DB_HOST') !== false
        ];
    } else {
        $tests['environment'] = ['status' => 'file_not_found'];
    }
} catch (Exception $e) {
    $tests['environment'] = ['status' => 'error', 'message' => $e->getMessage()];
}

// Test 5: Classes
try {
    if (class_exists('Dotenv\\Dotenv')) {
        $tests['dotenv_class'] = ['status' => 'available'];
    } else {
        $tests['dotenv_class'] = ['status' => 'not_found'];
    }
} catch (Exception $e) {
    $tests['dotenv_class'] = ['status' => 'error', 'message' => $e->getMessage()];
}

$response = [
    'status' => 'success',
    'message' => 'Backend diagnostics without full framework',
    'timestamp' => date('c'),
    'tests' => $tests,
    'request_info' => [
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'api_path' => $_GET['api_path'] ?? 'not_provided'
    ]
];

echo json_encode($response, JSON_PRETTY_PRINT);
?>