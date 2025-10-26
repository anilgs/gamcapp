<?php
declare(strict_types=1);

/**
 * Deployment Script: Fix Orphaned Payment Records
 * 
 * This script matches payment_transactions records with NULL appointment_id
 * to existing appointment records based on:
 * 1. Matching user_id
 * 2. Matching date, hour and minute of creation time
 * 3. No existing payment already linked to the appointment
 * 
 * IMPORTANT: This script includes safety measures and dry-run mode.
 * Always test with dry-run first!
 */

require_once __DIR__ . '/backend/vendor/autoload.php';

use Gamcapp\Core\Database;
use Gamcapp\Lib\Logger;

class OrphanedPaymentFixer {
    private PDO $db;
    private Logger $logger;
    private bool $dryRun;
    private array $stats;

    public function __construct(bool $dryRun = true) {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
        $this->dryRun = $dryRun;
        $this->stats = [
            'orphaned_payments_found' => 0,
            'potential_matches_found' => 0,
            'successful_matches' => 0,
            'failed_matches' => 0,
            'skipped_multiple_matches' => 0
        ];
    }

    public function run(): void {
        $this->logger->log('=== Starting Orphaned Payment Fixer ===', 'INFO');
        $this->logger->log('Mode: ' . ($this->dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN'), 'INFO');

        try {
            // Step 1: Find orphaned payments
            $orphanedPayments = $this->findOrphanedPayments();
            $this->stats['orphaned_payments_found'] = count($orphanedPayments);
            
            $this->logger->log("Found {$this->stats['orphaned_payments_found']} orphaned payment records", 'INFO');

            if (empty($orphanedPayments)) {
                $this->logger->log('No orphaned payments found. Nothing to fix.', 'INFO');
                return;
            }

            // Step 2: Process each orphaned payment
            foreach ($orphanedPayments as $payment) {
                $this->processOrphanedPayment($payment);
            }

            // Step 3: Report results
            $this->reportResults();

        } catch (Exception $e) {
            $this->logger->log('Error in orphaned payment fixer: ' . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }

    private function findOrphanedPayments(): array {
        $sql = "SELECT 
                    pt.id,
                    pt.user_id,
                    pt.razorpay_order_id,
                    pt.amount,
                    pt.status,
                    pt.payment_method,
                    pt.created_at,
                    pt.appointment_id,
                    u.name as user_name,
                    u.email as user_email
                FROM payment_transactions pt
                LEFT JOIN users u ON pt.user_id = u.id
                WHERE pt.appointment_id IS NULL OR pt.appointment_id = ''
                ORDER BY pt.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function processOrphanedPayment(array $payment): void {
        $this->logger->log("Processing payment ID {$payment['id']} (Order: {$payment['razorpay_order_id']}, Amount: ₹{$payment['amount']}, User: {$payment['user_name']})", 'INFO');

        // Find potential matching appointments
        $potentialMatches = $this->findPotentialAppointmentMatches($payment);
        
        if (empty($potentialMatches)) {
            $this->logger->log("  ❌ No potential appointment matches found for payment {$payment['id']}", 'WARN');
            return;
        }

        $this->stats['potential_matches_found'] += count($potentialMatches);

        // If multiple matches, be more selective
        if (count($potentialMatches) > 1) {
            $bestMatch = $this->selectBestMatch($payment, $potentialMatches);
            if (!$bestMatch) {
                $this->logger->log("  ⚠️ Multiple appointment matches found for payment {$payment['id']}, but no clear best match. Skipping for safety.", 'WARN');
                $this->stats['skipped_multiple_matches']++;
                return;
            }
            $potentialMatches = [$bestMatch];
        }

        $appointment = $potentialMatches[0];
        
        // Link the payment to the appointment
        if ($this->linkPaymentToAppointment($payment, $appointment)) {
            $this->stats['successful_matches']++;
            $this->logger->log("  ✅ Successfully linked payment {$payment['id']} to appointment {$appointment['id']}", 'INFO');
        } else {
            $this->stats['failed_matches']++;
            $this->logger->log("  ❌ Failed to link payment {$payment['id']} to appointment {$appointment['id']}", 'ERROR');
        }
    }

    private function findPotentialAppointmentMatches(array $payment): array {
        // Match based on user_id and exact date/hour/minute match
        $sql = "SELECT 
                    a.id,
                    a.user_id,
                    a.first_name,
                    a.last_name,
                    a.email,
                    a.appointment_type,
                    a.payment_status,
                    a.created_at,
                    TIMESTAMPDIFF(SECOND, a.created_at, :payment_created_at) as time_diff_seconds
                FROM appointments a
                WHERE a.user_id = :user_id
                AND DATE(a.created_at) = DATE(:payment_created_at)
                AND HOUR(a.created_at) = HOUR(:payment_created_at)
                AND MINUTE(a.created_at) = MINUTE(:payment_created_at)
                AND NOT EXISTS (
                    SELECT 1 FROM payment_transactions pt2 
                    WHERE pt2.appointment_id = a.id 
                    AND pt2.id != :payment_id
                )
                ORDER BY ABS(TIMESTAMPDIFF(SECOND, a.created_at, :payment_created_at)) ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':user_id', $payment['user_id'], PDO::PARAM_INT);
        $stmt->bindValue(':payment_created_at', $payment['created_at']);
        $stmt->bindValue(':payment_id', $payment['id'], PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function selectBestMatch(array $payment, array $potentialMatches): ?array {
        // With 10-second window, take the closest match by time
        return $potentialMatches[0]; // Already sorted by time difference
    }

    private function linkPaymentToAppointment(array $payment, array $appointment): bool {
        if ($this->dryRun) {
            $this->logger->log("  [DRY RUN] Would link payment {$payment['id']} to appointment {$appointment['id']}", 'INFO');
            return true;
        }

        try {
            $this->db->beginTransaction();

            // Update payment_transactions with appointment_id
            $updatePaymentSql = "UPDATE payment_transactions 
                               SET appointment_id = :appointment_id 
                               WHERE id = :payment_id";
            $stmt = $this->db->prepare($updatePaymentSql);
            $stmt->bindValue(':appointment_id', $appointment['id']);
            $stmt->bindValue(':payment_id', $payment['id'], PDO::PARAM_INT);
            $paymentUpdated = $stmt->execute();

            // Update appointment payment status if payment is successful
            if ($payment['status'] === 'paid') {
                $updateAppointmentSql = "UPDATE appointments 
                                       SET payment_status = 'completed',
                                           payment_amount = :amount,
                                           payment_reference = :reference
                                       WHERE id = :appointment_id";
                $stmt = $this->db->prepare($updateAppointmentSql);
                $stmt->bindValue(':amount', $payment['amount']);
                $stmt->bindValue(':reference', $payment['razorpay_order_id']);
                $stmt->bindValue(':appointment_id', $appointment['id']);
                $appointmentUpdated = $stmt->execute();
            } else {
                $appointmentUpdated = true; // No update needed for non-paid payments
            }

            if ($paymentUpdated && $appointmentUpdated) {
                $this->db->commit();
                return true;
            } else {
                $this->db->rollBack();
                return false;
            }

        } catch (Exception $e) {
            $this->db->rollBack();
            $this->logger->log("Database error linking payment {$payment['id']}: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }

    private function reportResults(): void {
        $this->logger->log('=== Orphaned Payment Fixer Results ===', 'INFO');
        foreach ($this->stats as $key => $value) {
            $this->logger->log("$key: $value", 'INFO');
        }

        if ($this->dryRun) {
            $this->logger->log('=== DRY RUN COMPLETED - No actual changes were made ===', 'INFO');
            $this->logger->log('To apply these changes, run the script with --live flag', 'INFO');
        } else {
            $this->logger->log('=== LIVE RUN COMPLETED ===', 'INFO');
        }
    }
}

// Command line interface
function showUsage(): void {
    echo "Usage: php fix-orphaned-payments.php [--live]\n";
    echo "  --live    Apply changes to database (default is dry-run)\n";
    echo "  --help    Show this help message\n";
    echo "\n";
    echo "By default, the script runs in dry-run mode and shows what would be changed.\n";
    echo "Use --live flag to actually apply the changes.\n";
}

// Parse command line arguments
$dryRun = true;

if (isset($argv)) {
    foreach ($argv as $arg) {
        if ($arg === '--live') {
            $dryRun = false;
        } elseif ($arg === '--help') {
            showUsage();
            exit(0);
        }
    }
}

// Run the fixer
try {
    $fixer = new OrphanedPaymentFixer($dryRun);
    $fixer->run();
    exit(0);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}