// ============================================================
// ReUse Connect
// Admin - Users & Accounts Routes
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');

const pool = require('../config/db');

const {
  authMiddleware,
  adminOnly
} = require('../middleware/authMiddleware');

const router = express.Router();


// ============================================================
// ALL ROUTES REQUIRE ADMIN AUTHENTICATION
// ============================================================

router.use(authMiddleware, adminOnly);


// ============================================================
// GET USER MANAGEMENT DATA
// GET /api/admin/users
// ============================================================

router.get('/', async (req, res) => {
  try {

    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit, 10) || 8,
        1
      ),
      50
    );

    const offset = (page - 1) * limit;

    const search =
      String(req.query.search || '').trim();

    const role =
      String(req.query.role || '').trim().toUpperCase();

    const status =
      String(req.query.status || '').trim().toUpperCase();


    const conditions = [];
    const values = [];

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (search) {

      values.push(`%${search}%`);

      conditions.push(`
        (
          CONCAT_WS(
            ' ',
            first_name,
            last_name
          ) ILIKE $${values.length}

          OR email ILIKE $${values.length}

          OR CAST(user_id AS TEXT)
             ILIKE $${values.length}
        )
      `);
    }


    // --------------------------------------------------------
    // ROLE FILTER
    // --------------------------------------------------------

    if (
      role &&
      ['BUYER', 'SELLER', 'ADMIN'].includes(role)
    ) {

      values.push(role);

      conditions.push(
        `role = $${values.length}`
      );
    }


    // --------------------------------------------------------
    // STATUS FILTER
    // --------------------------------------------------------

    if (
      status &&
      [
        'ACTIVE',
        'PENDING',
        'INACTIVE',
        'SUSPENDED'
      ].includes(status)
    ) {

      values.push(status);

      conditions.push(
        `status = $${values.length}`
      );
    }


    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';


    // --------------------------------------------------------
    // TOTAL COUNT
    // --------------------------------------------------------

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::INTEGER AS total
      FROM users
      ${whereClause}
      `,
      values
    );

    const total =
      countResult.rows[0]?.total || 0;


    // --------------------------------------------------------
    // USERS
    // --------------------------------------------------------

    const userValues = [
      ...values,
      limit,
      offset
    ];

    const usersResult = await pool.query(
      `
      SELECT
        user_id,
        first_name,
        last_name,
        email,
        role,
        phone,
        profile_image,
        address,
        city,
        province,
        postal_code,
        status,
        created_at,
        updated_at
      FROM users

      ${whereClause}

      ORDER BY created_at DESC

      LIMIT $${userValues.length - 1}
      OFFSET $${userValues.length}
      `,
      userValues
    );


    // --------------------------------------------------------
    // RETURN
    // --------------------------------------------------------

    return res.json({
      success: true,

      data: {
        users: usersResult.rows,

        pagination: {
          page,
          limit,
          total,
          totalPages:
            Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {

    console.error(
      'ADMIN USERS LIST ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load users.',
      error: error.message
    });
  }
});


// ============================================================
// USER MANAGEMENT STATISTICS
// GET /api/admin/users/stats
// ============================================================

router.get('/stats', async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT

        COUNT(*)::INTEGER
          AS total_users,

        COUNT(*) FILTER (
          WHERE role = 'BUYER'
        )::INTEGER
          AS buyers,

        COUNT(*) FILTER (
          WHERE role = 'SELLER'
        )::INTEGER
          AS sellers,

        COUNT(*) FILTER (
          WHERE role = 'ADMIN'
        )::INTEGER
          AS admins,

        COUNT(*) FILTER (
          WHERE status = 'ACTIVE'
        )::INTEGER
          AS active_users,

        COUNT(*) FILTER (
          WHERE status = 'PENDING'
        )::INTEGER
          AS pending_users,

        COUNT(*) FILTER (
          WHERE status = 'INACTIVE'
        )::INTEGER
          AS inactive_users,

        COUNT(*) FILTER (
          WHERE status = 'SUSPENDED'
        )::INTEGER
          AS suspended_users

      FROM users
    `);


    const stats = result.rows[0] || {};

    return res.json({
      success: true,

      data: {
        totalUsers:
          Number(stats.total_users || 0),

        buyers:
          Number(stats.buyers || 0),

        sellers:
          Number(stats.sellers || 0),

        admins:
          Number(stats.admins || 0),

        activeUsers:
          Number(stats.active_users || 0),

        pendingUsers:
          Number(stats.pending_users || 0),

        inactiveUsers:
          Number(stats.inactive_users || 0),

        suspendedUsers:
          Number(stats.suspended_users || 0)
      }
    });

  } catch (error) {

    console.error(
      'ADMIN USER STATS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load user statistics.',
      error: error.message
    });
  }
});


// ============================================================
// RECENT USERS
// GET /api/admin/users/recent
// ============================================================

router.get('/recent', async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        user_id,
        first_name,
        last_name,
        email,
        role,
        status,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    return res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {

    console.error(
      'RECENT USERS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load recent users.',
      error: error.message
    });
  }
});


// ============================================================
// EXPORT USERS AS CSV
// GET /api/admin/users/export
// ============================================================

router.get('/export', async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        user_id,
        first_name,
        last_name,
        email,
        role,
        phone,
        city,
        province,
        status,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);


    const escapeCsv = (value) => {

      if (
        value === null ||
        value === undefined
      ) {
        return '';
      }

      const text =
        String(value)
          .replace(/"/g, '""');

      return `"${text}"`;
    };


    const header = [
      'User ID',
      'First Name',
      'Last Name',
      'Email',
      'Role',
      'Phone',
      'City',
      'Province',
      'Status',
      'Joined Date'
    ];


    const rows =
      result.rows.map(
        (user) => [
          user.user_id,
          user.first_name,
          user.last_name,
          user.email,
          user.role,
          user.phone,
          user.city,
          user.province,
          user.status,
          user.created_at
        ]
          .map(escapeCsv)
          .join(',')
      );


    const csv = [
      header.map(escapeCsv).join(','),
      ...rows
    ].join('\n');


    res.setHeader(
      'Content-Type',
      'text/csv; charset=utf-8'
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="reuse-connect-users.csv"'
    );


    return res.send(csv);

  } catch (error) {

    console.error(
      'EXPORT USERS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to export users.',
      error: error.message
    });
  }
});


// ============================================================
// GET SINGLE USER
// GET /api/admin/users/:userId
// ============================================================

router.get('/:userId', async (req, res) => {
  try {

    const userId =
      Number.parseInt(
        req.params.userId,
        10
      );

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.'
      });
    }


    const result = await pool.query(
      `
      SELECT
        user_id,
        first_name,
        last_name,
        email,
        role,
        phone,
        profile_image,
        address,
        city,
        province,
        postal_code,
        status,
        created_at,
        updated_at
      FROM users
      WHERE user_id = $1
      `,
      [userId]
    );


    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }


    return res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {

    console.error(
      'GET ADMIN USER ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load user.',
      error: error.message
    });
  }
});


// ============================================================
// CREATE USER BY ADMIN
// POST /api/admin/users
// ============================================================

router.post('/', async (req, res) => {
  try {

    const {
      first_name,
      last_name,
      email,
      password,
      role,
      phone,
      address,
      city,
      province,
      postal_code,
      status
    } = req.body;


    if (
      !first_name ||
      !last_name ||
      !email ||
      !password ||
      !role
    ) {

      return res.status(400).json({
        success: false,
        message:
          'First name, last name, email, password, and role are required.'
      });
    }


    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 6 characters.'
      });
    }


    const normalizedEmail =
      email.trim().toLowerCase();


    const normalizedRole =
      String(role).toUpperCase();


    if (
      !['BUYER', 'SELLER', 'ADMIN']
        .includes(normalizedRole)
    ) {

      return res.status(400).json({
        success: false,
        message: 'Invalid user role.'
      });
    }


    const normalizedStatus =
      String(status || 'ACTIVE')
        .toUpperCase();


    if (
      ![
        'ACTIVE',
        'PENDING',
        'INACTIVE',
        'SUSPENDED'
      ].includes(normalizedStatus)
    ) {

      return res.status(400).json({
        success: false,
        message: 'Invalid user status.'
      });
    }


    const existingUser =
      await pool.query(
        `
        SELECT user_id
        FROM users
        WHERE email = $1
        `,
        [normalizedEmail]
      );


    if (existingUser.rows.length > 0) {

      return res.status(409).json({
        success: false,
        message: 'Email is already registered.'
      });
    }


    const passwordHash =
      await bcrypt.hash(
        password,
        10
      );


    const result =
      await pool.query(
        `
        INSERT INTO users (
          first_name,
          last_name,
          email,
          password_hash,
          role,
          phone,
          address,
          city,
          province,
          postal_code,
          status
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11
        )

        RETURNING
          user_id,
          first_name,
          last_name,
          email,
          role,
          phone,
          address,
          city,
          province,
          postal_code,
          status,
          created_at
        `,
        [
          first_name.trim(),
          last_name.trim(),
          normalizedEmail,
          passwordHash,
          normalizedRole,
          phone || null,
          address || null,
          city || null,
          province || null,
          postal_code || null,
          normalizedStatus
        ]
      );


    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: result.rows[0]
    });

  } catch (error) {

    console.error(
      'ADMIN CREATE USER ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to create user.',
      error: error.message
    });
  }
});


// ============================================================
// UPDATE USER STATUS
// PATCH /api/admin/users/:userId/status
// ============================================================

router.patch('/:userId/status', async (req, res) => {
  try {

    const userId =
      Number.parseInt(
        req.params.userId,
        10
      );

    const newStatus =
      String(
        req.body.status || ''
      ).toUpperCase();


    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.'
      });
    }


    if (
      ![
        'ACTIVE',
        'PENDING',
        'INACTIVE',
        'SUSPENDED'
      ].includes(newStatus)
    ) {

      return res.status(400).json({
        success: false,
        message: 'Invalid status.'
      });
    }


    // Prevent an administrator from disabling
    // their own currently logged-in account.
    if (
      userId === req.user.user_id &&
      newStatus !== 'ACTIVE'
    ) {

      return res.status(400).json({
        success: false,
        message:
          'You cannot deactivate or suspend your own account.'
      });
    }


    const result =
      await pool.query(
        `
        UPDATE users

        SET
          status = $1,
          updated_at = CURRENT_TIMESTAMP

        WHERE user_id = $2

        RETURNING
          user_id,
          first_name,
          last_name,
          email,
          role,
          status,
          updated_at
        `,
        [
          newStatus,
          userId
        ]
      );


    if (result.rows.length === 0) {

      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }


    return res.json({
      success: true,
      message: 'User status updated.',
      data: result.rows[0]
    });

  } catch (error) {

    console.error(
      'UPDATE USER STATUS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to update user status.',
      error: error.message
    });
  }
});


module.exports = router;
