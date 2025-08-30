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
          if (result.success && result.data) {
            setIsAuthenticated(true);
            setUserPhone(result.data.phone);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-clinical-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-clinical-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-8">Please log in to access the appointment form.</p>
          <Link
            to="/auth/login?redirect=/appointment-form"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <title>Appointment Form - GAMCA Medical Verification</title>

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
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Logged in as: <span className="font-medium">{userPhone}</span>
                </span>
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

          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-brand font-bold text-clinical-900 mb-4">
              Complete Your Appointment Details
            </h1>
            <p className="text-lg text-clinical-600 max-w-2xl mx-auto">
              Fill out the comprehensive medical appointment form to proceed with your GAMCA certification process.
            </p>
          </div>

          {/* Appointment Form */}
          <div className="card-medical hover-lift">
            <div className="section-header mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-medical-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-brand font-bold text-clinical-900">
                  Medical Appointment Form
                </h2>
              </div>
              <p className="text-clinical-600 font-medical mt-2">
                Please provide accurate information as it will be used for your medical examination.
              </p>
            </div>

            <AppointmentForm 
              onSubmit={handleFormSubmit}
              userPhone={userPhone}
            />
          </div>

          {/* Additional Information */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Important Information
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Ensure all information matches your passport exactly</li>
                    <li>Double-check your passport number as it cannot be changed after submission</li>
                    <li>Select your preferred medical center carefully based on your location</li>
                    <li>Your appointment will be confirmed via SMS and email</li>
                    <li>Bring all required documents on the day of your appointment</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}