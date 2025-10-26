<?php
declare(strict_types=1);

namespace Gamcapp\Lib;

class UpiPayment {
    private const PAYMENT_AMOUNTS = [
        'employment_visa' => 350, // ₹350
        'family_visa' => 300,     // ₹300
        'visit_visa' => 250,      // ₹250
        'student_visa' => 300,    // ₹300
        'business_visa' => 400,   // ₹400
        'other' => 350           // ₹350 (default)
    ];

    public static function getPaymentAmount(string $appointmentType): int {
        return self::PAYMENT_AMOUNTS[$appointmentType] ?? self::PAYMENT_AMOUNTS['other'];
    }

    public static function createPaymentRequest(array $paymentData): array {
        try {
            error_log('UPI createPaymentRequest called with data: ' . json_encode($paymentData, JSON_PRETTY_PRINT));
            
            $amount = $paymentData['amount'];
            $transactionId = $paymentData['transaction_id'];
            $notes = $paymentData['notes'] ?? [];
            
            // Get UPI configuration
            $merchantVPA = $_ENV['UPI_VIRTUAL_ADDRESS'] ?? '';
            $merchantName = $_ENV['UPI_MERCHANT_NAME'] ?? 'GAMCA Cochin Medical Services';
            
            if (empty($merchantVPA)) {
                error_log('UPI configuration error - Missing UPI_VIRTUAL_ADDRESS');
                throw new \Exception('UPI configuration missing. Please set UPI_VIRTUAL_ADDRESS environment variable.');
            }
            
            // Generate UPI payment URL
            $upiUrl = self::generateUpiUrl([
                'vpa' => $merchantVPA,
                'name' => $merchantName,
                'amount' => $amount,
                'transaction_id' => $transactionId,
                'note' => $notes['appointment_type'] ?? 'GAMCA Medical Payment'
            ]);
            
            // Generate QR code data
            $qrData = self::generateQrCodeData($upiUrl);
            
            // Generate app links in the format expected by frontend
            $appLinks = self::generateAppLinks($upiUrl);
            
            error_log('UPI payment request created successfully - Transaction ID: ' . $transactionId);
            
            return [
                'success' => true,
                'data' => [
                    'transaction_id' => $transactionId,
                    'reference_id' => $transactionId, // Frontend expects reference_id
                    'amount' => $amount,
                    'amount_display' => self::formatAmount($amount),
                    'merchant_vpa' => $merchantVPA,
                    'merchant_name' => $merchantName,
                    'upi_url' => $upiUrl,
                    'qr_code' => $qrData, // Frontend expects qr_code
                    'app_links' => $appLinks, // Frontend expects app_links as key-value pairs
                    'payment_apps' => self::getPopularUpiApps($upiUrl) // Keep for backwards compatibility
                ]
            ];
        } catch (\Exception $error) {
            error_log('UPI createPaymentRequest FAILED - Error: ' . $error->getMessage());
            return [
                'success' => false,
                'error' => $error->getMessage() ?: 'Failed to create UPI payment request'
            ];
        }
    }

    public static function verifyPayment(array $paymentData): array {
        try {
            $transactionId = $paymentData['transaction_id'] ?? '';
            $upiReferenceId = $paymentData['upi_reference_id'] ?? '';
            
            if (empty($transactionId)) {
                return [
                    'success' => false,
                    'error' => 'Missing transaction ID for verification'
                ];
            }
            
            // For UPI, we'll rely on manual confirmation or webhook
            // This is a placeholder for actual verification logic
            // In production, you would integrate with your bank's API or payment aggregator
            
            error_log('UPI payment verification initiated for transaction: ' . $transactionId);
            
            // For now, we'll assume verification is pending and requires manual confirmation
            return [
                'success' => true,
                'verified' => false, // Will be updated when payment is confirmed
                'status' => 'pending_confirmation',
                'message' => 'Payment initiated. Awaiting confirmation.'
            ];
        } catch (\Exception $error) {
            error_log('Error verifying UPI payment: ' . $error->getMessage());
            return [
                'success' => false,
                'error' => 'Payment verification error'
            ];
        }
    }

    public static function confirmPayment(string $transactionId, string $upiReferenceId): array {
        try {
            // This method would be called when payment is manually confirmed
            // or through webhook from payment processor
            
            error_log('UPI payment confirmed - Transaction: ' . $transactionId . ', Reference: ' . $upiReferenceId);
            
            return [
                'success' => true,
                'verified' => true,
                'transaction_id' => $transactionId,
                'upi_reference_id' => $upiReferenceId,
                'status' => 'completed'
            ];
        } catch (\Exception $error) {
            error_log('Error confirming UPI payment: ' . $error->getMessage());
            return [
                'success' => false,
                'error' => 'Payment confirmation error'
            ];
        }
    }

    private static function generateUpiUrl(array $params): string {
        $upiParams = [
            'pa' => $params['vpa'],           // Payee VPA
            'pn' => $params['name'],          // Payee Name
            'am' => $params['amount'],        // Amount
            'tr' => $params['transaction_id'], // Transaction Reference
            'tn' => $params['note'],          // Transaction Note
            'cu' => 'INR'                     // Currency
        ];
        
        $queryString = http_build_query($upiParams);
        return 'upi://pay?' . $queryString;
    }

    private static function generateQrCodeData(string $upiUrl): string {
        // Generate QR code data URL using a simple method
        // For production, you might want to use a proper QR code library like endroid/qr-code
        
        // For now, we'll use a QR code service (this is a simple approach)
        // In production, consider using a local QR code generator for security
        $encodedUrl = urlencode($upiUrl);
        return "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . $encodedUrl;
    }

    private static function getPopularUpiApps(string $upiUrl): array {
        // Popular UPI apps with their deep link formats
        return [
            [
                'name' => 'Google Pay',
                'package' => 'com.google.android.apps.nbu.paisa.user',
                'deep_link' => 'tez://upi/pay?' . parse_url($upiUrl, PHP_URL_QUERY),
                'icon' => 'gpay'
            ],
            [
                'name' => 'PhonePe',
                'package' => 'com.phonepe.app',
                'deep_link' => 'phonepe://pay?' . parse_url($upiUrl, PHP_URL_QUERY),
                'icon' => 'phonepe'
            ],
            [
                'name' => 'Paytm',
                'package' => 'net.one97.paytm',
                'deep_link' => 'paytmmp://pay?' . parse_url($upiUrl, PHP_URL_QUERY),
                'icon' => 'paytm'
            ],
            [
                'name' => 'BHIM',
                'package' => 'in.org.npci.upiapp',
                'deep_link' => $upiUrl,
                'icon' => 'bhim'
            ],
            [
                'name' => 'Amazon Pay',
                'package' => 'in.amazon.mShop.android.shopping',
                'deep_link' => $upiUrl,
                'icon' => 'amazon'
            ]
        ];
    }

    private static function generateAppLinks(string $upiUrl): array {
        // Generate app links in key-value format expected by frontend
        $queryString = parse_url($upiUrl, PHP_URL_QUERY);
        
        return [
            'googlepay' => 'tez://upi/pay?' . $queryString,
            'phonepe' => 'phonepe://pay?' . $queryString,
            'paytm' => 'paytmmp://pay?' . $queryString,
            'bhim' => $upiUrl,
            'amazonpay' => $upiUrl
        ];
    }

    public static function generateTransactionId(int $userId, string $appointmentType): string {
        $timestamp = time();
        $random = rand(1000, 9999);
        $userIdShort = substr((string)$userId, 0, 6);
        return "UPI_GAMCA_" . strtoupper($appointmentType) . "_{$userIdShort}_{$timestamp}_{$random}";
    }

    public static function formatAmount(int $amountInPaise): string {
        $rupees = $amountInPaise / 100;
        return '₹' . number_format($rupees, 0);
    }

    public static function getPaymentStatus(string $transactionId): array {
        try {
            // This would integrate with actual payment tracking system
            // For now, return a placeholder status
            
            return [
                'success' => true,
                'transaction_id' => $transactionId,
                'status' => 'pending', // pending, completed, failed
                'message' => 'Payment status check initiated'
            ];
        } catch (\Exception $error) {
            error_log('Error checking UPI payment status: ' . $error->getMessage());
            return [
                'success' => false,
                'error' => 'Status check failed'
            ];
        }
    }

    public static function isUpiEnabled(): bool {
        return filter_var($_ENV['UPI_ENABLED'] ?? 'true', FILTER_VALIDATE_BOOLEAN);
    }

    public static function validateUpiConfiguration(): array {
        $errors = [];
        
        if (empty($_ENV['UPI_VIRTUAL_ADDRESS'])) {
            $errors[] = 'UPI_VIRTUAL_ADDRESS not configured';
        }
        
        if (empty($_ENV['UPI_MERCHANT_NAME'])) {
            $errors[] = 'UPI_MERCHANT_NAME not configured';
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
}