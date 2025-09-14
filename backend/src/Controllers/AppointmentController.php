<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

use Gamcapp\Lib\Auth;
use Gamcapp\Models\User;
use Gamcapp\Models\Appointment;
use Lib\Logger;

class AppointmentController {
    private Logger $logger;
    
    public function __construct() {
        $this->logger = Logger::getInstance();
    }
    
    public function create(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $input = json_decode(file_get_contents('php://input'), true);

            // Get user from token
            $userId = $decoded['id'];

            $this->logger->info('Appointment creation started', [
                'user_id' => $userId,
                'appointment_type' => $input['appointmentType'] ?? 'unknown',
                'medical_center' => $input['medicalCenter'] ?? 'unknown',
                'appointment_date' => $input['appointmentDate'] ?? 'unknown',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);

            // Validate required fields
            $requiredFields = [
                'firstName', 'lastName', 'dateOfBirth', 'nationality', 'gender', 'maritalStatus',
                'passportNumber', 'passportIssueDate', 'passportIssuePlace', 'passportExpiryDate',
                'visaType', 'email', 'phone', 'country', 'countryTravelingTo', 'appointmentType',
                'medicalCenter', 'appointmentDate'
            ];

            $missingFields = array_filter($requiredFields, fn($field) => empty($input[$field]));
            if (!empty($missingFields)) {
                $this->logger->warning('Appointment creation failed: Missing required fields', [
                    'user_id' => $userId,
                    'missing_fields' => $missingFields
                ]);
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Missing required fields: ' . implode(', ', $missingFields)
                ]);
                return;
            }

            // Validate passport number confirmation
            if ($input['passportNumber'] !== $input['confirmPassportNumber']) {
                $this->logger->warning('Appointment creation failed: Passport number confirmation mismatch', [
                    'user_id' => $userId,
                    'passport_number' => substr($input['passportNumber'], 0, 4) . '***' // Log only first 4 chars for security
                ]);
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Passport number confirmation does not match'
                ]);
                return;
            }

            // First, save appointment to appointments table (before payment processing)
            $appointmentData = [
                'user_id' => $userId,
                'first_name' => $input['firstName'],
                'last_name' => $input['lastName'],
                'date_of_birth' => $input['dateOfBirth'],
                'nationality' => $input['nationality'],
                'gender' => $input['gender'],
                'marital_status' => $input['maritalStatus'],
                'passport_number' => $input['passportNumber'],
                'passport_issue_date' => $input['passportIssueDate'],
                'passport_issue_place' => $input['passportIssuePlace'],
                'passport_expiry_date' => $input['passportExpiryDate'],
                'visa_type' => $input['visaType'],
                'position_applied_for' => $input['positionAppliedFor'] ?? null,
                'email' => $input['email'],
                'phone' => $input['phone'],
                'national_id' => $input['nationalId'] ?? null,
                'country' => $input['country'],
                'city' => $input['city'] ?? null,
                'country_traveling_to' => $input['countryTravelingTo'],
                'appointment_type' => $input['appointmentType'],
                'medical_center' => $input['medicalCenter'],
                'appointment_date' => $input['appointmentDate'],
                'status' => 'payment_pending',
                'payment_status' => 'pending'
            ];

            // Check if user has a draft appointment to update instead of creating new
            $existingDraft = Appointment::findLatestDraftByUserId($userId);
            
            $appointment = null;
            if ($existingDraft) {
                // Update existing draft
                $appointmentData['status'] = 'payment_pending';
                if ($existingDraft->update($appointmentData)) {
                    $appointment = $existingDraft;
                }
            } else {
                // Create new appointment
                $appointment = Appointment::create($appointmentData);
            }

            if (!$appointment) {
                $this->logger->error('Failed to save appointment', [
                    'user_id' => $userId,
                    'appointment_type' => $input['appointmentType'],
                    'medical_center' => $input['medicalCenter']
                ]);
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to save appointment']);
                return;
            }

            // Get user for updating
            $user = User::findById($userId);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'User not found']);
                return;
            }

            // Prepare comprehensive appointment details for backward compatibility
            $appointmentDetails = [
                // Personal Information
                'firstName' => $input['firstName'],
                'lastName' => $input['lastName'],
                'fullName' => $input['firstName'] . ' ' . $input['lastName'],
                'dateOfBirth' => $input['dateOfBirth'],
                'nationality' => $input['nationality'],
                'gender' => $input['gender'],
                'maritalStatus' => $input['maritalStatus'],
                
                // Passport Information
                'passportNumber' => $input['passportNumber'],
                'passportIssueDate' => $input['passportIssueDate'],
                'passportIssuePlace' => $input['passportIssuePlace'],
                'passportExpiryDate' => $input['passportExpiryDate'],
                'visaType' => $input['visaType'],
                
                // Contact Information
                'email' => $input['email'],
                'phone' => $input['phone'],
                'nationalId' => $input['nationalId'] ?? null,
                
                // Employment & Travel
                'positionAppliedFor' => $input['positionAppliedFor'] ?? null,
                'country' => $input['country'],
                'city' => $input['city'] ?? null,
                'countryTravelingTo' => $input['countryTravelingTo'],
                
                // Appointment Details
                'appointmentType' => $input['appointmentType'],
                'medicalCenter' => $input['medicalCenter'],
                'appointmentDate' => $input['appointmentDate'],
                
                // References
                'appointmentId' => $appointment->id,
                
                // WAFID Integration Fields
                'wafidBookingReady' => true,
                'submittedAt' => date('c')
            ];

            // Update user with comprehensive appointment details (for backward compatibility)
            $user->update([
                'name' => $input['firstName'] . ' ' . $input['lastName'],
                'email' => $input['email'],
                'phone' => $input['phone'],
                'passport_number' => $input['passportNumber'],
                'appointment_details' => $appointmentDetails
            ]);

            $this->logger->info('Appointment created successfully', [
                'user_id' => $userId,
                'appointment_id' => $appointment->id,
                'user_email' => $input['email'],
                'user_name' => $input['firstName'] . ' ' . $input['lastName'],
                'appointment_type' => $input['appointmentType'],
                'medical_center' => $input['medicalCenter'],
                'appointment_date' => $input['appointmentDate'],
                'passport_number' => substr($input['passportNumber'], 0, 4) . '***', // Log only first 4 chars
                'country_traveling_to' => $input['countryTravelingTo'],
                'was_draft_update' => $existingDraft ? true : false
            ]);

            error_log("Appointment saved with ID: {$appointment->id} for user: {$userId}");

            echo json_encode([
                'success' => true,
                'message' => 'Appointment details saved successfully',
                'data' => [
                    'appointmentId' => $appointment->id,
                    'appointment' => $appointment->toArray(),
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone,
                        'appointment_details' => $user->appointment_details,
                        'payment_status' => $user->payment_status
                    ]
                ]
            ]);

        } catch (\Exception $error) {
            $this->logger->error('Create appointment error', [
                'user_id' => $userId ?? 'unknown',
                'error' => $error->getMessage(),
                'trace' => $error->getTraceAsString()
            ]);
            error_log('Create appointment error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function getUserAppointments(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $userId = $decoded['id'];

            $appointments = Appointment::findByUserId($userId);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'appointments' => array_map(fn($appointment) => $appointment->toArray(), $appointments)
                ]
            ]);

        } catch (\Exception $error) {
            error_log('Get user appointments error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function saveDraft(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = $decoded['id'];

            $this->logger->info('Appointment draft save started', [
                'user_id' => $userId,
                'has_first_name' => !empty($input['firstName']),
                'has_appointment_type' => !empty($input['appointmentType']),
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);

            // Convert frontend field names to database field names
            $appointmentData = [
                'user_id' => $userId,
                'first_name' => $input['firstName'] ?? '',
                'last_name' => $input['lastName'] ?? '',
                'date_of_birth' => $input['dateOfBirth'] ?? '',
                'nationality' => $input['nationality'] ?? '',
                'gender' => $input['gender'] ?? '',
                'marital_status' => $input['maritalStatus'] ?? '',
                'passport_number' => $input['passportNumber'] ?? '',
                'passport_issue_date' => $input['passportIssueDate'] ?? '',
                'passport_issue_place' => $input['passportIssuePlace'] ?? '',
                'passport_expiry_date' => $input['passportExpiryDate'] ?? '',
                'visa_type' => $input['visaType'] ?? '',
                'position_applied_for' => $input['positionAppliedFor'] ?? null,
                'email' => $input['email'] ?? '',
                'phone' => $input['phone'] ?? '',
                'national_id' => $input['nationalId'] ?? null,
                'country' => $input['country'] ?? '',
                'city' => $input['city'] ?? null,
                'country_traveling_to' => $input['countryTravelingTo'] ?? '',
                'appointment_type' => $input['appointmentType'] ?? '',
                'medical_center' => $input['medicalCenter'] ?? '',
                'appointment_date' => $input['appointmentDate'] ?? '',
                'status' => 'draft',
                'payment_status' => 'pending'
            ];

            // Remove empty fields to avoid database constraint issues
            $appointmentData = array_filter($appointmentData, fn($value) => $value !== '');

            // Check if user has an existing draft
            $existingDraft = Appointment::findLatestDraftByUserId($userId);
            
            $appointment = null;
            if ($existingDraft) {
                // Update existing draft
                if ($existingDraft->update($appointmentData)) {
                    $appointment = $existingDraft;
                }
            } else {
                // Only create if we have essential fields
                if (!empty($appointmentData['first_name']) || !empty($appointmentData['email']) || !empty($appointmentData['appointment_type'])) {
                    $appointment = Appointment::create($appointmentData);
                }
            }

            $this->logger->info('Appointment draft saved successfully', [
                'user_id' => $userId,
                'appointment_id' => $appointment ? $appointment->id : null,
                'was_update' => $existingDraft ? true : false,
                'had_essential_fields' => (!empty($appointmentData['first_name']) || !empty($appointmentData['email']) || !empty($appointmentData['appointment_type']))
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Draft saved successfully',
                'data' => [
                    'appointmentId' => $appointment ? $appointment->id : null,
                    'appointment' => $appointment ? $appointment->toArray() : null
                ]
            ]);

        } catch (\Exception $error) {
            $this->logger->error('Save draft error', [
                'user_id' => $userId ?? 'unknown',
                'error' => $error->getMessage(),
                'trace' => $error->getTraceAsString()
            ]);
            error_log('Save draft error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function getLatestDraft(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $userId = $decoded['id'];

            $draft = Appointment::findLatestDraftByUserId($userId);
            
            if ($draft) {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'hasDraft' => true,
                        'appointment' => $draft->toArray(),
                        'formData' => $draft->toFormData()
                    ]
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'hasDraft' => false,
                        'appointment' => null,
                        'formData' => null
                    ]
                ]);
            }

        } catch (\Exception $error) {
            error_log('Get latest draft error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }

    public function getById(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $userId = $decoded['id'];
            $appointmentId = $params['id'] ?? null;

            if (!$appointmentId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Appointment ID is required']);
                return;
            }

            // First try to find by appointment ID
            $appointment = Appointment::findById($appointmentId);
            
            if ($appointment) {
                // Verify user owns this appointment
                if ($appointment->user_id !== $userId) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Unauthorized access to appointment']);
                    return;
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'id' => $appointment->id,
                        'appointment_date' => $appointment->appointment_date,
                        'appointment_time' => $appointment->appointment_time,
                        'status' => $appointment->status,
                        'payment_status' => $appointment->payment_status,
                        'appointment_type' => $appointment->appointment_type,
                        'medical_center' => $appointment->medical_center,
                        'user_details' => [
                            'name' => $appointment->first_name . ' ' . $appointment->last_name,
                            'email' => $appointment->email,
                            'phone' => $appointment->phone,
                            'passport_number' => $appointment->passport_number
                        ],
                        'full_details' => $appointment->toArray()
                    ]
                ]);
                return;
            }

            // Fallback to legacy user-based system for backward compatibility
            if ((int)$userId === (int)$appointmentId) {
                $user = User::findById($userId);
                if (!$user) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'User not found']);
                    return;
                }

                if (empty($user->appointment_details)) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'No appointment found']);
                    return;
                }

                // Create appointment response with user data (legacy format)
                $appointmentData = [
                    'id' => (string)$user->id,
                    'appointment_date' => $user->appointment_details['appointmentDate'] ?? '',
                    'appointment_time' => $user->appointment_details['appointmentTime'] ?? '',
                    'status' => 'confirmed',
                    'payment_status' => $user->payment_status,
                    'appointment_type' => $user->appointment_details['appointmentType'] ?? '',
                    'medical_center' => $user->appointment_details['medicalCenter'] ?? '',
                    'user_details' => [
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone,
                        'passport_number' => $user->passport_number
                    ],
                    'full_details' => $user->appointment_details
                ];

                echo json_encode([
                    'success' => true,
                    'data' => $appointmentData
                ]);
                return;
            }

            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Appointment not found']);

        } catch (\Exception $error) {
            error_log('Get appointment by ID error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
}