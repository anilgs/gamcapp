import React from 'react';

// Basic loading spinner component
export const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary', 
  className = '',
  text = null 
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray' | 'red' | 'green' | 'blue';
  className?: string;
  text?: string | null;
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'border-medical-600',
    white: 'border-white',
    gray: 'border-clinical-600',
    red: 'border-red-600',
    green: 'border-health-600',
    blue: 'border-medical-600'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center">
        <div
          className={`
            ${sizeClasses[size]} 
            ${colorClasses[color]} 
            border-2 border-t-transparent 
            rounded-full 
            animate-spin
          `}
        />
        {text && (
          <p className="mt-2 text-sm text-gray-600">{text}</p>
        )}
      </div>
    </div>
  );
};

// Full page loading component
export const PageLoader = ({ 
  text = 'Loading...', 
  subtext = null,
  showLogo = true 
}: {
  text?: string;
  subtext?: string | null;
  showLogo?: boolean;
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-clinical-50 to-medical-50 flex items-center justify-center">
      <div className="text-center">
        {showLogo && (
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-medical-500 to-health-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-medical-lg">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C13.1 2 14 2.9 14 4V8H18C19.1 8 20 8.9 20 10V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V10C4 8.9 4.9 8 6 8H10V4C10 2.9 10.9 2 12 2M12 4V8H12V4M6 10V20H18V10H6M8 12H16V14H8V12M8 16H13V18H8V16Z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-medical-600">GAMCA</h1>
            <p className="text-clinical-500 mt-2">Medical Verification Platform</p>
          </div>
        )}
        
        <LoadingSpinner size="xl" />
        
        <div className="mt-6">
          <p className="text-lg font-medium text-clinical-900">{text}</p>
          {subtext && (
            <p className="text-sm text-clinical-600 mt-2">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Inline loading component for buttons
export const ButtonLoader = ({ 
  loading = false, 
  children, 
  loadingText = 'Loading...',
  ...props 
}: {
  loading?: boolean;
  children: React.ReactNode;
  loadingText?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner size="sm" color="white" className="mr-2" />
          {loadingText}
        </div>
      ) : (
        children
      )}
    </button>
  );
};

// Card loading skeleton
export const CardSkeleton = ({ lines = 3, className = '' }: {
  lines?: number;
  className?: string;
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="card-medical">
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 bg-clinical-200 rounded w-3/4"></div>
              <div className="h-3 bg-clinical-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Table loading skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }: {
  rows?: number;
  columns?: number;
}) => {
  return (
    <div className="animate-pulse">
      <div className="table-medical">
        {/* Header */}
        <div className="table-header">
          <div className="grid grid-cols-4 gap-4 p-6">
            {Array.from({ length: columns }).map((_, index) => (
              <div key={index} className="h-4 bg-clinical-200 rounded"></div>
            ))}
          </div>
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="table-row">
            <div className="grid grid-cols-4 gap-4 p-6">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="space-y-2">
                  <div className="h-3 bg-clinical-200 rounded"></div>
                  <div className="h-2 bg-clinical-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Form loading overlay
export const FormLoader = ({ loading = false, children }: {
  loading?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-sm text-clinical-600">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Content loading placeholder
export const ContentLoader = ({ 
  loading = false, 
  error = null, 
  children,
  onRetry = null,
  emptyState = null,
  isEmpty = false
}: {
  loading?: boolean;
  error?: string | null;
  children: React.ReactNode;
  onRetry?: (() => void) | null;
  emptyState?: React.ReactNode | null;
  isEmpty?: boolean;
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading content..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="emergency-icon mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-clinical-900 mb-2">Error Loading Content</h3>
        <p className="text-clinical-600 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-primary"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (isEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  return <>{children}</>;
};

// Progress bar component
export const ProgressBar = ({ 
  progress = 0, 
  className = '',
  showPercentage = true,
  color = 'primary'
}: {
  progress?: number;
  className?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'green' | 'blue' | 'red';
}) => {
  const colorClasses = {
    primary: 'bg-medical-600',
    green: 'bg-health-600',
    blue: 'bg-medical-600',
    red: 'bg-red-600'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        {showPercentage && (
          <span className="text-sm font-medium text-gray-700">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

// Upload progress component
export const UploadProgress = ({ 
  progress = 0, 
  fileName = '',
  onCancel = null 
}: {
  progress?: number;
  fileName?: string;
  onCancel?: (() => void) | null;
}) => {
  return (
    <div className="card-clinical">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="clinical-icon mr-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <span className="text-sm font-medium text-clinical-900 truncate">
            {fileName}
          </span>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-clinical-400 hover:text-clinical-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <ProgressBar progress={progress} showPercentage={true} />
    </div>
  );
};

// Loading states hook
export const useLoadingState = (initialState = false) => {
  const [loading, setLoading] = React.useState(initialState);
  const [error, setError] = React.useState<string | null>(null);

  const startLoading = React.useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const stopLoading = React.useCallback(() => {
    setLoading(false);
  }, []);

  const setLoadingError = React.useCallback((error: string) => {
    setLoading(false);
    setError(error);
  }, []);

  const reset = React.useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    reset
  };
};

export default LoadingSpinner;