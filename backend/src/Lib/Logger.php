<?php

declare(strict_types=1);

namespace Gamcapp\Lib;

class Logger
{
    private string $logDir;
    private int $maxFileSize;
    private int $storeDuration;
    
    public function __construct()
    {
        $this->logDir = dirname(__DIR__, 2) . '/logs';
        $this->maxFileSize = (int) ($_ENV['LOG_MAX_SIZE'] ?? 104857600); // 100MB default
        $this->storeDuration = (int) ($_ENV['LOG_STORE_DURATION'] ?? 2592000); // 30 days default
        
        $this->ensureLogDirectory();
        $this->performMaintenance();
    }
    
    public function log(string $level, string $message, array $context = []): void
    {
        $timestamp = date('Y-m-d H:i:s');
        $date = date('Y-m-d');
        $logFile = $this->logDir . "/app-{$date}.log";
        
        $contextStr = !empty($context) ? ' | Context: ' . json_encode($context) : '';
        $logEntry = "[{$timestamp}] [{$level}] {$message}{$contextStr}" . PHP_EOL;
        
        // Check if we need to rotate the log file
        if (file_exists($logFile) && filesize($logFile) >= $this->maxFileSize) {
            $this->rotateLogFile($logFile);
        }
        
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
    
    public function info(string $message, array $context = []): void
    {
        $this->log('INFO', $message, $context);
    }
    
    public function error(string $message, array $context = []): void
    {
        $this->log('ERROR', $message, $context);
    }
    
    public function warning(string $message, array $context = []): void
    {
        $this->log('WARNING', $message, $context);
    }
    
    public function debug(string $message, array $context = []): void
    {
        $this->log('DEBUG', $message, $context);
    }
    
    private function ensureLogDirectory(): void
    {
        if (!is_dir($this->logDir)) {
            mkdir($this->logDir, 0755, true);
        }
        
        $archiveDir = $this->logDir . '/archive';
        if (!is_dir($archiveDir)) {
            mkdir($archiveDir, 0755, true);
        }
    }
    
    private function rotateLogFile(string $logFile): void
    {
        $timestamp = date('Y-m-d_H-i-s');
        $pathInfo = pathinfo($logFile);
        $rotatedFile = $pathInfo['dirname'] . '/' . $pathInfo['filename'] . "_{$timestamp}." . $pathInfo['extension'];
        
        rename($logFile, $rotatedFile);
    }
    
    private function performMaintenance(): void
    {
        $this->archiveOldLogs();
        $this->cleanupOldArchives();
    }
    
    private function archiveOldLogs(): void
    {
        $cutoffTime = time() - $this->storeDuration;
        $logFiles = glob($this->logDir . '/app-*.log');
        
        foreach ($logFiles as $logFile) {
            $fileTime = filemtime($logFile);
            if ($fileTime < $cutoffTime) {
                $this->compressAndArchive($logFile);
            }
        }
        
        // Also check for rotated log files
        $rotatedFiles = glob($this->logDir . '/app-*_*-*-*.log');
        foreach ($rotatedFiles as $rotatedFile) {
            $fileTime = filemtime($rotatedFile);
            if ($fileTime < $cutoffTime) {
                $this->compressAndArchive($rotatedFile);
            }
        }
    }
    
    private function compressAndArchive(string $logFile): void
    {
        // Temporarily disabled compression due to missing ZipArchive extension
        // Just move files to archive directory without compression
        $archiveDir = $this->logDir . '/archive';
        if (!is_dir($archiveDir)) {
            mkdir($archiveDir, 0755, true);
        }
        
        $fileName = basename($logFile);
        $month = date('Y-m', filemtime($logFile));
        $archiveFile = $archiveDir . "/logs_{$month}_{$fileName}";
        
        // Simply move the file to archive directory
        if (rename($logFile, $archiveFile)) {
            $this->log('INFO', "Archived log file: {$fileName} to {$archiveFile}");
        } else {
            $this->log('ERROR', "Failed to archive file: {$fileName}");
        }
    }
    
    private function cleanupOldArchives(): void
    {
        $archiveDir = $this->logDir . '/archive';
        $cutoffTime = time() - ($this->storeDuration * 6); // Keep archives for 6x the log duration
        $archiveFiles = glob($archiveDir . '/logs_*');
        
        foreach ($archiveFiles as $archiveFile) {
            $fileTime = filemtime($archiveFile);
            if ($fileTime && $fileTime < $cutoffTime) {
                unlink($archiveFile);
                $this->log('INFO', "Cleaned up old archive: " . basename($archiveFile));
            }
        }
    }
    
    public static function getInstance(): self
    {
        static $instance = null;
        if ($instance === null) {
            $instance = new self();
        }
        return $instance;
    }
}