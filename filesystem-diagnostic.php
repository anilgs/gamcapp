<?php
// File system diagnostic for deployment debugging
header('Content-Type: application/json');

$info = [
    'status' => 'success',
    'message' => 'File system diagnostic',
    'timestamp' => date('c'),
    'current_location' => [
        'script_path' => __FILE__,
        'current_dir' => getcwd(),
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown'
    ],
    'directory_contents' => [],
    'backend_search' => [],
    'vendor_search' => []
];

// Check current directory
if (is_dir('.')) {
    $contents = scandir('.');
    $info['directory_contents']['root'] = array_slice($contents, 0, 20);
}

// Look for backend directory in various locations
$backend_locations = [
    './backend',
    '../backend', 
    './backend/public',
    '../backend/public',
    '../../backend'
];

foreach ($backend_locations as $location) {
    if (is_dir($location)) {
        $info['backend_search'][$location] = [
            'exists' => true,
            'contents' => array_slice(scandir($location), 0, 10)
        ];
        
        // Check for vendor in this backend location
        if (is_dir($location . '/vendor')) {
            $info['vendor_search'][$location . '/vendor'] = [
                'exists' => true,
                'autoloader' => file_exists($location . '/vendor/autoload.php')
            ];
        }
    } else {
        $info['backend_search'][$location] = ['exists' => false];
    }
}

// Look for vendor directories
$vendor_locations = [
    './vendor',
    '../vendor',
    './backend/vendor',
    '../backend/vendor',
    '../../vendor'
];

foreach ($vendor_locations as $location) {
    if (is_dir($location)) {
        $info['vendor_search'][$location] = [
            'exists' => true,
            'autoloader' => file_exists($location . '/autoload.php'),
            'size' => is_dir($location) ? count(scandir($location)) - 2 : 0
        ];
    }
}

// Look for .env files
$env_locations = [
    './.env',
    '../.env', 
    './backend/.env',
    '../backend/.env',
    '../../.env'
];

foreach ($env_locations as $location) {
    if (file_exists($location)) {
        $content = file_get_contents($location);
        $info['env_search'][$location] = [
            'exists' => true,
            'size' => strlen($content),
            'lines' => substr_count($content, "\n") + 1,
            'has_db_host' => strpos($content, 'DB_HOST') !== false
        ];
    }
}

echo json_encode($info, JSON_PRETTY_PRINT);
?>