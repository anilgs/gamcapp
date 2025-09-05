import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

export const Home: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [, setUserPhone] = useState('')
  const [, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.get('/api/auth/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (res.data.success) {
          setIsAuthenticated(true)
          setUserPhone(res.data.user.phone)
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
      await axios.post('/api/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      setIsAuthenticated(false)
      setUserPhone('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="nav-medical">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-medical-500 to-health-500 rounded-xl flex items-center justify-center shadow-medical">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C13.1 2 14 2.9 14 4V8H18C19.1 8 20 8.9 20 10V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V10C4 8.9 4.9 8 6 8H10V4C10 2.9 10.9 2 12 2M12 4V8H12V4M6 10V20H18V10H6M8 12H16V14H8V12M8 16H13V18H8V16Z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-medical-600">GAMCA</h1>
                  <span className="text-xs text-clinical-500 font-medium">Medical Verification Platform</span>
                </div>
              </div>
            </div>
            <nav className="flex space-x-8">
              <Link to="/book-appointment" className="nav-link flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0V7a4 4 0 118 0v4z" />
                </svg>
                <span>Book Appointment</span>
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/user/dashboard" className="nav-link flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    <span>Dashboard</span>
                  </Link>
                  <Link to="/profile" className="nav-link flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-clinical-700 hover:text-red-600 font-medium transition-colors duration-200 flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/auth/login" className="nav-link flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Login</span>
                  </Link>
                  <Link to="/admin/login" className="nav-link flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Admin</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-sm">
                <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Professional Medical<br />
              <span className="text-health-300">Verification Services</span>
            </h1>
            <p className="text-xl text-medical-100 mb-12 max-w-3xl mx-auto leading-relaxed">
              Streamlined GAMCA medical appointments for Gulf employment. 
              Secure, certified, and efficient healthcare verification with 24/7 digital access to your medical records.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Link 
                to="/book-appointment"
                className="btn-primary px-10 py-5 text-lg font-semibold inline-flex items-center justify-center bg-white text-medical-600 hover:bg-clinical-50 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0V7a4 4 0 118 0v4z" />
                </svg>
                Schedule Medical Exam
              </Link>
              <Link 
                to="/auth/login"
                className="btn-outline px-10 py-5 text-lg font-semibold inline-flex items-center justify-center border-2 border-white text-white hover:bg-white hover:text-medical-600 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Your Reports
              </Link>
            </div>

            {/* Enhanced Trust Indicators */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-medical-100">
              <div className="flex flex-col items-center space-y-3 p-6 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm">
                <div className="w-12 h-12 bg-health-400 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-semibold">GAMCA Certified</span>
                <span className="text-xs text-medical-200">Official Medical Authority</span>
              </div>
              <div className="flex flex-col items-center space-y-3 p-6 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm">
                <div className="w-12 h-12 bg-health-400 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-semibold">Secure & Private</span>
                <span className="text-xs text-medical-200">HIPAA Compliant Platform</span>
              </div>
              <div className="flex flex-col items-center space-y-3 p-6 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm">
                <div className="w-12 h-12 bg-health-400 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-semibold">24/7 Support</span>
                <span className="text-xs text-medical-200">Expert Medical Assistance</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose GAMCA Medical Services?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Trusted by thousands of travelers for secure, efficient, and professional medical verification services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-medical text-center hover-lift">
              <div className="medical-icon mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-clinical-900 mb-4">Certified Medical Excellence</h3>
              <p className="text-clinical-600 leading-relaxed mb-6">GAMCA-approved medical examinations with industry-leading security protocols. Your health data is protected with enterprise-grade encryption and HIPAA compliance.</p>
              <div className="flex justify-center space-x-2">
                <span className="status-badge status-success">GAMCA Certified</span>
                <span className="status-badge status-processing">ISO Compliant</span>
              </div>
            </div>

            <div className="card-health text-center hover-lift">
              <div className="health-icon mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-clinical-900 mb-4">Flexible Payment Solutions</h3>
              <p className="text-clinical-600 leading-relaxed mb-6">Multiple secure payment options including UPI, digital wallets, credit cards, and net banking. All transactions are protected with bank-level security.</p>
              <div className="flex justify-center space-x-2 flex-wrap gap-2">
                <span className="status-badge status-processing">UPI</span>
                <span className="status-badge status-processing">Cards</span>
                <span className="status-badge status-processing">Banking</span>
                <span className="status-badge status-processing">Wallets</span>
              </div>
            </div>

            <div className="card-accent text-center hover-lift">
              <div className="clinical-icon mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-clinical-900 mb-4">Digital Health Records</h3>
              <p className="text-clinical-600 leading-relaxed mb-6">Instant access to appointment slips, medical reports, and certification documents. Download, share, or print your records anytime from your secure dashboard.</p>
              <div className="flex justify-center space-x-2">
                <span className="status-badge status-pending">24/7 Access</span>
                <span className="status-badge status-success">Instant Download</span>
              </div>
            </div>
          </div>

          {/* Enhanced Statistics */}
          <div className="mt-20 bg-gradient-to-br from-clinical-50 to-medical-50 rounded-2xl p-8 shadow-medical border border-clinical-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="dashboard-stat border-0 shadow-none bg-transparent">
                <div className="dashboard-stat-number text-medical-600">50,000+</div>
                <div className="dashboard-stat-label">Medical Exams Completed</div>
                <div className="mt-2">
                  <span className="status-badge status-success text-xs">Verified Results</span>
                </div>
              </div>
              <div className="dashboard-stat border-0 shadow-none bg-transparent">
                <div className="dashboard-stat-number text-health-600">15+</div>
                <div className="dashboard-stat-label">Certified Medical Centers</div>
                <div className="mt-2">
                  <span className="status-badge status-processing text-xs">GAMCA Approved</span>
                </div>
              </div>
              <div className="dashboard-stat border-0 shadow-none bg-transparent">
                <div className="dashboard-stat-number text-accent-600">99.9%</div>
                <div className="dashboard-stat-label">Success Rate</div>
                <div className="mt-2">
                  <span className="status-badge status-success text-xs">Quality Assured</span>
                </div>
              </div>
              <div className="dashboard-stat border-0 shadow-none bg-transparent">
                <div className="dashboard-stat-number text-medical-600">24/7</div>
                <div className="dashboard-stat-label">Expert Support</div>
                <div className="mt-2">
                  <span className="status-badge status-processing text-xs">Always Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-medical-600 to-health-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Schedule Your Medical Verification?
            </h2>
            <p className="text-xl text-medical-100 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who trust our GAMCA-certified medical verification services for their Gulf employment needs.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/book-appointment"
              className="btn-success px-10 py-5 text-lg font-semibold inline-flex items-center bg-white text-health-600 hover:bg-clinical-50 hover:shadow-xl transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Book Medical Exam Now
            </Link>
            <Link 
              to="/auth/login"
              className="btn-outline px-10 py-5 text-lg font-semibold inline-flex items-center border-2 border-white text-white hover:bg-white hover:text-medical-600 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Track Your Application
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-clinical-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-medical-500 to-health-500 rounded-xl flex items-center justify-center shadow-medical">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C13.1 2 14 2.9 14 4V8H18C19.1 8 20 8.9 20 10V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V10C4 8.9 4.9 8 6 8H10V4C10 2.9 10.9 2 12 2M12 4V8H12V4M6 10V20H18V10H6M8 12H16V14H8V12M8 16H13V18H8V16Z"/>
                  </svg>
                </div>
                <div>
                  <span className="text-2xl font-bold">GAMCA</span>
                  <div className="text-clinical-400 text-sm">Medical Verification Platform</div>
                </div>
              </div>
              <p className="text-clinical-300 leading-relaxed max-w-md mb-6">
                Professional medical appointment booking platform for Gulf employment verification. 
                Trusted by healthcare professionals and thousands of travelers worldwide for secure, efficient, and GAMCA-certified medical services.
              </p>
              <div className="flex space-x-4">
                <div className="status-badge bg-medical-500 text-white">ISO 27001 Certified</div>
                <div className="status-badge bg-health-500 text-white">HIPAA Compliant</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6 text-medical-400">Medical Services</h4>
              <ul className="space-y-3 text-clinical-300">
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-health-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Comprehensive Medical Exams</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-health-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Gulf Employment Verification</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-health-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Digital Health Records</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-health-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>GAMCA Certification</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6 text-medical-400">Patient Support</h4>
              <ul className="space-y-3 text-clinical-300">
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-accent-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span>24/7 Medical Support</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-accent-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Healthcare Guidance</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-accent-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  <span>Appointment Management</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-accent-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>Technical Assistance</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-clinical-800 mt-12 pt-8 text-center">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-clinical-400 mb-4 md:mb-0">&copy; 2024 GAMCA Medical Verification Platform. All rights reserved.</p>
              <div className="flex space-x-6 text-sm text-clinical-400">
                <span>Privacy Policy</span>
                <span>Terms of Service</span>
                <span>Medical Disclaimer</span>
              </div>
            </div>
            <p className="mt-4 text-clinical-500 text-sm">Professional Healthcare Services • Gulf Employment Medical Certification</p>
          </div>
        </div>
      </footer>
    </div>
  )
}