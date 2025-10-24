<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

use Gamcapp\Lib\Auth;
use Gamcapp\Lib\Razorpay;
use Gamcapp\Lib\UpiPayment;
use Gamcapp\Models\User;
use Gamcapp\Models\Appointment;
use Gamcapp\Core\Database;
use Gamcapp\Lib\Logger;

class PaymentController {
    private Logger $logger;
    
    public function __construct() {
        $this->logger = Logger::getInstance();
    }
    
    public function getAvailablePaymentMethods(): array {
        $methods = [];
        
        try {
            // Check if Razorpay is enabled
            if ($this->isRazorpayEnabled()) {
                $methods[] = 'razorpay';
            }
        } catch (\Throwable $e) {
            error_log('Error checking Razorpay status: ' . $e->getMessage());
        }
        
        try {
            // Check if UPI is enabled
            if ($this->isUpiEnabled()) {
                $methods[] = 'upi';
            }
        } catch (\Throwable $e) {
            error_log('Error checking UPI status: ' . $e->getMessage());
        }
        
        // If no methods are available, default to UPI
        if (empty($methods)) {
            error_log('No payment methods available, defaulting to UPI');
            $methods[] = 'upi';
        }
        
        return $methods;
    }
    
    public function getDefaultPaymentMethod(): string {
        $default = $_ENV['DEFAULT_PAYMENT_METHOD'] ?? 'upi';
        $available = $this->getAvailablePaymentMethods();
        
        if (in_array($default, $available)) {
            return $default;
        }
        
        return $available[0] ?? 'upi';
    }
    
    private function isRazorpayEnabled(): bool {
        $enabled = filter_var($_ENV['RAZORPAY_ENABLED'] ?? 'false', FILTER_VALIDATE_BOOLEAN);
        
        if (!$enabled) {
            return false;
        }
        
        // Also check if credentials are configured
        return !empty($_ENV['RAZORPAY_KEY_ID']) && 
               !empty($_ENV['RAZORPAY_KEY_SECRET']) &&
               $_ENV['RAZORPAY_KEY_ID'] !== 'your_razorpay_key_id' &&
               $_ENV['RAZORPAY_KEY_SECRET'] !== 'your_razorpay_key_secret';
    }
    
    private function isUpiEnabled(): bool {
        try {
            $enabled = filter_var($_ENV['UPI_ENABLED'] ?? 'true', FILTER_VALIDATE_BOOLEAN);
            
            if (!$enabled) {
                return false;
            }
            
            // Check if UPI is properly configured
            $validation = UpiPayment::validateUpiConfiguration();
            return $validation['valid'];
        } catch (\Throwable $e) {
            error_log('Error checking UPI enabled status: ' . $e->getMessage());
            // If there's an error checking UPI config, assume it's not enabled
            return false;
        }
    }
    
    public function getPaymentMethods(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $availableMethods = $this->getAvailablePaymentMethods();
            $defaultMethod = $this->getDefaultPaymentMethod();
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'available_methods' => $availableMethods,
                    'default_method' => $defaultMethod,
                    'methods_info' => [
                        'razorpay' => [
                            'name' => 'Razorpay',
                            'description' => 'Credit/Debit Cards, NetBanking, UPI, Wallets',
                            'enabled' => $this->isRazorpayEnabled()
                        ],
                        'upi' => [
                            'name' => 'UPI',
                            'description' => 'Direct UPI Payment',
                            'enabled' => $this->isUpiEnabled()
                        ]
                    ]
                ]
            ]);
        } catch (\Exception $error) {
            error_log('Get payment methods error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
    
    public function createOrder(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $input = json_decode(file_get_contents('php://input'), true);
            
            $appointmentId = $input['appointmentId'] ?? null;
            $paymentMethod = $input['paymentMethod'] ?? $this->getDefaultPaymentMethod();
            $userId = $decoded['id'];

            $this->logger->info('Payment order creation started', [
                'user_id' => $userId,
                'appointment_id' => $appointmentId,
                'payment_method' => $paymentMethod,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);

            // Validate payment method is available
            $availableMethods = $this->getAvailablePaymentMethods();
            if (empty($availableMethods)) {
                $this->logger->error('Payment order creation failed: No payment methods enabled', [
                    'user_id' => $userId
                ]);
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Payment system not configured. Please contact administrator.']);
                return;
            }

            if (!in_array($paymentMethod, $availableMethods)) {
                $this->logger->error('Payment order creation failed: Invalid payment method', [
                    'user_id' => $userId,
                    'requested_method' => $paymentMethod,
                    'available_methods' => $availableMethods
                ]);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Selected payment method is not available']);
                return;
            }

            // Validate input
            if (!$appointmentId) {
                $this->logger->warning('Payment order creation failed: Missing appointment ID', [
                    'user_id' => $userId
                ]);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Appointment ID is required']);
                return;
            }

            // Get user details
            $user = User::findById($userId);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'User not found']);
                return;
            }

            // Validate that the appointment belongs to the user
            $appointment = Appointment::findById($appointmentId);
            if (!$appointment) {
                $this->logger->warning('Payment order creation failed: Appointment not found', [
                    'user_id' => $userId,
                    'appointment_id' => $appointmentId
                ]);
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Appointment not found']);
                return;
            }

            if ($appointment->user_id !== $userId) {
                $this->logger->warning('Payment order creation failed: Unauthorized access to appointment', [
                    'user_id' => $userId,
                    'appointment_id' => $appointmentId,
                    'appointment_user_id' => $appointment->user_id
                ]);
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Unauthorized access to appointment']);
                return;
            }

            // Check if appointment has required details
            if (empty($appointment->appointment_type)) {
                $this->logger->warning('Payment order creation failed: Incomplete appointment details', [
                    'user_id' => $userId,
                    'appointment_id' => $appointmentId
                ]);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Please complete appointment details first']);
                return;
            }

            // Check if appointment status allows payment
            if (!in_array($appointment->status, ['payment_pending', 'draft'])) {
                $this->logger->warning('Payment order creation failed: Invalid appointment status', [
                    'user_id' => $userId,
                    'appointment_id' => $appointmentId,
                    'status' => $appointment->status
                ]);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'This appointment is not eligible for payment']);
                return;
            }

            // Check if payment is already completed for this appointment
            if ($appointment->payment_status === 'completed') {
                $this->logger->warning('Payment order creation failed: Payment already completed', [
                    'user_id' => $userId,
                    'appointment_id' => $appointmentId
                ]);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Payment already completed for this appointment']);
                return;
            }

            // Get appointment type and route to appropriate payment method
            $appointmentType = $appointment->appointment_type;
            if (!$appointmentType) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Appointment type not specified']);
                return;
            }

            // Route to appropriate payment method
            if ($paymentMethod === 'razorpay') {
                $orderResult = $this->createRazorpayOrder($userId, $appointmentId, $appointmentType, $user, $appointment);
            } elseif ($paymentMethod === 'upi') {
                $orderResult = $this->createUpiPayment($userId, $appointmentId, $appointmentType, $user, $appointment);
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Unsupported payment method']);
                return;
            }

            if (!$orderResult['success']) {
                $this->logger->error('Failed to create payment order', [
                    'user_id' => $userId,
                    'payment_method' => $paymentMethod,
                    'appointment_type' => $appointmentType,
                    'error' => $orderResult['error']
                ]);
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to create payment order']);
                return;
            }

            echo json_encode([
                'success' => true,
                'message' => 'Payment order created successfully',
                'data' => $orderResult['data']
            ]);

        } catch (\Exception $error) {
            $this->logger->error('Create payment order error', [
                'user_id' => $userId ?? 'unknown',
                'error' => $error->getMessage(),
                'trace' => $error->getTraceAsString()
            ]);
            error_log('Create payment order error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
    
    private function createRazorpayOrder(int $userId, string $appointmentId, string $appointmentType, User $user, Appointment $appointment): array {
        $amount = Razorpay::getPaymentAmount($appointmentType);
        $receipt = Razorpay::generateReceiptId($userId, $appointmentType);

        // Create RazorPay order
        $orderResult = Razorpay::createOrder([
            'amount' => $amount,
            'currency' => 'INR',
            'receipt' => $receipt,
            'notes' => [
                'user_id' => (string)$userId,
                'appointment_id' => (string)$appointmentId,
                'appointment_type' => $appointmentType,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'user_phone' => $user->phone,
                'appointment_date' => $appointment->appointment_date,
                'medical_center' => $appointment->medical_center
            ]
        ]);

        if (!$orderResult['success']) {
            return $orderResult;
        }

        $order = $orderResult['order'];

        // Store payment transaction in database
        try {
            Database::query(
                "INSERT INTO payment_transactions (user_id, appointment_id, payment_method, razorpay_order_id, amount, currency, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [$userId, $appointmentId, 'razorpay', $order['id'], $amount, 'INR', 'created']
            );
        } catch (\Exception $dbError) {
            error_log('Failed to store Razorpay payment transaction: ' . $dbError->getMessage());
        }

        // Update user payment status to pending
        $user->updatePaymentStatus('pending');

        // Update appointment with payment order ID and method
        $appointment->update([
            'payment_order_id' => $order['id'],
            'payment_status' => 'pending',
            'payment_method' => 'razorpay'
        ]);

        $this->logger->info('Razorpay order created successfully', [
            'user_id' => $userId,
            'order_id' => $order['id'],
            'amount' => $amount
        ]);

        return [
            'success' => true,
            'data' => [
                'payment_method' => 'razorpay',
                'order_id' => $order['id'],
                'amount' => $order['amount'],
                'currency' => $order['currency'],
                'key' => $_ENV['RAZORPAY_KEY_ID']
            ]
        ];
    }
    
    private function createUpiPayment(int $userId, string $appointmentId, string $appointmentType, User $user, Appointment $appointment): array {
        $amount = UpiPayment::getPaymentAmount($appointmentType);
        $transactionId = UpiPayment::generateTransactionId($userId, $appointmentType);

        // Create UPI payment request
        $paymentResult = UpiPayment::createPaymentRequest([
            'amount' => $amount,
            'transaction_id' => $transactionId,
            'notes' => [
                'user_id' => (string)$userId,
                'appointment_id' => (string)$appointmentId,
                'appointment_type' => $appointmentType,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'user_phone' => $user->phone,
                'appointment_date' => $appointment->appointment_date,
                'medical_center' => $appointment->medical_center
            ]
        ]);

        if (!$paymentResult['success']) {
            return $paymentResult;
        }

        $paymentData = $paymentResult['data'];

        // Store payment transaction in database
        try {
            Database::query(
                "INSERT INTO payment_transactions (user_id, appointment_id, payment_method, upi_transaction_id, amount, currency, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [$userId, $appointmentId, 'upi', $transactionId, $amount, 'INR', 'created']
            );
        } catch (\Exception $dbError) {
            error_log('Failed to store UPI payment transaction: ' . $dbError->getMessage());
        }

        // Update user payment status to pending
        $user->updatePaymentStatus('pending');

        // Update appointment with payment transaction ID and method
        $appointment->update([
            'payment_order_id' => $transactionId,
            'payment_status' => 'pending',
            'payment_method' => 'upi'
        ]);

        $this->logger->info('UPI payment request created successfully', [
            'user_id' => $userId,
            'transaction_id' => $transactionId,
            'amount' => $amount
        ]);

        return [
            'success' => true,
            'data' => array_merge($paymentData, ['payment_method' => 'upi'])
        ];
    }

    public function verifyPayment(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $input = json_decode(file_get_contents('php://input'), true);
            
            $userId = $decoded['id'];
            $paymentMethod = $input['payment_method'] ?? 'razorpay'; // For backward compatibility
            $appointmentId = $input['appointment_id'] ?? null;

            $this->logger->info('Payment verification started', [
                'user_id' => $userId,
                'payment_method' => $paymentMethod,
                'appointment_id' => $appointmentId,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);

            // Route to appropriate verification method
            if ($paymentMethod === 'razorpay') {
                $verificationResult = $this->verifyRazorpayPayment($userId, $input, $appointmentId);
            } elseif ($paymentMethod === 'upi') {
                $verificationResult = $this->verifyUpiPayment($userId, $input, $appointmentId);
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Unsupported payment method']);
                return;
            }

            if (!$verificationResult['success']) {
                http_response_code(400);
                echo json_encode($verificationResult);
                return;
            }

            echo json_encode($verificationResult);

        } catch (\Exception $error) {
            $this->logger->error('Verify payment error', [
                'user_id' => $userId ?? 'unknown',
                'error' => $error->getMessage(),
                'trace' => $error->getTraceAsString()
            ]);
            error_log('Verify payment error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
    
    private function verifyRazorpayPayment(int $userId, array $input, ?string $appointmentId): array {
        $razorpayOrderId = $input['razorpay_order_id'] ?? null;
        $razorpayPaymentId = $input['razorpay_payment_id'] ?? null;
        $razorpaySignature = $input['razorpay_signature'] ?? null;

        if (!$razorpayOrderId || !$razorpayPaymentId || !$razorpaySignature) {
            return ['success' => false, 'error' => 'Missing Razorpay payment verification data'];
        }

        // Verify payment signature
        $verificationResult = Razorpay::verifyPaymentSignature([
            'razorpay_order_id' => $razorpayOrderId,
            'razorpay_payment_id' => $razorpayPaymentId,
            'razorpay_signature' => $razorpaySignature
        ]);

        if (!$verificationResult['success']) {
            return $verificationResult;
        }

        // Get payment details
        $paymentDetailsResult = Razorpay::fetchPaymentDetails($razorpayPaymentId);
        if (!$paymentDetailsResult['success']) {
            return ['success' => false, 'error' => 'Failed to fetch payment details'];
        }

        // Update records
        $this->updatePaymentRecords($userId, 'razorpay', $razorpayPaymentId, $razorpayOrderId, $appointmentId);

        return [
            'success' => true,
            'message' => 'Razorpay payment verified successfully',
            'data' => [
                'payment_id' => $razorpayPaymentId,
                'order_id' => $razorpayOrderId,
                'payment_method' => 'razorpay'
            ]
        ];
    }
    
    private function verifyUpiPayment(int $userId, array $input, ?string $appointmentId): array {
        $transactionId = $input['upi_transaction_id'] ?? null;
        $upiReferenceId = $input['upi_reference_id'] ?? null;

        if (!$transactionId) {
            return ['success' => false, 'error' => 'Missing UPI transaction ID'];
        }

        // Verify UPI payment
        $verificationResult = UpiPayment::verifyPayment([
            'transaction_id' => $transactionId,
            'upi_reference_id' => $upiReferenceId
        ]);

        // For UPI, we might need manual confirmation, so we'll mark as pending
        // and provide instructions for confirmation
        if ($verificationResult['success'] && !$verificationResult['verified']) {
            return [
                'success' => true,
                'verified' => false,
                'message' => 'UPI payment initiated. Please complete the payment in your UPI app.',
                'data' => [
                    'transaction_id' => $transactionId,
                    'status' => 'pending_confirmation',
                    'payment_method' => 'upi'
                ]
            ];
        }

        if ($verificationResult['verified']) {
            // Update records if payment is confirmed
            $this->updatePaymentRecords($userId, 'upi', $upiReferenceId, $transactionId, $appointmentId);
        }

        return [
            'success' => $verificationResult['success'],
            'message' => $verificationResult['verified'] ? 'UPI payment verified successfully' : 'UPI payment verification pending',
            'data' => [
                'transaction_id' => $transactionId,
                'upi_reference_id' => $upiReferenceId,
                'payment_method' => 'upi',
                'verified' => $verificationResult['verified']
            ]
        ];
    }
    
    private function updatePaymentRecords(int $userId, string $paymentMethod, string $paymentId, string $orderId, ?string $appointmentId): void {
        // Update user payment status
        $user = User::findById($userId);
        if ($user) {
            $user->updatePaymentStatus('paid', $paymentId);
        }

        // Update payment transaction
        try {
            if ($paymentMethod === 'razorpay') {
                Database::query(
                    "UPDATE payment_transactions SET razorpay_payment_id = ?, status = ? WHERE razorpay_order_id = ?",
                    [$paymentId, 'paid', $orderId]
                );
            } elseif ($paymentMethod === 'upi') {
                Database::query(
                    "UPDATE payment_transactions SET upi_reference_id = ?, status = ? WHERE upi_transaction_id = ?",
                    [$paymentId, 'paid', $orderId]
                );
            }
        } catch (\Exception $dbError) {
            error_log('Failed to update payment transaction: ' . $dbError->getMessage());
        }

        // Update appointment status if appointment_id is provided
        if ($appointmentId) {
            try {
                $appointment = Appointment::findById($appointmentId);
                if ($appointment && $appointment->user_id === $userId) {
                    $appointment->update([
                        'payment_status' => 'completed',
                        'status' => 'confirmed'
                    ]);
                }
            } catch (\Exception $appointmentError) {
                error_log('Failed to update appointment status: ' . $appointmentError->getMessage());
            }
        }

        $this->logger->info('Payment records updated successfully', [
            'user_id' => $userId,
            'payment_method' => $paymentMethod,
            'payment_id' => $paymentId,
            'order_id' => $orderId
        ]);
    }
    
    public function verifyUpiPayment(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $decoded['user_id'];
            $appointmentId = $input['appointmentId'] ?? null;

            $result = $this->verifyUpiPayment($userId, $input, $appointmentId);
            
            echo json_encode([
                'success' => true,
                'data' => $result
            ]);
        } catch (\Exception $error) {
            error_log('UPI payment verification error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Payment verification failed']);
        }
    }
}