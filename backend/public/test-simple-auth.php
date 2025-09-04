<?php
declare(strict_types=1);

// Simple test to verify the admin auth test will work in deployment
require_once '../vendor/autoload.php';

use Gamcapp\Models\Admin;

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

header('Content-Type: application/json');

try {
    // Test admin authentication
    $admin = Admin::authenticate('admin', 'admin123');
    
    if ($admin) {
        echo json_encode([
            'success' => true,
            'message' => 'Admin authentication successful',
            'admin_id' => $admin->id,
            'admin_username' => $admin->username,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Admin authentication failed',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}