<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

class DebugController {
    public function testPaymentConfig(array $params = []): void {
        header('Content-Type: application/json');
        
        try {
            $debug = [
                'timestamp' => date('c'),
                'php_version' => phpversion(),
                'environment_check' => []
            ];
            
            // Check environment variables
            $envVars = ['UPI_ENABLED', 'UPI_VIRTUAL_ADDRESS', 'UPI_MERCHANT_NAME', 'RAZORPAY_ENABLED', 'RAZORPAY_KEY_ID', 'DEFAULT_PAYMENT_METHOD'];
            foreach ($envVars as $var) {
                $debug['environment_check'][$var] = $_ENV[$var] ?? 'NOT SET';
            }
            
            // Test UPI class loading
            if (class_exists('Gamcapp\Lib\UpiPayment')) {
                $debug['upi_class'] = 'exists';
                try {
                    $validation = \Gamcapp\Lib\UpiPayment::validateUpiConfiguration();
                    $debug['upi_validation'] = $validation;
                } catch (\Throwable $e) {
                    $debug['upi_validation_error'] = $e->getMessage();
                }
            } else {
                $debug['upi_class'] = 'not found';
            }
            
            // Test PaymentController class loading
            if (class_exists('Gamcapp\Controllers\PaymentController')) {
                $debug['payment_controller'] = 'exists';
            } else {
                $debug['payment_controller'] = 'not found';
            }
            
            echo json_encode([
                'success' => true,
                'debug' => $debug
            ], JSON_PRETTY_PRINT);
            
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], JSON_PRETTY_PRINT);
        }
    }
}