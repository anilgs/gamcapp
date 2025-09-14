<?php
declare(strict_types=1);

namespace Gamcapp\Models;

use Gamcapp\Core\Database;
use PDO;

class Appointment {
    public string $id;
    public int $user_id;
    public string $first_name;
    public string $last_name;
    public string $date_of_birth;
    public string $nationality;
    public string $gender;
    public string $marital_status;
    public string $passport_number;
    public string $passport_issue_date;
    public string $passport_issue_place;
    public string $passport_expiry_date;
    public string $visa_type;
    public ?string $position_applied_for;
    public string $email;
    public string $phone;
    public ?string $national_id;
    public string $country;
    public ?string $city;
    public string $country_traveling_to;
    public string $appointment_type;
    public string $medical_center;
    public string $appointment_date;
    public ?string $appointment_time;
    public string $status;
    public ?string $payment_order_id;
    public string $payment_status;
    public string $created_at;
    public string $updated_at;

    public function __construct(array $data = []) {
        if (!empty($data)) {
            $this->fillFromArray($data);
        }
    }

    private function fillFromArray(array $data): void {
        $this->id = $data['id'] ?? '';
        $this->user_id = (int)($data['user_id'] ?? 0);
        $this->first_name = $data['first_name'] ?? '';
        $this->last_name = $data['last_name'] ?? '';
        $this->date_of_birth = $data['date_of_birth'] ?? '';
        $this->nationality = $data['nationality'] ?? '';
        $this->gender = $data['gender'] ?? '';
        $this->marital_status = $data['marital_status'] ?? '';
        $this->passport_number = $data['passport_number'] ?? '';
        $this->passport_issue_date = $data['passport_issue_date'] ?? '';
        $this->passport_issue_place = $data['passport_issue_place'] ?? '';
        $this->passport_expiry_date = $data['passport_expiry_date'] ?? '';
        $this->visa_type = $data['visa_type'] ?? '';
        $this->position_applied_for = $data['position_applied_for'] ?? null;
        $this->email = $data['email'] ?? '';
        $this->phone = $data['phone'] ?? '';
        $this->national_id = $data['national_id'] ?? null;
        $this->country = $data['country'] ?? '';
        $this->city = $data['city'] ?? null;
        $this->country_traveling_to = $data['country_traveling_to'] ?? '';
        $this->appointment_type = $data['appointment_type'] ?? '';
        $this->medical_center = $data['medical_center'] ?? '';
        $this->appointment_date = $data['appointment_date'] ?? '';
        $this->appointment_time = $data['appointment_time'] ?? null;
        $this->status = $data['status'] ?? 'draft';
        $this->payment_order_id = $data['payment_order_id'] ?? null;
        $this->payment_status = $data['payment_status'] ?? 'pending';
        $this->created_at = $data['created_at'] ?? '';
        $this->updated_at = $data['updated_at'] ?? '';
    }

    public static function create(array $data): ?self {
        $db = Database::getInstance();
        
        // Generate UUID
        $appointmentId = self::generateUuid();
        
        $sql = "INSERT INTO appointments (
            id, user_id, first_name, last_name, date_of_birth, nationality, gender, marital_status,
            passport_number, passport_issue_date, passport_issue_place, passport_expiry_date, visa_type,
            position_applied_for, email, phone, national_id, country, city, country_traveling_to,
            appointment_type, medical_center, appointment_date, appointment_time, status, payment_status
        ) VALUES (
            :id, :user_id, :first_name, :last_name, :date_of_birth, :nationality, :gender, :marital_status,
            :passport_number, :passport_issue_date, :passport_issue_place, :passport_expiry_date, :visa_type,
            :position_applied_for, :email, :phone, :national_id, :country, :city, :country_traveling_to,
            :appointment_type, :medical_center, :appointment_date, :appointment_time, :status, :payment_status
        )";

        $stmt = $db->prepare($sql);
        
        $params = [
            ':id' => $appointmentId,
            ':user_id' => $data['user_id'],
            ':first_name' => $data['first_name'] ?? '',
            ':last_name' => $data['last_name'] ?? '',
            ':date_of_birth' => $data['date_of_birth'] ?? '',
            ':nationality' => $data['nationality'] ?? '',
            ':gender' => $data['gender'] ?? '',
            ':marital_status' => $data['marital_status'] ?? '',
            ':passport_number' => $data['passport_number'] ?? '',
            ':passport_issue_date' => $data['passport_issue_date'] ?? '',
            ':passport_issue_place' => $data['passport_issue_place'] ?? '',
            ':passport_expiry_date' => $data['passport_expiry_date'] ?? '',
            ':visa_type' => $data['visa_type'] ?? '',
            ':position_applied_for' => $data['position_applied_for'] ?? null,
            ':email' => $data['email'] ?? '',
            ':phone' => $data['phone'] ?? '',
            ':national_id' => $data['national_id'] ?? null,
            ':country' => $data['country'] ?? '',
            ':city' => $data['city'] ?? null,
            ':country_traveling_to' => $data['country_traveling_to'] ?? '',
            ':appointment_type' => $data['appointment_type'] ?? '',
            ':medical_center' => $data['medical_center'] ?? '',
            ':appointment_date' => $data['appointment_date'] ?? '',
            ':appointment_time' => $data['appointment_time'] ?? null,
            ':status' => $data['status'] ?? 'draft',
            ':payment_status' => $data['payment_status'] ?? 'pending'
        ];

        if ($stmt->execute($params)) {
            return self::findById($appointmentId);
        }
        
        return null;
    }

    public static function findById(string $id): ?self {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM appointments WHERE id = :id");
        $stmt->execute([':id' => $id]);
        
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        return $data ? new self($data) : null;
    }

    public static function findByUserId(int $userId): array {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM appointments WHERE user_id = :user_id ORDER BY created_at DESC");
        $stmt->execute([':user_id' => $userId]);
        
        $appointments = [];
        while ($data = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $appointments[] = new self($data);
        }
        
        return $appointments;
    }

    public static function getLatestDraft(string $appointmentId): ?self {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM appointments WHERE id = :id");
        $stmt->execute([':id' => $appointmentId]);
        
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        return $data ? new self($data) : null;
    }

    public static function findLatestEditableByUserId(int $userId): ?self {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM appointments WHERE user_id = :user_id AND status IN ('draft', 'payment_pending') ORDER BY updated_at DESC LIMIT 1");
        $stmt->execute([':user_id' => $userId]);
        
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        return $data ? new self($data) : null;
    }

    public static function findLatestDraftByUserId(int $userId): ?self {
        // Deprecated: Use findLatestEditableByUserId instead
        return self::findLatestEditableByUserId($userId);
    }

    public function update(array $data): bool {
        $db = Database::getInstance();
        
        $updateFields = [];
        $params = [':id' => $this->id];
        
        $allowedFields = [
            'first_name', 'last_name', 'date_of_birth', 'nationality', 'gender', 'marital_status',
            'passport_number', 'passport_issue_date', 'passport_issue_place', 'passport_expiry_date',
            'visa_type', 'position_applied_for', 'email', 'phone', 'national_id', 'country',
            'city', 'country_traveling_to', 'appointment_type', 'medical_center', 'appointment_date',
            'appointment_time', 'status', 'payment_order_id', 'payment_status'
        ];
        
        foreach ($data as $field => $value) {
            if (in_array($field, $allowedFields)) {
                $updateFields[] = "{$field} = :{$field}";
                $params[":{$field}"] = $value;
            }
        }
        
        if (empty($updateFields)) {
            return false;
        }
        
        $sql = "UPDATE appointments SET " . implode(', ', $updateFields) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        
        if ($stmt->execute($params)) {
            // Refresh object data
            $updated = self::findById($this->id);
            if ($updated) {
                $this->fillFromArray($updated->toArray());
            }
            return true;
        }
        
        return false;
    }

    public function delete(): bool {
        $db = Database::getInstance();
        $stmt = $db->prepare("DELETE FROM appointments WHERE id = :id");
        return $stmt->execute([':id' => $this->id]);
    }

    public function toArray(): array {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'date_of_birth' => $this->date_of_birth,
            'nationality' => $this->nationality,
            'gender' => $this->gender,
            'marital_status' => $this->marital_status,
            'passport_number' => $this->passport_number,
            'passport_issue_date' => $this->passport_issue_date,
            'passport_issue_place' => $this->passport_issue_place,
            'passport_expiry_date' => $this->passport_expiry_date,
            'visa_type' => $this->visa_type,
            'position_applied_for' => $this->position_applied_for,
            'email' => $this->email,
            'phone' => $this->phone,
            'national_id' => $this->national_id,
            'country' => $this->country,
            'city' => $this->city,
            'country_traveling_to' => $this->country_traveling_to,
            'appointment_type' => $this->appointment_type,
            'medical_center' => $this->medical_center,
            'appointment_date' => $this->appointment_date,
            'appointment_time' => $this->appointment_time,
            'status' => $this->status,
            'payment_order_id' => $this->payment_order_id,
            'payment_status' => $this->payment_status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at
        ];
    }

    public function toFormData(): array {
        return [
            'firstName' => $this->first_name,
            'lastName' => $this->last_name,
            'dateOfBirth' => $this->date_of_birth,
            'nationality' => $this->nationality,
            'gender' => $this->gender,
            'maritalStatus' => $this->marital_status,
            'passportNumber' => $this->passport_number,
            'confirmPassportNumber' => $this->passport_number,
            'passportIssueDate' => $this->passport_issue_date,
            'passportIssuePlace' => $this->passport_issue_place,
            'passportExpiryDate' => $this->passport_expiry_date,
            'visaType' => $this->visa_type,
            'positionAppliedFor' => $this->position_applied_for ?? '',
            'email' => $this->email,
            'phone' => $this->phone,
            'nationalId' => $this->national_id ?? '',
            'country' => $this->country,
            'city' => $this->city ?? '',
            'countryTravelingTo' => $this->country_traveling_to,
            'appointmentType' => $this->appointment_type,
            'medicalCenter' => $this->medical_center,
            'appointmentDate' => $this->appointment_date
        ];
    }

    private static function generateUuid(): string {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}