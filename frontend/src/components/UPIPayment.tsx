import { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface UPIApp {
  name: string;
  id: string;
  icon: string;
  color: string;
}

interface UPIPaymentProps {
  appointmentId: string;
  amount: number;
  onPaymentComplete: (paymentData: { upi_transaction_id: string; upi_reference_id: string }) => void;
  onPaymentError: (error: string) => void;
}

const UPI_APPS: UPIApp[] = [
  {
    name: 'Google Pay',
    id: 'googlepay',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0Mjg1RjQiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+Cjx0ZXh0IHg9IjIiIHk9IjEyIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSI4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiPkdQYXk8L3RleHQ+CjxjaXJjbGUgY3g9IjEwIiBjeT0iMTYiIHI9IjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4KPC9zdmc+Cg==',
    color: 'bg-blue-500'
  },
  {
    name: 'PhonePe',
    id: 'phonepe',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM1RjI1OUYiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+Cjx0ZXh0IHg9IjEiIHk9IjEyIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSI3IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiPlBob25lUGU8L3RleHQ+CjxwYXRoIGQ9Ik0xNCAxNkwxOCAxNEwxNCAxMloiIGZpbGw9IndoaXRlIi8+CjwvdGV4dD4KPC9zdmc+Cjwvc3ZnPgo=',
    color: 'bg-purple-600'
  },
  {
    name: 'Paytm',
    id: 'paytm',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMwMEJBRkYiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+Cjx0ZXh0IHg9IjMiIHk9IjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIj5QYXl0bTwvdGV4dD4KPC9zdmc+Cjwvc3ZnPgo=',
    color: 'bg-cyan-500'
  },
  {
    name: 'BHIM UPI',
    id: 'bhim',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGRjk1MDAiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+Cjx0ZXh0IHg9IjMiIHk9IjEyIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSI5IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiPkJISU08L3RleHQ+Cjx0ZXh0IHg9IjYiIHk9IjE4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSI3IiBmaWxsPSJ3aGl0ZSI+VVBJPC90ZXh0Pgo8L3N2Zz4KPC9zdmc+Cg==',
    color: 'bg-orange-500'
  },
  {
    name: 'Amazon Pay',
    id: 'amazonpay',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGRjk5MDAiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+Cjx0ZXh0IHg9IjAiIHk9IjExIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSI3IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiPkFtYXpvbjwvdGV4dD4KPHRleHQgeD0iNiIgeT0iMTgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjYiIGZpbGw9IndoaXRlIj5QYXk8L3RleHQ+CjxwYXRoIGQ9Ik0zIDE0SDE3IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4KPC9zdmc+Cg==',
    color: 'bg-yellow-500'
  }
];

export function UPIPayment({ appointmentId, amount, onPaymentComplete, onPaymentError }: UPIPaymentProps) {
  // Helper function to safely extract UPI ID
  const getUpiId = (upiUrl: string): string => {
    try {
      return new URL(upiUrl).searchParams.get('pa') || 'N/A';
    } catch {
      console.error('Invalid UPI URL format:', upiUrl);
      // Fallback: try to extract UPI ID manually if URL is malformed
      const upiMatch = upiUrl.match(/pa=([^&]+)/);
      return upiMatch ? upiMatch[1] : 'N/A';
    }
  };

  const [upiData, setUpiData] = useState<{
    upi_url: string;
    qr_code: string;
    reference_id: string;
    app_links: Record<string, string>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'completed' | 'failed'>('pending');
  const [showQR, setShowQR] = useState(true); // Show QR code by default
  const [qrImageError, setQrImageError] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  useEffect(() => {
    initializeUPIPayment();
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeUPIPayment = async () => {
    try {
      const response = await fetch('/api/payment/create-upi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          appointmentId,
          amount
        })
      });

      const result = await response.json();
      if (result.success) {
        setUpiData(result.data);
        startPaymentPolling(result.data.reference_id);
      } else {
        onPaymentError(result.error || 'Failed to initialize UPI payment');
      }
    } catch {
      onPaymentError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startPaymentPolling = (referenceId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/verify-upi/${referenceId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const result = await response.json();
        if (result.success && result.data.status === 'completed') {
          clearInterval(interval);
          setPaymentStatus('completed');
          onPaymentComplete({
            upi_transaction_id: result.data.transaction_id,
            upi_reference_id: referenceId
          });
        } else if (result.data?.status === 'failed') {
          clearInterval(interval);
          setPaymentStatus('failed');
          onPaymentError('Payment failed. Please try again.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
      }
    }, 3000); // Poll every 3 seconds

    setPollingInterval(interval);

    // Stop polling after 10 minutes
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        if (paymentStatus === 'pending' || paymentStatus === 'checking') {
          onPaymentError('Payment timeout. Please try again.');
        }
      }
    }, 600000);
  };

  const handleAppClick = (app: UPIApp) => {
    if (!upiData) return;
    
    setPaymentStatus('checking');
    const appUrl = upiData.app_links[app.id];
    if (appUrl) {
      window.location.href = appUrl;
    } else {
      // Fallback to generic UPI URL
      window.location.href = upiData.upi_url;
    }
  };

  const copyUPIId = async () => {
    if (upiData && upiData.upi_url) {
      const upiId = getUpiId(upiData.upi_url);
      if (upiId && upiId !== 'N/A') {
        try {
          // Try using the modern clipboard API first
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(upiId);
          } else {
            // Fallback for older browsers or non-HTTPS
            const textArea = document.createElement('textarea');
            textArea.value = upiId;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
          }
          
          // Show success feedback
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
          console.error('Failed to copy UPI ID:', error);
          // Could show error toast here if needed
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner size="lg" text="Setting up UPI payment..." />
      </div>
    );
  }

  if (!upiData) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Failed to initialize UPI payment</div>
        <button
          onClick={initializeUPIPayment}
          className="px-4 py-2 bg-medical-600 text-white rounded-md hover:bg-medical-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Status */}
      {paymentStatus === 'checking' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <LoadingSpinner size="sm" className="mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Payment in Progress
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Complete the payment in your UPI app and return here
              </p>
            </div>
          </div>
        </div>
      )}

      {/* UPI Apps */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Pay with UPI Apps</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {UPI_APPS.map((app) => (
            <button
              key={app.id}
              onClick={() => handleAppClick(app)}
              disabled={paymentStatus === 'checking' || paymentStatus === 'completed'}
              className={`flex flex-col items-center p-4 border rounded-lg hover:shadow-md transition-all ${
                paymentStatus === 'checking' || paymentStatus === 'completed'
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-medical-300 cursor-pointer'
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${app.color}`}>
                <img src={app.icon} alt={app.name} className="w-12 h-12" />
              </div>
              <span className="text-sm font-medium text-gray-900">{app.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Alternative Options */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Other Options</h3>
        
        <div className="space-y-3">
          {/* QR Code Option */}
          <button
            onClick={() => setShowQR(!showQR)}
            disabled={paymentStatus === 'checking' || paymentStatus === 'completed'}
            className="w-full flex items-center justify-between p-4 border rounded-lg hover:border-medical-300 transition-colors"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01m0 0h-.01M12 8h.01" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">{showQR ? 'Hide' : 'Show'} QR Code</div>
                <div className="text-sm text-gray-500">Use any UPI app to scan</div>
              </div>
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${showQR ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showQR && (
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              {qrImageError ? (
                <div className="w-48 h-48 mx-auto mb-4 border rounded-lg bg-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm text-gray-500">QR Code unavailable</p>
                    <button
                      onClick={() => setQrImageError(false)}
                      className="mt-2 text-xs text-medical-600 hover:text-medical-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <img 
                  src={upiData.qr_code} 
                  alt="UPI QR Code" 
                  className="w-48 h-48 mx-auto mb-4 border rounded-lg"
                  onError={() => setQrImageError(true)}
                  onLoad={() => setQrImageError(false)}
                />
              )}
              <p className="text-sm text-gray-600 mb-2">
                Scan this QR code with any UPI app to pay ₹{(amount / 100).toFixed(2)}
              </p>
              <div className="bg-white p-3 rounded border mb-3">
                <div className="text-sm text-gray-600 mb-1">UPI ID</div>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-gray-900 break-all">
                    {upiData.upi_url ? getUpiId(upiData.upi_url) : 'Loading...'}
                  </div>
                  <button
                    onClick={copyUPIId}
                    className={`ml-2 px-2 py-1 text-xs rounded transition-colors flex items-center flex-shrink-0 ${
                      copySuccess 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {copySuccess ? (
                      <>
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Or copy the UPI ID above to pay manually
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <span>Reference ID: {upiData.reference_id}</span>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => setShowQR(false)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Hide QR Code
                </button>
              </div>
            </div>
          )}

          {/* Manual UPI ID */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <div className="space-y-3">
              <div className="font-medium text-gray-900">Pay using UPI ID</div>
              
              {/* UPI ID Display with Copy Button */}
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-gray-600 mb-1">UPI ID</div>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-lg text-gray-900 break-all">
                    {upiData.upi_url ? getUpiId(upiData.upi_url) : 'Loading...'}
                  </div>
                  <button
                    onClick={copyUPIId}
                    className={`ml-3 px-3 py-2 text-sm rounded transition-colors flex items-center flex-shrink-0 ${
                      copySuccess 
                        ? 'bg-green-600 text-white' 
                        : 'bg-medical-600 text-white hover:bg-medical-700'
                    }`}
                  >
                    {copySuccess ? (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <strong>Amount:</strong> ₹{(amount / 100).toFixed(2)}
              </div>
              
              <div className="text-xs text-gray-500">
                Open your UPI app, enter the above UPI ID, and send ₹{(amount / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Payment Instructions</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Click on your preferred UPI app above to pay directly</li>
          <li>• Or scan the QR code with any UPI app</li>
          <li>• Complete the payment and return to this page</li>
          <li>• Your payment status will be updated automatically</li>
        </ul>
      </div>
    </div>
  );
}