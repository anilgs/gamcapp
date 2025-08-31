<?php
// Simple PHP test file for deployment verification
header('Content-Type: application/json');

$info = [
    'status' => 'success',
    'message' => 'PHP is working correctly',
    'timestamp' => date('c'),
    'server_info' => [
        'php_version' => phpversion(),
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
        'script_name' => $_SERVER['SCRIPT_NAME'] ?? 'unknown',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown'
    ],
    'file_checks' => [
        'autoloader_exists' => file_exists(__DIR__ . '/../vendor/autoload.php'),
        'env_file_exists' => file_exists(__DIR__ . '/../.env'),
        'current_directory' => __DIR__,
        'parent_directory_contents' => is_dir(__DIR__ . '/..') ? array_slice(scandir(__DIR__ . '/..'), 0, 10) : 'cannot read'
    ]
];

echo json_encode($info, JSON_PRETTY_PRINT);