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

$router = new Router();

$router->post('/api/auth/send-otp', 'Gamcapp\\Controllers\\AuthController@sendOtp');
$router->post('/api/auth/verify-otp', 'Gamcapp\\Controllers\\AuthController@verifyOtp');
$router->post('/api/auth/logout', 'Gamcapp\\Controllers\\AuthController@logout');
$router->get('/api/auth/verify-token', 'Gamcapp\\Controllers\\AuthController@verifyToken');
$router->post('/api/auth/admin-login', 'Gamcapp\\Controllers\\AuthController@adminLogin');

$router->post('/api/appointments/create', 'Gamcapp\\Controllers\\AppointmentController@create');
$router->get('/api/appointments/user', 'Gamcapp\\Controllers\\AppointmentController@getUserAppointments');

$router->post('/api/payment/create-order', 'Gamcapp\\Controllers\\PaymentController@createOrder');
$router->post('/api/payment/verify', 'Gamcapp\\Controllers\\PaymentController@verifyPayment');

$router->post('/api/upload/appointment-slip', 'Gamcapp\\Controllers\\UploadController@appointmentSlip');

$router->get('/api/admin/users', 'Gamcapp\\Controllers\\AdminController@getUsers');
$router->post('/api/admin/upload-slip', 'Gamcapp\\Controllers\\AdminController@uploadSlip');

$router->post('/api/external/book-wafid', 'Gamcapp\\Controllers\\ExternalController@bookWafid');

$router->get('/api/user/profile', 'Gamcapp\\Controllers\\UserController@getProfile');

$router->post('/api/notifications/payment-success', 'Gamcapp\\Controllers\\NotificationController@paymentSuccess');

$router->get('/api/health', 'Gamcapp\\Controllers\\HealthController@check');

$router->run();