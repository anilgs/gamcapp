import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userPhone, setUserPhone] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      setIsAuthenticated(false)
      setUserPhone('')
    }
  }
  return (
    <>
      <Head>
        <title>GAMCA - Medical Appointment Booking</title>
        <meta name="description" content="Book your medical appointment for travel verification" />
      </Head>
      
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
                  <h1 className="text-2xl font-brand font-bold text-medical-600">GAMCA</h1>
                  <span className="text-sm text-clinical-500 font-medical">Medical Verification</span>
                </div>
              </div>
              <nav className="flex space-x-8">
                <Link href="/book-appointment" className="text-clinical-600 hover:text-medical-600 font-medical font-medium transition-colors">
                  Book Appointment
                </Link>
                {isAuthenticated ? (
                  <>
                    <Link href="/user/dashboard" className="text-clinical-600 hover:text-medical-600 font-medical font-medium transition-colors">
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-clinical-600 hover:text-red-600 font-medical font-medium transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/user/dashboard" className="text-clinical-600 hover:text-medical-600 font-medical font-medium transition-colors">
                      User Login
                    </Link>
                    <Link href="/admin/login" className="text-clinical-600 hover:text-medical-600 font-medical font-medium transition-colors">
                      Admin Login
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero-medical relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-5xl font-brand font-bold mb-6 leading-tight">
                Medical Appointment Booking<br />
                <span className="text-health-200">for Travel Verification</span>
              </h2>
              <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto font-medical leading-relaxed">
                Book your medical appointment quickly and securely with GAMCA certified centers. 
                Complete your travel verification requirements with our streamlined, professional booking process.
              </p>
              
              <div className="space-y-4 sm:space-y-0 sm:space-x-6 sm:flex sm:justify-center">
                <Link 
                  href="/book-appointment"
                  className="btn-accent inline-flex items-center px-8 py-4 text-lg font-medium hover-lift"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0V7a4 4 0 118 0v4z" />
                  </svg>
                  Book Appointment Now
                </Link>
                <Link 
                  href="/user/dashboard"
                  className="btn-outline-medical inline-flex items-center px-8 py-4 text-lg font-medium bg-white bg-opacity-10 border-white text-white hover:bg-white hover:text-medical-600 hover-lift"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Check Your Status
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-12 flex justify-center items-center space-x-8 text-blue-100">
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
                  <span className="font-medical text-sm">Secure & Private</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-health-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medical text-sm">24/7 Support</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-brand font-bold text-clinical-900 mb-4">
              Why Choose GAMCA Medical Services?
            </h3>
            <p className="text-lg text-clinical-600 max-w-2xl mx-auto font-medical">
              Trusted by thousands of travelers for secure, efficient, and professional medical verification services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-medical text-center hover-lift hover-glow-medical border-t-4 border-medical-500">
              <div className="w-16 h-16 bg-medical-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="icon-medical w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-brand font-semibold text-clinical-900 mb-4">Secure & Certified</h3>
              <p className="text-clinical-600 font-medical leading-relaxed">Your personal information and medical data are protected with industry-standard security and GAMCA certification.</p>
              <div className="mt-4 flex justify-center">
                <span className="status-badge bg-medical-100 text-medical-800">GAMCA Certified</span>
              </div>
            </div>

            <div className="card-medical text-center hover-lift hover-glow-medical border-t-4 border-accent-500">
              <div className="w-16 h-16 bg-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="icon-accent w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-brand font-semibold text-clinical-900 mb-4">Multiple Payment Options</h3>
              <p className="text-clinical-600 font-medical leading-relaxed">Pay conveniently using UPI, credit cards, net banking, or other supported payment methods with secure processing.</p>
              <div className="mt-4 flex justify-center space-x-2">
                <span className="status-badge bg-accent-100 text-accent-800">UPI</span>
                <span className="status-badge bg-accent-100 text-accent-800">Cards</span>
                <span className="status-badge bg-accent-100 text-accent-800">Net Banking</span>
              </div>
            </div>

            <div className="card-medical text-center hover-lift hover-glow-medical border-t-4 border-health-500">
              <div className="w-16 h-16 bg-health-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="icon-health w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-brand font-semibold text-clinical-900 mb-4">Digital Health Records</h3>
              <p className="text-clinical-600 font-medical leading-relaxed">Access and download your appointment slips, medical reports, and health records anytime from your secure dashboard.</p>
              <div className="mt-4 flex justify-center">
                <span className="status-badge bg-health-100 text-health-800">24/7 Access</span>
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="mt-20 bg-clinical-50 rounded-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-brand font-bold text-medical-600 mb-2">50,000+</div>
                <div className="text-clinical-600 font-medical">Appointments Completed</div>
              </div>
              <div>
                <div className="text-3xl font-brand font-bold text-health-600 mb-2">15+</div>
                <div className="text-clinical-600 font-medical">Medical Centers</div>
              </div>
              <div>
                <div className="text-3xl font-brand font-bold text-accent-600 mb-2">99.9%</div>
                <div className="text-clinical-600 font-medical">Success Rate</div>
              </div>
              <div>
                <div className="text-3xl font-brand font-bold text-medical-600 mb-2">24/7</div>
                <div className="text-clinical-600 font-medical">Customer Support</div>
              </div>
            </div>
          </div>
        </section>

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
  )
}
