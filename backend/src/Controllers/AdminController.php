<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

use Gamcapp\Lib\Auth;
use Gamcapp\Models\User;

class AdminController {
    public function getUsers(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            Auth::requireAdminAuth();

            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 10);
            $filters = [
                'payment_status' => $_GET['payment_status'] ?? null,
                'search' => $_GET['search'] ?? null
            ];

            $result = User::findAll($page, $limit, array_filter($filters));

            echo json_encode([
                'success' => true,
                'data' => $result
            ]);

        } catch (\Exception $error) {
            error_log('Get users error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function uploadSlip(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            Auth::requireAdminAuth();

            // Handle file upload logic here
            echo json_encode([
                'success' => true,
                'message' => 'File upload functionality not implemented yet'
            ]);

        } catch (\Exception $error) {
            error_log('Upload slip error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
}