const express = require('express');

const pool = require('../config/db');

const {
  authMiddleware,
  sellerOnly
} = require('../middleware/authMiddleware');

const router = express.Router();


// ============================================================
// SELLER ROUTE PROTECTION
// ============================================================

router.use(
  authMiddleware,
  sellerOnly
);


// ============================================================
// HELPERS
// ============================================================

const getSellerId = (req) => {
  return (
    req.user?.user_id ??
    req.user?.id ??
    req.user?.userId
  );
};


// ============================================================
// GET SELLER PROFILE
// GET /api/seller/profile
// ============================================================

router.get(
  '/profile',
  async (req, res) => {

    try {

      const sellerId = getSellerId(req);

      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Seller authentication information is missing.'
        });
      }


      const result = await pool.query(
        `
        SELECT
          user_id,
          first_name,
          last_name,
          email,
          phone,
          profile_image,
          address,
          city,
          province,
          postal_code,
          role,
          status,
          created_at,
          updated_at
        FROM users
        WHERE user_id = $1
          AND role = 'SELLER'
        LIMIT 1
        `,
        [sellerId]
      );


      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Seller account not found.'
        });
      }


      return res.json({
        success: true,
        seller: result.rows[0]
      });

    } catch (error) {

      console.error(
        'GET /api/seller/profile error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Unable to load seller profile.',
        error: error.message
      });

    }

  }
);


// ============================================================
// GET SELLER DASHBOARD
// GET /api/seller/dashboard
// ============================================================

router.get(
  '/dashboard',
  async (req, res) => {

    try {

      const sellerId = getSellerId(req);

      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Seller authentication information is missing.'
        });
      }


      // ======================================================
      // 1. CHECK SELLER
      // ======================================================

      const sellerResult = await pool.query(
        `
        SELECT
          user_id,
          first_name,
          last_name,
          email,
          profile_image,
          role,
          status
        FROM users
        WHERE user_id = $1
          AND role = 'SELLER'
        LIMIT 1
        `,
        [sellerId]
      );


      if (sellerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Seller account not found.'
        });
      }


      // ======================================================
      // 2. LISTING STATISTICS
      // ======================================================

      const listingStatsResult =
        await pool.query(
          `
          SELECT

            COUNT(*)::INTEGER
              AS total_products,

            COUNT(*) FILTER (
              WHERE status = 'AVAILABLE'
            )::INTEGER
              AS active_products,

            COUNT(*) FILTER (
              WHERE status = 'PENDING'
            )::INTEGER
              AS pending_products,

            COUNT(*) FILTER (
              WHERE status = 'SOLD'
            )::INTEGER
              AS sold_products,

            COUNT(*) FILTER (
              WHERE status = 'RESERVED'
            )::INTEGER
              AS reserved_products,

            COUNT(*) FILTER (
              WHERE status = 'HIDDEN'
            )::INTEGER
              AS hidden_products,

            COUNT(*) FILTER (
              WHERE status = 'REJECTED'
            )::INTEGER
              AS rejected_products

          FROM listings

          WHERE seller_id = $1
          `,
          [sellerId]
        );


      // ======================================================
      // 3. ORDER STATISTICS
      // ======================================================

      const orderStatsResult =
        await pool.query(
          `
          SELECT

            COUNT(DISTINCT oi.order_id)::INTEGER
              AS total_orders,

            COUNT(
              DISTINCT oi.order_id
            ) FILTER (
              WHERE o.status = 'PENDING'
            )::INTEGER
              AS pending_orders,

            COUNT(
              DISTINCT oi.order_id
            ) FILTER (
              WHERE o.status IN (
                'CONFIRMED',
                'PROCESSING'
              )
            )::INTEGER
              AS processing_orders,

            COUNT(
              DISTINCT oi.order_id
            ) FILTER (
              WHERE o.status = 'SHIPPED'
            )::INTEGER
              AS shipped_orders,

            COUNT(
              DISTINCT oi.order_id
            ) FILTER (
              WHERE o.status = 'DELIVERED'
            )::INTEGER
              AS delivered_orders,

            COUNT(
              DISTINCT oi.order_id
            ) FILTER (
              WHERE o.status = 'COMPLETED'
            )::INTEGER
              AS completed_orders,

            COUNT(
              DISTINCT oi.order_id
            ) FILTER (
              WHERE o.status IN (
                'CANCELLED',
                'REJECTED'
              )
            )::INTEGER
              AS cancelled_orders

          FROM order_items oi

          INNER JOIN orders o
            ON o.order_id = oi.order_id

          WHERE oi.seller_id = $1
          `,
          [sellerId]
        );


      // ======================================================
      // 4. SALES STATISTICS
      // ======================================================

      const salesResult =
        await pool.query(
          `
          SELECT

            COALESCE(
              SUM(oi.subtotal),
              0
            ) AS total_sales,

            COALESCE(
              SUM(
                CASE
                  WHEN o.status IN (
                    'DELIVERED',
                    'COMPLETED'
                  )
                  THEN oi.subtotal
                  ELSE 0
                END
              ),
              0
            ) AS completed_sales,

            COALESCE(
              SUM(
                CASE
                  WHEN o.status IN (
                    'PENDING',
                    'CONFIRMED',
                    'PROCESSING',
                    'SHIPPED'
                  )
                  THEN oi.subtotal
                  ELSE 0
                END
              ),
              0
            ) AS pending_sales

          FROM order_items oi

          INNER JOIN orders o
            ON o.order_id = oi.order_id

          WHERE oi.seller_id = $1
          `,
          [sellerId]
        );


      // ======================================================
      // 5. REVIEW STATISTICS
      //
      // FIX: reviews.seller_id no longer exists.
      //      Use reviews.reviewee_id instead.
      // ======================================================

      const reviewStatsResult =
        await pool.query(
          `
          SELECT

            COUNT(*)::INTEGER
              AS total_reviews,

            COALESCE(
              ROUND(
                AVG(rating)::NUMERIC,
                2
              ),
              0
            ) AS average_rating,

            COUNT(*) FILTER (
              WHERE rating = 5
            )::INTEGER
              AS five_star,

            COUNT(*) FILTER (
              WHERE rating = 4
            )::INTEGER
              AS four_star,

            COUNT(*) FILTER (
              WHERE rating = 3
            )::INTEGER
              AS three_star,

            COUNT(*) FILTER (
              WHERE rating = 2
            )::INTEGER
              AS two_star,

            COUNT(*) FILTER (
              WHERE rating = 1
            )::INTEGER
              AS one_star

          FROM reviews

          WHERE reviewee_id = $1
            AND status = 'PUBLISHED'
          `,
          [sellerId]
        );


      // ======================================================
      // 6. RECENT LISTINGS
      // ======================================================

      const recentListingsResult =
        await pool.query(
          `
          SELECT

            l.listing_id,
            l.title,
            l.description,
            l.price,
            l.condition,
            l.quantity,
            l.location,
            l.status,
            l.created_at,
            l.updated_at,

            c.category_id,
            c.name AS category_name,

            (
              SELECT li.image_url
              FROM listing_images li
              WHERE li.listing_id = l.listing_id
              ORDER BY
                li.is_primary DESC,
                li.sort_order ASC,
                li.image_id ASC
              LIMIT 1
            ) AS image_url

          FROM listings l

          LEFT JOIN categories c
            ON c.category_id = l.category_id

          WHERE l.seller_id = $1

          ORDER BY
            l.created_at DESC

          LIMIT 6
          `,
          [sellerId]
        );


      // ======================================================
      // 7. RECENT ORDERS
      // ======================================================

      const recentOrdersResult =
        await pool.query(
          `
          SELECT

            o.order_id,
            o.order_number,
            o.buyer_id,
            o.status,
            o.shipping_address,
            o.created_at,
            o.updated_at,

            u.first_name AS buyer_first_name,
            u.last_name AS buyer_last_name,

            COUNT(oi.order_item_id)::INTEGER
              AS item_count,

            COALESCE(
              SUM(oi.subtotal),
              0
            ) AS total_amount

          FROM orders o

          INNER JOIN order_items oi
            ON oi.order_id = o.order_id

          INNER JOIN users u
            ON u.user_id = o.buyer_id

          WHERE oi.seller_id = $1

          GROUP BY
            o.order_id,
            o.order_number,
            o.buyer_id,
            o.status,
            o.shipping_address,
            o.created_at,
            o.updated_at,
            u.first_name,
            u.last_name

          ORDER BY
            o.created_at DESC

          LIMIT 6
          `,
          [sellerId]
        );


      // ======================================================
      // 8. MONTHLY SALES
      // ======================================================

      const monthlySalesResult =
        await pool.query(
          `
          WITH months AS (

            SELECT
              generate_series(
                date_trunc(
                  'month',
                  CURRENT_DATE
                ) - INTERVAL '5 months',

                date_trunc(
                  'month',
                  CURRENT_DATE
                ),

                INTERVAL '1 month'
              ) AS month

          )

          SELECT

            TO_CHAR(
              m.month,
              'Mon'
            ) AS month,

            m.month AS month_date,

            COALESCE(
              SUM(
                CASE
                  WHEN o.status IN (
                    'DELIVERED',
                    'COMPLETED'
                  )
                  THEN oi.subtotal
                  ELSE 0
                END
              ),
              0
            ) AS sales

          FROM months m

          LEFT JOIN orders o
            ON date_trunc(
              'month',
              o.created_at
            ) = m.month

          LEFT JOIN order_items oi
            ON oi.order_id = o.order_id
            AND oi.seller_id = $1

          GROUP BY
            m.month

          ORDER BY
            m.month ASC
          `,
          [sellerId]
        );


      // ======================================================
      // 9. RESPONSE
      // ======================================================

      const listingStats =
        listingStatsResult.rows[0] || {};

      const orderStats =
        orderStatsResult.rows[0] || {};

      const sales =
        salesResult.rows[0] || {};

      const reviews =
        reviewStatsResult.rows[0] || {};


      return res.json({

        success: true,

        seller:
          sellerResult.rows[0],

        stats: {

          // Listings

          totalProducts:
            Number(
              listingStats.total_products || 0
            ),

          activeProducts:
            Number(
              listingStats.active_products || 0
            ),

          pendingProducts:
            Number(
              listingStats.pending_products || 0
            ),

          soldProducts:
            Number(
              listingStats.sold_products || 0
            ),

          reservedProducts:
            Number(
              listingStats.reserved_products || 0
            ),

          hiddenProducts:
            Number(
              listingStats.hidden_products || 0
            ),

          rejectedProducts:
            Number(
              listingStats.rejected_products || 0
            ),


          // Orders

          totalOrders:
            Number(
              orderStats.total_orders || 0
            ),

          pendingOrders:
            Number(
              orderStats.pending_orders || 0
            ),

          processingOrders:
            Number(
              orderStats.processing_orders || 0
            ),

          shippedOrders:
            Number(
              orderStats.shipped_orders || 0
            ),

          deliveredOrders:
            Number(
              orderStats.delivered_orders || 0
            ),

          completedOrders:
            Number(
              orderStats.completed_orders || 0
            ),

          cancelledOrders:
            Number(
              orderStats.cancelled_orders || 0
            ),


          // Sales

          totalSales:
            Number(
              sales.total_sales || 0
            ),

          completedSales:
            Number(
              sales.completed_sales || 0
            ),

          pendingSales:
            Number(
              sales.pending_sales || 0
            ),


          // Reviews

          totalReviews:
            Number(
              reviews.total_reviews || 0
            ),

          averageRating:
            Number(
              reviews.average_rating || 0
            ),

          fiveStar:
            Number(
              reviews.five_star || 0
            ),

          fourStar:
            Number(
              reviews.four_star || 0
            ),

          threeStar:
            Number(
              reviews.three_star || 0
            ),

          twoStar:
            Number(
              reviews.two_star || 0
            ),

          oneStar:
            Number(
              reviews.one_star || 0
            )

        },

        recentListings:
          recentListingsResult.rows,

        recentOrders:
          recentOrdersResult.rows,

        monthlySales:
          monthlySalesResult.rows

      });

    } catch (error) {

      console.error(
        'GET /api/seller/dashboard error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Unable to load seller dashboard.',
        error: error.message
      });

    }

  }
);


// ============================================================
// GET SELLER RECENT ORDERS
// GET /api/seller/orders/recent
// ============================================================

router.get(
  '/orders/recent',
  async (req, res) => {

    try {

      const sellerId = getSellerId(req);

      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Seller authentication information is missing.'
        });
      }


      const result = await pool.query(
        `
        SELECT

          o.order_id,
          o.order_number,
          o.status,
          o.shipping_address,
          o.notes,
          o.created_at,
          o.updated_at,

          u.user_id AS buyer_id,
          u.first_name AS buyer_first_name,
          u.last_name AS buyer_last_name,
          u.email AS buyer_email,

          COUNT(oi.order_item_id)::INTEGER
            AS item_count,

          COALESCE(
            SUM(oi.subtotal),
            0
          ) AS total_amount

        FROM orders o

        INNER JOIN order_items oi
          ON oi.order_id = o.order_id

        INNER JOIN users u
          ON u.user_id = o.buyer_id

        WHERE oi.seller_id = $1

        GROUP BY

          o.order_id,
          o.order_number,
          o.status,
          o.shipping_address,
          o.notes,
          o.created_at,
          o.updated_at,

          u.user_id,
          u.first_name,
          u.last_name,
          u.email

        ORDER BY
          o.created_at DESC

        LIMIT 20
        `,
        [sellerId]
      );


      return res.json({
        success: true,
        orders: result.rows
      });

    } catch (error) {

      console.error(
        'GET /api/seller/orders/recent error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Unable to load seller orders.',
        error: error.message
      });

    }

  }
);


// ============================================================
// GET SELLER REVIEWS
// GET /api/seller/reviews
//
// FIX: reviews.seller_id no longer exists.
//      Use reviews.reviewee_id instead.
// ============================================================

router.get(
  '/reviews',
  async (req, res) => {

    try {

      const sellerId = getSellerId(req);

      if (!sellerId) {
        return res.status(401).json({
          success: false,
          message: 'Seller authentication information is missing.'
        });
      }


      const result = await pool.query(
        `
        SELECT

          r.review_id,
          r.rating,
          r.comment,
          r.status,
          r.created_at,
          r.updated_at,

          reviewer.user_id
            AS reviewer_id,

          reviewer.first_name
            AS reviewer_first_name,

          reviewer.last_name
            AS reviewer_last_name,

          l.listing_id,
          l.title AS listing_title

        FROM reviews r

        INNER JOIN users reviewer
          ON reviewer.user_id = r.reviewer_id

        LEFT JOIN listings l
          ON l.listing_id = r.listing_id

        WHERE r.reviewee_id = $1

        ORDER BY
          r.created_at DESC

        LIMIT 50
        `,
        [sellerId]
      );


      return res.json({
        success: true,
        reviews: result.rows
      });

    } catch (error) {

      console.error(
        'GET /api/seller/reviews error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Unable to load seller reviews.',
        error: error.message
      });

    }

  }
);


// ============================================================
// SELLER TEST ROUTE
// GET /api/seller/test
// ============================================================

router.get(
  '/test',
  async (req, res) => {

    try {

      const sellerId = getSellerId(req);

      return res.json({
        success: true,
        message: 'Seller access granted.',
        seller_id: sellerId,
        user: req.user
      });

    } catch (error) {

      console.error(
        'GET /api/seller/test error:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Seller test route failed.',
        error: error.message
      });

    }

  }
);


module.exports = router;