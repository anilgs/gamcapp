import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Head>
        <title>GAMCA - Medical Appointment Booking</title>
        <meta name="description" content="Book your medical appointment for travel verification" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-primary-600">GAMCA</h1>
              </div>
              <nav className="flex space-x-8">
                <Link href="/book-appointment" className="text-gray-600 hover:text-primary-600">
                  Book Appointment
                </Link>
                <Link href="/user/dashboard" className="text-gray-600 hover:text-primary-600">
                  User Login
                </Link>
                <Link href="/admin/login" className="text-gray-600 hover:text-primary-600">
                  Admin Login
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Medical Appointment Booking for Travel Verification
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Book your medical appointment quickly and securely. Complete your travel verification 
              requirements with our streamlined booking process.
            </p>
            
            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Link 
                href="/book-appointment"
                className="btn-primary inline-block px-8 py-3 text-lg"
              >
                Book Appointment Now
              </Link>
              <Link 
                href="/user/dashboard"
                className="btn-secondary inline-block px-8 py-3 text-lg"
              >
                Check Your Status
              </Link>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0V7a4 4 0 118 0v4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Booking</h3>
              <p className="text-gray-600">Your personal information and payments are protected with industry-standard security.</p>
            </div>

            <div className="card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Multiple Payment Options</h3>
              <p className="text-gray-600">Pay conveniently using UPI, credit cards, or other supported payment methods.</p>
            </div>

            <div className="card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Digital Records</h3>
              <p className="text-gray-600">Access and download your appointment slips and medical records anytime.</p>
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
