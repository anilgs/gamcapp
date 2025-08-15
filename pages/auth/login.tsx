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

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
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
        // In development mode, show the OTP
        if (result.data.otp) {
          console.log('Development OTP:', result.data.otp)
        }
      } else {
        setError(result.error || 'Failed to send OTP')
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      setError('Failed to send OTP. Please try again.')
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
        
        // Redirect to appointment booking or dashboard
        const redirectTo = router.query.redirect || '/book-appointment'
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
        // In development mode, show the OTP
        if (result.data.otp) {
          console.log('Development OTP:', result.data.otp)
        }
        alert('OTP sent successfully!')
      } else {
        setError(result.error || 'Failed to resend OTP')
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
        <title>Login - GAMCA Medical Verification</title>
        <meta name="description" content="Login to book your medical appointment" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link href="/" className="flex justify-center">
            <h1 className="text-3xl font-bold text-primary-600">GAMCA</h1>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 'phone' ? 'Verify your phone number' : 'Enter verification code'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'phone' 
              ? 'We\'ll send you a verification code via SMS'
              : `We sent a 6-digit code to ${phone}`
            }
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
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
