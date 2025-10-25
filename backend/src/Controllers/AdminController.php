<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

use Gamcapp\Lib\Auth;
use Gamcapp\Lib\Logger;
use Gamcapp\Models\User;
use Gamcapp\Models\Admin;
use Gamcapp\Models\Appointment;
use Gamcapp\Core\Database;

class AdminController {
    private Logger $logger;
    
    public function __construct() {
        $this->logger = Logger::getInstance();
    }
    public function getUsers(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            Auth::requireAdminAuth();

            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 10);
            $filters = [
                'payment_status' => $_GET['payment_status'] ?? null,
                'search' => $_GET['search'] ?? null
            ];

            $result = User::findAll($page, $limit, array_filter($filters));
            
            // Convert User objects to arrays for proper JSON serialization
            $usersArray = [];
            foreach ($result['users'] as $user) {
                $usersArray[] = $user->toArray();
            }

            // Add mock statistics for now
            $statistics = [
                'total_users' => $result['pagination']['totalCount'],
                'paid_users' => 0, // TODO: Calculate from actual data
                'pending_users' => 0, // TODO: Calculate from actual data  
                'total_revenue' => 0 // TODO: Calculate from actual data
            ];

            // Return in the format expected by frontend
            echo json_encode([
                'success' => true,
                'data' => [
                    'users' => $usersArray,
                    'pagination' => [
                        'current_page' => $result['pagination']['page'],
                        'total_pages' => $result['pagination']['totalPages'],
                        'total_records' => $result['pagination']['totalCount'],
                        'per_page' => $result['pagination']['limit'],
                        'has_prev' => $result['pagination']['hasPrev'],
                        'has_next' => $result['pagination']['hasNext']
                    ],
                    'statistics' => $statistics
                ]
            ]);

        } catch (\Exception $error) {
            error_log('Get users error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function uploadSlip(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            Auth::requireAdminAuth();

            // Handle file upload logic here
            echo json_encode([
                'success' => true,
                'message' => 'File upload functionality not implemented yet'
            ]);

        } catch (\Exception $error) {
            error_log('Upload slip error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function changePassword(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $admin = Auth::requireAdminAuth();
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
                return;
            }

            $currentPassword = $input['currentPassword'] ?? '';
            $newPassword = $input['newPassword'] ?? '';

            if (empty($currentPassword) || empty($newPassword)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Current password and new password are required']);
                return;
            }

            if (strlen($newPassword) < 8) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'New password must be at least 8 characters long']);
                return;
            }

            // Get the admin object with password hash
            $adminWithPassword = Admin::findById($admin['id']);
            if (!$adminWithPassword) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Admin not found']);
                return;
            }

            // Verify current password
            if (!$adminWithPassword->validatePassword($currentPassword)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Current password is incorrect']);
                return;
            }

            // Update password
            $adminWithPassword->updatePassword($newPassword);

            echo json_encode([
                'success' => true,
                'message' => 'Password changed successfully'
            ]);

        } catch (\Exception $error) {
            error_log('Change password error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function getAppointments(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            Auth::requireAdminAuth();

            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 20);
            $search = $_GET['search'] ?? '';
            $paymentStatus = $_GET['payment_status'] ?? '';
            $appointmentType = $_GET['appointment_type'] ?? '';
            $sortBy = $_GET['sort_by'] ?? 'created_at';
            $sortOrder = $_GET['sort_order'] ?? 'desc';

            $offset = ($page - 1) * $limit;

            // Build WHERE clause
            $whereConditions = [];
            $params = [];

            if (!empty($search)) {
                $whereConditions[] = "(a.first_name LIKE :search OR a.last_name LIKE :search OR a.email LIKE :search OR a.phone LIKE :search OR a.passport_number LIKE :search)";
                $params[':search'] = "%{$search}%";
            }

            if (!empty($paymentStatus)) {
                $whereConditions[] = "a.payment_status = :payment_status";
                $params[':payment_status'] = $paymentStatus;
            }

            if (!empty($appointmentType)) {
                $whereConditions[] = "a.appointment_type = :appointment_type";
                $params[':appointment_type'] = $appointmentType;
            }

            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

            // Build ORDER BY clause
            $allowedSortFields = ['created_at', 'first_name', 'payment_status', 'appointment_date', 'status'];
            $sortField = in_array($sortBy, $allowedSortFields) ? $sortBy : 'created_at';
            if ($sortField === 'first_name') {
                $sortField = 'a.first_name';
            } else {
                $sortField = 'a.' . $sortField;
            }
            $sortDirection = ($sortOrder === 'asc') ? 'ASC' : 'DESC';

            $db = \Gamcapp\Core\Database::getInstance();

            // Get total count for pagination
            $countSql = "SELECT COUNT(*) as total FROM appointments a {$whereClause}";
            $countStmt = $db->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = (int)$countStmt->fetch(\PDO::FETCH_ASSOC)['total'];

            // Get appointments data
            $sql = "SELECT 
                        a.*,
                        u.name as user_name,
                        u.email as user_email,
                        u.phone as user_phone
                    FROM appointments a 
                    LEFT JOIN users u ON a.user_id = u.id 
                    {$whereClause}
                    ORDER BY {$sortField} {$sortDirection}
                    LIMIT :limit OFFSET :offset";

            $stmt = $db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
            $stmt->execute();

            $appointments = [];
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                // Format the appointment data for the frontend
                $appointments[] = [
                    'id' => $row['id'],
                    'user_id' => $row['user_id'],
                    'name' => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
                    'email' => $row['email'] ?? $row['user_email'] ?? '',
                    'phone' => $row['phone'] ?? $row['user_phone'] ?? '',
                    'passport_number' => $row['passport_number'],
                    'appointment_type' => $row['appointment_type'],
                    'appointment_date' => $row['appointment_date'],
                    'appointment_time' => $row['appointment_time'],
                    'medical_center' => $row['medical_center'],
                    'payment_status' => $row['payment_status'],
                    'status' => $row['status'],
                    'country_traveling_to' => $row['country_traveling_to'],
                    'payment_amount' => $row['payment_amount'] ? (float)$row['payment_amount'] : null,
                    'payment_reference' => $row['payment_reference'],
                    'admin_notes' => $row['admin_notes'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at'],
                    'appointment_details' => [
                        'nationality' => $row['nationality'],
                        'gender' => $row['gender'],
                        'date_of_birth' => $row['date_of_birth'],
                        'visa_type' => $row['visa_type'],
                        'position_applied_for' => $row['position_applied_for']
                    ]
                ];
            }

            // Calculate pagination
            $totalPages = ceil($totalRecords / $limit);
            $hasPrev = $page > 1;
            $hasNext = $page < $totalPages;

            // Calculate statistics
            $statsCountSql = "SELECT 
                COUNT(*) as total_appointments,
                SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_appointments,
                SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_appointments,
                COUNT(DISTINCT user_id) as total_users
                FROM appointments";
            $statsStmt = $db->prepare($statsCountSql);
            $statsStmt->execute();
            $statsData = $statsStmt->fetch(\PDO::FETCH_ASSOC);

            $statistics = [
                'total_users' => (int)$statsData['total_users'],
                'total_appointments' => (int)$statsData['total_appointments'],
                'paid_users' => (int)$statsData['paid_appointments'], // Using appointments as proxy
                'pending_users' => (int)$statsData['pending_appointments'],
                'total_revenue' => 0 // TODO: Calculate from actual payment data
            ];

            echo json_encode([
                'success' => true,
                'data' => [
                    'appointments' => $appointments,
                    'pagination' => [
                        'current_page' => $page,
                        'total_pages' => $totalPages,
                        'total_records' => $totalRecords,
                        'per_page' => $limit,
                        'has_prev' => $hasPrev,
                        'has_next' => $hasNext
                    ],
                    'statistics' => $statistics
                ]
            ]);

        } catch (\Exception $error) {
            error_log('Get appointments error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function getPendingPayments(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            Auth::requireAdminAuth();
            $this->logger->log('Admin accessing pending payments list', 'INFO');

            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['limit'] ?? 20);
            $offset = ($page - 1) * $limit;

            $db = Database::getInstance();

            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM appointments WHERE payment_status IN ('pending', 'pending_confirmation')";
            $countStmt = $db->prepare($countSql);
            $countStmt->execute();
            $totalRecords = (int)$countStmt->fetch(\PDO::FETCH_ASSOC)['total'];

            // Get pending payments with appointment details
            $sql = "SELECT 
                        a.id,
                        a.user_id,
                        a.first_name,
                        a.last_name,
                        a.email,
                        a.phone,
                        a.payment_status,
                        a.payment_amount,
                        a.payment_reference,
                        a.appointment_type,
                        a.appointment_date,
                        a.created_at,
                        a.updated_at
                    FROM appointments a 
                    WHERE a.payment_status IN ('pending', 'pending_confirmation')
                    ORDER BY a.created_at DESC
                    LIMIT :limit OFFSET :offset";

            $stmt = $db->prepare($sql);
            $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
            $stmt->execute();

            $payments = [];
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $payments[] = [
                    'id' => $row['id'],
                    'user_id' => $row['user_id'],
                    'customer_name' => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
                    'email' => $row['email'],
                    'phone' => $row['phone'],
                    'payment_status' => $row['payment_status'],
                    'payment_method' => 'UPI', // Default since we don't have this column yet
                    'payment_amount' => $row['payment_amount'],
                    'payment_reference' => $row['payment_reference'],
                    'appointment_type' => $row['appointment_type'],
                    'appointment_date' => $row['appointment_date'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at']
                ];
            }

            $totalPages = ceil($totalRecords / $limit);

            echo json_encode([
                'success' => true,
                'data' => [
                    'payments' => $payments,
                    'pagination' => [
                        'current_page' => $page,
                        'total_pages' => $totalPages,
                        'total_records' => $totalRecords,
                        'per_page' => $limit,
                        'has_prev' => $page > 1,
                        'has_next' => $page < $totalPages
                    ]
                ]
            ]);

        } catch (\Exception $error) {
            $this->logger->log('Error getting pending payments: ' . $error->getMessage(), 'ERROR');
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function markPaymentComplete(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $admin = Auth::requireAdminAuth();
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
                return;
            }

            $appointmentId = $input['appointment_id'] ?? '';
            $adminNotes = $input['admin_notes'] ?? '';

            if (empty($appointmentId)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Appointment ID is required']);
                return;
            }

            $this->logger->log("Admin {$admin['username']} marking payment complete for appointment: {$appointmentId}", 'INFO');

            $db = Database::getInstance();

            // First, verify the appointment exists and is pending
            $checkSql = "SELECT id, payment_status, first_name, last_name, email FROM appointments WHERE id = :id";
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->bindValue(':id', $appointmentId);
            $checkStmt->execute();
            
            $appointment = $checkStmt->fetch(\PDO::FETCH_ASSOC);
            
            if (!$appointment) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Appointment not found']);
                return;
            }

            if ($appointment['payment_status'] === 'completed') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Payment already marked as complete']);
                return;
            }

            // Update payment status to completed
            $updateSql = "UPDATE appointments 
                         SET payment_status = 'completed', 
                             status = 'confirmed',
                             updated_at = NOW(),
                             admin_notes = CONCAT(COALESCE(admin_notes, ''), :admin_note)
                         WHERE id = :id";
            
            $adminNote = "\n[" . date('Y-m-d H:i:s') . "] Payment manually marked complete by admin: {$admin['username']}";
            if (!empty($adminNotes)) {
                $adminNote .= " - Notes: {$adminNotes}";
            }

            $updateStmt = $db->prepare($updateSql);
            $updateStmt->bindValue(':id', $appointmentId);
            $updateStmt->bindValue(':admin_note', $adminNote);
            
            if ($updateStmt->execute()) {
                $customerName = trim(($appointment['first_name'] ?? '') . ' ' . ($appointment['last_name'] ?? ''));
                
                $this->logger->log("Payment marked complete for appointment {$appointmentId} by admin {$admin['username']}", 'INFO');
                
                echo json_encode([
                    'success' => true,
                    'message' => "Payment marked as complete for {$customerName}",
                    'data' => [
                        'appointment_id' => $appointmentId,
                        'new_status' => 'completed',
                        'updated_by' => $admin['username'],
                        'updated_at' => date('Y-m-d H:i:s')
                    ]
                ]);
            } else {
                throw new \Exception('Failed to update payment status');
            }

        } catch (\Exception $error) {
            $this->logger->log('Error marking payment complete: ' . $error->getMessage(), 'ERROR');
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
}