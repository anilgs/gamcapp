const User = require('../../../lib/models/User')

// Mock the database
const mockQuery = jest.fn()
const mockTransaction = jest.fn()
jest.mock('../../../lib/db', () => ({
  query: mockQuery,
  transaction: mockTransaction
}))

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Constructor', () => {
    test('should create User instance with provided data', () => {
      const userData = {
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+919876543210',
        passport_number: 'A1234567',
        appointment_details: { type: 'employment_visa' },
        payment_status: 'pending',
        payment_id: null,
        appointment_slip_path: null,
        created_at: new Date(),
        updated_at: new Date()
      }

      const user = new User(userData)

      expect(user.id).toBe(userData.id)
      expect(user.name).toBe(userData.name)
      expect(user.email).toBe(userData.email)
      expect(user.phone).toBe(userData.phone)
      expect(user.passport_number).toBe(userData.passport_number)
      expect(user.appointment_details).toEqual(userData.appointment_details)
      expect(user.payment_status).toBe(userData.payment_status)
    })
  })

  describe('Static Methods', () => {
    describe('create', () => {
      test('should create new user in database', async () => {
        const userData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+919876543210',
          passport_number: 'A1234567',
          appointment_details: { type: 'employment_visa' },
          payment_status: 'pending'
        }

        const mockResult = {
          rows: [{
            id: 'user123',
            ...userData,
            appointment_details: JSON.stringify(userData.appointment_details),
            created_at: new Date(),
            updated_at: new Date()
          }]
        }

        mockQuery.mockResolvedValue(mockResult)

        const user = await User.create(userData)

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO users'),
          [
            userData.name,
            userData.email,
            userData.phone,
            userData.passport_number,
            JSON.stringify(userData.appointment_details),
            userData.payment_status
          ]
        )
        expect(user).toBeInstanceOf(User)
        expect(user.id).toBe('user123')
        expect(user.name).toBe(userData.name)
      })

      test('should use default values for optional fields', async () => {
        const minimalUserData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+919876543210',
          passport_number: 'A1234567'
        }

        const mockResult = {
          rows: [{
            id: 'user123',
            ...minimalUserData,
            appointment_details: '{}',
            payment_status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
          }]
        }

        mockQuery.mockResolvedValue(mockResult)

        const user = await User.create(minimalUserData)

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO users'),
          expect.arrayContaining([
            minimalUserData.name,
            minimalUserData.email,
            minimalUserData.phone,
            minimalUserData.passport_number,
            '{}', // Default empty appointment_details
            'pending' // Default payment_status
          ])
        )
        expect(user.payment_status).toBe('pending')
      })

      test('should throw error on database failure', async () => {
        const userData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+919876543210',
          passport_number: 'A1234567'
        }

        mockQuery.mockRejectedValue(new Error('Database error'))

        await expect(User.create(userData)).rejects.toThrow('Database error')
      })
    })

    describe('findById', () => {
      test('should find user by ID', async () => {
        const mockUserData = {
          id: 'user123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+919876543210',
          appointment_details: { type: 'employment_visa' },
          payment_status: 'pending'
        }

        mockQuery.mockResolvedValue({ rows: [mockUserData] })

        const user = await User.findById('user123')

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE id = $1',
          ['user123']
        )
        expect(user).toBeInstanceOf(User)
        expect(user.id).toBe('user123')
        expect(user.name).toBe('John Doe')
      })

      test('should return null if user not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] })

        const user = await User.findById('nonexistent')

        expect(user).toBeNull()
      })

      test('should throw error on database failure', async () => {
        mockQuery.mockRejectedValue(new Error('Database error'))

        await expect(User.findById('user123')).rejects.toThrow('Database error')
      })
    })

    describe('findByEmail', () => {
      test('should find user by email', async () => {
        const mockUserData = {
          id: 'user123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+919876543210'
        }

        mockQuery.mockResolvedValue({ rows: [mockUserData] })

        const user = await User.findByEmail('john@example.com')

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE email = $1',
          ['john@example.com']
        )
        expect(user).toBeInstanceOf(User)
        expect(user.email).toBe('john@example.com')
      })

      test('should return null if user not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] })

        const user = await User.findByEmail('nonexistent@example.com')

        expect(user).toBeNull()
      })
    })

    describe('findByPhone', () => {
      test('should find user by phone', async () => {
        const mockUserData = {
          id: 'user123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+919876543210'
        }

        mockQuery.mockResolvedValue({ rows: [mockUserData] })

        const user = await User.findByPhone('+919876543210')

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE phone = $1',
          ['+919876543210']
        )
        expect(user).toBeInstanceOf(User)
        expect(user.phone).toBe('+919876543210')
      })
    })

    describe('findAll', () => {
      test('should return paginated users with no filters', async () => {
        const mockUsers = [
          { id: 'user1', name: 'User 1', email: 'user1@example.com' },
          { id: 'user2', name: 'User 2', email: 'user2@example.com' }
        ]

        mockQuery
          .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Count query
          .mockResolvedValueOnce({ rows: mockUsers }) // Data query

        const result = await User.findAll(1, 10)

        expect(result.users).toHaveLength(2)
        expect(result.users[0]).toBeInstanceOf(User)
        expect(result.pagination).toEqual({
          page: 1,
          limit: 10,
          totalCount: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        })
      })

      test('should apply payment status filter', async () => {
        const mockUsers = [
          { id: 'user1', name: 'User 1', payment_status: 'completed' }
        ]

        mockQuery
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: mockUsers })

        const result = await User.findAll(1, 10, { payment_status: 'completed' })

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('WHERE payment_status = $1'),
          ['completed']
        )
        expect(result.users).toHaveLength(1)
      })

      test('should apply search filter', async () => {
        const mockUsers = [
          { id: 'user1', name: 'John Doe', email: 'john@example.com' }
        ]

        mockQuery
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: mockUsers })

        const result = await User.findAll(1, 10, { search: 'john' })

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1'),
          ['%john%']
        )
      })

      test('should handle pagination correctly', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ count: '25' }] })
          .mockResolvedValueOnce({ rows: [] })

        const result = await User.findAll(2, 10) // Page 2 of 3

        expect(result.pagination).toEqual({
          page: 2,
          limit: 10,
          totalCount: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: true
        })

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT $1 OFFSET $2'),
          [10, 10] // OFFSET = (page - 1) * limit
        )
      })
    })

    describe('getDashboardData', () => {
      test('should return user dashboard data', async () => {
        const mockDashboardData = {
          id: 'user123',
          name: 'John Doe',
          payment_status: 'completed',
          appointment_slip_filename: 'slip.pdf'
        }

        mockQuery.mockResolvedValue({ rows: [mockDashboardData] })

        const result = await User.getDashboardData('user123')

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM user_dashboard_view WHERE id = $1',
          ['user123']
        )
        expect(result).toEqual(mockDashboardData)
      })

      test('should return null if user not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] })

        const result = await User.getDashboardData('nonexistent')

        expect(result).toBeNull()
      })
    })

    describe('getAdminDashboardData', () => {
      test('should return admin dashboard data with pagination', async () => {
        const mockAdminData = [
          { id: 'user1', name: 'User 1', payment_status: 'completed' },
          { id: 'user2', name: 'User 2', payment_status: 'pending' }
        ]

        mockQuery
          .mockResolvedValueOnce({ rows: [{ count: '2' }] })
          .mockResolvedValueOnce({ rows: mockAdminData })

        const result = await User.getAdminDashboardData(1, 10)

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM admin_dashboard_view'),
          expect.any(Array)
        )
        expect(result.users).toEqual(mockAdminData)
        expect(result.pagination.totalCount).toBe(2)
      })
    })
  })

  describe('Instance Methods', () => {
    let user

    beforeEach(() => {
      user = new User({
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+919876543210',
        passport_number: 'A1234567',
        appointment_details: { type: 'employment_visa' },
        payment_status: 'pending'
      })
    })

    describe('update', () => {
      test('should update allowed fields', async () => {
        const updateData = {
          name: 'Jane Doe',
          email: 'jane@example.com',
          payment_status: 'completed'
        }

        const mockResult = {
          rows: [{
            ...user,
            ...updateData
          }]
        }

        mockQuery.mockResolvedValue(mockResult)

        const updatedUser = await user.update(updateData)

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE users SET'),
          expect.arrayContaining(['Jane Doe', 'jane@example.com', 'completed', 'user123'])
        )
        expect(updatedUser.name).toBe('Jane Doe')
        expect(updatedUser.email).toBe('jane@example.com')
      })

      test('should handle appointment_details JSON serialization', async () => {
        const updateData = {
          appointment_details: { type: 'family_visa', center: 'mumbai' }
        }

        mockQuery.mockResolvedValue({
          rows: [{ ...user, appointment_details: updateData.appointment_details }]
        })

        await user.update(updateData)

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('appointment_details = $1'),
          expect.arrayContaining([JSON.stringify(updateData.appointment_details), 'user123'])
        )
      })

      test('should ignore non-allowed fields', async () => {
        const updateData = {
          name: 'Jane Doe',
          id: 'hacker_attempt', // Not allowed
          created_at: new Date() // Not allowed
        }

        mockQuery.mockResolvedValue({
          rows: [{ ...user, name: 'Jane Doe' }]
        })

        await user.update(updateData)

        const queryCall = mockQuery.mock.calls[0]
        expect(queryCall[0]).not.toContain('id =')
        expect(queryCall[0]).not.toContain('created_at =')
        expect(queryCall[0]).toContain('name =')
      })

      test('should throw error for no valid fields', async () => {
        const updateData = {
          invalid_field: 'value'
        }

        await expect(user.update(updateData)).rejects.toThrow('No valid fields to update')
      })

      test('should throw error if user not found', async () => {
        const updateData = { name: 'Jane Doe' }
        mockQuery.mockResolvedValue({ rows: [] })

        await expect(user.update(updateData)).rejects.toThrow('User not found')
      })
    })

    describe('updatePaymentStatus', () => {
      test('should update payment status and ID', async () => {
        const mockResult = {
          rows: [{
            ...user,
            payment_status: 'completed',
            payment_id: 'pay_123'
          }]
        }

        mockQuery.mockResolvedValue(mockResult)

        const updatedUser = await user.updatePaymentStatus('completed', 'pay_123')

        expect(mockQuery).toHaveBeenCalledWith(
          'UPDATE users SET payment_status = $1, payment_id = $2 WHERE id = $3 RETURNING *',
          ['completed', 'pay_123', 'user123']
        )
        expect(updatedUser.payment_status).toBe('completed')
        expect(updatedUser.payment_id).toBe('pay_123')
      })

      test('should handle null payment ID', async () => {
        mockQuery.mockResolvedValue({
          rows: [{ ...user, payment_status: 'failed', payment_id: null }]
        })

        await user.updatePaymentStatus('failed')

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          ['failed', null, 'user123']
        )
      })
    })

    describe('updateAppointmentSlip', () => {
      test('should update appointment slip path', async () => {
        const slipPath = '/uploads/slip_123.pdf'
        
        mockQuery.mockResolvedValue({
          rows: [{ ...user, appointment_slip_path: slipPath }]
        })

        const updatedUser = await user.updateAppointmentSlip(slipPath)

        expect(mockQuery).toHaveBeenCalledWith(
          'UPDATE users SET appointment_slip_path = $1 WHERE id = $2 RETURNING *',
          [slipPath, 'user123']
        )
        expect(updatedUser.appointment_slip_path).toBe(slipPath)
      })
    })

    describe('delete', () => {
      test('should delete user from database', async () => {
        mockQuery.mockResolvedValue({ rows: [user] })

        const result = await user.delete()

        expect(mockQuery).toHaveBeenCalledWith(
          'DELETE FROM users WHERE id = $1 RETURNING *',
          ['user123']
        )
        expect(result).toBe(true)
      })

      test('should throw error if user not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] })

        await expect(user.delete()).rejects.toThrow('User not found')
      })
    })

    describe('toJSON', () => {
      test('should return clean JSON object', () => {
        const json = user.toJSON()

        expect(json).toEqual({
          id: 'user123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+919876543210',
          passport_number: 'A1234567',
          appointment_details: { type: 'employment_visa' },
          payment_status: 'pending',
          payment_id: undefined,
          appointment_slip_path: undefined,
          created_at: undefined,
          updated_at: undefined
        })
      })
    })
  })
})