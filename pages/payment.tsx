import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Payment() {
  const router = useRouter()
  const { appointmentId } = router.query
  
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderData, setOrderData] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [appointmentDetails, setAppointmentDetails] = useState(null)

  useEffect(() => {
    if (!appointmentId) return

    const initializePayment = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath))
          return
        }

        // Create payment order
        const response = await fetch('/api/payment/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ appointmentId })
        })

        const result = await response.json()

        if (result.success) {
          setOrderData(result.data.order)
          setUserDetails(result.data.user)
          setAppointmentDetails(result.data.appointment)
        } else {
          setError(result.error || 'Failed to initialize payment')
        }
      } catch (error) {
        console.error('Payment initialization error:', error)
        setError('Failed to initialize payment. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    initializePayment()
  }, [appointmentId, router])

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handlePayment = async () => {
    if (!orderData || !userDetails) {
      setError('Payment data not available')
      return
    }

    setPaymentLoading(true)
    setError('')

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway')
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GAMCA Medical Verification',
        description: `Medical appointment - ${appointmentDetails?.type?.replace('_', ' ').toUpperCase()}`,
        order_id: orderData.id,
        prefill: {
          name: userDetails.name,
          email: userDetails.email,
          contact: userDetails.phone
        },
        theme: {
          color: '#2563eb'
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false)
            console.log('Payment modal dismissed')
          }
        },
        handler: async (response) => {
          try {
            // Verify payment
            const token = localStorage.getItem('token')
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            })

            const verifyResult = await verifyResponse.json()

            if (verifyResult.success) {
              // Payment successful - redirect to success page
              router.push(`/payment/success?paymentId=${response.razorpay_payment_id}`)
            } else {
              throw new Error(verifyResult.error || 'Payment verification failed')
            }
          } catch (error) {
            console.error('Payment verification error:', error)
            setError('Payment verification failed. Please contact support.')
            setPaymentLoading(false)
          }
        }
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()

    } catch (error) {
      console.error('Payment error:', error)
      setError(error.message || 'Payment failed. Please try again.')
      setPaymentLoading(false)
    }
  }

  const formatAmount = (amountInPaise) => {
    const rupees = amountInPaise / 100
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(rupees)
  }

  const getAppointmentTypeLabel = (type) => {
    const labels = {
      employment_visa: 'Employment Visa Medical',
      family_visa: 'Family Visa Medical',
      visit_visa: 'Visit Visa Medical',
      student_visa: 'Student Visa Medical',
      business_visa: 'Business Visa Medical',
      other: 'Other'
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing payment...</p>
        </div>
      </div>
    )
  }

  if (error && !orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Link href="/book-appointment" className="btn-primary block">
              Back to Booking
            </Link>
            <Link href="/" className="btn-secondary block">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Payment - GAMCA Medical Verification</title>
        <meta name="description" content="Complete your payment for medical appointment booking" />
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
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Complete Payment
            </h1>
            <p className="text-lg text-gray-600">
              Review your appointment details and complete the payment
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium text-green-600">Appointment Details</span>
              </div>
              <div className="w-16 h-1 bg-green-600"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-primary-600">Payment</span>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Appointment Summary */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Appointment Summary</h2>
              
              {userDetails && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                    <p className="text-gray-900">{userDetails.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{userDetails.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900">{userDetails.phone}</p>
                  </div>
                </div>
              )}

              {appointmentDetails && (
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Appointment Type</label>
                    <p className="text-gray-900">{getAppointmentTypeLabel(appointmentDetails.type)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Preferred Date</label>
                    <p className="text-gray-900">
                      {new Date(appointmentDetails.details.preferred_date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Medical Center</label>
                    <p className="text-gray-900">{appointmentDetails.details.medical_center?.replace('_', ' ').toUpperCase()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Details */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Details</h2>
              
              {orderData && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600">Medical Examination Fee</span>
                    <span className="font-medium text-gray-900">{formatAmount(orderData.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600">Processing Fee</span>
                    <span className="font-medium text-gray-900">Included</span>
                  </div>
                  <div className="flex justify-between items-center py-3 text-lg font-semibold">
                    <span className="text-gray-900">Total Amount</span>
                    <span className="text-primary-600">{formatAmount(orderData.amount)}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading || !orderData}
                  className={`w-full btn-primary py-4 text-lg ${
                    paymentLoading 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-primary-700'
                  }`}
                >
                  {paymentLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing Payment...
                    </div>
                  ) : (
                    'Pay Now'
                  )}
                </button>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Secure payment powered by RazorPay
                  </p>
                  <div className="flex justify-center items-center mt-2 space-x-4">
                    <span className="text-xs text-gray-400">Supports:</span>
                    <span className="text-xs text-gray-600">UPI • Credit Cards • Debit Cards • Net Banking • Wallets</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Information */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Secure Payment</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Your payment information is encrypted and secure</li>
                    <li>We do not store your card details</li>
                    <li>All transactions are processed through RazorPay's secure gateway</li>
                    <li>You will receive a confirmation email after successful payment</li>
                  </ul>
                </div>
              </div>
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
