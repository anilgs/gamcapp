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
}