<?php
// Minimal backend index test - no framework dependencies
// This helps identify if the issue is dependencies or file access

header('Content-Type: application/json');

// Track execution step by step
$debug = [];
$debug[] = "Script started";

try {
    $debug[] = "Headers set";
    
    // Test basic PHP functionality
    $apiPath = $_GET['api_path'] ?? '';
    $debug[] = "API path retrieved: " . ($apiPath ?: 'empty');
    
    // Test file system
    $debug[] = "Current directory: " . __DIR__;
    $debug[] = "Parent directory exists: " . (is_dir(__DIR__ . '/..') ? 'yes' : 'no');
    
    // Test if vendor directory exists
    $debug[] = "Vendor directory exists: " . (is_dir(__DIR__ . '/../vendor') ? 'yes' : 'no');
    
    // Test if .env file exists  
    $debug[] = "Env file exists: " . (file_exists(__DIR__ . '/../.env') ? 'yes' : 'no');
    
    // If no API path, return basic info
    if (empty($apiPath)) {
        $response = [
            'success' => true,
            'message' => 'Minimal Backend Index Test',
            'timestamp' => date('c'),
            'php_version' => phpversion(),
            'debug_steps' => $debug,
            'request_info' => [
                'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'unknown',
                'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'unknown',
                'api_path' => $apiPath
            ]
        ];
    } else {
        $response = [
            'success' => true,
            'message' => 'API routing test via minimal backend',
            'api_path' => $apiPath,
            'timestamp' => date('c'),
            'debug_steps' => $debug
        ];
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    $debug[] = "Exception: " . $e->getMessage();
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_steps' => $debug
    ], JSON_PRETTY_PRINT);
} catch (Error $e) {
    $debug[] = "Error: " . $e->getMessage();
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(), 
        'debug_steps' => $debug
    ], JSON_PRETTY_PRINT);
}
?>