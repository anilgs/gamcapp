/**
 * Comprehensive error handling utilities for GAMCA Medical Services
 */

// Error types enum
export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// Error severity levels
export const ErrorSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Custom error class
export class AppError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN_ERROR, severity = ErrorSeverity.MEDIUM, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.errorId = this.generateErrorId();
  }

  generateErrorId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp,
      errorId: this.errorId,
      stack: this.stack
    };
  }
}

// Error handler class
export class ErrorHandler {
  static instance = null;

  constructor() {
    if (ErrorHandler.instance) {
      return ErrorHandler.instance;
    }
    
    this.errorQueue = [];
    this.maxQueueSize = 100;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandlers();
      this.setupNetworkStatusHandlers();
    }
    
    ErrorHandler.instance = this;
  }

  setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(new AppError(
        event.reason?.message || 'Unhandled promise rejection',
        ErrorTypes.UNKNOWN_ERROR,
        ErrorSeverity.HIGH,
        { reason: event.reason }
      ));
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleError(new AppError(
        event.error?.message || event.message || 'Global JavaScript error',
        ErrorTypes.UNKNOWN_ERROR,
        ErrorSeverity.HIGH,
        { 
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        }
      ));
    });
  }

  setupNetworkStatusHandlers() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Main error handling method
  handleError(error, context = {}) {
    const appError = error instanceof AppError ? error : this.normalizeError(error);
    
    // Add context information
    appError.context = {
      ...context,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      timestamp: new Date().toISOString()
    };

    // Log error locally
    this.logError(appError);

    // Queue error for remote logging
    this.queueError(appError);

    // Show user notification based on severity
    this.showUserNotification(appError);

    return appError;
  }

  // Normalize different error types to AppError
  normalizeError(error) {
    if (error instanceof AppError) {
      return error;
    }

    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new AppError(
        'Network connection error. Please check your internet connection.',
        ErrorTypes.NETWORK_ERROR,
        ErrorSeverity.MEDIUM,
        { originalError: error.message }
      );
    }

    // Handle HTTP errors
    if (error.response) {
      const status = error.response.status;
      let type = ErrorTypes.SERVER_ERROR;
      let severity = ErrorSeverity.MEDIUM;

      if (status === 401) {
        type = ErrorTypes.AUTHENTICATION_ERROR;
        severity = ErrorSeverity.HIGH;
      } else if (status === 403) {
        type = ErrorTypes.AUTHORIZATION_ERROR;
        severity = ErrorSeverity.HIGH;
      } else if (status === 404) {
        type = ErrorTypes.NOT_FOUND_ERROR;
        severity = ErrorSeverity.LOW;
      } else if (status >= 500) {
        type = ErrorTypes.SERVER_ERROR;
        severity = ErrorSeverity.HIGH;
      }

      return new AppError(
        error.response.data?.message || `HTTP ${status} Error`,
        type,
        severity,
        {
          status,
          statusText: error.response.statusText,
          data: error.response.data
        }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return new AppError(
        error.message,
        ErrorTypes.VALIDATION_ERROR,
        ErrorSeverity.LOW,
        { originalError: error }
      );
    }

    // Default error handling
    return new AppError(
      error.message || 'An unexpected error occurred',
      ErrorTypes.UNKNOWN_ERROR,
      ErrorSeverity.MEDIUM,
      { originalError: error }
    );
  }

  // Log error locally
  logError(error) {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.type}] ${error.message}`;
    
    switch (logLevel) {
      case 'error':
        console.error(logMessage, error);
        break;
      case 'warn':
        console.warn(logMessage, error);
        break;
      default:
        console.log(logMessage, error);
    }

    // Store in localStorage for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      try {
        const errorLog = JSON.parse(localStorage.getItem('gamca_error_log') || '[]');
        errorLog.push(error.toJSON());
        
        // Keep only last 50 errors
        if (errorLog.length > 50) {
          errorLog.splice(0, errorLog.length - 50);
        }
        
        localStorage.setItem('gamca_error_log', JSON.stringify(errorLog));
      } catch (storageError) {
        console.warn('Failed to store error in localStorage:', storageError);
      }
    }
  }

  // Queue error for remote logging
  queueError(error) {
    if (this.errorQueue.length >= this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest error
    }
    
    this.errorQueue.push(error);
    
    if (this.isOnline) {
      this.flushErrorQueue();
    }
  }

  // Send errors to remote logging service
  async flushErrorQueue() {
    if (this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ errors: errorsToSend })
      });
    } catch (error) {
      console.warn('Failed to send errors to remote service:', error);
      // Re-queue errors if sending failed
      this.errorQueue.unshift(...errorsToSend);
    }
  }

  // Show user notification based on error severity
  showUserNotification(error) {
    if (typeof window === 'undefined') return;

    const message = this.getUserFriendlyMessage(error);
    
    // You can integrate with a toast notification library here
    // For now, we'll use a simple approach
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      // Show prominent error notification
      this.showErrorToast(message, 'error');
    } else if (error.severity === ErrorSeverity.MEDIUM) {
      // Show warning notification
      this.showErrorToast(message, 'warning');
    }
    // Low severity errors are logged but not shown to user
  }

  // Get user-friendly error message
  getUserFriendlyMessage(error) {
    const friendlyMessages = {
      [ErrorTypes.NETWORK_ERROR]: 'Please check your internet connection and try again.',
      [ErrorTypes.AUTHENTICATION_ERROR]: 'Please log in again to continue.',
      [ErrorTypes.AUTHORIZATION_ERROR]: 'You don\'t have permission to perform this action.',
      [ErrorTypes.NOT_FOUND_ERROR]: 'The requested resource was not found.',
      [ErrorTypes.VALIDATION_ERROR]: 'Please check your input and try again.',
      [ErrorTypes.PAYMENT_ERROR]: 'Payment processing failed. Please try again or contact support.',
      [ErrorTypes.FILE_UPLOAD_ERROR]: 'File upload failed. Please check the file and try again.',
      [ErrorTypes.SERVER_ERROR]: 'Server error occurred. Please try again later.',
      [ErrorTypes.EXTERNAL_API_ERROR]: 'External service is temporarily unavailable.',
      [ErrorTypes.DATABASE_ERROR]: 'Database error occurred. Please try again later.',
      [ErrorTypes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
    };

    return friendlyMessages[error.type] || error.message;
  }

  // Simple toast notification (can be replaced with a proper toast library)
  showErrorToast(message, type = 'error') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm ${
      type === 'error' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black'
    }`;
    toast.innerHTML = `
      <div class="flex items-center">
        <div class="flex-1">
          <p class="text-sm font-medium">${message}</p>
        </div>
        <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  }

  // Get log level based on severity
  getLogLevel(severity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      default:
        return 'log';
    }
  }

  // Get error statistics
  getErrorStats() {
    if (process.env.NODE_ENV !== 'development') return null;

    try {
      const errorLog = JSON.parse(localStorage.getItem('gamca_error_log') || '[]');
      const stats = {
        total: errorLog.length,
        byType: {},
        bySeverity: {},
        recent: errorLog.slice(-10)
      };

      errorLog.forEach(error => {
        stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.warn('Failed to get error stats:', error);
      return null;
    }
  }

  // Clear error log (development only)
  clearErrorLog() {
    if (process.env.NODE_ENV === 'development') {
      localStorage.removeItem('gamca_error_log');
      console.log('Error log cleared');
    }
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Convenience functions
export const handleError = (error, context) => errorHandler.handleError(error, context);
export const createError = (message, type, severity, details) => new AppError(message, type, severity, details);
export const getErrorStats = () => errorHandler.getErrorStats();
export const clearErrorLog = () => errorHandler.clearErrorLog();

// React hook for error handling
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback((error, context = {}) => {
    const appError = errorHandler.handleError(error, context);
    setError(appError);
    return appError;
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};

export default errorHandler;
