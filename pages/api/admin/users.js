const { requireAdminAuth } = require('../../../lib/auth');
const { query } = require('../../../lib/db');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      payment_status = '',
      appointment_type = '',
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 records per page
    const offset = (pageNum - 1) * limitNum;

    // Validate sort parameters
    const allowedSortFields = ['created_at', 'name', 'email', 'phone', 'payment_status', 'updated_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Search functionality
    if (search.trim()) {
      whereConditions.push(`(
        LOWER(name) LIKE LOWER($${paramIndex}) OR 
        LOWER(email) LIKE LOWER($${paramIndex + 1}) OR 
        phone LIKE $${paramIndex + 2} OR
        passport_number LIKE UPPER($${paramIndex + 3})
      )`);
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      paramIndex += 4;
    }

    // Payment status filter
    if (payment_status && ['pending', 'completed', 'failed'].includes(payment_status)) {
      whereConditions.push(`payment_status = $${paramIndex}`);
      queryParams.push(payment_status);
      paramIndex++;
    }

    // Appointment type filter
    if (appointment_type) {
      whereConditions.push(`appointment_details->>'appointment_type' = $${paramIndex}`);
      queryParams.push(appointment_type);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRecords / limitNum);

    // Get users with pagination
    const usersQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.passport_number,
        u.appointment_details,
        u.payment_status,
        u.payment_id,
        u.appointment_slip_path,
        u.created_at,
        u.updated_at,
        pt.razorpay_order_id,
        pt.razorpay_payment_id,
        pt.amount as payment_amount,
        pt.status as transaction_status,
        pt.created_at as payment_created_at
      FROM users u
      LEFT JOIN payment_transactions pt ON u.id = pt.user_id
      ${whereClause}
      ORDER BY u.${sortField} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limitNum, offset);
    const usersResult = await query(usersQuery, queryParams);

    // Format the response data
    const users = usersResult.rows.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      passport_number: user.passport_number,
      appointment_details: user.appointment_details || {},
      payment_status: user.payment_status,
      payment_id: user.payment_id,
      appointment_slip_path: user.appointment_slip_path,
      created_at: user.created_at,
      updated_at: user.updated_at,
      payment_info: user.razorpay_order_id ? {
        order_id: user.razorpay_order_id,
        payment_id: user.razorpay_payment_id,
        amount: user.payment_amount,
        status: user.transaction_status,
        created_at: user.payment_created_at
      } : null
    }));

    // Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as paid_users,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_users,
        COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_users,
        COUNT(CASE WHEN appointment_slip_path IS NOT NULL THEN 1 END) as users_with_slips,
        SUM(CASE WHEN pt.status = 'paid' THEN pt.amount ELSE 0 END) as total_revenue
      FROM users u
      LEFT JOIN payment_transactions pt ON u.id = pt.user_id
      ${whereClause}
    `;

    const statsResult = await query(statsQuery, queryParams.slice(0, -2)); // Remove limit and offset params
    const stats = statsResult.rows[0];

    // Format revenue (convert from paise to rupees)
    const formattedStats = {
      total_users: parseInt(stats.total_users),
      paid_users: parseInt(stats.paid_users),
      pending_users: parseInt(stats.pending_users),
      failed_users: parseInt(stats.failed_users),
      users_with_slips: parseInt(stats.users_with_slips),
      total_revenue: stats.total_revenue ? parseFloat(stats.total_revenue) / 100 : 0
    };

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_records: totalRecords,
          per_page: limitNum,
          has_next: pageNum < totalPages,
          has_prev: pageNum > 1
        },
        filters: {
          search,
          payment_status,
          appointment_type,
          sort_by: sortField,
          sort_order: sortDirection.toLowerCase()
        },
        statistics: formattedStats
      }
    });

  } catch (error) {
    console.error('Admin users fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default requireAdminAuth(handler);
