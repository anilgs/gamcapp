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

    public static function storeOTP(string $phone, string $otp): array {
        // Delete any existing OTPs for this phone number
        Database::query('DELETE FROM otp_tokens WHERE phone = ?', [$phone]);
        
        // Calculate expiry time
        $expiresAt = date('Y-m-d H:i:s', time() + self::OTP_EXPIRES_IN);
        
        // Store new OTP
        Database::query(
            'INSERT INTO otp_tokens (phone, otp, expires_at) VALUES (?, ?, ?)',
            [$phone, $otp, $expiresAt]
        );
        
        // Get the inserted OTP record
        $stmt = Database::query(
            'SELECT * FROM otp_tokens WHERE phone = ? ORDER BY created_at DESC LIMIT 1',
            [$phone]
        );
        
        return $stmt->fetch();
    }

    public static function verifyOTP(string $phone, string $otp): bool {
        $stmt = Database::query(
            'SELECT * FROM otp_tokens WHERE phone = ? AND otp = ? AND expires_at > NOW() AND used = FALSE',
            [$phone, $otp]
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

    public static function sendSMS(string $phone, string $message): array {
        // For development mode, log the message
        if ($_ENV['APP_ENV'] === 'development') {
            error_log("Development mode - SMS to {$phone}: {$message}");
        }
        
        // Extract OTP from message if present
        if (preg_match('/Your OTP is (\d+)/', $message, $matches)) {
            // In a real implementation, you would integrate with SMS service
            // For now, return success with logged OTP
            error_log("OTP SMS to {$phone}: " . $matches[1]);
            return [
                'success' => true,
                'messageId' => 'logged-' . time(),
                'otp' => $matches[1]
            ];
        }
        
        error_log("Non-OTP SMS to {$phone}: {$message}");
        return ['success' => true, 'messageId' => 'logged-' . time()];
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
        return preg_match('/^(91)?[6-9]\d{9}$/', $cleaned);
    }

    public static function checkOTPRateLimit(string $phone): bool {
        $now = time();
        $key = $phone;
        
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