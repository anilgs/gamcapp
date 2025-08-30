import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { appointmentApi, authApi } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const paymentId = searchParams.get('paymentId');
  
  const [loading, setLoading] = useState(true);
  const [appointmentDetails, setAppointmentDetails] = useState<any | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appointmentId || !paymentId) {
      navigate('/');
      return;
    }

    const loadDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/auth/login');
          return;
        }

        // Get user details
        const userResult = await authApi.getProfile();
        if (userResult.success && userResult.data) {
          setUserDetails(userResult.data);
        }

        // Get appointment details
        const appointmentResult = await appointmentApi.getById(appointmentId);
        if (appointmentResult.success && appointmentResult.data) {
          setAppointmentDetails(appointmentResult.data);
        } else {
          setError('Could not load appointment details');
        }
      } catch (error: any) {
        console.error('Error loading details:', error);
        setError('Failed to load payment confirmation details');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [appointmentId, paymentId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-clinical-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading confirmation..." />
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link
            to="/user/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <title>Payment Successful - GAMCA Medical Verification</title>

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
              {userDetails && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">{userDetails.phone}</span>
                  <Link to="/user/dashboard" className="text-sm text-primary-600 hover:text-primary-500">
                    Dashboard
                  </Link>
                </div>
              )}
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
                <div className="w-8 h-8 bg-accent-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium text-accent-green-600 font-medical">Payment</span>
              </div>
              <div className="w-16 h-1 bg-accent-green-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-accent-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium text-accent-green-600 font-medical">Confirmation</span>
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-accent-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-clinical-900 mb-4">
              Payment Successful!
            </h1>
            <p className="text-xl text-clinical-600 max-w-2xl mx-auto">
              Your medical appointment has been confirmed. You will receive SMS and email confirmations shortly.
            </p>
          </div>

          {/* Appointment Details */}
          {appointmentDetails && (
            <div className="card-medical mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-medical-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-brand font-bold text-clinical-900">
                  Appointment Confirmation
                </h2>
              </div>

              <div className="bg-accent-green-50 border border-accent-green-200 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-accent-green-800">Appointment ID:</span>
                    <div className="text-accent-green-600 font-mono">{appointmentDetails.id}</div>
                  </div>
                  <div>
                    <span className="font-medium text-accent-green-800">Payment ID:</span>
                    <div className="text-accent-green-600 font-mono">{paymentId}</div>
                  </div>
                  <div>
                    <span className="font-medium text-accent-green-800">Date:</span>
                    <div className="text-accent-green-600">{appointmentDetails.appointment_date}</div>
                  </div>
                  <div>
                    <span className="font-medium text-accent-green-800">Time:</span>
                    <div className="text-accent-green-600">{appointmentDetails.appointment_time}</div>
                  </div>
                  <div>
                    <span className="font-medium text-accent-green-800">Status:</span>
                    <div className="text-accent-green-600 capitalize">{appointmentDetails.status}</div>
                  </div>
                  <div>
                    <span className="font-medium text-accent-green-800">Payment Status:</span>
                    <div className="text-accent-green-600 capitalize">{appointmentDetails.payment_status || 'Paid'}</div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Next Steps:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• You will receive a confirmation SMS and email within 30 minutes</li>
                  <li>• Please arrive 30 minutes before your scheduled appointment</li>
                  <li>• Bring all required documents including passport and photographs</li>
                  <li>• Fast for 8-12 hours before your appointment for blood tests</li>
                  <li>• Results will be available within 2-3 working days</li>
                </ul>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/user/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-medical-600 hover:bg-medical-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h0a2 2 0 012 2v0H8v0z" />
              </svg>
              View Dashboard
            </Link>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Print Confirmation
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Home
            </Link>
          </div>

          {/* Contact Information */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@gamca.com" className="text-primary-600 hover:text-primary-500">
                support@gamca.com
              </a>{' '}
              or{' '}
              <a href="tel:+911234567890" className="text-primary-600 hover:text-primary-500">
                +91 1234 567 890
              </a>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}