import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, handleApiError } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [lastOtpSentTime, setLastOtpSentTime] = useState<number | null>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Prevent rapid successive requests
      const now = Date.now();
      if (lastOtpSentTime && (now - lastOtpSentTime) < 3000) {
        setError('Please wait a moment before requesting another code.');
        setLoading(false);
        return;
      }

      const result = await authApi.sendOTP(phone);

      if (result.success) {
        // Clear any existing errors first
        setError('');
        
        // Update success states
        setLastOtpSentTime(now);
        setRetryCount(0);
        
        // In development mode, show the OTP
        if (result.data?.otp) {
          console.log('Development OTP:', result.data.otp);
        }
        
        // Use setTimeout to ensure step change happens after all other state updates
        setTimeout(() => {
          setStep('otp');
        }, 50);
      } else {
        // Handle specific error cases with better messaging
        const errorMessage = result.error || 'Failed to send OTP';
        setError(errorMessage);
        setRetryCount(prev => prev + 1);
      }
    } catch (error: unknown) {
      console.error('Send OTP error:', error);
      
      // Handle network errors specifically
      const errorMessage = handleApiError(error);
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setError('Network connection error. Please check your internet connection and try again.');
      } else {
        setError(errorMessage);
      }
      
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authApi.verifyOTP(phone, otp);

      if (result.success && result.data) {
        // Store token
        localStorage.setItem('token', result.data.token);
        
        // Redirect to appointment form instead of booking page
        const redirectTo = searchParams.get('redirect') || '/appointment-form';
        navigate(redirectTo);
      } else {
        setError(result.error || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);

    try {
      // Prevent rapid resend requests
      const now = Date.now();
      if (lastOtpSentTime && (now - lastOtpSentTime) < 30000) {
        const waitTime = Math.ceil((30000 - (now - lastOtpSentTime)) / 1000);
        setError(`Please wait ${waitTime} seconds before requesting another code.`);
        setLoading(false);
        return;
      }

      const result = await authApi.sendOTP(phone);

      if (result.success) {
        setError('');
        setLastOtpSentTime(now);
        setOtp(''); // Clear previous OTP input
        
        // In development mode, show the OTP
        if (result.data && result.data.otp) {
          console.log('Development OTP:', result.data.otp);
        }
        
        // Show success message briefly
        setError('New verification code sent successfully!');
        setTimeout(() => setError(''), 3000);
      } else {
        // Handle specific resend error cases
        setError(result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-clinical-50 to-medical-50">
      {/* Enhanced Header */}
      <div className="hero-medical py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3 hover-lift">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4V8H18C19.1 8 20 8.9 20 10V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V10C4 8.9 4.9 8 6 8H10V4C10 2.9 10.9 2 12 2M12 4V8H12V4M6 10V20H18V10H6M8 12H16V14H8V12M8 16H13V18H8V16Z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">GAMCA</h1>
                <p className="text-medical-100 text-sm">Medical Verification Platform</p>
              </div>
            </Link>
            <div className="hidden md:flex items-center space-x-6 text-sm text-medical-100">
              <div className="flex items-center space-x-2">
                <div className="health-icon w-8 h-8 bg-white bg-opacity-20">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>Bank-Level Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="health-icon w-8 h-8 bg-white bg-opacity-20">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>HIPAA Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Enhanced Hero Section */}
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-20 h-20 bg-gradient-to-br from-medical-500 to-health-500 rounded-2xl mb-6 shadow-medical-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-clinical-900 mb-3">
              {step === 'phone' ? 'Secure Phone Verification' : 'Enter Verification Code'}
            </h2>
            <p className="text-clinical-600 text-lg">
              {step === 'phone' 
                ? 'Secure SMS verification for your medical appointment booking'
                : `We sent a 6-digit verification code to ${phone}`
              }
            </p>
          </div>

          {/* Enhanced Main Form Card */}
          <div className="card-medical">
            {/* Enhanced Security Trust Indicators */}
            <div className="flex items-center justify-center space-x-8 py-6 border-b border-medical-200 mb-8">
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="w-10 h-10 bg-health-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-health-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs text-clinical-600 font-medium">256-bit SSL</span>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="w-10 h-10 bg-medical-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-medical-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs text-clinical-600 font-medium">GAMCA Verified</span>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </div>
                <span className="text-xs text-clinical-600 font-medium">Privacy Protected</span>
              </div>
            </div>

            {/* Enhanced Error/Success Display */}
            {error && (
              <div className={`mb-8 rounded-xl border-2 ${
                error.includes('sent successfully') 
                  ? 'bg-gradient-to-r from-health-50 to-health-100 border-health-200'
                  : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
              }`}>
                <div className="flex items-start p-6">
                  <div className="flex-shrink-0">
                    {error.includes('sent successfully') ? (
                      <div className="w-10 h-10 bg-health-500 rounded-full flex items-center justify-center shadow-health">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <p className={`font-semibold text-lg ${error.includes('sent successfully') ? 'text-health-800' : 'text-red-800'}`}>
                      {error.includes('sent successfully') ? 'Verification Code Sent!' : 'Verification Required'}
                    </p>
                    <p className={`text-sm mt-1 ${error.includes('sent successfully') ? 'text-health-700' : 'text-red-700'}`}>
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 'phone' ? (
              <form onSubmit={handleSendOTP} className="space-y-8">
                <div className="form-group">
                  <label htmlFor="phone" className="form-label text-clinical-800 font-semibold">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-clinical-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="form-input pl-12 text-lg"
                      placeholder="+91 9876543210"
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-3 text-sm text-clinical-500 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-clinical-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Enter your Indian mobile number with country code for secure verification
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !phone}
                  className="btn-primary w-full py-4 text-lg font-semibold shadow-medical-lg hover:shadow-medical"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="loading-spinner w-5 h-5 mr-3"></div>
                      Sending Verification Code...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Send Verification Code
                    </div>
                  )}
                </button>
                
                {/* Enhanced Retry Information */}
                {retryCount > 0 && !loading && (
                  <div className="info-card-warning">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-medium">Verification Assistance</p>
                        <p className="text-sm mt-1">
                          {retryCount === 1 && 'Ensure your phone number is correct and includes country code (+91)'}
                          {retryCount === 2 && 'Check your internet connection and try again'}
                          {retryCount >= 3 && 'Multiple attempts detected. Please wait a moment before trying again'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-8">
                <div className="form-group">
                  <label htmlFor="otp" className="form-label text-clinical-800 font-semibold">
                    Verification Code
                  </label>
                  <div className="relative">
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="form-input text-center text-2xl tracking-widest font-mono py-4"
                      placeholder="000000"
                      disabled={loading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <svg className="w-5 h-5 text-clinical-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-clinical-500 text-center flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2 text-clinical-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    Enter the 6-digit code sent to your mobile device
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="btn-primary w-full py-4 text-lg font-semibold shadow-medical-lg hover:shadow-medical"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="loading-spinner w-5 h-5 mr-3"></div>
                      Verifying Code...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verify & Continue
                    </div>
                  )}
                </button>

                <div className="flex items-center justify-between text-sm pt-4 border-t border-medical-200">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setOtp('');
                      setError('');
                      setRetryCount(0);
                    }}
                    className="text-medical-600 hover:text-medical-500 font-medium flex items-center space-x-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Change phone number</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-health-600 hover:text-health-500 font-medium disabled:opacity-50 flex items-center space-x-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Resend code</span>
                  </button>
                </div>
              </form>
            )}

            <div className="mt-10">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-medical-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gradient-to-r from-medical-50 to-clinical-50 text-clinical-500 font-medium">
                    Need assistance with verification?
                  </span>
                </div>
              </div>

              <div className="mt-8 text-center space-y-4">
                <div className="flex justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2 text-clinical-500">
                    <svg className="w-4 h-4 text-health-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <span>24/7 Support</span>
                  </div>
                  <div className="flex items-center space-x-2 text-clinical-500">
                    <svg className="w-4 h-4 text-medical-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>Help Center</span>
                  </div>
                </div>
                <Link 
                  to="/" 
                  className="inline-flex items-center text-sm text-clinical-600 hover:text-medical-600 font-medium transition-colors group"
                >
                  <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Return to homepage
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}