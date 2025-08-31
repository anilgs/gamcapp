<?php
// API routing test file - Enhanced for debugging
header('Content-Type: application/json');

$info = [
    'status' => 'success',
    'message' => 'Direct routing test (not through .htaccess)',
    'timestamp' => date('c'),
    'server_environment' => [
        'SERVER_SOFTWARE' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'DOCUMENT_ROOT' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
        'PHP_VERSION' => phpversion()
    ],
    'request_info' => [
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'unknown',
        'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? 'unknown',
        'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'] ?? 'unknown',
        'SCRIPT_FILENAME' => $_SERVER['SCRIPT_FILENAME'] ?? 'unknown'
    ],
    'parameters' => [
        'GET' => $_GET,
        'POST' => $_POST,
        'api_path_param' => $_GET['api_path'] ?? 'not provided'
    ],
    'file_system_checks' => [
        'backend_dir_exists' => is_dir('./backend'),
        'backend_public_dir_exists' => is_dir('./backend/public'),
        'backend_index_exists' => file_exists('./backend/public/index.php'),
        'htaccess_exists' => file_exists('./.htaccess'),
        'current_dir' => getcwd()
    ],
    'test_results' => [
        'direct_access' => 'This file was accessed directly - routing-test.php',
        'rewrite_test' => 'If accessed via /api/routing-test, should show api_path parameter'
    ]
];

echo json_encode($info, JSON_PRETTY_PRINT);
?>