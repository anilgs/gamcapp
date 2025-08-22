const Admin = require('../../../lib/models/Admin')

// Mock the database
const mockQuery = jest.fn()
jest.mock('../../../lib/db', () => ({
  query: mockQuery
}))

// Mock bcryptjs
const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn()
}
jest.mock('bcryptjs', () => mockBcrypt)

describe('Admin Model', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Constructor', () => {
    test('should create Admin instance with provided data', () => {
      const adminData = {
        id: 'admin123',
        username: 'admin',
        password_hash: 'hashedpassword',
        created_at: new Date(),
        updated_at: new Date()
      }

      const admin = new Admin(adminData)

      expect(admin.id).toBe(adminData.id)
      expect(admin.username).toBe(adminData.username)
      expect(admin.password_hash).toBe(adminData.password_hash)
      expect(admin.created_at).toBe(adminData.created_at)
      expect(admin.updated_at).toBe(adminData.updated_at)
    })
  })

  describe('Static Methods', () => {
    describe('create', () => {
      test('should create new admin with hashed password', async () => {
        const adminData = {
          username: 'newadmin',
          password: 'plainpassword'
        }

        const hashedPassword = 'hashed_password_123'
        mockBcrypt.hash.mockResolvedValue(hashedPassword)

        const mockResult = {
          rows: [{
            id: 'admin123',
            username: adminData.username,
            password_hash: hashedPassword,
            created_at: new Date(),
            updated_at: new Date()
          }]
        }

        mockQuery.mockResolvedValue(mockResult)

        const admin = await Admin.create(adminData)

        expect(mockBcrypt.hash).toHaveBeenCalledWith('plainpassword', 12)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO admins'),
          [adminData.username, hashedPassword]
        )
        expect(admin).toBeInstanceOf(Admin)
        expect(admin.username).toBe(adminData.username)
        expect(admin.password_hash).toBe(hashedPassword)
      })

      test('should throw error on database failure', async () => {
        const adminData = {
          username: 'newadmin',
          password: 'plainpassword'
        }

        mockBcrypt.hash.mockResolvedValue('hashed_password')
        mockQuery.mockRejectedValue(new Error('Database error'))

        await expect(Admin.create(adminData)).rejects.toThrow('Database error')
      })

      test('should throw error on bcrypt failure', async () => {
        const adminData = {
          username: 'newadmin',
          password: 'plainpassword'
        }

        mockBcrypt.hash.mockRejectedValue(new Error('Hashing failed'))

        await expect(Admin.create(adminData)).rejects.toThrow('Hashing failed')
      })
    })

    describe('findById', () => {
      test('should find admin by ID', async () => {
        const mockAdminData = {
          id: 'admin123',
          username: 'admin',
          password_hash: 'hashed_password',
          created_at: new Date(),
          updated_at: new Date()
        }

        mockQuery.mockResolvedValue({ rows: [mockAdminData] })

        const admin = await Admin.findById('admin123')

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM admins WHERE id = $1',
          ['admin123']
        )
        expect(admin).toBeInstanceOf(Admin)
        expect(admin.id).toBe('admin123')
        expect(admin.username).toBe('admin')
      })

      test('should return null if admin not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] })

        const admin = await Admin.findById('nonexistent')

        expect(admin).toBeNull()
      })

      test('should throw error on database failure', async () => {
        mockQuery.mockRejectedValue(new Error('Database error'))

        await expect(Admin.findById('admin123')).rejects.toThrow('Database error')
      })
    })

    describe('findByUsername', () => {
      test('should find admin by username', async () => {
        const mockAdminData = {
          id: 'admin123',
          username: 'admin',
          password_hash: 'hashed_password',
          created_at: new Date()
        }

        mockQuery.mockResolvedValue({ rows: [mockAdminData] })

        const admin = await Admin.findByUsername('admin')

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM admins WHERE username = $1',
          ['admin']
        )
        expect(admin).toBeInstanceOf(Admin)
        expect(admin.username).toBe('admin')
      })

      test('should return null if admin not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] })

        const admin = await Admin.findByUsername('nonexistent')

        expect(admin).toBeNull()
      })

      test('should handle case sensitivity', async () => {
        mockQuery.mockResolvedValue({ rows: [] })

        await Admin.findByUsername('ADMIN')

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM admins WHERE username = $1',
          ['ADMIN'] // Should pass through as-is (case sensitive)
        )
      })
    })

    describe('findAll', () => {
      test('should return all admins with pagination', async () => {
        const mockAdmins = [
          { id: 'admin1', username: 'admin1', password_hash: 'hash1' },
          { id: 'admin2', username: 'admin2', password_hash: 'hash2' }
        ]

        mockQuery
          .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // Count query
          .mockResolvedValueOnce({ rows: mockAdmins }) // Data query

        const result = await Admin.findAll(1, 10)

        expect(result.admins).toHaveLength(2)
        expect(result.admins[0]).toBeInstanceOf(Admin)
        expect(result.pagination).toEqual({
          page: 1,
          limit: 10,
          totalCount: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        })
      })

      test('should handle pagination correctly', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ count: '25' }] })
          .mockResolvedValueOnce({ rows: [] })

        const result = await Admin.findAll(2, 10)

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
  })

  describe('Instance Methods', () => {
    let admin

    beforeEach(() => {
      admin = new Admin({
        id: 'admin123',
        username: 'admin',
        password_hash: 'hashed_password_123',
        created_at: new Date(),
        updated_at: new Date()
      })
    })

    describe('validatePassword', () => {
      test('should validate correct password', async () => {
        const plainPassword = 'admin123'
        mockBcrypt.compare.mockResolvedValue(true)

        const isValid = await admin.validatePassword(plainPassword)

        expect(mockBcrypt.compare).toHaveBeenCalledWith(plainPassword, 'hashed_password_123')
        expect(isValid).toBe(true)
      })

      test('should reject incorrect password', async () => {
        const wrongPassword = 'wrongpassword'
        mockBcrypt.compare.mockResolvedValue(false)

        const isValid = await admin.validatePassword(wrongPassword)

        expect(mockBcrypt.compare).toHaveBeenCalledWith(wrongPassword, 'hashed_password_123')
        expect(isValid).toBe(false)
      })

      test('should throw error on bcrypt failure', async () => {
        mockBcrypt.compare.mockRejectedValue(new Error('Comparison failed'))

        await expect(admin.validatePassword('password')).rejects.toThrow('Comparison failed')
      })
    })

    describe('updatePassword', () => {
      test('should update password with new hash', async () => {
        const newPassword = 'newpassword123'
        const newHash = 'new_hashed_password'

        mockBcrypt.hash.mockResolvedValue(newHash)
        mockQuery.mockResolvedValue({
          rows: [{
            ...admin,
            password_hash: newHash,
            updated_at: new Date()
          }]
        })

        const updatedAdmin = await admin.updatePassword(newPassword)

        expect(mockBcrypt.hash).toHaveBeenCalledWith(newPassword, 12)
        expect(mockQuery).toHaveBeenCalledWith(
          'UPDATE admins SET password_hash = $1 WHERE id = $2 RETURNING *',
          [newHash, 'admin123']
        )
        expect(updatedAdmin.password_hash).toBe(newHash)
      })

      test('should throw error if admin not found during update', async () => {
        const newPassword = 'newpassword123'
        mockBcrypt.hash.mockResolvedValue('new_hash')
        mockQuery.mockResolvedValue({ rows: [] })

        await expect(admin.updatePassword(newPassword)).rejects.toThrow('Admin not found')
      })
    })

    describe('update', () => {
      test('should update allowed fields', async () => {
        const updateData = {
          username: 'newadmin'
        }

        const mockResult = {
          rows: [{
            ...admin,
            username: 'newadmin',
            updated_at: new Date()
          }]
        }

        mockQuery.mockResolvedValue(mockResult)

        const updatedAdmin = await admin.update(updateData)

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE admins SET username = $1'),
          ['newadmin', 'admin123']
        )
        expect(updatedAdmin.username).toBe('newadmin')
      })

      test('should ignore non-allowed fields', async () => {
        const updateData = {
          username: 'newadmin',
          id: 'hacker_attempt', // Not allowed
          created_at: new Date() // Not allowed
        }

        mockQuery.mockResolvedValue({
          rows: [{ ...admin, username: 'newadmin' }]
        })

        await admin.update(updateData)

        const queryCall = mockQuery.mock.calls[0]
        expect(queryCall[0]).not.toContain('id =')
        expect(queryCall[0]).not.toContain('created_at =')
        expect(queryCall[0]).toContain('username =')
      })

      test('should throw error for no valid fields', async () => {
        const updateData = {
          invalid_field: 'value'
        }

        await expect(admin.update(updateData)).rejects.toThrow('No valid fields to update')
      })
    })

    describe('delete', () => {
      test('should delete admin from database', async () => {
        mockQuery.mockResolvedValue({ rows: [admin] })

        const result = await admin.delete()

        expect(mockQuery).toHaveBeenCalledWith(
          'DELETE FROM admins WHERE id = $1 RETURNING *',
          ['admin123']
        )
        expect(result).toBe(true)
      })

      test('should throw error if admin not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] })

        await expect(admin.delete()).rejects.toThrow('Admin not found')
      })
    })

    describe('toJSON', () => {
      test('should return clean JSON object without password', () => {
        const json = admin.toJSON()

        expect(json).toEqual({
          id: 'admin123',
          username: 'admin',
          created_at: admin.created_at,
          updated_at: admin.updated_at
        })

        // Should NOT include password_hash
        expect(json.password_hash).toBeUndefined()
        expect(json.password).toBeUndefined()
      })

      test('should handle missing dates gracefully', () => {
        const adminWithoutDates = new Admin({
          id: 'admin123',
          username: 'admin',
          password_hash: 'hash'
        })

        const json = adminWithoutDates.toJSON()

        expect(json.created_at).toBeUndefined()
        expect(json.updated_at).toBeUndefined()
      })
    })
  })

  describe('Security Considerations', () => {
    test('should use appropriate bcrypt rounds', async () => {
      const adminData = { username: 'admin', password: 'password' }
      mockBcrypt.hash.mockResolvedValue('hashed')
      mockQuery.mockResolvedValue({ rows: [{ id: '1', username: 'admin' }] })

      await Admin.create(adminData)

      expect(mockBcrypt.hash).toHaveBeenCalledWith('password', 12) // Should use 12 rounds
    })

    test('should not expose password in any form', () => {
      const adminData = {
        id: 'admin123',
        username: 'admin',
        password_hash: 'secret_hash',
        password: 'should_not_appear' // This shouldn't be stored
      }

      const admin = new Admin(adminData)
      const json = admin.toJSON()

      expect(json.password_hash).toBeUndefined()
      expect(json.password).toBeUndefined()
      expect(Object.keys(json)).not.toContain('password_hash')
      expect(Object.keys(json)).not.toContain('password')
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty username gracefully', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const admin = await Admin.findByUsername('')

      expect(admin).toBeNull()
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM admins WHERE username = $1',
        ['']
      )
    })

    test('should handle null values in constructor', () => {
      const adminData = {
        id: null,
        username: null,
        password_hash: null
      }

      const admin = new Admin(adminData)

      expect(admin.id).toBeNull()
      expect(admin.username).toBeNull()
      expect(admin.password_hash).toBeNull()
    })

    test('should handle database connection errors gracefully', async () => {
      const adminData = { username: 'admin', password: 'password' }
      mockBcrypt.hash.mockResolvedValue('hashed')
      mockQuery.mockRejectedValue(new Error('Connection failed'))

      await expect(Admin.create(adminData)).rejects.toThrow('Connection failed')
      expect(mockBcrypt.hash).toHaveBeenCalled()
    })
  })
})