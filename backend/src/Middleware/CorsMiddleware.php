<?php
declare(strict_types=1);

namespace Gamcapp\Middleware;

class CorsMiddleware {
    public static function handle(): void {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
        
        $allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            $_ENV['FRONTEND_URL'] ?? ''
        ];
        
        if (in_array($origin, $allowedOrigins) || $_ENV['APP_ENV'] === 'development') {
            header("Access-Control-Allow-Origin: $origin");
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Allow-Credentials: true');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }
}