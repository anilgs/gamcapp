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

      {/* Enhanced Hero Section */}
      <div className="relative bg-gradient-to-r from-medical-blue-600 via-medical-blue-700 to-health-green-600 text-white py-16 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <div className="w-2 h-2 bg-white/50 rounded-full"></div>
            <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Medical Examination
            <span className="block text-4xl md:text-5xl text-white/90 font-semibold">Appointment Booking</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8 leading-relaxed">
            Complete your GAMCA medical certification with our streamlined appointment system. 
            <span className="block mt-2 text-lg text-white/80">Secure • Fast • HIPAA Compliant</span>
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/80">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-health-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>SSL Encrypted</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-health-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Data Protected</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-health-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Verified Process</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Overview */}
        <div className="mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Appointment Process</h2>
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">5 Simple Steps</span>
          </div>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-10 h-10 bg-medical-blue-100 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-medical-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">Location</span>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 bg-medical-blue-100 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-medical-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">Schedule</span>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 bg-medical-blue-100 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-medical-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">Personal</span>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 bg-medical-blue-100 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-medical-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">Passport</span>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 bg-medical-blue-100 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-medical-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">Contact</span>
            </div>
          </div>
        </div>

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