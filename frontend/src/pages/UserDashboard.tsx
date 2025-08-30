import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi, userApi, uploadApi } from '@/lib/api'
import { PageLoader } from '@/components/LoadingSpinner'

interface UserData {
  user: {
    name: string
    email: string
    phone: string
    passport_number?: string
    created_at: string
    payment_status: string
  }
  status: {
    status: string
    message: string
    next_steps?: string[]
  }
  appointment: {
    type_label?: string
    preferred_date?: string
    medical_center?: string
    details?: any
  }
  payment?: {
    amount_formatted: string
    payment_id: string
    status: string
    created_at: string
  }
  appointment_slip?: {
    available: boolean
    size_formatted?: string
    uploaded_at?: string
  }
}

export const UserDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadNotes, setUploadNotes] = useState('')

  const fetchUserProfile = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await userApi.getProfile()
      if (result.success) {
        setUser(result.data)
      } else {
        setError(result.error || 'Failed to load profile')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/auth/login?redirect=' + encodeURIComponent('/user/dashboard'))
      return
    }

    fetchUserProfile()
  }, [fetchUserProfile, navigate])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      navigate('/')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a PDF, JPEG, JPG, PNG, or GIF file.')
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB.')
        return
      }
      
      setSelectedFile(file)
    }
  }

  const handleUploadSubmit = async () => {
    if (!selectedFile) return

    setUploadLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('appointmentSlip', selectedFile)
      formData.append('notes', uploadNotes)
      formData.append('replaceExisting', 'true')

      const result = await uploadApi.appointmentSlip(formData)

      if (result.success) {
        alert('Appointment slip uploaded successfully!')
        setShowUploadModal(false)
        setSelectedFile(null)
        setUploadNotes('')
        await fetchUserProfile()
      } else {
        alert(result.error || 'Failed to upload appointment slip')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Network error. Please try again.')
    } finally {
      setUploadLoading(false)
    }
  }

  const handleDownloadSlip = async () => {
    if (!user?.user?.name) return

    try {
      const result = await userApi.downloadSlip()
      
      if (result.success && result.blob) {
        const url = window.URL.createObjectURL(result.blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `appointment_slip_${user.user.name.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        alert(result.error || 'Failed to download appointment slip')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Network error. Please try again.')
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Not available'
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      payment_pending: 'bg-gradient-to-r from-accent-yellow-100 to-accent-yellow-200 text-accent-yellow-800 border border-accent-yellow-300',
      processing: 'bg-gradient-to-r from-clinical-100 to-medical-100 text-medical-800 border border-medical-300',
      ready: 'bg-gradient-to-r from-accent-green-100 to-accent-green-200 text-accent-green-800 border border-accent-green-300',
      payment_failed: 'bg-gradient-to-r from-accent-red-100 to-accent-red-200 text-accent-red-800 border border-accent-red-300',
      unknown: 'bg-gradient-to-r from-health-100 to-health-200 text-health-800 border border-health-300'
    }
    return colors[status as keyof typeof colors] || colors.unknown
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'payment_pending':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'ready':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'payment_failed':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  if (loading) {
    return <PageLoader text="Loading Dashboard" subtext="Retrieving your medical appointment information..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button onClick={fetchUserProfile} className="btn-primary block w-full">
              Try Again
            </button>
            <Link to="/" className="btn-secondary block w-full">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-clinical-50 via-health-50 to-medical-50">
        {/* Medical Header */}
        <header className="bg-medical-600 text-white shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <Link to="/" className="flex items-center space-x-3 hover-lift">
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
                <div className="hidden md:block">
                  <span className="bg-medical-700 text-medical-100 px-3 py-1 rounded-full text-sm font-medium">
                    Patient Dashboard
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <nav className="hidden sm:flex space-x-6 text-sm">
                  <Link to="/" className="text-medical-100 hover:text-white transition-colors hover-lift">
                    Home
                  </Link>
                  <Link to="/book-appointment" className="text-medical-100 hover:text-white transition-colors hover-lift">
                    Book Appointment
                  </Link>
                </nav>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-medical-100">Welcome back</p>
                    <p className="font-semibold">{user.user.name}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-medical-700 hover:bg-medical-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover-lift"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Card */}
          <div className="mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {getStatusIcon(user.status.status)}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">
                      Application Status
                    </h2>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status.status)}`}>
                      {user.status.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{user.status.message}</p>
                  {user.status.next_steps && user.status.next_steps.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Next Steps:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {user.status.next_steps.map((step, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mr-2"></span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900">{user.user.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{user.user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900">{user.user.phone}</p>
                </div>
                {user.user.passport_number && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Passport Number</label>
                    <p className="text-gray-900">{user.user.passport_number}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Registration Date</label>
                  <p className="text-gray-900">{formatDateTime(user.user.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Appointment Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Appointment Type</label>
                  <p className="text-gray-900">
                    {user.appointment.type_label || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Preferred Date</label>
                  <p className="text-gray-900">{formatDate(user.appointment.preferred_date)}</p>
                </div>
                {user.appointment.medical_center && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Medical Center</label>
                    <p className="text-gray-900">
                      {user.appointment.medical_center.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                )}
                {user.appointment.details && Object.keys(user.appointment.details).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Additional Details</label>
                    <div className="mt-1 text-sm text-gray-600">
                      {user.appointment.details.special_requirements && (
                        <p><strong>Special Requirements:</strong> {user.appointment.details.special_requirements}</p>
                      )}
                      {user.appointment.details.emergency_contact && (
                        <p><strong>Emergency Contact:</strong> {user.appointment.details.emergency_contact}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            {user.payment && (
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Payment Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <p className="text-gray-900">{user.payment.amount_formatted}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment ID</label>
                    <p className="text-gray-900 font-mono text-sm">{user.payment.payment_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.payment.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Date</label>
                    <p className="text-gray-900">{formatDateTime(user.payment.created_at)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Appointment Slip */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Appointment Slip</h3>
              
              {user.appointment_slip && user.appointment_slip.available ? (
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-md">
                    <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">Appointment slip is ready</p>
                      <p className="text-sm text-green-600">
                        File size: {user.appointment_slip.size_formatted} • 
                        Uploaded: {formatDateTime(user.appointment_slip.uploaded_at)}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleDownloadSlip}
                    className="w-full btn-primary"
                  >
                    Download Appointment Slip
                  </button>

                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full btn-secondary"
                  >
                    Upload New Slip
                  </button>
                </div>
              ) : user.user.payment_status === 'completed' ? (
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">Processing your appointment</p>
                      <p className="text-sm text-blue-600">
                        Your appointment slip will be available within 24-48 hours
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full btn-secondary"
                  >
                    Upload Your Own Slip
                  </button>
                </div>
              ) : (
                <div className="flex items-center p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">Payment required</p>
                    <p className="text-sm text-yellow-600">
                      Complete your payment to access appointment slip
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            {user.user.payment_status === 'pending' && (
              <Link to="/payment" className="btn-primary px-8 py-3 text-center">
                Complete Payment
              </Link>
            )}
            <button
              onClick={fetchUserProfile}
              className="btn-secondary px-8 py-3"
            >
              Refresh Status
            </button>
            <Link to="/" className="btn-secondary px-8 py-3 text-center">
              Back to Home
            </Link>
          </div>
        </main>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Upload Appointment Slip
                  </h3>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select File (PDF, JPEG, JPG, PNG, GIF - Max 5MB)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      rows={3}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Add any notes about this appointment slip..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadSubmit}
                    disabled={!selectedFile || uploadLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadLoading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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