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

    public function adminAuthTest(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $testResults = [];
            $allTestsPassed = true;

            // Test 1: Check if admin user exists
            try {
                $admin = \Gamcapp\Models\Admin::findByUsername('admin');
                if ($admin) {
                    $testResults['admin_exists'] = [
                        'passed' => true,
                        'message' => "Admin user 'admin' found (ID: {$admin->id})",
                        'details' => [
                            'id' => $admin->id,
                            'email' => $admin->email,
                            'is_active' => $admin->is_active
                        ]
                    ];
                } else {
                    $testResults['admin_exists'] = [
                        'passed' => false,
                        'message' => "Admin user 'admin' not found"
                    ];
                    $allTestsPassed = false;
                }
            } catch (\Exception $e) {
                $testResults['admin_exists'] = [
                    'passed' => false,
                    'message' => 'Error checking admin user: ' . $e->getMessage()
                ];
                $allTestsPassed = false;
            }

            // Test 2: Test password verification with correct password
            try {
                $authResult = \Gamcapp\Models\Admin::authenticate('admin', 'admin123');
                if ($authResult) {
                    $testResults['password_verification'] = [
                        'passed' => true,
                        'message' => "Authentication successful with default password",
                        'details' => [
                            'authenticated_admin_id' => $authResult->id,
                            'username' => $authResult->username
                        ]
                    ];
                } else {
                    $testResults['password_verification'] = [
                        'passed' => false,
                        'message' => "Authentication failed with default password 'admin123'"
                    ];
                    $allTestsPassed = false;
                }
            } catch (\Exception $e) {
                $testResults['password_verification'] = [
                    'passed' => false,
                    'message' => 'Error testing password verification: ' . $e->getMessage()
                ];
                $allTestsPassed = false;
            }

            // Test 3: Test password verification with wrong password
            try {
                $wrongAuthResult = \Gamcapp\Models\Admin::authenticate('admin', 'wrongpassword');
                if ($wrongAuthResult) {
                    $testResults['wrong_password_rejection'] = [
                        'passed' => false,
                        'message' => "Authentication unexpectedly succeeded with wrong password"
                    ];
                    $allTestsPassed = false;
                } else {
                    $testResults['wrong_password_rejection'] = [
                        'passed' => true,
                        'message' => "Authentication correctly failed with wrong password"
                    ];
                }
            } catch (\Exception $e) {
                $testResults['wrong_password_rejection'] = [
                    'passed' => false,
                    'message' => 'Error testing wrong password rejection: ' . $e->getMessage()
                ];
                $allTestsPassed = false;
            }

            // Test 4: Direct password hash verification
            try {
                $storedHash = '$argon2id$v=19$m=1024,t=2,p=2$WTVBQjYwS3FvcHNyY1JzUA$+3vzlfS0Vilea8C2BV/4ugt3VdHjbOUbCfLgj7xSp0M';
                $isValid = password_verify('admin123', $storedHash);
                $testResults['password_hash_verification'] = [
                    'passed' => $isValid,
                    'message' => $isValid ? "Password hash verification successful" : "Password hash verification failed"
                ];
                if (!$isValid) {
                    $allTestsPassed = false;
                }
            } catch (\Exception $e) {
                $testResults['password_hash_verification'] = [
                    'passed' => false,
                    'message' => 'Error testing password hash verification: ' . $e->getMessage()
                ];
                $allTestsPassed = false;
            }

            echo json_encode([
                'success' => $allTestsPassed,
                'message' => $allTestsPassed ? 'All admin authentication tests passed' : 'Some admin authentication tests failed',
                'test_type' => 'admin_authentication_test',
                'timestamp' => date('c'),
                'test_results' => $testResults,
                'summary' => [
                    'total_tests' => count($testResults),
                    'passed_tests' => count(array_filter($testResults, fn($test) => $test['passed'])),
                    'failed_tests' => count(array_filter($testResults, fn($test) => !$test['passed']))
                ]
            ]);

        } catch (\Exception $error) {
            error_log('Admin auth test error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Internal server error during admin auth test',
                'details' => $error->getMessage()
            ]);
        }
    }
}