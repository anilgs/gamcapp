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

            // Check if database bypass mode is enabled
            $bypassDatabase = ($_ENV['BYPASS_PHONE_VERIFICATION'] ?? 'false') === 'true';
            
            if ($bypassDatabase) {
                error_log("Admin users endpoint bypassed - returning mock data");
                
                // Mock data for bypass mode
                $mockUsers = [
                    [
                        'id' => 1,
                        'name' => 'John Doe',
                        'email' => 'john@example.com',
                        'phone' => '+1234567890',
                        'passport_number' => 'A12345678',
                        'payment_status' => 'completed',
                        'appointment_details' => json_encode([
                            'appointment_type' => 'standard',
                            'medical_center' => 'GAMCA Mumbai',
                            'appointment_date' => '2025-09-15'
                        ]),
                        'created_at' => '2025-09-01 10:00:00',
                        'updated_at' => '2025-09-01 10:00:00'
                    ],
                    [
                        'id' => 2,
                        'name' => 'Jane Smith',
                        'email' => 'jane@example.com',
                        'phone' => '+1234567891',
                        'passport_number' => 'B87654321',
                        'payment_status' => 'pending',
                        'appointment_details' => json_encode([
                            'appointment_type' => 'premium',
                            'medical_center' => 'GAMCA Delhi',
                            'appointment_date' => '2025-09-20'
                        ]),
                        'created_at' => '2025-09-02 11:00:00',
                        'updated_at' => '2025-09-02 11:00:00'
                    ]
                ];

                $mockPagination = [
                    'current_page' => 1,
                    'total_pages' => 1,
                    'total_records' => 2,
                    'per_page' => 20,
                    'has_prev' => false,
                    'has_next' => false
                ];

                $mockStatistics = [
                    'total_users' => 2,
                    'paid_users' => 1,
                    'pending_users' => 1,
                    'total_revenue' => 1000
                ];

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'users' => $mockUsers,
                        'pagination' => $mockPagination,
                        'statistics' => $mockStatistics
                    ]
                ]);
                return;
            }

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