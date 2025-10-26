import React, { useState, useEffect, useCallback } from 'react'
import { adminApi, handleApiError } from '@/lib/api'

interface PendingPayment {
  id: string
  user_id: string
  customer_name: string
  email: string
  phone: string
  payment_status: string
  payment_method: string
  payment_amount: number
  payment_reference: string
  appointment_type: string
  appointment_date: string
  created_at: string
  updated_at: string
}

interface PaymentPagination {
  current_page: number
  total_pages: number
  total_records: number
  per_page: number
  has_prev: boolean
  has_next: boolean
}

type PaymentFilter = 'all' | 'pending'

export const AdminPaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [pagination, setPagination] = useState<PaymentPagination>({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    per_page: 20,
    has_prev: false,
    has_next: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('pending')

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const fetchPayments = useCallback(async (page = pagination.current_page, filter = paymentFilter) => {
    setLoading(true)
    setError('')

    try {
      const result = await adminApi.getPendingPayments({
        page: page.toString(),
        limit: pagination.per_page.toString(),
        status_filter: filter
      })

      if (result.success && result.data) {
        setPayments(result.data.payments)
        setPagination(result.data.pagination)
      } else {
        setError(result.error || 'Failed to fetch payments')
      }
    } catch (error: unknown) {
      console.error('Error fetching payments:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [pagination.current_page, pagination.per_page, paymentFilter])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleMarkComplete = (payment: PendingPayment) => {
    setSelectedPayment(payment)
    setShowConfirmModal(true)
    setAdminNotes('')
  }

  const confirmMarkComplete = async () => {
    if (!selectedPayment) return

    setProcessingPayment(selectedPayment.id)
    setError('')
    setSuccessMessage('')

    try {
      const result = await adminApi.markPaymentComplete(selectedPayment.id, adminNotes)

      if (result.success) {
        setSuccessMessage(`Payment marked as complete for ${selectedPayment.customer_name}`)
        setShowConfirmModal(false)
        setSelectedPayment(null)
        setAdminNotes('')
        
        // Refresh the payments list
        await fetchPayments()
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000)
      } else {
        setError(result.error || 'Failed to mark payment as complete')
      }
    } catch (error: unknown) {
      console.error('Error marking payment complete:', error)
      setError(handleApiError(error))
    } finally {
      setProcessingPayment(null)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({
      ...prev,
      current_page: newPage
    }))
    fetchPayments(newPage)
  }

  const handleFilterChange = (newFilter: PaymentFilter) => {
    setPaymentFilter(newFilter)
    setPagination(prev => ({
      ...prev,
      current_page: 1
    }))
    fetchPayments(1, newFilter)
  }

  if (loading && payments.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Payment Management ({pagination.total_records})
          </h3>
          <div className="flex items-center space-x-3">
            {/* Filter Dropdown */}
            <select
              value={paymentFilter}
              onChange={(e) => handleFilterChange(e.target.value as PaymentFilter)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="pending">Pending Payments</option>
              <option value="all">All Payments</option>
            </select>
            
            <button
              onClick={() => fetchPayments()}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md mb-4">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {payments.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {paymentFilter === 'pending' ? 'No pending payments' : 'No payments found'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {paymentFilter === 'pending' ? 'All payments have been processed.' : 'No payment records are available.'}
            </p>
          </div>
        ) : (
          <>
            {/* Payments Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.customer_name}
                          </div>
                          <div className="text-sm text-gray-500">{payment.email}</div>
                          <div className="text-sm text-gray-500">{payment.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatAmount(payment.payment_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.payment_method || 'UPI'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.payment_status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : payment.payment_status === 'pending_confirmation'
                            ? 'bg-orange-100 text-orange-800'
                            : payment.payment_status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.payment_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 max-w-32 truncate" title={payment.payment_reference}>
                          {payment.payment_reference || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(payment.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Complete Payment - only show for pending payments */}
                          {(payment.payment_status === 'pending' || payment.payment_status === 'pending_confirmation') && (
                            <button
                              onClick={() => handleMarkComplete(payment)}
                              disabled={processingPayment === payment.id}
                              className="inline-flex items-center p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={processingPayment === payment.id ? 'Processing...' : 'Mark Payment Complete'}
                            >
                              {processingPayment === payment.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={!pagination.has_prev}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={!pagination.has_next}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {((pagination.current_page - 1) * pagination.per_page) + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.current_page * pagination.per_page, pagination.total_records)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{pagination.total_records}</span>{' '}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={!pagination.has_prev}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                        const pageNum = Math.max(1, pagination.current_page - 2) + i
                        if (pageNum > pagination.total_pages) return null
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNum === pagination.current_page
                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      
                      <button
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                        disabled={!pagination.has_next}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirm Payment Completion
                </h3>
                <button
                  onClick={() => {
                    setShowConfirmModal(false)
                    setSelectedPayment(null)
                    setAdminNotes('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={processingPayment !== null}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to mark the payment as complete for:
                </p>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="font-medium text-gray-900">{selectedPayment.customer_name}</p>
                  <p className="text-sm text-gray-600">{selectedPayment.email}</p>
                  <p className="text-sm text-gray-600">Amount: {formatAmount(selectedPayment.payment_amount)}</p>
                  <p className="text-sm text-gray-600">Reference: {selectedPayment.payment_reference || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes about this payment verification..."
                    rows={3}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false)
                    setSelectedPayment(null)
                    setAdminNotes('')
                  }}
                  disabled={processingPayment !== null}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMarkComplete}
                  disabled={processingPayment !== null}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {processingPayment ? 'Processing...' : 'Mark Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}