<?php
// Minimal backend index.php for testing API routing without framework dependencies
header('Content-Type: application/json');

// Get the API path from query parameter
$apiPath = $_GET['api_path'] ?? '';

// Simple routing without framework
$response = [
    'success' => true,
    'message' => 'Minimal backend API working',
    'api_path' => $apiPath,
    'timestamp' => date('c'),
    'request_info' => [
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'unknown', 
        'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'unknown'
    ]
];

// Handle different API endpoints
switch ($apiPath) {
    case 'health':
        $response['endpoint'] = 'health';
        $response['status'] = 'healthy';
        break;
        
    case 'routing-test':
        $response['endpoint'] = 'routing-test'; 
        $response['message'] = 'API routing test successful - rewrite is working!';
        $response['test_type'] = 'minimal_backend_routing';
        break;
        
    case '':
        $response['message'] = 'Minimal backend API root';
        $response['available_endpoints'] = ['/api/health', '/api/routing-test'];
        break;
        
    default:
        $response['endpoint'] = $apiPath;
        $response['message'] = 'Route handled by minimal backend';
        break;
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>