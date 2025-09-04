import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, appointmentApi } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import AppointmentForm from '../components/AppointmentForm';

interface AppointmentFormData {
  name: string;
  email: string;
  phone: string;
  passport_number: string;
  appointment_type: string;
  preferred_date: string;
  medical_center: string;
  additional_notes: string;
}

export default function BookAppointment() {
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
            // Redirect authenticated users to the comprehensive appointment form
            navigate('/appointment-form');
          } else {
            localStorage.removeItem('token');
          }
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [navigate]);

  const handleFormSubmit = async (formData: AppointmentFormData) => {
    try {
      const result = await appointmentApi.create({
        appointment_date: formData.preferred_date,
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

  const handleAuthRequired = () => {
    navigate('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-clinical-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <>
      <title>Book Appointment - GAMCA Medical Verification</title>

      <div className="min-h-screen bg-clinical-100">
        {/* Header */}
        <header className="bg-white shadow-lg border-b border-clinical-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="flex items-center space-x-3">
                  {/* Medical Cross Icon */}
                  <div className="w-10 h-10 bg-medical-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </div>
                  <Link to="/" className="text-2xl font-brand font-bold text-medical-600">
                    GAMCA
                  </Link>
                  <span className="text-sm text-clinical-500 font-medical">Medical Verification</span>
                </div>
              </div>
              <nav className="flex space-x-8">
                <Link to="/" className="text-clinical-600 hover:text-medical-600 font-medical font-medium transition-colors">
                  Home
                </Link>
                <Link to="/user/dashboard" className="text-clinical-600 hover:text-medical-600 font-medical font-medium transition-colors">
                  Dashboard
                </Link>
                <Link to="/admin/login" className="text-clinical-600 hover:text-medical-600 font-medical font-medium transition-colors">
                  Admin Login
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero-medical relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>
              <h1 className="text-4xl font-brand font-bold mb-4 leading-tight">
                Book Your Medical Appointment
              </h1>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto font-medical leading-relaxed">
                Start your medical verification process with GAMCA certified centers. 
                Secure, professional, and trusted by thousands of travelers.
              </p>

              {/* Trust indicators */}
              <div className="flex justify-center items-center space-x-8 text-blue-100">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-health-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medical text-sm">GAMCA Certified</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-health-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medical text-sm">Secure Process</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-health-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medical text-sm">Fast Processing</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Progress Indicator */}
          <div className="mb-12">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-medical-500 text-white rounded-full flex items-center justify-center text-sm font-medium shadow-medical">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-medical-600 font-medical">Appointment Details</span>
              </div>
              <div className="w-16 h-1 bg-clinical-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-clinical-300 text-clinical-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-clinical-500 font-medical">Payment</span>
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

          {/* Authentication Check */}
          {!isAuthenticated ? (
            <div className="card-medical max-w-md mx-auto text-center hover-lift">
              <div className="w-16 h-16 bg-health-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-health-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-brand font-bold text-clinical-900 mb-3">Authentication Required</h3>
              <p className="text-clinical-600 mb-6 font-medical">
                Please verify your phone number to continue with your secure medical appointment booking.
              </p>
              <button
                onClick={handleAuthRequired}
                className="btn-medical w-full hover-lift"
              >
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Verify Phone Number
              </button>
              <div className="mt-4 p-3 bg-health-50 rounded-lg">
                <p className="text-sm text-health-800 font-medical">
                  <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Secure OTP verification ensures your appointment data is protected
                </p>
              </div>
            </div>
          ) : (
            /* Appointment Form */
            <div className="card-medical hover-lift">
              <div className="section-header mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-medical-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-brand font-bold text-clinical-900">
                    Appointment Information
                  </h2>
                </div>
                <p className="text-clinical-600 font-medical mt-2">
                  Authenticated as: <span className="font-medium text-medical-600">{userPhone}</span>
                </p>
              </div>

              <AppointmentForm 
                onSubmit={handleFormSubmit}
                userPhone={userPhone}
              />
            </div>
          )}

          {/* Information Section */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card-medical text-center hover-lift hover-glow-medical border-t-4 border-health-500">
              <div className="w-16 h-16 bg-health-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="icon-health w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-brand font-bold text-clinical-900 mb-4">Required Documents</h3>
              <ul className="space-y-3 text-clinical-600 font-medical text-left">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-health-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Valid passport with minimum 6 months validity</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-health-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Recent passport-size photographs</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-health-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Employment visa or job offer letter</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-health-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Previous medical reports (if any)</span>
                </li>
              </ul>
              <div className="mt-6 flex justify-center">
                <span className="status-badge bg-health-100 text-health-800">Essential Documents</span>
              </div>
            </div>

            <div className="card-medical text-center hover-lift hover-glow-medical border-t-4 border-medical-500">
              <div className="w-16 h-16 bg-medical-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="icon-medical w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-brand font-bold text-clinical-900 mb-4">Medical Tests Included</h3>
              <ul className="space-y-3 text-clinical-600 font-medical text-left">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-medical-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>General Physical Examination</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-medical-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Chest X-Ray</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-medical-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Blood Tests (HIV, Hepatitis B & C, Malaria)</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-medical-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Stool Examination</span>
                </li>
              </ul>
              <div className="mt-6 flex justify-center">
                <span className="status-badge bg-medical-100 text-medical-800">Comprehensive Testing</span>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-clinical-800 text-white mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-medical-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </div>
                  <span className="text-2xl font-brand font-bold">GAMCA</span>
                  <span className="text-clinical-400">Medical Verification</span>
                </div>
                <p className="text-clinical-300 font-medical leading-relaxed max-w-md">
                  Professional medical appointment booking platform for travel verification. 
                  Trusted by thousands of travelers worldwide for secure and efficient medical services.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg font-brand font-semibold mb-4">Services</h4>
                <ul className="space-y-2 text-clinical-300 font-medical">
                  <li>Medical Examinations</li>
                  <li>Travel Verification</li>
                  <li>Digital Records</li>
                  <li>GAMCA Certification</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-brand font-semibold mb-4">Support</h4>
                <ul className="space-y-2 text-clinical-300 font-medical">
                  <li>24/7 Customer Support</li>
                  <li>Medical Centers</li>
                  <li>Payment Help</li>
                  <li>Technical Support</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-clinical-700 mt-8 pt-8 text-center">
              <p className="text-clinical-400 font-medical">&copy; 2024 GAMCA Medical Verification. All rights reserved.</p>
              <p className="mt-2 text-clinical-500 text-sm">Professional Medical Appointment Booking Platform</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}