<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

class NotificationController {
    public function paymentSuccess(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            echo json_encode([
                'success' => true,
                'message' => 'Payment success notification received'
            ]);

        } catch (\Exception $error) {
            error_log('Payment success notification error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
}