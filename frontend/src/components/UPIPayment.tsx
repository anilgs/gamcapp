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
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzQyODVGNCIvPgo8cGF0aCBkPSJNMTAgMTVIMzBWMjVIMTBWMTVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
    color: 'bg-blue-500'
  },
  {
    name: 'PhonePe',
    id: 'phonepe',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzVGMjU5RiIvPgo8cGF0aCBkPSJNMTAgMTVIMzBWMjVIMTBWMTVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
    color: 'bg-purple-600'
  },
  {
    name: 'Paytm',
    id: 'paytm',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzAwQkFGRiIvPgo8cGF0aCBkPSJNMTAgMTVIMzBWMjVIMTBWMTVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
    color: 'bg-cyan-500'
  },
  {
    name: 'BHIM UPI',
    id: 'bhim',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iI0ZGOTUwMCIvPgo8cGF0aCBkPSJNMTAgMTVIMzBWMjVIMTBWMTVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
    color: 'bg-orange-500'
  },
  {
    name: 'Amazon Pay',
    id: 'amazonpay',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iI0ZGOTkwMCIvPgo8cGF0aCBkPSJNMTAgMTVIMzBWMjVIMTBWMTVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
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
  const [showQR, setShowQR] = useState(false);
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

  const copyUPIId = () => {
    if (upiData && upiData.upi_url) {
      const upiId = getUpiId(upiData.upi_url);
      if (upiId && upiId !== 'N/A') {
        navigator.clipboard.writeText(upiId);
        // You could show a toast notification here
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
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${app.color}`}>
                <img src={app.icon} alt={app.name} className="w-8 h-8" />
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
                <div className="font-medium text-gray-900">Scan QR Code</div>
                <div className="text-sm text-gray-500">Use any UPI app to scan</div>
              </div>
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${showQR ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showQR && (
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <img 
                src={upiData.qr_code} 
                alt="UPI QR Code" 
                className="w-48 h-48 mx-auto mb-4 border rounded-lg"
              />
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code with any UPI app to pay ₹{(amount / 100).toFixed(2)}
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <span>Reference ID: {upiData.reference_id}</span>
              </div>
            </div>
          )}

          {/* Manual UPI ID */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Pay using UPI ID</div>
                <div className="text-sm text-gray-600 mt-1">
                  UPI ID: {upiData.upi_url ? getUpiId(upiData.upi_url) : 'Loading...'}
                </div>
                <div className="text-sm text-gray-600">
                  Amount: ₹{(amount / 100).toFixed(2)}
                </div>
              </div>
              <button
                onClick={copyUPIId}
                className="px-3 py-1 text-sm bg-medical-600 text-white rounded hover:bg-medical-700"
              >
                Copy UPI ID
              </button>
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