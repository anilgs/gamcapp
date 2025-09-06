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
            error_log("sendOtp: Starting request processing");
            $input = json_decode(file_get_contents('php://input'), true);
            error_log("sendOtp: Input data: " . json_encode($input));
            $identifier = $input['identifier'] ?? null;
            $type = $input['type'] ?? 'email'; // Default to email
            error_log("sendOtp: Identifier: {$identifier}, Type: {$type}");

            if (!$identifier) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => ucfirst($type) . ' is required']);
                return;
            }

            // Validate identifier based on type
            if ($type === 'email') {
                $formattedIdentifier = Auth::formatEmail($identifier);
                if (!Auth::isValidEmail($formattedIdentifier)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid email address format']);
                    return;
                }
            } else {
                // Format and validate phone number
                $formattedIdentifier = Auth::formatPhoneNumber($identifier);
                if (!Auth::isValidPhoneNumber($formattedIdentifier)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid phone number format']);
                    return;
                }
            }

            // Check if OTP verification bypass is enabled
            $bypassOtpVerification = ($_ENV['BYPASS_OTP_VERIFICATION'] ?? 'false') === 'true';
            
            if ($bypassOtpVerification) {
                error_log("OTP verification bypassed for {$formattedIdentifier} ({$type}) - OTP: 123456");
                echo json_encode([
                    'success' => true,
                    'message' => 'OTP sent successfully (bypass mode)',
                    'data' => [
                        'identifier' => $formattedIdentifier,
                        'type' => $type,
                        'otp' => '123456',
                        'expiresIn' => 600
                    ]
                ]);
                return;
            }

            // Check rate limiting
            if (!Auth::checkOTPRateLimit($formattedIdentifier)) {
                http_response_code(429);
                echo json_encode(['success' => false, 'error' => 'Too many OTP requests. Please try again later.']);
                return;
            }

            // Generate OTP
            $otp = Auth::generateOTP();

            // Store OTP in database
            Auth::storeOTP($formattedIdentifier, $otp, $type);

            if ($type === 'email') {
                // Send email OTP
                $emailResult = Auth::sendEmail(
                    $formattedIdentifier,
                    'GAMCA Medical Verification Code',
                    $otp
                );
                
                if (!$emailResult['success']) {
                    error_log('Email sending failed: ' . json_encode($emailResult));
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Failed to send verification code. Please try again.']);
                    return;
                }

                error_log("OTP sent successfully to {$formattedIdentifier} via email. Message ID: {$emailResult['messageId']}");

                echo json_encode([
                    'success' => true,
                    'message' => 'Verification code sent to your email',
                    'data' => [
                        'identifier' => $formattedIdentifier,
                        'type' => $type,
                        'messageId' => $emailResult['messageId'],
                        'expiresIn' => 600
                    ]
                ]);
            } else {
                // Send SMS OTP
                $message = "Your GAMCA verification code is: {$otp}. This code will expire in 10 minutes. Do not share this code with anyone.";
                $smsResult = Auth::sendSMS($formattedIdentifier, $message);
                
                if (!$smsResult['success']) {
                    error_log('SMS sending failed: ' . json_encode($smsResult));
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Failed to send verification code. Please try again.']);
                    return;
                }

                error_log("OTP sent successfully to {$formattedIdentifier} via SMS. Message ID: {$smsResult['messageId']}");

                echo json_encode([
                    'success' => true,
                    'message' => 'Verification code sent to your phone',
                    'data' => [
                        'identifier' => $formattedIdentifier,
                        'type' => $type,
                        'messageId' => $smsResult['messageId'],
                        'expiresIn' => 600
                    ]
                ]);
            }

        } catch (\Exception $error) {
            error_log('Send OTP error: ' . $error->getMessage());
            error_log('Send OTP stack trace: ' . $error->getTraceAsString());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error: ' . $error->getMessage()]);
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
            $identifier = $input['identifier'] ?? null;
            $otp = $input['otp'] ?? null;
            $type = $input['type'] ?? 'email'; // Default to email
            $name = $input['name'] ?? null;
            $email = $input['email'] ?? null;
            $passportNumber = $input['passportNumber'] ?? null;

            if (!$identifier || !$otp) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => ucfirst($type) . ' and OTP are required']);
                return;
            }

            // For email type, email should be the same as identifier
            if ($type === 'email' && !$email) {
                $email = $identifier;
            }

            // Format identifier based on type
            if ($type === 'email') {
                $formattedIdentifier = Auth::formatEmail($identifier);
                if (!Auth::isValidEmail($formattedIdentifier)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid email address format']);
                    return;
                }
            } else {
                $formattedIdentifier = Auth::formatPhoneNumber($identifier);
                if (!Auth::isValidPhoneNumber($formattedIdentifier)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid phone number format']);
                    return;
                }
            }

            // Check bypass mode
            $bypassOtpVerification = ($_ENV['BYPASS_OTP_VERIFICATION'] ?? 'false') === 'true';
            
            error_log("Bypass mode: " . ($bypassOtpVerification ? 'true' : 'false'));
            error_log("OTP provided: " . $otp);
            error_log("Identifier: " . $formattedIdentifier . ", Type: " . $type);
            
            if ($bypassOtpVerification) {
                $isValidOtp = ($otp === '123456');
                error_log("Bypass OTP validation result: " . ($isValidOtp ? 'valid' : 'invalid'));
            } else {
                $isValidOtp = Auth::verifyOTP($formattedIdentifier, $otp, $type);
            }

            if (!$isValidOtp) {
                error_log("OTP validation failed. Bypass: " . ($bypassOtpVerification ? 'true' : 'false') . ", OTP: " . $otp);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid or expired OTP']);
                return;
            }

            // Find or create user
            if ($bypassOtpVerification) {
                // In bypass mode, create a mock user for testing
                $user = (object) [
                    'id' => 1,
                    'name' => $name ?? 'Test User',
                    'email' => $email ?? 'test@example.com',
                    'phone' => $type === 'phone' ? $formattedIdentifier : '+1234567890',
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
                // Find user by email or phone depending on type
                if ($type === 'email') {
                    $user = User::findByEmail($formattedIdentifier);
                } else {
                    $user = User::findByPhone($formattedIdentifier);
                }
                
                if (!$user) {
                    // Create new user with minimal required information
                    // Additional details will be collected during appointment booking
                    $userData = [
                        'name' => $name ?? 'New User', // Temporary name, will be updated in appointment form
                        'email' => $email ?? $formattedIdentifier, // Use identifier as email if not provided
                        'phone' => $type === 'phone' ? $formattedIdentifier : '+1234567890', // Default phone if email verification
                        'passport_number' => $passportNumber ?? 'TEMP-' . uniqid() // Temporary passport number until collected
                    ];
                    $user = User::create($userData);
                }
            }

            // Generate JWT token
            $token = Auth::generateToken([
                'id' => $user->id,
                'email' => $user->email,
                'phone' => $user->phone,
                'type' => 'user'
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'OTP verified successfully',
                'data' => [
                    'token' => $token,
                    'user' => $bypassOtpVerification ? call_user_func($user->toArray) : $user->toArray()
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
            $bypassOtpVerification = ($_ENV['BYPASS_OTP_VERIFICATION'] ?? 'false') === 'true';

            if ($decoded['type'] === 'user') {
                if ($bypassOtpVerification) {
                    // Create mock user for bypass mode
                    $user = (object) [
                        'id' => $decoded['id'],
                        'name' => 'Test User',
                        'email' => $decoded['email'] ?? 'test@example.com',
                        'phone' => $decoded['phone'] ?? '+919876543210',
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
            $bypassOtpVerification = ($_ENV['BYPASS_OTP_VERIFICATION'] ?? 'false') === 'true';
            
            if ($bypassOtpVerification) {
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