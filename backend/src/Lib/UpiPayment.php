<?php
declare(strict_types=1);

namespace Gamcapp\Lib;

class UpiPayment {
    private const PAYMENT_AMOUNTS = [
        'employment_visa' => 350000, // ₹3,500
        'family_visa' => 300000,     // ₹3,000
        'visit_visa' => 250000,      // ₹2,500
        'student_visa' => 300000,    // ₹3,000
        'business_visa' => 400000,   // ₹4,000
        'other' => 350000           // ₹3,500 (default)
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
            
            // Convert amount from paise to rupees
            $amountInRupees = $amount / 100;
            
            // Generate UPI payment URL
            $upiUrl = self::generateUpiUrl([
                'vpa' => $merchantVPA,
                'name' => $merchantName,
                'amount' => $amountInRupees,
                'transaction_id' => $transactionId,
                'note' => $notes['appointment_type'] ?? 'GAMCA Medical Payment'
            ]);
            
            // Generate QR code data
            $qrData = self::generateQrCodeData($upiUrl);
            
            error_log('UPI payment request created successfully - Transaction ID: ' . $transactionId);
            
            return [
                'success' => true,
                'data' => [
                    'transaction_id' => $transactionId,
                    'amount' => $amount,
                    'amount_display' => self::formatAmount($amount),
                    'merchant_vpa' => $merchantVPA,
                    'merchant_name' => $merchantName,
                    'upi_url' => $upiUrl,
                    'qr_code_data' => $qrData,
                    'payment_apps' => self::getPopularUpiApps($upiUrl)
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
        // Return the UPI URL as QR code data
        // Frontend will use this to generate the actual QR code
        return $upiUrl;
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