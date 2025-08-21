import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Login() {
  const router = useRouter()
  const [step, setStep] = useState('phone') // 'phone' or 'otp'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastOtpSentTime, setLastOtpSentTime] = useState(null)

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Prevent rapid successive requests
      const now = Date.now()
      if (lastOtpSentTime && (now - lastOtpSentTime) < 3000) {
        setError('Please wait a moment before requesting another code.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      })

      const result = await response.json()

      if (result.success) {
        setOtpSent(true)
        setStep('otp')
        setLastOtpSentTime(now)
        setRetryCount(0)
        setError('')
        
        // In development mode, show the OTP
        if (result.data.otp) {
          console.log('Development OTP:', result.data.otp)
        }
      } else {
        // Handle specific error cases with better messaging
        const errorMessage = result.error || 'Failed to send OTP'
        
        if (response.status === 429) {
          setError('Too many requests. Please wait a few minutes before trying again.')
        } else if (response.status === 400) {
          setError('Please check your phone number format and try again.')
        } else if (response.status === 500) {
          setError('Service temporarily unavailable. Please try again in a moment.')
        } else {
          setError(errorMessage)
        }
        
        setRetryCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      
      // Handle network errors specifically
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Network connection error. Please check your internet connection and try again.')
      } else {
        setError('Failed to send OTP. Please check your connection and try again.')
      }
      
      setRetryCount(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, otp }),
      })

      const result = await response.json()

      if (result.success) {
        // Store token
        localStorage.setItem('token', result.data.token)
        
        // Redirect to appointment form instead of booking page
        const redirectTo = router.query.redirect || '/appointment-form'
        router.push(redirectTo)
      } else {
        setError(result.error || 'Invalid OTP')
      }
    } catch (error) {
      console.error('Verify OTP error:', error)
      setError('Failed to verify OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setError('')
    setLoading(true)

    try {
      // Prevent rapid resend requests
      const now = Date.now()
      if (lastOtpSentTime && (now - lastOtpSentTime) < 30000) {
        const waitTime = Math.ceil((30000 - (now - lastOtpSentTime)) / 1000)
        setError(`Please wait ${waitTime} seconds before requesting another code.`)
        setLoading(false)
        return
      }

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      })

      const result = await response.json()

      if (result.success) {
        setError('')
        setLastOtpSentTime(now)
        setOtp('') // Clear previous OTP input
        
        // In development mode, show the OTP
        if (result.data.otp) {
          console.log('Development OTP:', result.data.otp)
        }
        
        // Show success message briefly
        setError('New verification code sent successfully!')
        setTimeout(() => setError(''), 3000)
      } else {
        // Handle specific resend error cases
        if (response.status === 429) {
          setError('Too many requests. Please wait before requesting another code.')
        } else {
          setError(result.error || 'Failed to resend OTP')
        }
      }
    } catch (error) {
      console.error('Resend OTP error:', error)
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Secure Login - GAMCA Medical Verification</title>
        <meta name="description" content="Secure login to book your GAMCA medical appointment" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Medical Header */}
      <div className="bg-medical-600 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 hover-lift">
              <div className="bg-white rounded-lg p-2">
                <svg className="w-8 h-8 text-medical-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 8h-2v3h-3v2h3v3h2v-3h3v-2h-3zM4 8h2v8h8v2H4z"/>
                  <path d="M11.5 2L6 6.5V10h2V7.5L11.5 4 15 7.5V10h2V6.5z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">GAMCA</h1>
                <p className="text-medical-100 text-sm">Gulf Approved Medical Centers Association</p>
              </div>
            </Link>
            <div className="hidden md:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Secure Login</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-gradient-to-br from-clinical-50 via-health-50 to-medical-50 py-12 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-gradient-to-br from-medical-500 to-clinical-600 rounded-full mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-clinical-800 mb-2">
              {step === 'phone' ? 'Verify Your Phone' : 'Enter Security Code'}
            </h2>
            <p className="text-health-600">
              {step === 'phone' 
                ? 'Secure SMS verification for your medical appointment'
                : `We sent a 6-digit code to ${phone}`
              }
            </p>
          </div>

          {/* Main Form Card */}
          <div className="card-medical backdrop-blur-sm">
            {/* Security Trust Indicators */}
            <div className="flex items-center justify-center space-x-6 py-4 border-b border-medical-100 mb-6">
              <div className="flex items-center space-x-2 text-sm text-health-600">
                <svg className="w-4 h-4 text-accent-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-health-600">
                <svg className="w-4 h-4 text-accent-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>GAMCA Verified</span>
              </div>
            </div>

            {/* Enhanced Error/Success Display */}
            {error && (
              <div className={`mb-6 rounded-lg border-2 ${
                error.includes('sent successfully') 
                  ? 'bg-gradient-to-r from-accent-green-50 to-accent-green-100 border-accent-green-200 text-accent-green-800'
                  : 'bg-gradient-to-r from-accent-red-50 to-accent-red-100 border-accent-red-200 text-accent-red-800'
              }`}>
                <div className="flex items-start p-4">
                  <div className="flex-shrink-0">
                    {error.includes('sent successfully') ? (
                      <div className="w-8 h-8 bg-accent-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-accent-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">{error.includes('sent successfully') ? 'Success!' : 'Attention Required'}</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {step === 'phone' ? (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <div className="mt-1">
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="+91 9876543210"
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your Indian mobile number with country code
                  </p>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || !phone}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </div>
                    ) : (
                      'Send Verification Code'
                    )}
                  </button>
                  
                  {/* Retry Information */}
                  {retryCount > 0 && !loading && (
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      {retryCount === 1 && 'Having trouble? Check your phone number and try again.'}
                      {retryCount === 2 && 'Still not working? Make sure you have a stable internet connection.'}
                      {retryCount >= 3 && 'Multiple attempts detected. Please wait a moment and try again.'}
                    </div>
                  )}
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                    Verification Code
                  </label>
                  <div className="mt-1">
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-center text-lg tracking-widest"
                      placeholder="000000"
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the 6-digit code sent to your phone
                  </p>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verifying...
                      </div>
                    ) : (
                      'Verify Code'
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone')
                      setOtp('')
                      setError('')
                      setOtpSent(false)
                      setRetryCount(0)
                    }}
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    Change phone number
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-sm text-primary-600 hover:text-primary-500 disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Need help?</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link href="/" className="text-sm text-gray-600 hover:text-primary-600">
                  ← Back to home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}