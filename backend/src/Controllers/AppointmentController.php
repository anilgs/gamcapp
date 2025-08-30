<?php
declare(strict_types=1);

namespace Gamcapp\Controllers;

use Gamcapp\Lib\Auth;
use Gamcapp\Models\User;

class AppointmentController {
    public function create(array $params = []): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            return;
        }

        try {
            $decoded = Auth::requireAuth();
            $input = json_decode(file_get_contents('php://input'), true);

            // Validate required fields
            $requiredFields = [
                'firstName', 'lastName', 'dateOfBirth', 'nationality', 'gender', 'maritalStatus',
                'passportNumber', 'passportIssueDate', 'passportIssuePlace', 'passportExpiryDate',
                'visaType', 'email', 'phone', 'country', 'countryTravelingTo', 'appointmentType',
                'medicalCenter', 'appointmentDate'
            ];

            $missingFields = array_filter($requiredFields, fn($field) => empty($input[$field]));
            if (!empty($missingFields)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Missing required fields: ' . implode(', ', $missingFields)
                ]);
                return;
            }

            // Validate passport number confirmation
            if ($input['passportNumber'] !== $input['confirmPassportNumber']) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Passport number confirmation does not match'
                ]);
                return;
            }

            // Get user from token
            $userId = $decoded['id'];

            // Prepare comprehensive appointment details
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
                
                // WAFID Integration Fields
                'wafidBookingReady' => true,
                'submittedAt' => date('c')
            ];

            // Update user with comprehensive appointment details
            $user = User::findById($userId);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'User not found']);
                return;
            }

            // Update user information with all details
            $user->update([
                'name' => $input['firstName'] . ' ' . $input['lastName'],
                'email' => $input['email'],
                'phone' => $input['phone'],
                'passport_number' => $input['passportNumber'],
                'appointment_details' => $appointmentDetails
            ]);

            error_log("Comprehensive appointment created for user: {$userId}");

            echo json_encode([
                'success' => true,
                'message' => 'Appointment details saved successfully',
                'data' => [
                    'appointmentId' => $user->id,
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

            $user = User::findById($userId);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'User not found']);
                return;
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'appointments' => [$user->toArray()]
                ]
            ]);

        } catch (\Exception $error) {
            error_log('Get user appointments error: ' . $error->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Internal server error']);
        }
    }
}