<?php
declare(strict_types=1);

namespace Gamcapp\Lib;

use Razorpay\Api\Api;

class Razorpay {
    private static ?Api $api = null;
    
    private const PAYMENT_AMOUNTS = [
        'employment_visa' => 350000, // ₹3,500
        'family_visa' => 300000,     // ₹3,000
        'visit_visa' => 250000,      // ₹2,500
        'student_visa' => 300000,    // ₹3,000
        'business_visa' => 400000,   // ₹4,000
        'other' => 350000           // ₹3,500 (default)
    ];

    private static function getApi(): Api {
        if (self::$api === null) {
            $keyId = $_ENV['RAZORPAY_KEY_ID'] ?? '';
            $keySecret = $_ENV['RAZORPAY_KEY_SECRET'] ?? '';
            
            // Log initialization attempt
            error_log('Initializing RazorPay API - Key ID length: ' . strlen($keyId) . 
                     ', Key Secret length: ' . strlen($keySecret));
            
            if (empty($keyId) || empty($keySecret)) {
                error_log('RazorPay configuration error - Missing credentials in environment variables');
                throw new \Exception('RazorPay configuration missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
            }
            
            // Validate key format (Razorpay key IDs start with 'rzp_')
            if (!str_starts_with($keyId, 'rzp_')) {
                error_log('RazorPay configuration warning - Key ID does not start with "rzp_": ' . substr($keyId, 0, 10) . '...');
            }
            
            // SSL Certificate Path Resolution for Production Environment
            $currentDir = getcwd();
            $backendDir = dirname(__DIR__, 2); // Go up two levels from src/Lib to backend root
            
            // Try certificate filenames in order of preference (exclude checksum files)
            $certPaths = [
                $backendDir . '/vendor/rmccue/requests/certificates/cacert.pem',         // Standard certificate bundle
                $backendDir . '/vendor/rmccue/requests/certificates/cacert.pem.sha256'  // Potential certificate file (not checksum)
            ];
            
            $certPath = null;
            foreach ($certPaths as $path) {
                if (file_exists($path) && filesize($path) > 10000) { // Ensure it's a proper certificate bundle (>10KB)
                    $certPath = $path;
                    break;
                }
            }
            
            // Configure SSL/cURL options to ensure certificate is found across different hosting environments
            if ($certPath) {
                // Set environment variable for cURL (works with most hosting providers)
                putenv('CURL_CA_BUNDLE=' . $certPath);
                
                // Set SSL context for stream-based requests
                stream_context_set_default([
                    'ssl' => [
                        'cafile' => $certPath,
                        'verify_peer' => true,
                        'verify_peer_name' => true,
                        'allow_self_signed' => false
                    ]
                ]);
                
                // Configure Requests library with absolute certificate path
                try {
                    if (class_exists('\WpOrg\Requests\Requests')) {
                        \WpOrg\Requests\Requests::set_certificate_path($certPath);
                    } elseif (class_exists('\Requests')) {
                        \Requests::set_certificate_path($certPath);
                    }
                } catch (\Exception $certError) {
                    error_log('RazorPay SSL - Warning: ' . $certError->getMessage());
                }
                
                error_log('RazorPay SSL - Configured certificate: ' . basename($certPath));
            } else {
                error_log('RazorPay SSL - Warning: No valid certificate file found');
            }
            
            // Set working directory to backend root for proper path resolution
            chdir($backendDir);
            
            try {
                self::$api = new Api($keyId, $keySecret);
                error_log('RazorPay API initialized successfully');
            } catch (\Exception $error) {
                error_log('Failed to initialize RazorPay API: ' . $error->getMessage());
                throw $error;
            } finally {
                // Restore original working directory
                chdir($currentDir);
            }
        }
        
        return self::$api;
    }

    public static function getPaymentAmount(string $appointmentType): int {
        return self::PAYMENT_AMOUNTS[$appointmentType] ?? self::PAYMENT_AMOUNTS['other'];
    }

    public static function createOrder(array $orderData): array {
        try {
            // Log input data for debugging
            error_log('RazorPay createOrder called with data: ' . json_encode($orderData, JSON_PRETTY_PRINT));
            
            $amount = $orderData['amount'];
            $currency = $orderData['currency'] ?? 'INR';
            $receipt = $orderData['receipt'];
            $notes = $orderData['notes'] ?? [];

            $options = [
                'amount' => $amount, // Amount in paise
                'currency' => $currency,
                'receipt' => $receipt,
                'notes' => $notes,
                'payment_capture' => 1 // Auto capture payment
            ];

            // Log the options being sent to Razorpay API
            error_log('RazorPay API options: ' . json_encode($options, JSON_PRETTY_PRINT));
            
            // Log API credentials status (without exposing secrets)
            $keyId = $_ENV['RAZORPAY_KEY_ID'] ?? '';
            $keySecret = $_ENV['RAZORPAY_KEY_SECRET'] ?? '';
            error_log('RazorPay credentials check - Key ID present: ' . (!empty($keyId) ? 'YES' : 'NO') . 
                     ', Key Secret present: ' . (!empty($keySecret) ? 'YES' : 'NO'));

            $api = self::getApi();
            
            // Log before API call
            error_log('Making RazorPay API call to create order...');
            $startTime = microtime(true);
            
            $order = $api->order->create($options);
            
            $endTime = microtime(true);
            $duration = round(($endTime - $startTime) * 1000, 2); // Convert to milliseconds
            
            // Log successful order creation with timing
            error_log('RazorPay order created successfully - Order ID: ' . $order['id'] . 
                     ', Duration: ' . $duration . 'ms');
            error_log('RazorPay order response: ' . json_encode($order->toArray(), JSON_PRETTY_PRINT));
            
            return [
                'success' => true,
                'order' => $order->toArray()
            ];
        } catch (\Exception $error) {
            // Enhanced error logging with more context
            $errorDetails = [
                'message' => $error->getMessage(),
                'code' => $error->getCode(),
                'file' => $error->getFile(),
                'line' => $error->getLine(),
                'trace' => $error->getTraceAsString()
            ];
            
            error_log('RazorPay createOrder FAILED - Error details: ' . json_encode($errorDetails, JSON_PRETTY_PRINT));
            error_log('RazorPay createOrder FAILED - Input data was: ' . json_encode($orderData, JSON_PRETTY_PRINT));
            
            // Check if it's a specific Razorpay API error
            if (method_exists($error, 'getField') && method_exists($error, 'getDescription')) {
                error_log('RazorPay API Error - Field: ' . $error->getField() . ', Description: ' . $error->getDescription());
            }
            
            return [
                'success' => false,
                'error' => $error->getMessage() ?: 'Failed to create payment order'
            ];
        }
    }

    public static function verifyPaymentSignature(array $paymentData): array {
        try {
            $razorpayOrderId = $paymentData['razorpay_order_id'] ?? '';
            $razorpayPaymentId = $paymentData['razorpay_payment_id'] ?? '';
            $razorpaySignature = $paymentData['razorpay_signature'] ?? '';

            if (empty($razorpayOrderId) || empty($razorpayPaymentId) || empty($razorpaySignature)) {
                return [
                    'success' => false,
                    'error' => 'Missing required payment verification data'
                ];
            }

            // Create signature string
            $signatureString = $razorpayOrderId . '|' . $razorpayPaymentId;
            
            // Generate expected signature
            $expectedSignature = hash_hmac('sha256', $signatureString, $_ENV['RAZORPAY_KEY_SECRET']);

            // Compare signatures
            $isSignatureValid = hash_equals($expectedSignature, $razorpaySignature);

            if ($isSignatureValid) {
                error_log('Payment signature verified successfully: ' . $razorpayPaymentId);
                return [
                    'success' => true,
                    'verified' => true
                ];
            } else {
                error_log("Payment signature verification failed. Expected: {$expectedSignature}, Received: {$razorpaySignature}");
                return [
                    'success' => false,
                    'error' => 'Payment signature verification failed'
                ];
            }
        } catch (\Exception $error) {
            error_log('Error verifying payment signature: ' . $error->getMessage());
            return [
                'success' => false,
                'error' => 'Payment verification error'
            ];
        }
    }

    public static function fetchPaymentDetails(string $paymentId): array {
        try {
            $api = self::getApi();
            $payment = $api->payment->fetch($paymentId);
            
            error_log('Payment details fetched: ' . $paymentId);
            
            return [
                'success' => true,
                'payment' => $payment->toArray()
            ];
        } catch (\Exception $error) {
            error_log('Error fetching payment details: ' . $error->getMessage());
            return [
                'success' => false,
                'error' => $error->getMessage() ?: 'Failed to fetch payment details'
            ];
        }
    }

    public static function fetchOrderDetails(string $orderId): array {
        try {
            $api = self::getApi();
            $order = $api->order->fetch($orderId);
            
            error_log('Order details fetched: ' . $orderId);
            
            return [
                'success' => true,
                'order' => $order->toArray()
            ];
        } catch (\Exception $error) {
            error_log('Error fetching order details: ' . $error->getMessage());
            return [
                'success' => false,
                'error' => $error->getMessage() ?: 'Failed to fetch order details'
            ];
        }
    }

    public static function generateReceiptId(int $userId, string $appointmentType): string {
        $timestamp = time();
        $random = rand(100, 999);
        $userIdShort = substr((string)$userId, 0, 8);
        return "GAMCA_" . strtoupper($appointmentType) . "_{$userIdShort}_{$timestamp}_{$random}";
    }

    public static function formatAmount(int $amountInPaise): string {
        $rupees = $amountInPaise / 100;
        return '₹' . number_format($rupees, 0);
    }

    public static function getPaymentMethodDetails(array $payment): array {
        if (empty($payment['method'])) {
            return ['method' => 'unknown', 'details' => []];
        }

        $method = $payment['method'];
        $details = [];

        switch ($method) {
            case 'card':
                $details['card_type'] = $payment['card']['type'] ?? null;
                $details['card_network'] = $payment['card']['network'] ?? null;
                $details['card_last4'] = $payment['card']['last4'] ?? null;
                break;
            case 'upi':
                $details['upi_id'] = $payment['upi']['payer_account_type'] ?? null;
                break;
            case 'netbanking':
                $details['bank'] = $payment['bank'] ?? null;
                break;
            case 'wallet':
                $details['wallet'] = $payment['wallet'] ?? null;
                break;
        }

        return ['method' => $method, 'details' => $details];
    }

    public static function validateWebhookSignature(string $webhookBody, string $webhookSignature, string $webhookSecret): bool {
        try {
            $expectedSignature = hash_hmac('sha256', $webhookBody, $webhookSecret);
            return hash_equals($expectedSignature, $webhookSignature);
        } catch (\Exception $error) {
            error_log('Error validating webhook signature: ' . $error->getMessage());
            return false;
        }
    }
}