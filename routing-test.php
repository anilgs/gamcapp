<?php
// API routing test file
header('Content-Type: application/json');

$info = [
    'status' => 'success',
    'message' => 'API routing test',
    'timestamp' => date('c'),
    'request_info' => [
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'unknown',
        'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? 'unknown',
        'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'] ?? 'unknown'
    ],
    'get_params' => $_GET,
    'post_params' => $_POST,
    'api_path_param' => $_GET['api_path'] ?? 'not provided',
    'rewrite_test' => [
        'message' => 'If you see this via /api/routing-test, .htaccess rewrite is working'
    ]
];

echo json_encode($info, JSON_PRETTY_PRINT);
?>