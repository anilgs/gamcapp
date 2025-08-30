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
            
            if (empty($keyId) || empty($keySecret)) {
                throw new \Exception('RazorPay configuration missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
            }
            
            self::$api = new Api($keyId, $keySecret);
        }
        
        return self::$api;
    }

    public static function getPaymentAmount(string $appointmentType): int {
        return self::PAYMENT_AMOUNTS[$appointmentType] ?? self::PAYMENT_AMOUNTS['other'];
    }

    public static function createOrder(array $orderData): array {
        try {
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

            $api = self::getApi();
            $order = $api->order->create($options);
            
            error_log('RazorPay order created: ' . $order['id']);
            
            return [
                'success' => true,
                'order' => $order->toArray()
            ];
        } catch (\Exception $error) {
            error_log('Error creating RazorPay order: ' . $error->getMessage());
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