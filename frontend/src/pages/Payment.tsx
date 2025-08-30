import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentApi, appointmentApi, authApi, User } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

declare global {
  interface Window {
    Razorpay: {
      new(options: Record<string, unknown>): {
        open(): void;
      };
    };
  }
}

interface OrderData {
  order_id: string;
  amount: number;
  currency: string;
  key: string;
}

interface AppointmentDetails {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  amount?: number;
}

interface PaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null);

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

  useEffect(() => {
    if (!appointmentId) {
      navigate('/appointment-form');
      return;
    }

    const initializePayment = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/auth/login?redirect=' + encodeURIComponent(`/payment?appointmentId=${appointmentId}`));
          return;
        }

        // Get user details
        const userResult = await authApi.getProfile();
        if (!userResult.success) {
          throw new Error('Failed to get user details');
        }

        // Get appointment details
        const appointmentResult = await appointmentApi.getById(appointmentId);
        if (!appointmentResult.success) {
          throw new Error('Failed to get appointment details');
        }

        // Create payment order
        const orderResult = await paymentApi.createOrder(appointmentId, 150); // Default amount
        if (!orderResult.success) {
          throw new Error('Failed to create payment order');
        }

        setOrderData(orderResult.data || null);
        setUserDetails(userResult.data || null);
        setAppointmentDetails(appointmentResult.data || null);
      } catch (error: unknown) {
        console.error('Payment initialization error:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize payment. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [appointmentId, navigate]);

  const handlePayment = async () => {
    if (!orderData || !userDetails || !appointmentDetails) {
      setError('Payment data not loaded');
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GAMCA Medical Services',
        description: `Medical Appointment - ${appointmentDetails.appointment_date}`,
        order_id: orderData.order_id,
        prefill: {
          name: userDetails.name || '',
          email: userDetails.email || '',
          contact: userDetails.phone || ''
        },
        theme: {
          color: '#3B82F6'
        },
        handler: async function (response: PaymentResponse) {
          try {
            // Verify payment
            const verificationResult = await paymentApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              appointment_id: appointmentId!
            });

            if (verificationResult.success) {
              navigate(`/payment/success?appointmentId=${appointmentId}&paymentId=${response.razorpay_payment_id}`);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error: unknown) {
            console.error('Payment verification error:', error);
            setError('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: function() {
            setPaymentLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: unknown) {
      console.error('Payment error:', error);
      setError('Failed to open payment gateway. Please try again.');
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-clinical-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading payment details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-clinical-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Error</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/appointment-form')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Form
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <title>Payment - GAMCA Medical Verification</title>

      <div className="min-h-screen bg-clinical-100">
        {/* Header */}
        <header className="bg-white shadow-lg border-b border-clinical-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-medical-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </div>
                <span className="text-2xl font-brand font-bold text-medical-600">GAMCA</span>
                <span className="text-sm text-clinical-500 font-medical">Medical Verification</span>
              </div>
              <div className="flex items-center space-x-4">
                {userDetails && (
                  <span className="text-sm text-gray-600">
                    {userDetails.phone}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Progress Indicator */}
          <div className="mb-12">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-accent-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium text-accent-green-600 font-medical">Appointment Details</span>
              </div>
              <div className="w-16 h-1 bg-accent-green-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-medical-500 text-white rounded-full flex items-center justify-center text-sm font-medium shadow-medical">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-medical-600 font-medical">Payment</span>
              </div>
              <div className="w-16 h-1 bg-clinical-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-clinical-300 text-clinical-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-clinical-500 font-medical">Confirmation</span>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="card-medical mb-8">
            <h2 className="text-2xl font-bold text-clinical-900 mb-6">Payment Summary</h2>
            
            {appointmentDetails && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Appointment Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Appointment ID:</span>
                    <span className="font-medium">{appointmentDetails.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-medium">{appointmentDetails.appointment_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span className="font-medium">{appointmentDetails.appointment_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium capitalize">{appointmentDetails.status}</span>
                  </div>
                </div>
              </div>
            )}

            {orderData && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-medical-600">
                    ₹{(orderData.amount / 100).toFixed(2)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-6">
                  <p>• GAMCA Medical Examination Fee</p>
                  <p>• All required medical tests included</p>
                  <p>• Digital certificate upon completion</p>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className={`w-full py-3 px-4 border border-transparent text-lg font-medium rounded-md text-white ${
                    paymentLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-medical-600 hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500'
                  }`}
                >
                  {paymentLoading ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" color="white" className="mr-2" />
                      Processing...
                    </div>
                  ) : (
                    'Pay Now'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Security Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Secure Payment
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Your payment is secured by Razorpay with 256-bit SSL encryption. We do not store your payment details.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Razorpay Script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    </>
  );
}