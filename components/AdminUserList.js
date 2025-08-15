import { useState } from 'react'

export default function AdminUserList({ 
  users, 
  loading, 
  onUploadSlip, 
  onViewDetails, 
  onRefresh 
}) {
  const [uploadingUserId, setUploadingUserId] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadNotes, setUploadNotes] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amountInPaise) => {
    if (!amountInPaise) return 'N/A'
    const rupees = amountInPaise / 100
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(rupees)
  }

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getAppointmentTypeLabel = (type) => {
    const labels = {
      employment_visa: 'Employment Visa',
      family_visa: 'Family Visa',
      visit_visa: 'Visit Visa',
      student_visa: 'Student Visa',
      business_visa: 'Business Visa',
      other: 'Other'
    }
    return labels[type] || type
  }

  const handleUploadClick = (userId) => {
    setCurrentUserId(userId)
    setShowUploadModal(true)
    setSelectedFile(null)
    setUploadNotes('')
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a PDF, JPEG, JPG, or PNG file.')
        return
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB.')
        return
      }
      
      setSelectedFile(file)
    }
  }

  const handleUploadSubmit = async () => {
    if (!selectedFile || !currentUserId) return

    setUploadingUserId(currentUserId)
    
    try {
      const formData = new FormData()
      formData.append('appointmentSlip', selectedFile)
      formData.append('userId', currentUserId)
      formData.append('notes', uploadNotes)

      await onUploadSlip(formData)
      
      // Close modal and reset state
      setShowUploadModal(false)
      setSelectedFile(null)
      setUploadNotes('')
      setCurrentUserId(null)
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploadingUserId(null)
    }
  }

  const handleDownloadSlip = (user) => {
    if (user.appointment_slip_path) {
      // Create download link
      const link = document.createElement('a')
      link.href = `/api/admin/download-slip?userId=${user.id}`
      link.download = `appointment_slip_${user.name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No users match your current filters.
          </p>
          <div className="mt-6">
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <div className="ml-2">
                          {getPaymentStatusBadge(user.payment_status)}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <p className="truncate">{user.email}</p>
                        <span className="mx-2">•</span>
                        <p>{user.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onViewDetails(user)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      View Details
                    </button>
                    {user.payment_status === 'completed' && (
                      <>
                        {user.appointment_slip_path ? (
                          <button
                            onClick={() => handleDownloadSlip(user)}
                            className="inline-flex items-center px-3 py-1 border border-green-300 shadow-sm text-xs font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
                          >
                            Download Slip
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUploadClick(user.id)}
                            disabled={uploadingUserId === user.id}
                            className="inline-flex items-center px-3 py-1 border border-primary-300 shadow-sm text-xs font-medium rounded-md text-primary-700 bg-primary-50 hover:bg-primary-100 disabled:opacity-50"
                          >
                            {uploadingUserId === user.id ? 'Uploading...' : 'Upload Slip'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Appointment Type
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user.appointment_details?.appointment_type 
                        ? getAppointmentTypeLabel(user.appointment_details.appointment_type)
                        : 'Not specified'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Payment Amount
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user.payment_info?.amount 
                        ? formatAmount(user.payment_info.amount)
                        : 'N/A'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Created
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(user.created_at)}
                    </dd>
                  </div>
                </div>

                {user.appointment_details?.preferred_date && (
                  <div className="mt-3">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Preferred Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(user.appointment_details.preferred_date)}
                    </dd>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Upload Appointment Slip
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File (PDF, JPEG, JPG, PNG - Max 5MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
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
                  disabled={!selectedFile || uploadingUserId}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingUserId ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
