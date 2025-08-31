<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

class HealthController {
    public function check(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            echo json_encode([
                'success' => true,
                'message' => 'API is healthy',
                'timestamp' => date('c'),
                'version' => '1.0.0'
            ]);

        } catch (\Exception $error) {
            error_log('Health check error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function routingTest(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            echo json_encode([
                'success' => true,
                'message' => 'API routing is working correctly',
                'test_type' => 'backend_routing_test',
                'timestamp' => date('c'),
                'request_info' => [
                    'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
                    'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'unknown',
                    'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'unknown',
                    'api_path' => $_GET['api_path'] ?? 'not provided'
                ],
                'rewrite_confirmation' => 'If you see this via /api/routing-test, .htaccess rewrite is working'
            ]);

        } catch (\Exception $error) {
            error_log('Routing test error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
}