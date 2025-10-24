import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function PaymentMethodSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if no appointment ID
    if (!appointmentId) {
      navigate('/appointment-form');
      return;
    }

    // Check authentication
    const token = localStorage.getItem('token');
    if (token) {
      authApi.getProfile()
        .then(result => {
          if (result.success && result.data && result.data.type === 'user' && result.data.user) {
            setIsAuthenticated(true);
            setUserEmail(result.data.user.email || '');
          } else {
            localStorage.removeItem('token');
            navigate('/auth/login?redirect=/appointment-form');
          }
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          navigate('/auth/login?redirect=/appointment-form');
          setLoading(false);
        });
    } else {
      navigate('/auth/login?redirect=/appointment-form');
      setLoading(false);
    }
  }, [navigate, appointmentId]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      navigate('/');
    }
  };

  const handleSelectPaymentMethod = (method: string) => {
    if (method === 'upi') {
      navigate(`/payment?appointmentId=${appointmentId}&method=upi`);
    }
    // RazorPay is disabled, so no navigation for it
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-8">Please log in to access payment options.</p>
          <Link
            to="/auth/login?redirect=/appointment-form"
            className="btn-primary"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-blue-50 via-white to-health-green-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-medical-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-medical-500 to-health-500 rounded-xl flex items-center justify-center shadow-medical">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C13.1 2 14 2.9 14 4V8H18C19.1 8 20 8.9 20 10V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V10C4 8.9 4.9 8 6 8H10V4C10 2.9 10.9 2 12 2M12 4V8H12V4M6 10V20H18V10H6M8 12H16V14H8V12M8 16H13V18H8V16Z"/>
                  </svg>
                </div>
                <div>
                  <Link to="/" className="text-2xl font-bold text-medical-600">
                    GAMCA
                  </Link>
                  <div className="flex items-center space-x-2 text-xs text-clinical-500">
                    <span className="font-medium">Medical Verification Platform</span>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <span className="text-health-600 font-medium">✓ Secure Portal</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <div className="w-2 h-2 bg-health-green-500 rounded-full animate-pulse"></div>
                <span>Logged in as: <span className="font-semibold text-medical-blue-700">{userEmail}</span></span>
              </div>
              <Link
                to="/profile"
                className="flex items-center space-x-1 text-sm text-medical-blue-600 hover:text-medical-blue-700 font-medium transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span>Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-sm text-medical-blue-600 hover:text-medical-blue-700 font-medium transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-health-green-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="ml-2 text-sm font-medium text-health-green-600">Appointment Details</span>
            </div>
            <div className="w-16 h-0.5 bg-medical-blue-200"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-medical-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">2</span>
              </div>
              <span className="ml-2 text-sm font-medium text-medical-blue-600">Payment Method</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-200"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-400 text-sm font-bold">3</span>
              </div>
              <span className="ml-2 text-sm font-medium text-gray-400">Payment</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-medical-blue-600 to-health-green-600 px-8 py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2,17H22V19H2V17M1.5,14.25L1.34,15.28C1.29,15.63 1.59,15.94 1.94,15.94H2.06C2.41,15.94 2.71,15.63 2.66,15.28L2.5,14.25H1.5M23,15H3V13H23V15M12,2A3,3 0 0,1 15,5H9A3,3 0 0,1 12,2M15,6V5H17V9H15V8H9V9H7V5H9V6H15M12,10.5A1.5,1.5 0 0,1 13.5,12A1.5,1.5 0 0,1 12,13.5A1.5,1.5 0 0,1 10.5,12A1.5,1.5 0 0,1 12,10.5Z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Choose Payment Method</h1>
                <p className="text-white/80">Select your preferred payment option</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Main Payment Method - UPI */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Payment Method</h3>
              <div 
                className="border-2 border-health-green-300 rounded-xl p-6 cursor-pointer hover:border-health-green-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-health-green-50 to-emerald-50 shadow-lg"
                onClick={() => handleSelectPaymentMethod('upi')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-health-green-100 rounded-xl flex items-center justify-center shadow-md">
                      <svg className="w-8 h-8 text-health-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">UPI Payment</h3>
                      <p className="text-sm text-gray-600 mb-2">Pay instantly using your favorite UPI app</p>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-health-green-100 text-health-green-800">
                          ✓ Available Now
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          ⚡ Instant Payment
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          🔒 Secure
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex space-x-2">
                      <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM0Mjg1RjQiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI2IiB5PSI2Ij4KPHBhdGggZD0iTTEwIDJDMTQuNDE4IDIgMTggNS41ODIgMTggMTBDMTggMTQuNDE4IDE0LjQxOCAxOCAxMCAxOEM1LjU4MiAxOCAyIDE0LjQxOCAyIDEwQzIgNS41ODIgNS41ODIgMiAxMCAyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=" alt="Google Pay" className="w-8 h-8 rounded-lg shadow-sm" />
                      <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM1RjI1OUIiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI2IiB5PSI2Ij4KPHBhdGggZD0iTTEwIDJDMTQuNDE4IDIgMTggNS41ODIgMTggMTBDMTggMTQuNDE4IDE0LjQxOCAxOCAxMCAxOEM1LjU4MiAxOCAyIDE0LjQxOCAyIDEwQzIgNS41ODIgNS41ODIgMiAxMCAyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=" alt="PhonePe" className="w-8 h-8 rounded-lg shadow-sm" />
                      <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMwMDJCNUIiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI2IiB5PSI2Ij4KPHBhdGggZD0iTTEwIDJDMTQuNDE4IDIgMTggNS41ODIgMTggMTBDMTggMTQuNDE4IDE0LjQxOCAxOCAxMCAxOEM1LjU4MiAxOCAyIDE0LjQxOCAyIDEwQzIgNS41ODIgNS41ODIgMiAxMCAyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=" alt="Paytm" className="w-8 h-8 rounded-lg shadow-sm" />
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        UPI
                      </div>
                    </div>
                    <svg className="w-8 h-8 text-health-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Payment Methods - Coming Soon */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Coming Soon</h3>
              <div className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50/50 opacity-70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                      <svg className="w-7 h-7 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2,17H22V19H2V17M1.5,14.25L1.34,15.28C1.29,15.63 1.59,15.94 1.94,15.94H2.06C2.41,15.94 2.71,15.63 2.66,15.28L2.5,14.25H1.5M23,15H3V13H23V15M12,2A3,3 0 0,1 15,5H9A3,3 0 0,1 12,2M15,6V5H17V9H15V8H9V9H7V5H9V6H15M12,10.5A1.5,1.5 0 0,1 13.5,12A1.5,1.5 0 0,1 12,13.5A1.5,1.5 0 0,1 10.5,12A1.5,1.5 0 0,1 12,10.5Z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-500">RazorPay</h3>
                      <p className="text-sm text-gray-400">Credit Card, Debit Card, Net Banking, Wallets</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          🚧 Coming Soon
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1 opacity-50">
                      <div className="w-6 h-6 bg-blue-200 rounded"></div>
                      <div className="w-6 h-6 bg-red-200 rounded"></div>
                      <div className="w-6 h-6 bg-green-200 rounded"></div>
                    </div>
                    <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => navigate('/appointment-form')}
                className="flex items-center space-x-2 px-6 py-3 text-medical-blue-600 hover:text-medical-blue-700 font-medium transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Back to Appointment Form</span>
              </button>
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                💳 Payment Information
              </h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>• UPI payments are instant and secure</p>
                <p>• You will receive confirmation via SMS and email after successful payment</p>
                <p>• Keep your transaction ID for reference</p>
                <p>• RazorPay will be available soon for card and net banking payments</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}