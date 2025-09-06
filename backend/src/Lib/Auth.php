<?php
declare(strict_types=1);

namespace Gamcapp\Lib;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Gamcapp\Core\Database;

class Auth {
    private const JWT_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds
    private const OTP_EXPIRES_IN = 10 * 60; // 10 minutes in seconds
    private const OTP_RATE_LIMIT_WINDOW = 60; // 1 minute
    private const OTP_RATE_LIMIT_MAX_REQUESTS = 3;

    private static array $otpRateLimit = [];

    public static function generateToken(array $payload): string {
        $payload['exp'] = time() + self::JWT_EXPIRES_IN;
        $payload['iat'] = time();
        
        return JWT::encode($payload, $_ENV['JWT_SECRET'], 'HS256');
    }

    public static function verifyToken(string $token): ?array {
        try {
            $decoded = JWT::decode($token, new Key($_ENV['JWT_SECRET'], 'HS256'));
            return (array) $decoded;
        } catch (\Exception $e) {
            error_log("Error verifying JWT token: " . $e->getMessage());
            return null;
        }
    }

    public static function generateOTP(): string {
        return sprintf("%06d", rand(100000, 999999));
    }

    public static function storeOTP(string $identifier, string $otp, string $type = 'email'): array {
        // Delete any existing OTPs for this identifier
        Database::query('DELETE FROM otp_tokens WHERE identifier = ? AND type = ?', [$identifier, $type]);
        
        // Calculate expiry time
        $expiresAt = date('Y-m-d H:i:s', time() + self::OTP_EXPIRES_IN);
        
        // Store new OTP
        Database::query(
            'INSERT INTO otp_tokens (identifier, otp, type, expires_at) VALUES (?, ?, ?, ?)',
            [$identifier, $otp, $type, $expiresAt]
        );
        
        // Get the inserted OTP record
        $stmt = Database::query(
            'SELECT * FROM otp_tokens WHERE identifier = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
            [$identifier, $type]
        );
        
        return $stmt->fetch();
    }

    public static function verifyOTP(string $identifier, string $otp, string $type = 'email'): bool {
        $stmt = Database::query(
            'SELECT * FROM otp_tokens WHERE identifier = ? AND otp = ? AND type = ? AND expires_at > NOW() AND used = FALSE',
            [$identifier, $otp, $type]
        );
        
        $otpRecord = $stmt->fetch();
        if (!$otpRecord) {
            return false;
        }
        
        // Mark OTP as used
        Database::query(
            'UPDATE otp_tokens SET used = TRUE WHERE id = ?',
            [$otpRecord['id']]
        );
        
        return true;
    }

    public static function cleanupExpiredOTPs(): int {
        $stmt = Database::query('DELETE FROM otp_tokens WHERE expires_at < NOW()');
        $count = $stmt->rowCount();
        error_log("Cleaned up {$count} expired OTPs");
        return $count;
    }

    public static function extractTokenFromRequest(): ?string {
        // Check Authorization header
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $parts = explode(' ', $headers['Authorization']);
            if (count($parts) === 2 && $parts[0] === 'Bearer') {
                return $parts[1];
            }
        }
        
        return null;
    }

    public static function requireAuth(): ?array {
        $token = self::extractTokenFromRequest();
        
        if (!$token) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'No token provided']);
            exit;
        }
        
        $decoded = self::verifyToken($token);
        
        if (!$decoded) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
            exit;
        }
        
        return $decoded;
    }

    public static function requireAdminAuth(): ?array {
        $decoded = self::requireAuth();
        
        if (!$decoded || $decoded['type'] !== 'admin') {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Admin access required']);
            exit;
        }
        
        return $decoded;
    }

    public static function getUserFromToken(string $token): ?array {
        $decoded = self::verifyToken($token);
        
        if (!$decoded) {
            return null;
        }
        
        if ($decoded['type'] === 'user') {
            $stmt = Database::query('SELECT * FROM users WHERE id = ?', [$decoded['id']]);
            return $stmt->fetch() ?: null;
        } elseif ($decoded['type'] === 'admin') {
            $stmt = Database::query('SELECT * FROM admins WHERE id = ?', [$decoded['id']]);
            return $stmt->fetch() ?: null;
        }
        
        return null;
    }

    public static function sendEmail(string $to, string $subject, string $otp): array {
        try {
            // Prepare email content
            $message = "
            <html>
            <head>
                <title>GAMCA Medical Verification Code</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .otp-code { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; }
                    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>🏥 GAMCA Medical Verification</h1>
                        <p>Your secure verification code</p>
                    </div>
                    <div class='content'>
                        <h2>Hello!</h2>
                        <p>You have requested a verification code for your GAMCA medical appointment booking. Please use the code below to complete your verification:</p>
                        
                        <div class='otp-code'>{$otp}</div>
                        
                        <div class='warning'>
                            <strong>⚠️ Important:</strong>
                            <ul>
                                <li>This code will expire in <strong>10 minutes</strong></li>
                                <li>Do not share this code with anyone</li>
                                <li>GAMCA will never ask for this code via phone or email</li>
                            </ul>
                        </div>
                        
                        <p>If you didn't request this verification code, please ignore this email. Your account remains secure.</p>
                        
                        <p>Thank you for choosing GAMCA Medical Services.</p>
                    </div>
                    <div class='footer'>
                        <p>© 2024 GAMCA Medical Services | Professional Medical Verification Platform</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            ";

            // Email headers
            $headers = [
                'MIME-Version: 1.0',
                'Content-type: text/html; charset=UTF-8',
                'From: ' . ($_ENV['FROM_NAME'] ?? 'GAMCA Medical Services') . ' <' . ($_ENV['FROM_EMAIL'] ?? 'noreply@gamca-wafid.com') . '>',
                'Reply-To: ' . ($_ENV['ADMIN_EMAIL'] ?? 'admin@gamca-wafid.com'),
                'X-Mailer: PHP/' . phpversion(),
                'X-Priority: 1',
                'Importance: High'
            ];

            // For development mode, log the email
            if ($_ENV['APP_ENV'] === 'development') {
                error_log("Development mode - Email to {$to}: Subject: {$subject}, OTP: {$otp}");
                return [
                    'success' => true,
                    'messageId' => 'dev-email-' . time(),
                    'otp' => $otp
                ];
            }

            // Check if SMTP configuration is available
            if (isset($_ENV['SMTP_HOST']) && $_ENV['SMTP_HOST']) {
                // Use PHPMailer for SMTP
                require_once __DIR__ . '/../../vendor/autoload.php';
                
                $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
                
                try {
                    // Server settings
                    $mail->isSMTP();
                    $mail->Host = $_ENV['SMTP_HOST'];
                    $mail->SMTPAuth = true;
                    $mail->Username = $_ENV['SMTP_USER'];
                    $mail->Password = $_ENV['SMTP_PASS'];
                    $mail->SMTPSecure = $_ENV['SMTP_SECURE'] === 'true' ? \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS : false;
                    $mail->Port = intval($_ENV['SMTP_PORT'] ?? 587);

                    // Recipients
                    $mail->setFrom($_ENV['FROM_EMAIL'] ?? 'noreply@gamca-wafid.com', $_ENV['FROM_NAME'] ?? 'GAMCA Medical Services');
                    $mail->addAddress($to);
                    $mail->addReplyTo($_ENV['ADMIN_EMAIL'] ?? 'admin@gamca-wafid.com', 'GAMCA Support');

                    // Content
                    $mail->isHTML(true);
                    $mail->Subject = $subject;
                    $mail->Body = $message;
                    $mail->AltBody = "Your GAMCA verification code is: {$otp}. This code will expire in 10 minutes. Do not share this code with anyone.";

                    $mail->send();
                    return [
                        'success' => true,
                        'messageId' => 'smtp-' . time(),
                        'method' => 'smtp'
                    ];
                } catch (\PHPMailer\PHPMailer\Exception $e) {
                    error_log("SMTP Error: " . $e->getMessage());
                    // Fall back to PHP mail()
                }
            }

            // Fallback to PHP mail() function
            $success = mail($to, $subject, $message, implode("\r\n", $headers));
            
            if ($success) {
                return [
                    'success' => true,
                    'messageId' => 'mail-' . time(),
                    'method' => 'php_mail'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to send email'
                ];
            }

        } catch (\Exception $e) {
            error_log("Email sending error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Email sending failed: ' . $e->getMessage()
            ];
        }
    }

    public static function formatEmail(string $email): string {
        return strtolower(trim($email));
    }

    public static function isValidEmail(string $email): bool {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function sendSMS(string $phone, string $message): array {
        // For development mode, log the message
        if ($_ENV['APP_ENV'] === 'development') {
            error_log("Development mode - SMS to {$phone}: {$message}");
        }
        
        // Extract OTP from message if present
        if (preg_match('/Your GAMCA verification code is: (\d+)/', $message, $matches)) {
            // In a real implementation, you would integrate with SMS service
            // For now, return success with logged OTP
            error_log("OTP SMS to {$phone}: " . $matches[1]);
            return [
                'success' => true,
                'messageId' => 'sms-logged-' . time(),
                'otp' => $matches[1]
            ];
        }
        
        error_log("Non-OTP SMS to {$phone}: {$message}");
        return ['success' => true, 'messageId' => 'sms-logged-' . time()];
    }

    public static function formatPhoneNumber(string $phone): string {
        // Remove all non-digit characters
        $cleaned = preg_replace('/\D/', '', $phone);
        
        // Add country code if not present (assuming India +91)
        if (strlen($cleaned) === 10) {
            return '+91' . $cleaned;
        } elseif (strlen($cleaned) === 12 && str_starts_with($cleaned, '91')) {
            return '+' . $cleaned;
        } elseif (strlen($cleaned) === 13 && str_starts_with($cleaned, '91')) {
            return '+' . substr($cleaned, 1);
        }
        
        return $phone; // Return as-is if format is unclear
    }

    public static function isValidPhoneNumber(string $phone): bool {
        $cleaned = preg_replace('/\D/', '', $phone);
        return (bool) preg_match('/^(91)?[6-9]\d{9}$/', $cleaned);
    }

    public static function checkOTPRateLimit(string $identifier): bool {
        $now = time();
        $key = $identifier;
        
        if (!isset(self::$otpRateLimit[$key])) {
            self::$otpRateLimit[$key] = [
                'count' => 1,
                'resetTime' => $now + self::OTP_RATE_LIMIT_WINDOW
            ];
            return true;
        }
        
        $limit = self::$otpRateLimit[$key];
        
        if ($now > $limit['resetTime']) {
            // Reset the limit
            self::$otpRateLimit[$key] = [
                'count' => 1,
                'resetTime' => $now + self::OTP_RATE_LIMIT_WINDOW
            ];
            return true;
        }
        
        if ($limit['count'] >= self::OTP_RATE_LIMIT_MAX_REQUESTS) {
            return false;
        }
        
        self::$otpRateLimit[$key]['count']++;
        return true;
    }
}