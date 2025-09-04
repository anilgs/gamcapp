<?php
declare(strict_types=1);

namespace Gamcapp\Models;

use Gamcapp\Core\Database;

class Admin {
    public ?int $id = null;
    public string $username;
    public string $password_hash;
    public ?string $email = null;
    public bool $is_active = true;
    public ?string $last_login = null;
    public ?string $created_at = null;
    public ?string $updated_at = null;

    public function __construct(array $data = []) {
        if (!empty($data)) {
            $this->id = $data['id'] ?? null;
            $this->username = $data['username'] ?? '';
            $this->password_hash = $data['password_hash'] ?? '';
            $this->email = $data['email'] ?? null;
            $this->is_active = (bool)($data['is_active'] ?? true);
            $this->last_login = $data['last_login'] ?? null;
            $this->created_at = $data['created_at'] ?? null;
            $this->updated_at = $data['updated_at'] ?? null;
        }
    }

    public static function create(array $adminData): self {
        $username = $adminData['username'];
        $password = $adminData['password'];

        if (empty($username) || empty($password)) {
            throw new \Exception('Username and password are required');
        }

        $password_hash = password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 1024,
            'time_cost' => 2, 
            'threads' => 2
        ]);

        try {
            $stmt = Database::query(
                "INSERT INTO admins (username, password_hash)
                 VALUES (?, ?) RETURNING id, username, created_at, updated_at",
                [$username, $password_hash]
            );

            $data = $stmt->fetch();
            $data['password_hash'] = $password_hash;

            return new self($data);
        } catch (\PDOException $e) {
            if ($e->getCode() === '23505') { // Unique constraint violation
                throw new \Exception('Username already exists');
            }
            throw $e;
        }
    }

    public static function findById(int $id): ?self {
        $stmt = Database::query('SELECT * FROM admins WHERE id = ?', [$id]);
        $data = $stmt->fetch();
        
        return $data ? new self($data) : null;
    }

    public static function findByUsername(string $username): ?self {
        $stmt = Database::query('SELECT * FROM admins WHERE username = ?', [$username]);
        $data = $stmt->fetch();
        
        return $data ? new self($data) : null;
    }

    public static function findAll(): array {
        $stmt = Database::query(
            'SELECT id, username, created_at, updated_at FROM admins ORDER BY created_at DESC'
        );

        $admins = [];
        while ($row = $stmt->fetch()) {
            $row['password_hash'] = ''; // Don't expose password hash
            $admins[] = new self($row);
        }

        return $admins;
    }

    public static function authenticate(string $username, string $password): ?self {
        if (empty($username) || empty($password)) {
            throw new \Exception('Username and password are required');
        }

        $admin = self::findByUsername($username);
        
        if (!$admin) {
            return null; // Admin not found
        }

        // Check if admin is active
        if (!$admin->is_active) {
            return null; // Admin is disabled
        }

        // Verify password
        if (!password_verify($password, $admin->password_hash)) {
            return null; // Invalid password
        }

        // Update last login
        try {
            Database::query(
                'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [$admin->id]
            );
        } catch (\Exception $e) {
            error_log('Failed to update last login: ' . $e->getMessage());
        }

        // Return admin without password hash
        return new self([
            'id' => $admin->id,
            'username' => $admin->username,
            'email' => $admin->email,
            'is_active' => $admin->is_active,
            'last_login' => date('Y-m-d H:i:s'), // Current timestamp
            'created_at' => $admin->created_at,
            'updated_at' => $admin->updated_at,
            'password_hash' => ''
        ]);
    }

    public function updatePassword(string $newPassword): self {
        if (empty($newPassword)) {
            throw new \Exception('New password is required');
        }

        $password_hash = password_hash($newPassword, PASSWORD_ARGON2ID, [
            'memory_cost' => 1024,
            'time_cost' => 2,
            'threads' => 2
        ]);

        $stmt = Database::query(
            'UPDATE admins SET password_hash = ? WHERE id = ? RETURNING id, username, created_at, updated_at',
            [$password_hash, $this->id]
        );

        $data = $stmt->fetch();
        if (!$data) {
            throw new \Exception('Admin not found');
        }

        $this->__construct(array_merge($data, ['password_hash' => '']));
        return $this;
    }

    public function updateUsername(string $newUsername): self {
        if (empty($newUsername)) {
            throw new \Exception('New username is required');
        }

        try {
            $stmt = Database::query(
                'UPDATE admins SET username = ? WHERE id = ? RETURNING id, username, created_at, updated_at',
                [$newUsername, $this->id]
            );

            $data = $stmt->fetch();
            if (!$data) {
                throw new \Exception('Admin not found');
            }

            $this->__construct($data);
            return $this;
        } catch (\PDOException $e) {
            if ($e->getCode() === '23505') { // Unique constraint violation
                throw new \Exception('Username already exists');
            }
            throw $e;
        }
    }

    public function delete(): bool {
        $adminId = $this->id;
        Database::query('DELETE FROM admins WHERE id = ?', [$adminId]);
        return true;
    }

    public function validatePassword(string $password): bool {
        if (empty($password)) {
            return false;
        }

        $stmt = Database::query('SELECT password_hash FROM admins WHERE id = ?', [$this->id]);
        $data = $stmt->fetch();
        
        if (!$data) {
            return false;
        }

        return password_verify($password, $data['password_hash']);
    }

    public static function getStats(): array {
        $stmt = Database::query("
            SELECT 
                COUNT(*) as total_admins,
                MIN(created_at) as first_admin_created,
                MAX(created_at) as last_admin_created
            FROM admins
        ");

        return $stmt->fetch();
    }

    public function toArray(): array {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'email' => $this->email,
            'is_active' => $this->is_active,
            'last_login' => $this->last_login,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at
        ];
    }

    public function toSafeArray(): array {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'created_at' => $this->created_at
        ];
    }
}