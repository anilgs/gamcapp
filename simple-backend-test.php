<?php
// Simple backend index test - minimal dependencies
header('Content-Type: application/json');

echo json_encode([
    'status' => 'success',
    'message' => 'Backend index.php is accessible',
    'timestamp' => date('c'),
    'php_version' => phpversion(),
    'request_info' => [
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'unknown',
        'api_path' => $_GET['api_path'] ?? 'not_provided'
    ],
    'test_type' => 'minimal_backend_test'
]);
?>