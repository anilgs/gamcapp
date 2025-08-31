<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Gamcapp\Core\Router;
use Gamcapp\Core\Database;
use Gamcapp\Middleware\CorsMiddleware;

header('Content-Type: application/json');

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

// Routes without /api prefix and leading slash
$router->get('health', 'Gamcapp\\Controllers\\HealthController@check');
$router->post('auth/send-otp', 'Gamcapp\\Controllers\\AuthController@sendOtp');
$router->post('auth/verify-otp', 'Gamcapp\\Controllers\\AuthController@verifyOtp');
$router->post('auth/logout', 'Gamcapp\\Controllers\\AuthController@logout');
$router->get('auth/verify-token', 'Gamcapp\\Controllers\\AuthController@verifyToken');
$router->post('auth/admin-login', 'Gamcapp\\Controllers\\AuthController@adminLogin');

$router->post('appointments/create', 'Gamcapp\\Controllers\\AppointmentController@create');
$router->get('appointments/user', 'Gamcapp\\Controllers\\AppointmentController@getUserAppointments');

$router->post('payment/create-order', 'Gamcapp\\Controllers\\PaymentController@createOrder');
$router->post('payment/verify', 'Gamcapp\\Controllers\\PaymentController@verifyPayment');

$router->post('upload/appointment-slip', 'Gamcapp\\Controllers\\UploadController@appointmentSlip');

$router->get('admin/users', 'Gamcapp\\Controllers\\AdminController@getUsers');
$router->post('admin/upload-slip', 'Gamcapp\\Controllers\\AdminController@uploadSlip');

$router->post('external/book-wafid', 'Gamcapp\\Controllers\\ExternalController@bookWafid');

$router->get('user/profile', 'Gamcapp\\Controllers\\UserController@getProfile');

$router->post('notifications/payment-success', 'Gamcapp\\Controllers\\NotificationController@paymentSuccess');

// Override REQUEST_URI to use the API path for routing
$_SERVER['REQUEST_URI'] = '/' . ltrim($apiPath, '/');

$router->run();