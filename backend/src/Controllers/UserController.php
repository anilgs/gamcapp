<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

use Gamcapp\Lib\Auth;
use Gamcapp\Models\User;

class UserController {
    public function getProfile(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $userId = $decoded['id'];

            $user = User::findById($userId);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'User not found']);
                return;
            }

            echo json_encode([
                'success' => true,
                'data' => ['user' => $user->toArray()]
            ]);

        } catch (\Exception $error) {
            error_log('Get profile error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
}