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
                $orderResult = $this->createUpiPayment($userId, $appointmentId, $appointmentType, $user, $appointment, $input['amount'] ?? null);
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
    
    public function createUpiPayment(int $userId, string $appointmentId, string $appointmentType, User $user, ?Appointment $appointment, ?int $customAmount = null): array {
        // Use custom amount if provided, otherwise use default amount for appointment type
        $amount = $customAmount ?? UpiPayment::getPaymentAmount($appointmentType);
        
        // Check if Razorpay is enabled for UPI (recommended for webhook support)
        if ($this->isRazorpayEnabled() && ($_ENV['UPI_USE_RAZORPAY'] ?? 'true') === 'true') {
            // Use Razorpay for UPI payment (supports webhooks)
            return $this->createRazorpayUpiPayment($userId, $appointmentId, $appointmentType, $user, $appointment, $amount);
        } else {
            // Fallback to direct UPI (no webhook support)
            return $this->createDirectUpiPayment($userId, $appointmentId, $appointmentType, $user, $appointment, $amount);
        }
    }

    private function createRazorpayUpiPayment(int $userId, string $appointmentId, string $appointmentType, User $user, ?Appointment $appointment, int $amount): array {
        try {
            // Create Razorpay order for UPI
            $order = Razorpay::createOrder([
                'amount' => $amount,
                'currency' => 'INR',
                'notes' => [
                    'user_id' => (string)$userId,
                    'appointment_id' => (string)$appointmentId,
                    'appointment_type' => $appointmentType,
                    'user_name' => $user->name,
                    'user_email' => $user->email,
                    'payment_method' => 'upi'
                ]
            ]);

            if (!$order['success']) {
                return $order;
            }

            $orderData = $order['data'];

            // Store payment transaction in database
            try {
                Database::query(
                    "INSERT INTO payment_transactions (user_id, appointment_id, payment_method, razorpay_order_id, amount, currency, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [$userId, $appointmentId, 'upi', $orderData['id'], $amount, 'INR', 'created']
                );
            } catch (\Exception $dbError) {
                error_log('Failed to store Razorpay UPI payment transaction: ' . $dbError->getMessage());
            }

            // Update user payment status to pending
            $user->updatePaymentStatus('pending');

            // Update appointment with payment order ID and method (if appointment exists)
            if ($appointment) {
                $appointment->update([
                    'payment_order_id' => $orderData['id'],
                    'payment_status' => 'pending',
                    'payment_method' => 'upi'
                ]);
            }

            $this->logger->info('Razorpay UPI payment request created successfully', [
                'user_id' => $userId,
                'order_id' => $orderData['id'],
                'amount' => $amount
            ]);

            // Generate UPI QR code and payment links
            $upiUrl = $this->generateRazorpayUpiUrl($orderData['id'], $amount);
            $qrCode = $this->generateQrCodeData($upiUrl);
            $appLinks = $this->generateUpiAppLinks($upiUrl);

            return [
                'success' => true,
                'data' => [
                    'transaction_id' => $orderData['id'],
                    'reference_id' => $orderData['id'],
                    'amount' => $amount,
                    'upi_url' => $upiUrl,
                    'qr_code' => $qrCode,
                    'app_links' => $appLinks,
                    'payment_method' => 'upi',
                    'provider' => 'razorpay'
                ]
            ];

        } catch (\Exception $error) {
            error_log('Razorpay UPI payment creation failed: ' . $error->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to create UPI payment: ' . $error->getMessage()
            ];
        }
    }

    private function createDirectUpiPayment(int $userId, string $appointmentId, string $appointmentType, User $user, ?Appointment $appointment, int $amount): array {
        $transactionId = UpiPayment::generateTransactionId($userId, $appointmentType);

        // Create UPI payment request using direct UPI
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
                'appointment_date' => $appointment ? $appointment->appointment_date : null,
                'medical_center' => $appointment ? $appointment->medical_center : null
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

        // Update appointment with payment transaction ID and method (if appointment exists)
        if ($appointment) {
            $appointment->update([
                'payment_order_id' => $transactionId,
                'payment_status' => 'pending',
                'payment_method' => 'upi'
            ]);
        }

        $this->logger->info('Direct UPI payment request created successfully', [
            'user_id' => $userId,
            'transaction_id' => $transactionId,
            'amount' => $amount
        ]);

        return array_merge($paymentData, ['payment_method' => 'upi', 'provider' => 'direct']);
    }

    private function generateRazorpayUpiUrl(string $orderId, int $amount): string {
        // Generate UPI URL for Razorpay order
        $merchantVPA = $_ENV['UPI_VIRTUAL_ADDRESS'] ?? 'rzp.payto021551929@icici';
        $merchantName = $_ENV['UPI_MERCHANT_NAME'] ?? 'GAMCA Cochin Medical Services';
        $amountInRupees = $amount / 100;

        $upiParams = [
            'pa' => $merchantVPA,
            'pn' => $merchantName,
            'am' => $amountInRupees,
            'tr' => $orderId,
            'tn' => 'GAMCA Medical Payment',
            'cu' => 'INR'
        ];

        return 'upi://pay?' . http_build_query($upiParams);
    }

    private function generateQrCodeData(string $upiUrl): string {
        $encodedUrl = urlencode($upiUrl);
        return "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . $encodedUrl;
    }

    private function generateUpiAppLinks(string $upiUrl): array {
        $queryString = parse_url($upiUrl, PHP_URL_QUERY);
        
        return [
            'googlepay' => 'tez://upi/pay?' . $queryString,
            'phonepe' => 'phonepe://pay?' . $queryString,
            'paytm' => 'paytmmp://pay?' . $queryString,
            'bhim' => $upiUrl,
            'amazonpay' => $upiUrl
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
    
    public function verifyUpiPayment(int $userId, array $input, ?string $appointmentId): array {
        $transactionId = $input['upi_transaction_id'] ?? null;
        $upiReferenceId = $input['upi_reference_id'] ?? null;

        if (!$transactionId) {
            return ['success' => false, 'error' => 'Missing UPI transaction ID'];
        }

        // Check if this is a Razorpay UPI payment by looking up the transaction
        try {
            $transaction = Database::query(
                "SELECT payment_method, razorpay_order_id, upi_transaction_id, status FROM payment_transactions WHERE (razorpay_order_id = ? OR upi_transaction_id = ?) AND user_id = ?",
                [$transactionId, $transactionId, $userId]
            );

            if (!empty($transaction)) {
                $paymentRecord = $transaction[0];
                
                // If this is a Razorpay UPI payment, check Razorpay status
                if (!empty($paymentRecord['razorpay_order_id']) && $paymentRecord['razorpay_order_id'] === $transactionId) {
                    return $this->verifyRazorpayUpiPayment($userId, $transactionId, $appointmentId);
                }
            }
        } catch (\Exception $dbError) {
            error_log('Database error during UPI verification: ' . $dbError->getMessage());
        }

        // Fallback to direct UPI verification
        return $this->verifyDirectUpiPayment($userId, $transactionId, $upiReferenceId, $appointmentId);
    }

    private function verifyRazorpayUpiPayment(int $userId, string $orderId, ?string $appointmentId): array {
        try {
            // Check order status with Razorpay
            $orderResult = Razorpay::fetchOrderDetails($orderId);
            
            if (!$orderResult['success']) {
                return [
                    'success' => true,
                    'status' => 'pending',
                    'message' => 'Payment verification in progress'
                ];
            }

            $orderData = $orderResult['data'];
            $orderStatus = $orderData['status'] ?? 'created';

            // Check if there are any payments associated with this order
            $payments = $orderData['payments'] ?? [];
            
            foreach ($payments as $payment) {
                if ($payment['status'] === 'captured') {
                    // Payment is completed
                    $this->updatePaymentRecords($userId, 'upi', $payment['id'], $orderId, $appointmentId);
                    
                    return [
                        'success' => true,
                        'status' => 'completed',
                        'data' => [
                            'transaction_id' => $payment['id'],
                            'order_id' => $orderId,
                            'payment_method' => 'upi',
                            'provider' => 'razorpay'
                        ]
                    ];
                }
            }

            // Check database for webhook-updated status
            $dbTransaction = Database::query(
                "SELECT status FROM payment_transactions WHERE razorpay_order_id = ? AND user_id = ?",
                [$orderId, $userId]
            );

            if (!empty($dbTransaction) && $dbTransaction[0]['status'] === 'paid') {
                return [
                    'success' => true,
                    'status' => 'completed',
                    'data' => [
                        'transaction_id' => $orderId,
                        'order_id' => $orderId,
                        'payment_method' => 'upi',
                        'provider' => 'razorpay'
                    ]
                ];
            }

            // Payment is still pending
            return [
                'success' => true,
                'status' => 'pending',
                'message' => 'UPI payment is pending. Please complete the payment.',
                'data' => [
                    'transaction_id' => $orderId,
                    'order_id' => $orderId,
                    'payment_method' => 'upi',
                    'provider' => 'razorpay'
                ]
            ];

        } catch (\Exception $error) {
            error_log('Razorpay UPI verification error: ' . $error->getMessage());
            return [
                'success' => true,
                'status' => 'pending',
                'message' => 'Payment verification in progress'
            ];
        }
    }

    private function verifyDirectUpiPayment(int $userId, string $transactionId, ?string $upiReferenceId, ?string $appointmentId): array {
        // Verify UPI payment using direct UPI method
        $verificationResult = UpiPayment::verifyPayment([
            'transaction_id' => $transactionId,
            'upi_reference_id' => $upiReferenceId
        ]);

        // For direct UPI, we might need manual confirmation, so we'll mark as pending
        // and provide instructions for confirmation
        if ($verificationResult['success'] && !$verificationResult['verified']) {
            return [
                'success' => true,
                'verified' => false,
                'status' => 'pending',
                'message' => 'UPI payment initiated. Please complete the payment in your UPI app.',
                'data' => [
                    'transaction_id' => $transactionId,
                    'status' => 'pending_confirmation',
                    'payment_method' => 'upi',
                    'provider' => 'direct'
                ]
            ];
        }

        if ($verificationResult['verified']) {
            // Update records if payment is confirmed
            $this->updatePaymentRecords($userId, 'upi', $upiReferenceId, $transactionId, $appointmentId);
        }

        return [
            'success' => $verificationResult['success'],
            'status' => $verificationResult['verified'] ? 'completed' : 'pending',
            'message' => $verificationResult['verified'] ? 'UPI payment verified successfully' : 'UPI payment verification pending',
            'data' => [
                'transaction_id' => $transactionId,
                'upi_reference_id' => $upiReferenceId,
                'payment_method' => 'upi',
                'provider' => 'direct',
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
    
    public function createUpiPaymentEndpoint(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $decoded['id']; // JWT payload uses 'id', not 'user_id'
            $appointmentId = $input['appointmentId'] ?? null;
            $customAmount = $input['amount'] ?? null; // Allow custom amount from frontend

            $user = User::findById($userId);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'User not found']);
                return;
            }

            if ($appointmentId) {
                $appointment = Appointment::findById($appointmentId);
                if (!$appointment || $appointment->user_id !== $userId) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Appointment not found']);
                    return;
                }
                
                $appointmentType = $appointment->appointment_type;
                $result = $this->createUpiPayment($userId, $appointmentId, $appointmentType, $user, $appointment, $customAmount);
            } else {
                // For user profile payments without specific appointment
                $appointmentType = 'medical_examination';
                $result = $this->createUpiPayment($userId, '', $appointmentType, $user, null, $customAmount);
            }

            echo json_encode([
                'success' => true,
                'data' => $result
            ]);
        } catch (\Exception $error) {
            error_log('UPI payment creation error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Payment creation failed']);
        }
    }
    
    public function verifyUpiPaymentEndpoint(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $userId = $decoded['id']; // JWT payload uses 'id', not 'user_id'
            $referenceId = $params['reference_id'] ?? null;

            if (!$referenceId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Reference ID is required']);
                return;
            }

            $input = ['upi_transaction_id' => $referenceId];
            $result = $this->verifyUpiPayment($userId, $input, null);
            
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

    public function razorpayWebhook(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            // Get webhook payload
            $webhookBody = file_get_contents('php://input');
            $webhookSignature = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';
            $webhookSecret = $_ENV['RAZORPAY_WEBHOOK_SECRET'] ?? '';

            $this->logger->log('Webhook received', [
                'signature' => $webhookSignature,
                'body_length' => strlen($webhookBody)
            ]);

            // Validate webhook signature
            if (!Razorpay::validateWebhookSignature($webhookBody, $webhookSignature, $webhookSecret)) {
                $this->logger->log('Invalid webhook signature', ['signature' => $webhookSignature]);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid signature']);
                return;
            }

            $webhookData = json_decode($webhookBody, true);
            if (!$webhookData) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
                return;
            }

            $this->logger->log('Webhook validated', ['event' => $webhookData['event'] ?? 'unknown']);

            // Handle payment.captured event
            if (($webhookData['event'] ?? '') === 'payment.captured') {
                $paymentData = $webhookData['payload']['payment']['entity'] ?? [];
                $paymentId = $paymentData['id'] ?? '';
                $orderId = $paymentData['order_id'] ?? '';
                $status = $paymentData['status'] ?? '';

                $this->logger->log('Payment captured webhook', [
                    'payment_id' => $paymentId,
                    'order_id' => $orderId,
                    'status' => $status
                ]);

                if ($status === 'captured') {
                    // Update payment status in database
                    try {
                        Database::query(
                            "UPDATE payment_transactions SET razorpay_payment_id = ?, status = ? WHERE razorpay_order_id = ?",
                            [$paymentId, 'paid', $orderId]
                        );

                        // Get user and appointment info from payment transaction
                        $transaction = Database::query(
                            "SELECT user_id, appointment_id FROM payment_transactions WHERE razorpay_order_id = ?",
                            [$orderId]
                        );

                        if (!empty($transaction)) {
                            $userId = $transaction[0]['user_id'];
                            $appointmentId = $transaction[0]['appointment_id'];

                            // Update user payment status
                            $user = User::findById($userId);
                            if ($user) {
                                $user->updatePaymentStatus('paid', $paymentId);
                            }

                            // Update appointment status
                            if ($appointmentId) {
                                $appointment = Appointment::findById($appointmentId);
                                if ($appointment && $appointment->user_id === $userId) {
                                    $appointment->update([
                                        'payment_status' => 'completed',
                                        'status' => 'confirmed'
                                    ]);
                                }
                            }

                            $this->logger->log('Payment completed successfully', [
                                'payment_id' => $paymentId,
                                'user_id' => $userId,
                                'appointment_id' => $appointmentId
                            ]);
                        }
                    } catch (\Exception $dbError) {
                        $this->logger->log('Database update failed', ['error' => $dbError->getMessage()]);
                    }
                }
            }

            echo json_encode(['success' => true]);
        } catch (\Exception $error) {
            $this->logger->log('Webhook processing error', ['error' => $error->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Webhook processing failed']);
        }
    }
}