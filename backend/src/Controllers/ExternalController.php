<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

use Gamcapp\Lib\Auth;

class ExternalController {
    public function bookWafid(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            Auth::requireAuth();

            echo json_encode([
                'success' => true,
                'message' => 'WAFID booking integration not implemented yet'
            ]);

        } catch (\Exception $error) {
            error_log('Book WAFID error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
}