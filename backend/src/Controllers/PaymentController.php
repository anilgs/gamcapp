<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

use Gamcapp\Lib\Auth;
use Gamcapp\Lib\Razorpay;
use Gamcapp\Models\User;
use Gamcapp\Core\Database;

class PaymentController {
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

            // Validate input
            if (!$appointmentId) {
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
            // In this system, appointmentId is actually the user ID
            if ((int)$userId !== (int)$appointmentId) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Unauthorized access to appointment']);
                return;
            }

            // Check if user has appointment details
            if (empty($user->appointment_details)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Please complete appointment details first']);
                return;
            }

            // Check if payment is already completed
            if ($user->payment_status === 'paid') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Payment already completed for this appointment']);
                return;
            }

            // Get appointment type and calculate amount
            $appointmentType = $user->appointment_details['appointmentType'] ?? null;
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
                    'user_phone' => $user->phone
                ]
            ]);

            if (!$orderResult['success']) {
                error_log('Failed to create RazorPay order: ' . $orderResult['error']);
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to create payment order']);
                return;
            }

            $order = $orderResult['order'];

            // Store payment transaction in database
            try {
                Database::query(
                    "INSERT INTO payment_transactions (user_id, razorpay_order_id, amount, currency, status)
                     VALUES (?, ?, ?, ?, ?)",
                    [$userId, $order['id'], $amount, 'INR', 'created']
                );
            } catch (\Exception $dbError) {
                error_log('Failed to store payment transaction: ' . $dbError->getMessage());
                // Continue anyway, as the order was created successfully
            }

            // Update user payment status to pending
            $user->updatePaymentStatus('pending');

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
                    "UPDATE payment_transactions SET razorpay_payment_id = ?, status = ?, payment_details = ? WHERE razorpay_order_id = ?",
                    [$razorpayPaymentId, 'paid', json_encode($paymentDetails), $razorpayOrderId]
                );
            } catch (\Exception $dbError) {
                error_log('Failed to update payment transaction: ' . $dbError->getMessage());
            }

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
            error_log('Verify payment error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
}