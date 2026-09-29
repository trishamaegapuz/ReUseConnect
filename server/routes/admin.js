const express = require('express');
const pool = require('../config/db');

const {
  authMiddleware,
  adminOnly
} = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(adminOnly);


// ============================================================
// HELPER
// ============================================================

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};


// ============================================================
// ADMIN DASHBOARD
// GET /api/admin/dashboard
// ============================================================

router.get('/dashboard', async (req, res) => {

  try {

    // ========================================================
    // BASIC COUNTS
    // ========================================================

    const [
      usersResult,
      listingsResult,
      ordersResult,
      buyersResult,
      sellersResult,
      adminsResult,
      pendingUsersResult,
      activeListingsResult
    ] = await Promise.all([

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM users
      `),

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM listings
      `),

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM orders
      `),

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM users
        WHERE role = 'BUYER'
      `),

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM users
        WHERE role = 'SELLER'
      `),

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM users
        WHERE role = 'ADMIN'
      `),

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM users
        WHERE status = 'PENDING'
      `),

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM listings
        WHERE status = 'ACTIVE'
      `)

    ]);


    // ========================================================
    // PLATFORM FEE
    //
    // We first check whether payments has a platform_fee
    // column. If it does, use it.
    //
    // If the column does not exist, dashboard will safely
    // return 0 instead of crashing.
    // ========================================================

    let platformFee = 0;

    try {

      const columnCheck = await pool.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'payments'
          AND column_name = 'platform_fee'
        LIMIT 1
      `);


      if (columnCheck.rows.length > 0) {

        const feeResult = await pool.query(`
          SELECT
            COALESCE(
              SUM(platform_fee),
              0
            )::numeric AS total
          FROM payments
          WHERE UPPER(status) = 'COMPLETED'
        `);

        platformFee =
          safeNumber(
            feeResult.rows[0].total
          );

      }

    } catch (feeError) {

      console.warn(
        'Platform fee query skipped:',
        feeError.message
      );

      platformFee = 0;

    }


    // ========================================================
    // PLATFORM OVERVIEW
    //
    // Last 7 days
    // Users
    // Listings
    // Orders
    // ========================================================

    const platformOverviewResult = await pool.query(`

      WITH days AS (

        SELECT
          generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS activity_date

      ),

      user_counts AS (

        SELECT
          created_at::date AS activity_date,
          COUNT(*)::int AS total
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY created_at::date

      ),

      listing_counts AS (

        SELECT
          created_at::date AS activity_date,
          COUNT(*)::int AS total
        FROM listings
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY created_at::date

      ),

      order_counts AS (

        SELECT
          created_at::date AS activity_date,
          COUNT(*)::int AS total
        FROM orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY created_at::date

      )

      SELECT

        days.activity_date,

        COALESCE(
          user_counts.total,
          0
        ) AS users,

        COALESCE(
          listing_counts.total,
          0
        ) AS listings,

        COALESCE(
          order_counts.total,
          0
        ) AS orders

      FROM days

      LEFT JOIN user_counts
        ON user_counts.activity_date =
           days.activity_date

      LEFT JOIN listing_counts
        ON listing_counts.activity_date =
           days.activity_date

      LEFT JOIN order_counts
        ON order_counts.activity_date =
           days.activity_date

      ORDER BY days.activity_date ASC

    `);


    // ========================================================
    // USER DISTRIBUTION
    // ========================================================

    const userDistributionResult = await pool.query(`

      SELECT
        role,
        COUNT(*)::int AS count

      FROM users

      GROUP BY role

      ORDER BY
        CASE role
          WHEN 'BUYER' THEN 1
          WHEN 'SELLER' THEN 2
          WHEN 'ADMIN' THEN 3
          ELSE 4
        END

    `);


    // ========================================================
    // RECENT USERS
    // ========================================================

    const recentUsersResult = await pool.query(`

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


    // ========================================================
    // RECENT LISTINGS
    // ========================================================

    const recentListingsResult = await pool.query(`

      SELECT
        l.listing_id,
        l.title,
        l.status,
        l.created_at,

        u.first_name,
        u.last_name

      FROM listings l

      LEFT JOIN users u
        ON u.user_id = l.seller_id

      ORDER BY l.created_at DESC

      LIMIT 5

    `);


    // ========================================================
    // RECENT ORDERS
    // ========================================================

    const recentOrdersResult = await pool.query(`

      SELECT
        o.order_id,
        o.total_amount,
        o.status,
        o.created_at,

        u.first_name,
        u.last_name

      FROM orders o

      LEFT JOIN users u
        ON u.user_id = o.buyer_id

      ORDER BY o.created_at DESC

      LIMIT 5

    `);


    // ========================================================
    // TOP SELLING CATEGORIES
    //
    // IMPORTANT:
    // This uses:
    //
    // orders
    //    ↓
    // order_items
    //    ↓
    // listings
    //    ↓
    // categories
    //
    // Only COMPLETED orders are counted.
    // ========================================================

    let topSellingCategories = [];

    try {

      const categoryResult = await pool.query(`

        SELECT

          c.category_id,

          c.name AS category,

          COALESCE(
            SUM(oi.quantity),
            0
          )::int AS orders

        FROM order_items oi

        INNER JOIN orders o
          ON o.order_id = oi.order_id

        INNER JOIN listings l
          ON l.listing_id = oi.listing_id

        INNER JOIN categories c
          ON c.category_id = l.category_id

        WHERE UPPER(o.status) = 'COMPLETED'

        GROUP BY
          c.category_id,
          c.name

        ORDER BY
          orders DESC

        LIMIT 5

      `);


      topSellingCategories =
        categoryResult.rows;


      // ------------------------------------------------------
      // Calculate percentage based on total category orders.
      // ------------------------------------------------------

      const totalCategoryOrders =
        topSellingCategories.reduce(
          (sum, item) =>
            sum + safeNumber(item.orders),
          0
        );


      topSellingCategories =
        topSellingCategories.map(
          item => ({

            category:
              item.category,

            orders:
              safeNumber(item.orders),

            percentage:
              totalCategoryOrders > 0
                ? Number(
                    (
                      (
                        safeNumber(item.orders) /
                        totalCategoryOrders
                      ) * 100
                    ).toFixed(1)
                  )
                : 0

          })
        );

    } catch (categoryError) {

      console.error(
        'TOP SELLING CATEGORIES ERROR:',
        categoryError.message
      );

      topSellingCategories = [];

    }


    // ========================================================
    // RECENT ACTIVITY
    // ========================================================

    const recentActivity = [

      ...recentUsersResult.rows.map(
        user => ({

          type: 'USER',

          id: user.user_id,

          name:
            `${user.first_name} ${user.last_name}`,

          role:
            user.role,

          action:
            user.status === 'PENDING'
              ? 'Account Pending'
              : 'Account Created',

          details:
            user.email,

          status:
            user.status,

          created_at:
            user.created_at

        })
      ),


      ...recentListingsResult.rows.map(
        listing => ({

          type: 'LISTING',

          id:
            listing.listing_id,

          name:
            listing.first_name &&
            listing.last_name
              ? `${listing.first_name} ${listing.last_name}`
              : 'Unknown Seller',

          role:
            'SELLER',

          action:
            'New Listing',

          details:
            listing.title,

          status:
            listing.status,

          created_at:
            listing.created_at

        })
      ),


      ...recentOrdersResult.rows.map(
        order => ({

          type: 'ORDER',

          id:
            order.order_id,

          name:
            order.first_name &&
            order.last_name
              ? `${order.first_name} ${order.last_name}`
              : 'Unknown Buyer',

          role:
            'BUYER',

          action:
            'Placed Order',

          details:
            `Order #${order.order_id}`,

          status:
            order.status,

          created_at:
            order.created_at

        })
      )

    ]
      .sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      )
      .slice(0, 5);


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({

      success: true,

      stats: {

        totalUsers:
          usersResult.rows[0].count,

        totalListings:
          listingsResult.rows[0].count,

        totalOrders:
          ordersResult.rows[0].count,

        totalEarnings:
          platformFee,

        buyers:
          buyersResult.rows[0].count,

        sellers:
          sellersResult.rows[0].count,

        admins:
          adminsResult.rows[0].count,

        pendingUsers:
          pendingUsersResult.rows[0].count,

        activeListings:
          activeListingsResult.rows[0].count

      },


      platformOverview:
        platformOverviewResult.rows,


      userDistribution:
        userDistributionResult.rows,


      recentActivity,


      topSellingCategories

    });


  } catch (error) {

    console.error(
      '=========================================='
    );

    console.error(
      'ADMIN DASHBOARD ERROR'
    );

    console.error(
      error
    );

    console.error(
      '=========================================='
    );


    return res.status(500).json({

      success: false,

      message:
        'Unable to load admin dashboard data.',

      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined

    });

  }

});


// ============================================================
// PENDING USERS
// ============================================================

router.get(
  '/users/pending',
  async (req, res) => {

    try {

      const result = await pool.query(`

        SELECT
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

        FROM users

        WHERE status = 'PENDING'

          AND role IN (
            'BUYER',
            'SELLER'
          )

        ORDER BY created_at ASC

      `);


      res.json({
        success: true,
        users: result.rows
      });

    } catch (error) {

      console.error(
        'PENDING USERS ERROR:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Unable to load pending users.'
      });

    }

  }
);


// ============================================================
// APPROVE USER
// ============================================================

router.patch(
  '/users/:userId/approve',
  async (req, res) => {

    try {

      const userId =
        Number(req.params.userId);


      const result = await pool.query(
        `

        UPDATE users

        SET
          status = 'ACTIVE',
          updated_at = CURRENT_TIMESTAMP

        WHERE
          user_id = $1

          AND role IN (
            'BUYER',
            'SELLER'
          )

          AND status = 'PENDING'

        RETURNING
          user_id,
          first_name,
          last_name,
          email,
          role,
          status,
          created_at

        `,
        [userId]
      );


      if (result.rows.length === 0) {

        return res.status(404).json({
          success: false,
          message:
            'Pending user was not found.'
        });

      }


      return res.json({

        success: true,

        message:
          'User approved successfully.',

        user:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        'APPROVE USER ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to approve user.'
      });

    }

  }
);


// ============================================================
// REJECT USER
// ============================================================

router.patch(
  '/users/:userId/reject',
  async (req, res) => {

    try {

      const userId =
        Number(req.params.userId);


      const result = await pool.query(
        `

        UPDATE users

        SET
          status = 'INACTIVE',
          updated_at = CURRENT_TIMESTAMP

        WHERE
          user_id = $1

          AND role IN (
            'BUYER',
            'SELLER'
          )

          AND status = 'PENDING'

        RETURNING
          user_id,
          first_name,
          last_name,
          email,
          role,
          status,
          created_at

        `,
        [userId]
      );


      if (result.rows.length === 0) {

        return res.status(404).json({
          success: false,
          message:
            'Pending user was not found.'
        });

      }


      return res.json({

        success: true,

        message:
          'User rejected successfully.',

        user:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        'REJECT USER ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to reject user.'
      });

    }

  }
);


module.exports = router;