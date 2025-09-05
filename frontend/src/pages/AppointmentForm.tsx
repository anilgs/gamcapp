import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, appointmentApi } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import AppointmentForm from '../components/AppointmentForm';

interface AppointmentFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  gender: string;
  maritalStatus: string;
  passportNumber: string;
  confirmPassportNumber: string;
  passportIssueDate: string;
  passportIssuePlace: string;
  passportExpiryDate: string;
  email: string;
  phone: string;
  nationalId: string;
  country: string;
  city: string;
  countryTravelingTo: string;
  appointmentType: string;
  medicalCenter: string;
  appointmentDate: string;
  visaType: string;
  positionAppliedFor: string;
}

export default function AppointmentFormPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user info
      authApi.getProfile()
        .then(result => {
          if (result.success && result.data && result.data.type === 'user' && result.data.user) {
            setIsAuthenticated(true);
            setUserPhone(result.data.user.phone);
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
  }, [navigate]);

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

  const handleFormSubmit = async (data: AppointmentFormData) => {
    try {
      const result = await appointmentApi.create({
        appointment_date: data.appointmentDate,
        appointment_time: '09:00', // Default time, can be enhanced
        wafid_booking_id: undefined // Will be set by external booking if needed
      });

      if (result.success && result.data) {
        // Redirect to payment page
        navigate(`/payment?appointmentId=${result.data.id}`);
      } else {
        throw new Error(result.error || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error submitting appointment:', error);
      alert('Failed to submit appointment. Please try again.');
    }
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
          <p className="text-gray-600 mb-8">Please log in to access the appointment form.</p>
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
      {/* Enhanced Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-medical-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-medical-blue-600 to-medical-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v14H3v3c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3V2l-1.5 1.5zM19 19c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v2zm0-5H8v-2h11v2zm0-4H8V8h11v2zm0-4H8V4h11v2z"/>
                  </svg>
                </div>
                <div>
                  <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-medical-blue-600 to-health-green-600 bg-clip-text text-transparent">
                    GAMCA
                  </Link>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="font-medium">Medical Verification</span>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <span className="text-health-green-600 font-medium">✓ Secure Portal</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <div className="w-2 h-2 bg-health-green-500 rounded-full animate-pulse"></div>
                <span>Logged in as: <span className="font-semibold text-medical-blue-700">{userPhone}</span></span>
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Appointment Form */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <AppointmentForm 
            onSubmit={handleFormSubmit}
            userPhone={userPhone}
          />
        </div>

        {/* Enhanced Important Information */}
        <div className="mt-12 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-3">
                📋 Important Guidelines
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-amber-800">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-600 font-medium">✓</span>
                    <span>Ensure all information matches your passport exactly</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-600 font-medium">✓</span>
                    <span>Double-check passport number - cannot be changed after submission</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-600 font-medium">✓</span>
                    <span>Select medical center based on your location preference</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-600 font-medium">✓</span>
                    <span>Appointment confirmation via SMS and email</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-600 font-medium">✓</span>
                    <span>Bring original documents on appointment day</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-600 font-medium">✓</span>
                    <span>Arrive 30 minutes before scheduled time</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}