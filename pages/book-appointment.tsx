import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AppointmentForm from '../components/AppointmentForm'

export default function BookAppointment() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userPhone, setUserPhone] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token')
    if (token) {
      // Verify token and get user info
      fetch('/api/auth/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsAuthenticated(true)
          setUserPhone(data.user.phone)
        } else {
          localStorage.removeItem('token')
        }
        setLoading(false)
      })
      .catch(() => {
        localStorage.removeItem('token')
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const handleFormSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        // Redirect to payment page
        router.push(`/payment?appointmentId=${result.data.appointmentId}`)
      } else {
        throw new Error(result.error || 'Failed to create appointment')
      }
    } catch (error) {
      console.error('Error submitting appointment:', error)
      alert('Failed to submit appointment. Please try again.')
    }
  }

  const handleAuthRequired = () => {
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Book Appointment - GAMCA Medical Verification</title>
        <meta name="description" content="Book your medical appointment for travel verification" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link href="/" className="text-2xl font-bold text-primary-600">
                  GAMCA
                </Link>
              </div>
              <nav className="flex space-x-8">
                <Link href="/" className="text-gray-600 hover:text-primary-600">
                  Home
                </Link>
                <Link href="/user/dashboard" className="text-gray-600 hover:text-primary-600">
                  Dashboard
                </Link>
                <Link href="/admin/login" className="text-gray-600 hover:text-primary-600">
                  Admin
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Book Medical Appointment
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Complete the form below to book your medical verification appointment. 
              All fields are required for processing your application.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-primary-600">Appointment Details</span>
              </div>
              <div className="w-16 h-1 bg-gray-200"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Payment</span>
              </div>
              <div className="w-16 h-1 bg-gray-200"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Confirmation</span>
              </div>
            </div>
          </div>

          {/* Authentication Check */}
          {!isAuthenticated ? (
            <div className="card max-w-md mx-auto text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
              <p className="text-gray-600 mb-6">
                Please verify your phone number to continue with the appointment booking.
              </p>
              <button
                onClick={handleAuthRequired}
                className="btn-primary w-full"
              >
                Verify Phone Number
              </button>
            </div>
          ) : (
            /* Appointment Form */
            <div className="card">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Appointment Information
                </h2>
                <p className="text-gray-600">
                  Authenticated as: <span className="font-medium">{userPhone}</span>
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
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Required Documents</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Valid passport with minimum 6 months validity
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Recent passport-size photographs
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Employment visa or job offer letter
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Previous medical reports (if any)
                </li>
              </ul>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Tests Included</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  General Physical Examination
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Chest X-Ray
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Blood Tests (HIV, Hepatitis B & C, Malaria)
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Stool Examination
                </li>
              </ul>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-white mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p>&copy; 2024 GAMCA. All rights reserved.</p>
              <p className="mt-2 text-gray-400">Medical Appointment Booking Platform</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
