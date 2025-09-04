<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

use Gamcapp\Lib\Auth;
use Gamcapp\Models\User;
use Gamcapp\Models\Admin;

class AuthController {
    public function sendOtp(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $phone = $input['phone'] ?? null;

            if (!$phone) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Phone number is required']);
                return;
            }

            // Format and validate phone number
            $formattedPhone = Auth::formatPhoneNumber($phone);
            
            if (!Auth::isValidPhoneNumber($formattedPhone)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid phone number format']);
                return;
            }

            // Check if phone verification bypass is enabled
            $bypassPhoneVerification = ($_ENV['BYPASS_PHONE_VERIFICATION'] ?? 'false') === 'true';
            
            if ($bypassPhoneVerification) {
                error_log("Phone verification bypassed for {$formattedPhone} - OTP: 123456");
                echo json_encode([
                    'success' => true,
                    'message' => 'OTP sent successfully (bypass mode)',
                    'data' => [
                        'phone' => $formattedPhone,
                        'otp' => '123456',
                        'expiresIn' => 600
                    ]
                ]);
                return;
            }

            // Check rate limiting
            if (!Auth::checkOTPRateLimit($formattedPhone)) {
                http_response_code(429);
                echo json_encode(['success' => false, 'error' => 'Too many OTP requests. Please try again later.']);
                return;
            }

            // Generate OTP
            $otp = Auth::generateOTP();

            // Store OTP in database
            Auth::storeOTP($formattedPhone, $otp);

            // Prepare SMS message
            $message = "Your GAMCA verification code is: {$otp}. This code will expire in 10 minutes. Do not share this code with anyone.";

            // Send SMS
            $smsResult = Auth::sendSMS($formattedPhone, $message);
            
            if (!$smsResult['success']) {
                error_log('SMS sending failed: ' . json_encode($smsResult));
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to send OTP. Please try again.']);
                return;
            }

            error_log("OTP sent successfully to {$formattedPhone}. Message ID: {$smsResult['messageId']}");

            echo json_encode([
                'success' => true,
                'message' => 'OTP sent successfully',
                'data' => [
                    'phone' => $formattedPhone,
                    'messageId' => $smsResult['messageId'],
                    'expiresIn' => 600
                ]
            ]);

        } catch (\Exception $error) {
            error_log('Send OTP error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function verifyOtp(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $phone = $input['phone'] ?? null;
            $otp = $input['otp'] ?? null;
            $name = $input['name'] ?? null;
            $email = $input['email'] ?? null;
            $passportNumber = $input['passportNumber'] ?? null;

            if (!$phone || !$otp) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Phone number and OTP are required']);
                return;
            }

            $formattedPhone = Auth::formatPhoneNumber($phone);

            // Check bypass mode
            $bypassPhoneVerification = ($_ENV['BYPASS_PHONE_VERIFICATION'] ?? 'false') === 'true';
            
            error_log("Bypass mode: " . ($bypassPhoneVerification ? 'true' : 'false'));
            error_log("OTP provided: " . $otp);
            
            if ($bypassPhoneVerification) {
                $isValidOtp = ($otp === '123456');
                error_log("Bypass OTP validation result: " . ($isValidOtp ? 'valid' : 'invalid'));
            } else {
                $isValidOtp = Auth::verifyOTP($formattedPhone, $otp);
            }

            if (!$isValidOtp) {
                error_log("OTP validation failed. Bypass: " . ($bypassPhoneVerification ? 'true' : 'false') . ", OTP: " . $otp);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid or expired OTP']);
                return;
            }

            // Find or create user
            if ($bypassPhoneVerification) {
                // In bypass mode, create a mock user for testing
                $user = (object) [
                    'id' => 1,
                    'name' => $name ?? 'Test User',
                    'email' => $email ?? 'test@example.com',
                    'phone' => $formattedPhone,
                    'passport_number' => $passportNumber ?? 'TEST123456',
                    'payment_status' => 'pending',
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                
                // Add toArray method behavior
                $user->toArray = function() use ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone,
                        'passport_number' => $user->passport_number,
                        'payment_status' => $user->payment_status,
                        'created_at' => $user->created_at,
                        'updated_at' => $user->updated_at
                    ];
                };
            } else {
                $user = User::findByPhone($formattedPhone);
                
                if (!$user && $name && $email && $passportNumber) {
                    // Create new user
                    $userData = [
                        'name' => $name,
                        'email' => $email,
                        'phone' => $formattedPhone,
                        'passport_number' => $passportNumber
                    ];
                    $user = User::create($userData);
                } elseif (!$user) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'User not found. Please provide registration details.']);
                    return;
                }
            }

            // Generate JWT token
            $token = Auth::generateToken([
                'id' => $user->id,
                'phone' => $user->phone,
                'type' => 'user'
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'OTP verified successfully',
                'data' => [
                    'token' => $token,
                    'user' => $bypassPhoneVerification ? call_user_func($user->toArray) : $user->toArray()
                ]
            ]);

        } catch (\Exception $error) {
            error_log('Verify OTP error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function adminLogin(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $username = $input['username'] ?? null;
            $password = $input['password'] ?? null;

            if (!$username || !$password) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Username and password are required']);
                return;
            }

            $admin = Admin::authenticate($username, $password);

            if (!$admin) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
                return;
            }

            // Generate JWT token
            $token = Auth::generateToken([
                'id' => $admin->id,
                'username' => $admin->username,
                'type' => 'admin'
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'data' => [
                    'token' => $token,
                    'admin' => $admin->toArray()
                ]
            ]);

        } catch (\Exception $error) {
            error_log('Admin login error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function verifyToken(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();

            // Check bypass mode
            $bypassPhoneVerification = ($_ENV['BYPASS_PHONE_VERIFICATION'] ?? 'false') === 'true';

            if ($decoded['type'] === 'user') {
                if ($bypassPhoneVerification) {
                    // Create mock user for bypass mode
                    $user = (object) [
                        'id' => $decoded['id'],
                        'name' => 'Test User',
                        'email' => 'test@example.com',
                        'phone' => $decoded['phone'],
                        'passport_number' => 'TEST123456',
                        'payment_status' => 'pending',
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s')
                    ];
                    
                    echo json_encode([
                        'success' => true,
                        'data' => [
                            'user' => [
                                'id' => $user->id,
                                'name' => $user->name,
                                'email' => $user->email,
                                'phone' => $user->phone,
                                'passport_number' => $user->passport_number,
                                'payment_status' => $user->payment_status,
                                'created_at' => $user->created_at,
                                'updated_at' => $user->updated_at
                            ],
                            'type' => 'user'
                        ]
                    ]);
                } else {
                    $user = User::findById($decoded['id']);
                    if (!$user) {
                        http_response_code(401);
                        echo json_encode(['success' => false, 'error' => 'User not found']);
                        return;
                    }

                    echo json_encode([
                        'success' => true,
                        'data' => [
                            'user' => $user->toArray(),
                            'type' => 'user'
                        ]
                    ]);
                }
            } elseif ($decoded['type'] === 'admin') {
                $admin = Admin::findById($decoded['id']);
                if (!$admin) {
                    http_response_code(401);
                    echo json_encode(['success' => false, 'error' => 'Admin not found']);
                    return;
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'admin' => $admin->toArray(),
                        'type' => 'admin'
                    ]
                ]);
            }

        } catch (\Exception $error) {
            error_log('Verify token error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function logout(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        // For JWT tokens, logout is handled client-side by removing the token
        echo json_encode([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    public function changePassword(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $currentPassword = $input['currentPassword'] ?? null;
            $newPassword = $input['newPassword'] ?? null;

            if (!$currentPassword || !$newPassword) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Current password and new password are required']);
                return;
            }

            // Validate new password strength
            if (strlen($newPassword) < 6) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'New password must be at least 6 characters long']);
                return;
            }

            // Get token from Authorization header
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'No token provided']);
                return;
            }

            $token = substr($authHeader, 7);
            $payload = Auth::verifyToken($token);

            if (!$payload || $payload['type'] !== 'user') {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Invalid token']);
                return;
            }

            // Check if bypass mode is enabled
            $bypassPhoneVerification = ($_ENV['BYPASS_PHONE_VERIFICATION'] ?? 'false') === 'true';
            
            if ($bypassPhoneVerification) {
                // In bypass mode, accept any current password and update with new password
                error_log("Password change bypassed for user ID {$payload['id']}");
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Password changed successfully (bypass mode)'
                ]);
                return;
            }

            // In production, verify current password and update to new password
            $user = User::findById($payload['id']);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'User not found']);
                return;
            }

            // Verify current password
            if (!$user->verifyPassword($currentPassword)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Current password is incorrect']);
                return;
            }

            // Update to new password
            $user->updatePassword($newPassword);

            echo json_encode([
                'success' => true,
                'message' => 'Password changed successfully'
            ]);

        } catch (\Exception $error) {
            error_log('Change password error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
}