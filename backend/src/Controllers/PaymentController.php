<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

use Gamcapp\Lib\Auth;
use Gamcapp\Lib\Razorpay;
use Gamcapp\Models\User;
use Gamcapp\Models\Appointment;
use Gamcapp\Core\Database;
use Gamcapp\Lib\Logger;

class PaymentController {
    private Logger $logger;
    
    public function __construct() {
        $this->logger = Logger::getInstance();
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
            $userId = $decoded['id'];

            $this->logger->info('Payment order creation started', [
                'user_id' => $userId,
                'appointment_id' => $appointmentId,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);

            // Check Razorpay configuration first
            if (empty($_ENV['RAZORPAY_KEY_ID']) || empty($_ENV['RAZORPAY_KEY_SECRET']) ||
                $_ENV['RAZORPAY_KEY_ID'] === 'your_razorpay_key_id' ||
                $_ENV['RAZORPAY_KEY_SECRET'] === 'your_razorpay_key_secret') {
                $this->logger->error('Payment order creation failed: Razorpay credentials not configured', [
                    'user_id' => $userId
                ]);
                error_log('Payment creation failed: Razorpay credentials not configured');
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Payment system not configured. Please contact administrator.']);
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
            if ($appointment->payment_status === 'paid') {
                $this->logger->warning('Payment order creation failed: Payment already completed', [
                    'user_id' => $userId,
                    'appointment_id' => $appointmentId
                ]);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Payment already completed for this appointment']);
                return;
            }

            // Get appointment type and calculate amount
            $appointmentType = $appointment->appointment_type;
            if (!$appointmentType) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Appointment type not specified']);
                return;
            }

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
                $this->logger->error('Failed to create RazorPay order', [
                    'user_id' => $userId,
                    'appointment_type' => $appointmentType,
                    'amount' => $amount,
                    'error' => $orderResult['error']
                ]);
                error_log('Failed to create RazorPay order: ' . $orderResult['error']);
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to create payment order']);
                return;
            }

            $order = $orderResult['order'];

            // Store payment transaction in database
            try {
                // Try to insert with appointment_id if column exists, fallback without it
                try {
                    Database::query(
                        "INSERT INTO payment_transactions (user_id, appointment_id, razorpay_order_id, amount, currency, status)
                         VALUES (?, ?, ?, ?, ?, ?)",
                        [$userId, $appointmentId, $order['id'], $amount, 'INR', 'created']
                    );
                } catch (\Exception $e) {
                    // Fallback: column might not exist, try without appointment_id
                    Database::query(
                        "INSERT INTO payment_transactions (user_id, razorpay_order_id, amount, currency, status)
                         VALUES (?, ?, ?, ?, ?)",
                        [$userId, $order['id'], $amount, 'INR', 'created']
                    );
                }
            } catch (\Exception $dbError) {
                error_log('Failed to store payment transaction: ' . $dbError->getMessage());
                // Continue anyway, as the order was created successfully
            }

            // Update user payment status to pending
            $user->updatePaymentStatus('pending');

            // Update appointment with payment order ID
            $appointment->update([
                'payment_order_id' => $order['id'],
                'payment_status' => 'pending'
            ]);

            $this->logger->info('Payment order created successfully', [
                'user_id' => $userId,
                'user_email' => $user->email,
                'appointment_type' => $appointmentType,
                'order_id' => $order['id'],
                'amount' => $amount,
                'currency' => 'INR',
                'receipt' => $receipt
            ]);

            error_log("Payment order created for user {$userId}: " . $order['id']);

            echo json_encode([
                'success' => true,
                'message' => 'Payment order created successfully',
                'data' => [
                    'order_id' => $order['id'],
                    'amount' => $order['amount'],
                    'currency' => $order['currency'],
                    'key' => $_ENV['RAZORPAY_KEY_ID']
                ]
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
            $razorpayOrderId = $input['razorpay_order_id'] ?? null;
            $razorpayPaymentId = $input['razorpay_payment_id'] ?? null;
            $razorpaySignature = $input['razorpay_signature'] ?? null;
            $appointmentId = $input['appointment_id'] ?? null;

            $this->logger->info('Payment verification started', [
                'user_id' => $userId,
                'order_id' => $razorpayOrderId,
                'payment_id' => $razorpayPaymentId,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);

            if (!$razorpayOrderId || !$razorpayPaymentId || !$razorpaySignature) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Missing payment verification data']);
                return;
            }

            // Verify payment signature
            $verificationResult = Razorpay::verifyPaymentSignature([
                'razorpay_order_id' => $razorpayOrderId,
                'razorpay_payment_id' => $razorpayPaymentId,
                'razorpay_signature' => $razorpaySignature
            ]);

            if (!$verificationResult['success']) {
                $this->logger->warning('Payment verification failed', [
                    'user_id' => $userId,
                    'order_id' => $razorpayOrderId,
                    'payment_id' => $razorpayPaymentId,
                    'error' => $verificationResult['error']
                ]);
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => $verificationResult['error']]);
                return;
            }

            // Get payment details from Razorpay
            $paymentDetailsResult = Razorpay::fetchPaymentDetails($razorpayPaymentId);
            if (!$paymentDetailsResult['success']) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to fetch payment details']);
                return;
            }

            $paymentDetails = $paymentDetailsResult['payment'];

            // Update user payment status
            $user = User::findById($userId);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'User not found']);
                return;
            }

            $user->updatePaymentStatus('paid', $razorpayPaymentId);

            // Update payment transaction
            try {
                Database::query(
                    "UPDATE payment_transactions SET razorpay_payment_id = ?, status = ? WHERE razorpay_order_id = ?",
                    [$razorpayPaymentId, 'paid', $razorpayOrderId]
                );
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
                        $this->logger->info('Appointment status updated after payment', [
                            'user_id' => $userId,
                            'appointment_id' => $appointmentId,
                            'payment_id' => $razorpayPaymentId
                        ]);
                    }
                } catch (\Exception $appointmentError) {
                    error_log('Failed to update appointment status: ' . $appointmentError->getMessage());
                    // Continue anyway, payment verification was successful
                }
            }

            $this->logger->info('Payment verified successfully', [
                'user_id' => $userId,
                'user_email' => $user->email,
                'order_id' => $razorpayOrderId,
                'payment_id' => $razorpayPaymentId,
                'amount' => $paymentDetails['amount'] ?? 'unknown',
                'method' => $paymentDetails['method'] ?? 'unknown'
            ]);

            error_log("Payment verified successfully for user {$userId}: {$razorpayPaymentId}");

            echo json_encode([
                'success' => true,
                'message' => 'Payment verified successfully',
                'data' => [
                    'payment_id' => $razorpayPaymentId,
                    'order_id' => $razorpayOrderId,
                    'user' => $user->toArray()
                ]
            ]);

        } catch (\Exception $error) {
            $this->logger->error('Verify payment error', [
                'user_id' => $userId ?? 'unknown',
                'order_id' => $razorpayOrderId ?? 'unknown',
                'payment_id' => $razorpayPaymentId ?? 'unknown',
                'error' => $error->getMessage(),
                'trace' => $error->getTraceAsString()
            ]);
            error_log('Verify payment error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
}