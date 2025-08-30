<?php
declare(strict_types=1);

namespace Gamcapp\Models;

use Gamcapp\Core\Database;
use PDO;

class User {
    public ?int $id = null;
    public string $name;
    public string $email;
    public string $phone;
    public string $passport_number;
    public array $appointment_details = [];
    public string $payment_status = 'pending';
    public ?string $payment_id = null;
    public ?string $appointment_slip_path = null;
    public ?string $created_at = null;
    public ?string $updated_at = null;

    public function __construct(array $data = []) {
        if (!empty($data)) {
            $this->id = $data['id'] ?? null;
            $this->name = $data['name'] ?? '';
            $this->email = $data['email'] ?? '';
            $this->phone = $data['phone'] ?? '';
            $this->passport_number = $data['passport_number'] ?? '';
            $this->appointment_details = isset($data['appointment_details']) 
                ? (is_string($data['appointment_details']) ? json_decode($data['appointment_details'], true) : $data['appointment_details'])
                : [];
            $this->payment_status = $data['payment_status'] ?? 'pending';
            $this->payment_id = $data['payment_id'] ?? null;
            $this->appointment_slip_path = $data['appointment_slip_path'] ?? null;
            $this->created_at = $data['created_at'] ?? null;
            $this->updated_at = $data['updated_at'] ?? null;
        }
    }

    public static function create(array $userData): self {
        $name = $userData['name'];
        $email = $userData['email'];
        $phone = $userData['phone'];
        $passport_number = $userData['passport_number'];
        $appointment_details = json_encode($userData['appointment_details'] ?? []);
        $payment_status = $userData['payment_status'] ?? 'pending';

        Database::query(
            "INSERT INTO users (name, email, phone, passport_number, appointment_details, payment_status)
             VALUES (?, ?, ?, ?, ?, ?)",
            [$name, $email, $phone, $passport_number, $appointment_details, $payment_status]
        );

        // Get the inserted user record
        $stmt = Database::query('SELECT * FROM users WHERE email = ? AND phone = ?', [$email, $phone]);
        $data = $stmt->fetch();
        return new self($data);
    }

    public static function findById(int $id): ?self {
        $stmt = Database::query('SELECT * FROM users WHERE id = ?', [$id]);
        $data = $stmt->fetch();
        
        return $data ? new self($data) : null;
    }

    public static function findByEmail(string $email): ?self {
        $stmt = Database::query('SELECT * FROM users WHERE email = ?', [$email]);
        $data = $stmt->fetch();
        
        return $data ? new self($data) : null;
    }

    public static function findByPhone(string $phone): ?self {
        $stmt = Database::query('SELECT * FROM users WHERE phone = ?', [$phone]);
        $data = $stmt->fetch();
        
        return $data ? new self($data) : null;
    }

    public static function findAll(int $page = 1, int $limit = 10, array $filters = []): array {
        $offset = ($page - 1) * $limit;
        $whereClause = '';
        $params = [];

        if (!empty($filters['payment_status'])) {
            $whereClause = 'WHERE payment_status = ?';
            $params[] = $filters['payment_status'];
        }

        if (!empty($filters['search'])) {
            $searchClause = ($whereClause ? ' AND ' : 'WHERE ') . 
                           '(name LIKE ? OR email LIKE ? OR phone LIKE ?)';
            $whereClause .= $searchClause;
            $searchTerm = "%{$filters['search']}%";
            $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
        }

        // Get total count
        $countStmt = Database::query("SELECT COUNT(*) as count FROM users $whereClause", $params);
        $totalCount = $countStmt->fetch()['count'];

        // Get paginated results
        $params = array_merge($params, [$limit, $offset]);
        $stmt = Database::query(
            "SELECT * FROM users $whereClause ORDER BY created_at DESC LIMIT ? OFFSET ?",
            $params
        );

        $users = [];
        while ($row = $stmt->fetch()) {
            $users[] = new self($row);
        }

        return [
            'users' => $users,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'totalCount' => (int)$totalCount,
                'totalPages' => ceil($totalCount / $limit),
                'hasNext' => $page < ceil($totalCount / $limit),
                'hasPrev' => $page > 1
            ]
        ];
    }

    public function update(array $updateData): self {
        $allowedFields = ['name', 'email', 'phone', 'passport_number', 'appointment_details', 'payment_status', 'payment_id', 'appointment_slip_path'];
        $updates = [];
        $values = [];

        foreach ($updateData as $key => $value) {
            if (in_array($key, $allowedFields) && $value !== null) {
                $updates[] = "$key = ?";
                $values[] = $key === 'appointment_details' ? json_encode($value) : $value;
            }
        }

        if (empty($updates)) {
            throw new \Exception('No valid fields to update');
        }

        $values[] = $this->id;
        Database::query(
            "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?",
            $values
        );

        // Get the updated user record
        $stmt = Database::query('SELECT * FROM users WHERE id = ?', [$this->id]);
        $data = $stmt->fetch();
        if (!$data) {
            throw new \Exception('User not found');
        }

        // Update current instance
        $this->__construct($data);
        return $this;
    }

    public function updatePaymentStatus(string $paymentStatus, ?string $paymentId = null): self {
        Database::query(
            'UPDATE users SET payment_status = ?, payment_id = ? WHERE id = ?',
            [$paymentStatus, $paymentId, $this->id]
        );

        // Get the updated user record
        $stmt = Database::query('SELECT * FROM users WHERE id = ?', [$this->id]);
        $data = $stmt->fetch();
        if (!$data) {
            throw new \Exception('User not found');
        }

        $this->__construct($data);
        return $this;
    }

    public function updateAppointmentSlip(string $slipPath): self {
        Database::query(
            'UPDATE users SET appointment_slip_path = ? WHERE id = ?',
            [$slipPath, $this->id]
        );

        // Get the updated user record
        $stmt = Database::query('SELECT * FROM users WHERE id = ?', [$this->id]);
        $data = $stmt->fetch();
        if (!$data) {
            throw new \Exception('User not found');
        }

        $this->__construct($data);
        return $this;
    }

    public function delete(): bool {
        $userId = $this->id;
        Database::query('DELETE FROM users WHERE id = ?', [$userId]);
        return true;
    }

    public static function getDashboardData(int $userId): ?array {
        $stmt = Database::query('SELECT * FROM users WHERE id = ?', [$userId]);
        return $stmt->fetch() ?: null;
    }

    public static function getAdminDashboardData(int $page = 1, int $limit = 10, array $filters = []): array {
        return self::findAll($page, $limit, $filters);
    }

    public function toArray(): array {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'passport_number' => $this->passport_number,
            'appointment_details' => $this->appointment_details,
            'payment_status' => $this->payment_status,
            'payment_id' => $this->payment_id,
            'appointment_slip_path' => $this->appointment_slip_path,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at
        ];
    }
}