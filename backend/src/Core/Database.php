<?php
declare(strict_types=1);

namespace Gamcapp\Core;

use PDO;
use PDOException;

class Database {
    private static ?PDO $connection = null;
    
    public static function getConnection(): PDO {
        if (self::$connection === null) {
            try {
                $host = $_ENV['DB_HOST'] ?? 'localhost';
                $port = $_ENV['DB_PORT'] ?? '3306';
                $dbname = $_ENV['DB_NAME'] ?? 'gamcapp';
                $username = $_ENV['DB_USER'] ?? 'root';
                $password = $_ENV['DB_PASSWORD'] ?? '';
                
                $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
                
                self::$connection = new PDO($dsn, $username, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
                
                echo "Connected to MySQL database\n";
            } catch (PDOException $e) {
                error_log("Database connection error: " . $e->getMessage());
                throw $e;
            }
        }
        
        return self::$connection;
    }
    
    public static function query(string $sql, array $params = []): \PDOStatement {
        $start = microtime(true);
        try {
            $stmt = self::getConnection()->prepare($sql);
            $stmt->execute($params);
            $duration = (microtime(true) - $start) * 1000;
            
            error_log("Executed query - Duration: {$duration}ms, Rows: " . $stmt->rowCount());
            
            return $stmt;
        } catch (PDOException $e) {
            error_log("Database query error: " . $e->getMessage());
            throw $e;
        }
    }
    
    public static function transaction(callable $callback) {
        $pdo = self::getConnection();
        try {
            $pdo->beginTransaction();
            $result = $callback($pdo);
            $pdo->commit();
            return $result;
        } catch (\Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}