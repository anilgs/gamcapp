<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Gamcapp\Core\Router;
use Gamcapp\Core\Database;
use Gamcapp\Middleware\CorsMiddleware;

header('Content-Type: application/json');

// Configure error handling to prevent HTML output
ini_set('display_errors', '0');
ini_set('html_errors', '0');
error_reporting(E_ALL);

$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

CorsMiddleware::handle();

// Debug information for troubleshooting
if (isset($_GET['debug']) && $_GET['debug'] === '1') {
    echo json_encode([
        'debug' => true,
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'not set',
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'not set',
        'api_path' => $_GET['api_path'] ?? 'not set',
        'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'not set',
        'GET' => $_GET,
        'SERVER_NAME' => $_SERVER['SERVER_NAME'] ?? 'not set'
    ]);
    exit;
}

$router = new Router();

// Get the API path from query parameter
$apiPath = $_GET['api_path'] ?? '';

// If no API path provided, show basic info
if (empty($apiPath)) {
    echo json_encode([
        'success' => true,
        'message' => 'GAMCAPP Backend API is running',
        'version' => '1.0.0',
        'php_version' => phpversion(),
        'timestamp' => date('c'),
        'available_endpoints' => [
            'GET /api/health',
            'POST /api/auth/send-otp',
            'POST /api/auth/verify-otp',
            'GET /api/auth/verify-token',
            // Add more as needed
        ]
    ]);
    exit;
}

// Routes with leading slash to match REQUEST_URI format
$router->get('/health', 'Gamcapp\\Controllers\\HealthController@check');
$router->get('/debug/payment-config', 'Gamcapp\\Controllers\\DebugController@testPaymentConfig');
$router->get('/routing-test', 'Gamcapp\\Controllers\\HealthController@routingTest');
$router->get('/admin-auth-test', 'Gamcapp\\Controllers\\HealthController@adminAuthTest');
$router->post('/auth/send-otp', 'Gamcapp\\Controllers\\AuthController@sendOtp');
$router->post('/auth/verify-otp', 'Gamcapp\\Controllers\\AuthController@verifyOtp');
$router->post('/auth/logout', 'Gamcapp\\Controllers\\AuthController@logout');
$router->get('/auth/verify-token', 'Gamcapp\\Controllers\\AuthController@verifyToken');
// Legacy endpoint - redirect to verify-token
$router->get('/auth/profile', 'Gamcapp\\Controllers\\AuthController@verifyToken');
$router->post('/auth/change-password', 'Gamcapp\\Controllers\\AuthController@changePassword');
$router->post('/auth/admin-login', 'Gamcapp\\Controllers\\AuthController@adminLogin');

$router->post('/appointments/create', 'Gamcapp\\Controllers\\AppointmentController@create');
$router->get('/appointments/user', 'Gamcapp\\Controllers\\AppointmentController@getUserAppointments');
$router->post('/appointments/save-draft', 'Gamcapp\\Controllers\\AppointmentController@saveDraft');
$router->get('/appointments/latest-draft', 'Gamcapp\\Controllers\\AppointmentController@getLatestDraft');
$router->get('/appointments/{id}', 'Gamcapp\\Controllers\\AppointmentController@getById');

$router->get('/payment/methods', 'Gamcapp\\Controllers\\PaymentController@getPaymentMethods');
$router->post('/payment/create-order', 'Gamcapp\\Controllers\\PaymentController@createOrder');
$router->post('/payment/verify', 'Gamcapp\\Controllers\\PaymentController@verifyPayment');
$router->post('/payment/create-upi', 'Gamcapp\\Controllers\\PaymentController@createUpiPayment');
$router->post('/payment/verify-upi', 'Gamcapp\\Controllers\\PaymentController@verifyUpiPayment');

$router->post('/upload/appointment-slip', 'Gamcapp\\Controllers\\UploadController@appointmentSlip');

$router->get('/admin/users', 'Gamcapp\\Controllers\\AdminController@getUsers');
$router->get('/admin/appointments', 'Gamcapp\\Controllers\\AdminController@getAppointments');
$router->post('/admin/upload-slip', 'Gamcapp\\Controllers\\AdminController@uploadSlip');
$router->post('/admin/change-password', 'Gamcapp\\Controllers\\AdminController@changePassword');

$router->post('/external/book-wafid', 'Gamcapp\\Controllers\\ExternalController@bookWafid');

$router->get('/user/profile', 'Gamcapp\\Controllers\\UserController@getProfile');

$router->post('/notifications/payment-success', 'Gamcapp\\Controllers\\NotificationController@paymentSuccess');

// Override REQUEST_URI to use the API path for routing
if (!empty($apiPath)) {
    $_SERVER['REQUEST_URI'] = '/' . ltrim($apiPath, '/');
    $router->run();
} else {
    // For empty API path, don't run the router at all since we already responded
    // This prevents any router processing of empty paths
}