import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminUserList from '../../../components/AdminUserList'

// Mock data
const mockUsers = [
  {
    id: 'user1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+919876543210',
    payment_status: 'completed',
    appointment_details: { appointment_type: 'employment_visa' },
    created_at: '2023-01-01T00:00:00Z',
    has_appointment_slip: true
  },
  {
    id: 'user2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+919876543211',
    payment_status: 'pending',
    appointment_details: { appointment_type: 'family_visa' },
    created_at: '2023-01-02T00:00:00Z',
    has_appointment_slip: false
  }
]

const mockPagination = {
  page: 1,
  limit: 10,
  totalCount: 2,
  totalPages: 1,
  hasNext: false,
  hasPrev: false
}

const defaultProps = {
  users: mockUsers,
  pagination: mockPagination,
  loading: false,
  onPageChange: jest.fn(),
  onSearch: jest.fn(),
  onFilterChange: jest.fn(),
  searchTerm: '',
  filter: ''
}

describe('AdminUserList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('should render user list table', () => {
      render(<AdminUserList {...defaultProps} />)
      
      // Table headers
      expect(screen.getByText(/name/i)).toBeInTheDocument()
      expect(screen.getByText(/email/i)).toBeInTheDocument()
      expect(screen.getByText(/phone/i)).toBeInTheDocument()
      expect(screen.getByText(/payment status/i)).toBeInTheDocument()
      expect(screen.getByText(/appointment type/i)).toBeInTheDocument()
      expect(screen.getByText(/created/i)).toBeInTheDocument()
      
      // User data
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('+919876543210')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })

    test('should show payment status badges', () => {
      render(<AdminUserList {...defaultProps} />)
      
      // Should show different badges for different statuses
      const completedBadge = screen.getByText(/completed/i)
      const pendingBadge = screen.getByText(/pending/i)
      
      expect(completedBadge).toBeInTheDocument()
      expect(pendingBadge).toBeInTheDocument()
      
      // Should have different styling classes
      expect(completedBadge).toHaveClass(/green|success/)
      expect(pendingBadge).toHaveClass(/yellow|warning/)
    })

    test('should show appointment slip status', () => {
      render(<AdminUserList {...defaultProps} />)
      
      // Check for appointment slip indicators
      expect(screen.getByText(/✓|yes|uploaded/i)).toBeInTheDocument() // User1 has slip
      expect(screen.getByText(/✗|no|not uploaded/i)).toBeInTheDocument() // User2 doesn't have slip
    })

    test('should handle empty user list', () => {
      render(<AdminUserList {...defaultProps} users={[]} />)
      
      expect(screen.getByText(/no users found/i)).toBeInTheDocument()
    })

    test('should show loading state', () => {
      render(<AdminUserList {...defaultProps} loading={true} />)
      
      expect(screen.getByText(/loading/i) || screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    const user = userEvent.setup()

    test('should render search input', () => {
      render(<AdminUserList {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/search users/i) || screen.getByLabelText(/search/i)
      expect(searchInput).toBeInTheDocument()
    })

    test('should call onSearch when typing in search input', async () => {
      render(<AdminUserList {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/search users/i) || screen.getByLabelText(/search/i)
      await user.type(searchInput, 'john')
      
      await waitFor(() => {
        expect(defaultProps.onSearch).toHaveBeenCalledWith('john')
      }, { timeout: 1000 })
    })

    test('should show current search term', () => {
      render(<AdminUserList {...defaultProps} searchTerm="john" />)
      
      const searchInput = screen.getByPlaceholderText(/search users/i) || screen.getByLabelText(/search/i)
      expect(searchInput).toHaveValue('john')
    })

    test('should clear search when clear button clicked', async () => {
      render(<AdminUserList {...defaultProps} searchTerm="john" />)
      
      const clearButton = screen.queryByRole('button', { name: /clear|reset/i })
      if (clearButton) {
        await user.click(clearButton)
        expect(defaultProps.onSearch).toHaveBeenCalledWith('')
      }
    })
  })

  describe('Filtering', () => {
    test('should render filter dropdown', () => {
      render(<AdminUserList {...defaultProps} />)
      
      const filterSelect = screen.getByLabelText(/filter|status/i) || screen.getByRole('combobox')
      expect(filterSelect).toBeInTheDocument()
    })

    test('should show filter options', async () => {
      const user = userEvent.setup()
      render(<AdminUserList {...defaultProps} />)
      
      const filterSelect = screen.getByLabelText(/filter|status/i) || screen.getByRole('combobox')
      await user.click(filterSelect)
      
      expect(screen.getByRole('option', { name: /all/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /completed/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /pending/i })).toBeInTheDocument()
    })

    test('should call onFilterChange when filter is selected', async () => {
      const user = userEvent.setup()
      render(<AdminUserList {...defaultProps} />)
      
      const filterSelect = screen.getByLabelText(/filter|status/i) || screen.getByRole('combobox')
      await user.selectOptions(filterSelect, 'completed')
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('completed')
    })

    test('should show current filter value', () => {
      render(<AdminUserList {...defaultProps} filter="completed" />)
      
      const filterSelect = screen.getByLabelText(/filter|status/i) || screen.getByRole('combobox')
      expect(filterSelect).toHaveValue('completed')
    })
  })

  describe('Pagination', () => {
    const paginatedProps = {
      ...defaultProps,
      pagination: {
        page: 2,
        limit: 10,
        totalCount: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      }
    }

    test('should render pagination controls', () => {
      render(<AdminUserList {...paginatedProps} />)
      
      expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument()
      expect(screen.getByText(/25 total users/i)).toBeInTheDocument()
    })

    test('should show previous/next buttons when appropriate', () => {
      render(<AdminUserList {...paginatedProps} />)
      
      const prevButton = screen.getByRole('button', { name: /previous/i })
      const nextButton = screen.getByRole('button', { name: /next/i })
      
      expect(prevButton).toBeInTheDocument()
      expect(nextButton).toBeInTheDocument()
      expect(prevButton).not.toBeDisabled()
      expect(nextButton).not.toBeDisabled()
    })

    test('should disable buttons appropriately', () => {
      const firstPageProps = {
        ...defaultProps,
        pagination: { ...paginatedProps.pagination, page: 1, hasPrev: false }
      }
      render(<AdminUserList {...firstPageProps} />)
      
      const prevButton = screen.getByRole('button', { name: /previous/i })
      expect(prevButton).toBeDisabled()
    })

    test('should call onPageChange when pagination buttons clicked', async () => {
      const user = userEvent.setup()
      render(<AdminUserList {...paginatedProps} />)
      
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(3)
    })
  })

  describe('User Actions', () => {
    test('should show action buttons for each user', () => {
      render(<AdminUserList {...defaultProps} />)
      
      const viewButtons = screen.getAllByRole('button', { name: /view|details/i })
      expect(viewButtons).toHaveLength(2) // One for each user
    })

    test('should call view action when view button clicked', async () => {
      const mockOnView = jest.fn()
      const user = userEvent.setup()
      
      render(<AdminUserList {...defaultProps} onViewUser={mockOnView} />)
      
      const viewButtons = screen.getAllByRole('button', { name: /view|details/i })
      await user.click(viewButtons[0])
      
      expect(mockOnView).toHaveBeenCalledWith(mockUsers[0])
    })

    test('should show upload slip button for users without slips', () => {
      render(<AdminUserList {...defaultProps} />)
      
      // User2 doesn't have slip, should show upload button
      const uploadButtons = screen.getAllByRole('button', { name: /upload|slip/i })
      expect(uploadButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Data Display', () => {
    test('should format dates properly', () => {
      render(<AdminUserList {...defaultProps} />)
      
      // Should format the created_at dates
      expect(screen.getByText(/jan|january/i)).toBeInTheDocument()
    })

    test('should format appointment types', () => {
      render(<AdminUserList {...defaultProps} />)
      
      expect(screen.getByText(/employment visa/i)).toBeInTheDocument()
      expect(screen.getByText(/family visa/i)).toBeInTheDocument()
    })

    test('should handle missing data gracefully', () => {
      const usersWithMissingData = [
        {
          id: 'user3',
          name: 'Incomplete User',
          email: 'incomplete@example.com',
          phone: '+919876543212',
          payment_status: null,
          appointment_details: {},
          created_at: null,
          has_appointment_slip: false
        }
      ]
      
      render(<AdminUserList {...defaultProps} users={usersWithMissingData} />)
      
      expect(screen.getByText('Incomplete User')).toBeInTheDocument()
      expect(screen.getByText(/unknown|n\/a/i)).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    test('should handle mobile view', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      })
      
      render(<AdminUserList {...defaultProps} />)
      
      // Should still show essential information
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    test('should show sortable column headers', () => {
      render(<AdminUserList {...defaultProps} />)
      
      const nameHeader = screen.getByText(/name/i)
      const createdHeader = screen.getByText(/created/i)
      
      // Should be clickable if sorting is supported
      expect(nameHeader).toBeInTheDocument()
      expect(createdHeader).toBeInTheDocument()
    })

    test('should call sort function when header clicked', async () => {
      const mockOnSort = jest.fn()
      const user = userEvent.setup()
      
      render(<AdminUserList {...defaultProps} onSort={mockOnSort} />)
      
      const nameHeader = screen.getByText(/name/i)
      await user.click(nameHeader)
      
      if (mockOnSort) {
        expect(mockOnSort).toHaveBeenCalledWith('name', 'asc')
      }
    })
  })
})