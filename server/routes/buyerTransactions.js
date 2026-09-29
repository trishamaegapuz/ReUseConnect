/*
============================================================
ReUse Connect
Buyer Transactions Backend
============================================================

REVIEW UPDATE:
- Buyer can review SELLER separately.
- Buyer can review each ITEM/LISTING separately.
- Existing seller reviews remain supported.
- review_type is now used:
    SELLER = buyer -> seller
    ITEM   = buyer -> purchased item/listing
============================================================
*/

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const {
  authMiddleware,
  buyerOnly
} = require('../middleware/authMiddleware');

/*
============================================================
AUTHENTICATION
============================================================

IMPORTANT:
This router is mounted from server.js at:

/api/buyer/transactions

The previous version relied on req.user without attaching
authMiddleware/buyerOnly to this router. That caused:

401 Unauthorized
Authorization token is required.

Keep authentication isolated to Buyer Transactions.
No changes are required in shared api.js, Login, Admin,
Seller, or server.js.
============================================================
*/

router.use(authMiddleware, buyerOnly);

const getUserId = (req) => {
  return (
    req.user?.user_id ||
    req.user?.id ||
    req.auth?.user_id ||
    req.auth?.id ||
    null
  );
};

/* ============================================================
   GET BUYER TRANSACTIONS
============================================================ */

router.get('/', async (req, res) => {
  const buyerId = getUserId(req);

  if (!buyerId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.'
    });
  }

  try {
    const {
      search = '',
      status = 'all',
      page = 1,
      limit = 10
    } = req.query;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(
      Math.max(parseInt(limit, 10) || 10, 1),
      100
    );
    const offset = (safePage - 1) * safeLimit;

    const params = [buyerId];
    const where = ['o.buyer_id = $1'];

    if (status && status !== 'all') {
      params.push(String(status).toUpperCase());
      where.push(`o.status = $${params.length}`);
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      where.push(`
        (
          o.order_number ILIKE $${params.length}
          OR EXISTS (
            SELECT 1
            FROM order_items oi_search
            JOIN listings l_search
              ON l_search.listing_id = oi_search.listing_id
            WHERE oi_search.order_id = o.order_id
              AND (
                l_search.title ILIKE $${params.length}
                OR l_search.description ILIKE $${params.length}
              )
          )
        )
      `);
    }

    const countResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM orders o
        WHERE ${where.join(' AND ')}
      `,
      params
    );

    const total = countResult.rows[0]?.total || 0;

    params.push(safeLimit);
    params.push(offset);

    const result = await pool.query(
      `
        SELECT
          o.order_id,
          o.order_number,
          o.buyer_id,
          o.total_amount,
          o.status,
          o.shipping_address,
          o.notes,
          o.created_at,
          o.updated_at,

          COALESCE(
            (
              SELECT ROUND(AVG(r.rating)::numeric, 1)
              FROM reviews r
              WHERE r.reviewee_id = oi_first.seller_id
                AND r.review_type = 'SELLER'
                AND r.status = 'PUBLISHED'
            ),
            0
          ) AS seller_rating,

          (
            SELECT COUNT(*)
            FROM reviews r
            WHERE r.reviewee_id = oi_first.seller_id
              AND r.review_type = 'SELLER'
              AND r.status = 'PUBLISHED'
          )::int AS seller_review_count,

          EXISTS (
            SELECT 1
            FROM reviews r_check
            WHERE r_check.order_id = o.order_id
              AND r_check.reviewer_id = o.buyer_id
              AND r_check.review_type = 'SELLER'
          ) AS has_seller_review,

          EXISTS (
            SELECT 1
            FROM reviews r_check
            WHERE r_check.order_id = o.order_id
              AND r_check.reviewer_id = o.buyer_id
              AND r_check.review_type = 'ITEM'
          ) AS has_item_review

        FROM orders o

        LEFT JOIN LATERAL (
          SELECT
            oi_first.seller_id
          FROM order_items oi_first
          WHERE oi_first.order_id = o.order_id
          ORDER BY oi_first.order_item_id ASC
          LIMIT 1
        ) oi_first ON TRUE

        WHERE ${where.join(' AND ')}

        ORDER BY o.created_at DESC
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
      `,
      params
    );

    const orderIds = result.rows.map((row) => row.order_id);

    let itemRows = [];

    if (orderIds.length) {
      const itemResult = await pool.query(
        `
          SELECT
            oi.order_item_id,
            oi.order_id,
            oi.listing_id,
            oi.seller_id,
            oi.quantity,
            oi.unit_price,
            oi.subtotal,

            l.title,
            l.description,
            l.price,
            l.condition,
            l.quantity AS listing_quantity,
            l.location,
            l.size,
            l.listing_type,
            l.status AS listing_status,

            u.first_name AS seller_first_name,
            u.last_name AS seller_last_name,

            (
              SELECT li.image_url
              FROM listing_images li
              WHERE li.listing_id = l.listing_id
              ORDER BY li.is_primary DESC, li.sort_order ASC, li.image_id ASC
              LIMIT 1
            ) AS image_url,

            (
              SELECT ROUND(AVG(r.rating)::numeric, 1)
              FROM reviews r
              WHERE r.listing_id = l.listing_id
                AND r.review_type = 'ITEM'
                AND r.status = 'PUBLISHED'
            ) AS item_rating,

            (
              SELECT COUNT(*)
              FROM reviews r
              WHERE r.listing_id = l.listing_id
                AND r.review_type = 'ITEM'
                AND r.status = 'PUBLISHED'
            )::int AS item_review_count,

            EXISTS (
              SELECT 1
              FROM reviews r
              WHERE r.order_id = oi.order_id
                AND r.reviewer_id = $1
                AND r.listing_id = oi.listing_id
                AND r.review_type = 'ITEM'
            ) AS buyer_has_item_review

          FROM order_items oi

          JOIN listings l
            ON l.listing_id = oi.listing_id

          LEFT JOIN users u
            ON u.user_id = oi.seller_id

          WHERE oi.order_id = ANY($2::bigint[])

          ORDER BY oi.order_item_id ASC
        `,
        [buyerId, orderIds]
      );

      itemRows = itemResult.rows;
    }

    const itemsByOrder = new Map();

    for (const item of itemRows) {
      const list = itemsByOrder.get(item.order_id) || [];

      list.push({
        orderItemId: item.order_item_id,
        listingId: item.listing_id,
        sellerId: item.seller_id,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price || 0),
        subtotal: Number(item.subtotal || 0),

        title: item.title,
        description: item.description,
        price: Number(item.price || 0),
        condition: item.condition,
        listingQuantity: item.listing_quantity,
        location: item.location,
        size: item.size,
        listingType: item.listing_type,
        listingStatus: item.listing_status,

        sellerName: [
          item.seller_first_name,
          item.seller_last_name
        ]
          .filter(Boolean)
          .join(' ')
          .trim(),

        imageUrl: item.image_url,

        itemRating:
          item.item_rating === null
            ? null
            : Number(item.item_rating),

        itemReviewCount: Number(item.item_review_count || 0),

        buyerHasItemReview: Boolean(
          item.buyer_has_item_review
        )
      });

      itemsByOrder.set(item.order_id, list);
    }

    const transactions = result.rows.map((row) => ({
      orderId: row.order_id,
      orderNumber: row.order_number,
      buyerId: row.buyer_id,
      totalAmount: Number(row.total_amount || 0),
      status: row.status,
      shippingAddress: row.shipping_address,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,

      sellerId:
        itemRows.find(
          (item) => item.order_id === row.order_id
        )?.seller_id || null,

      sellerRating:
        row.seller_rating === null
          ? null
          : Number(row.seller_rating),

      sellerReviewCount: Number(
        row.seller_review_count || 0
      ),

      hasSellerReview: Boolean(row.has_seller_review),
      hasItemReview: Boolean(row.has_item_review),

      hasReview:
        Boolean(row.has_seller_review) ||
        Boolean(row.has_item_review),

      items: itemsByOrder.get(row.order_id) || []
    }));

    return res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit)
        }
      }
    });
  } catch (error) {
    console.error(
      'GET /api/buyer/transactions error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to load buyer transactions.',
      error: error.message
    });
  }
});


/* ============================================================
   GET BUYER TRANSACTION SUMMARY
============================================================ */

router.get('/summary', async (req, res) => {
  const buyerId = getUserId(req);

  if (!buyerId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.'
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          COUNT(*)::int AS total_purchases,

          COUNT(*) FILTER (
            WHERE status = 'COMPLETED'
          )::int AS completed_purchases,

          COUNT(*) FILTER (
            WHERE status IN (
              'PENDING',
              'CONFIRMED',
              'PROCESSING',
              'SHIPPED',
              'DELIVERED'
            )
          )::int AS active_purchases,

          COUNT(*) FILTER (
            WHERE status IN (
              'CANCELLED',
              'REJECTED'
            )
          )::int AS cancelled_purchases,

          COALESCE(
            SUM(total_amount) FILTER (
              WHERE status = 'COMPLETED'
            ),
            0
          ) AS total_spent

        FROM orders
        WHERE buyer_id = $1
      `,
      [buyerId]
    );

    const row = result.rows[0] || {};

    return res.json({
      success: true,
      data: {
        totalPurchases: Number(row.total_purchases || 0),
        completedPurchases: Number(
          row.completed_purchases || 0
        ),
        activePurchases: Number(
          row.active_purchases || 0
        ),
        cancelledPurchases: Number(
          row.cancelled_purchases || 0
        ),
        totalSpent: Number(row.total_spent || 0),

        trades: 0,
        donations: 0
      }
    });
  } catch (error) {
    console.error(
      'GET /api/buyer/transactions/summary error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to load transaction summary.',
      error: error.message
    });
  }
});


/* ============================================================
   GET REVIEWS FOR ONE ORDER
============================================================ */

router.get('/:orderId/review', async (req, res) => {
  const buyerId = getUserId(req);
  const orderId = Number(req.params.orderId);

  if (!buyerId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.'
    });
  }

  if (!Number.isInteger(orderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID.'
    });
  }

  try {
    const orderCheck = await pool.query(
      `
        SELECT order_id, status
        FROM orders
        WHERE order_id = $1
          AND buyer_id = $2
        LIMIT 1
      `,
      [orderId, buyerId]
    );

    if (!orderCheck.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    const result = await pool.query(
      `
        SELECT
          review_id,
          reviewer_id,
          reviewee_id,
          listing_id,
          order_id,
          review_type,
          rating,
          comment,
          status,
          created_at,
          updated_at
        FROM reviews
        WHERE reviewer_id = $1
          AND order_id = $2
        ORDER BY created_at ASC, review_id ASC
      `,
      [buyerId, orderId]
    );

    const sellerReview =
      result.rows.find(
        (row) => row.review_type === 'SELLER'
      ) || null;

    const itemReviews = result.rows
      .filter((row) => row.review_type === 'ITEM')
      .map((row) => ({
        reviewId: row.review_id,
        reviewerId: row.reviewer_id,
        revieweeId: row.reviewee_id,
        listingId: row.listing_id,
        orderId: row.order_id,
        reviewType: row.review_type,
        rating: row.rating,
        comment: row.comment,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    return res.json({
      success: true,
      data: {
        review:
          sellerReview
            ? {
                reviewId: sellerReview.review_id,
                reviewerId: sellerReview.reviewer_id,
                revieweeId: sellerReview.reviewee_id,
                listingId: sellerReview.listing_id,
                orderId: sellerReview.order_id,
                reviewType: sellerReview.review_type,
                rating: sellerReview.rating,
                comment: sellerReview.comment,
                status: sellerReview.status,
                createdAt: sellerReview.created_at,
                updatedAt: sellerReview.updated_at
              }
            : null,

        sellerReview: sellerReview
          ? {
              reviewId: sellerReview.review_id,
              reviewerId: sellerReview.reviewer_id,
              revieweeId: sellerReview.reviewee_id,
              listingId: sellerReview.listing_id,
              orderId: sellerReview.order_id,
              reviewType: sellerReview.review_type,
              rating: sellerReview.rating,
              comment: sellerReview.comment,
              status: sellerReview.status,
              createdAt: sellerReview.created_at,
              updatedAt: sellerReview.updated_at
            }
          : null,

        itemReviews
      }
    });
  } catch (error) {
    console.error(
      'GET /api/buyer/transactions/:orderId/review error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to load transaction reviews.',
      error: error.message
    });
  }
});


/* ============================================================
   POST / UPDATE SELLER REVIEW
============================================================ */

router.post('/:orderId/review', async (req, res) => {
  const buyerId = getUserId(req);
  const orderId = Number(req.params.orderId);

  if (!buyerId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.'
    });
  }

  if (!Number.isInteger(orderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID.'
    });
  }

  const rating = Number(req.body?.rating);
  const comment =
    typeof req.body?.comment === 'string'
      ? req.body.comment.trim()
      : '';

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5.'
    });
  }

  try {
    const orderResult = await pool.query(
      `
        SELECT order_id, buyer_id, status
        FROM orders
        WHERE order_id = $1
          AND buyer_id = $2
        LIMIT 1
      `,
      [orderId, buyerId]
    );

    if (!orderResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Only completed transactions can be reviewed.'
      });
    }

    const itemResult = await pool.query(
      `
        SELECT
          oi.seller_id,
          oi.listing_id
        FROM order_items oi
        WHERE oi.order_id = $1
        ORDER BY oi.order_item_id ASC
        LIMIT 1
      `,
      [orderId]
    );

    if (!itemResult.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'This transaction has no item to review.'
      });
    }

    const sellerId = itemResult.rows[0].seller_id;

    const existingResult = await pool.query(
      `
        SELECT review_id
        FROM reviews
        WHERE order_id = $1
          AND reviewer_id = $2
          AND review_type = 'SELLER'
        LIMIT 1
      `,
      [orderId, buyerId]
    );

    let result;

    if (existingResult.rows.length) {
      result = await pool.query(
        `
          UPDATE reviews
          SET
            reviewee_id = $1,
            listing_id = NULL,
            rating = $2,
            comment = $3,
            status = 'PUBLISHED',
            updated_at = CURRENT_TIMESTAMP
          WHERE review_id = $4
          RETURNING
            review_id,
            reviewer_id,
            reviewee_id,
            listing_id,
            order_id,
            review_type,
            rating,
            comment,
            status,
            created_at,
            updated_at
        `,
        [
          sellerId,
          rating,
          comment || null,
          existingResult.rows[0].review_id
        ]
      );
    } else {
      result = await pool.query(
        `
          INSERT INTO reviews (
            reviewer_id,
            reviewee_id,
            listing_id,
            order_id,
            review_type,
            rating,
            comment,
            status
          )
          VALUES (
            $1,
            $2,
            NULL,
            $3,
            'SELLER',
            $4,
            $5,
            'PUBLISHED'
          )
          RETURNING
            review_id,
            reviewer_id,
            reviewee_id,
            listing_id,
            order_id,
            review_type,
            rating,
            comment,
            status,
            created_at,
            updated_at
        `,
        [
          buyerId,
          sellerId,
          orderId,
          rating,
          comment || null
        ]
      );
    }

    return res.json({
      success: true,
      message: existingResult.rows.length
        ? 'Seller review updated successfully.'
        : 'Seller review submitted successfully.',
      data: {
        review: result.rows[0]
      }
    });
  } catch (error) {
    console.error(
      'POST /api/buyer/transactions/:orderId/review error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to save seller review.',
      error: error.message
    });
  }
});


/* ============================================================
   POST / UPDATE ITEM REVIEW
============================================================ */

router.post('/:orderId/item-review', async (req, res) => {
  const buyerId = getUserId(req);
  const orderId = Number(req.params.orderId);
  const listingId = Number(req.body?.listingId);

  if (!buyerId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.'
    });
  }

  if (!Number.isInteger(orderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID.'
    });
  }

  if (!Number.isInteger(listingId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid listing ID.'
    });
  }

  const rating = Number(req.body?.rating);
  const comment =
    typeof req.body?.comment === 'string'
      ? req.body.comment.trim()
      : '';

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5.'
    });
  }

  try {
    const orderResult = await pool.query(
      `
        SELECT order_id, buyer_id, status
        FROM orders
        WHERE order_id = $1
          AND buyer_id = $2
        LIMIT 1
      `,
      [orderId, buyerId]
    );

    if (!orderResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    if (orderResult.rows[0].status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Only completed transactions can be reviewed.'
      });
    }

    const itemResult = await pool.query(
      `
        SELECT
          oi.order_item_id,
          oi.seller_id,
          oi.listing_id
        FROM order_items oi
        WHERE oi.order_id = $1
          AND oi.listing_id = $2
        LIMIT 1
      `,
      [orderId, listingId]
    );

    if (!itemResult.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'The selected item is not part of this transaction.'
      });
    }

    const sellerId = itemResult.rows[0].seller_id;

    const existingResult = await pool.query(
      `
        SELECT review_id
        FROM reviews
        WHERE order_id = $1
          AND reviewer_id = $2
          AND review_type = 'ITEM'
          AND listing_id = $3
        LIMIT 1
      `,
      [orderId, buyerId, listingId]
    );

    let result;

    if (existingResult.rows.length) {
      result = await pool.query(
        `
          UPDATE reviews
          SET
            reviewee_id = $1,
            listing_id = $2,
            rating = $3,
            comment = $4,
            status = 'PUBLISHED',
            updated_at = CURRENT_TIMESTAMP
          WHERE review_id = $5
          RETURNING
            review_id,
            reviewer_id,
            reviewee_id,
            listing_id,
            order_id,
            review_type,
            rating,
            comment,
            status,
            created_at,
            updated_at
        `,
        [
          sellerId,
          listingId,
          rating,
          comment || null,
          existingResult.rows[0].review_id
        ]
      );
    } else {
      result = await pool.query(
        `
          INSERT INTO reviews (
            reviewer_id,
            reviewee_id,
            listing_id,
            order_id,
            review_type,
            rating,
            comment,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'ITEM',
            $5,
            $6,
            'PUBLISHED'
          )
          RETURNING
            review_id,
            reviewer_id,
            reviewee_id,
            listing_id,
            order_id,
            review_type,
            rating,
            comment,
            status,
            created_at,
            updated_at
        `,
        [
          buyerId,
          sellerId,
          listingId,
          orderId,
          rating,
          comment || null
        ]
      );
    }

    return res.json({
      success: true,
      message: existingResult.rows.length
        ? 'Item review updated successfully.'
        : 'Item review submitted successfully.',
      data: {
        review: result.rows[0]
      }
    });
  } catch (error) {
    console.error(
      'POST /api/buyer/transactions/:orderId/item-review error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to save item review.',
      error: error.message
    });
  }
});


/* ============================================================
   GET ONE TRANSACTION
============================================================ */

router.get('/:orderId', async (req, res) => {
  const buyerId = getUserId(req);
  const orderId = Number(req.params.orderId);

  if (!buyerId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.'
    });
  }

  if (!Number.isInteger(orderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID.'
    });
  }

  try {
    const orderResult = await pool.query(
      `
        SELECT
          o.order_id,
          o.order_number,
          o.buyer_id,
          o.total_amount,
          o.status,
          o.shipping_address,
          o.notes,
          o.created_at,
          o.updated_at
        FROM orders o
        WHERE o.order_id = $1
          AND o.buyer_id = $2
        LIMIT 1
      `,
      [orderId, buyerId]
    );

    if (!orderResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    const itemResult = await pool.query(
      `
        SELECT
          oi.order_item_id,
          oi.order_id,
          oi.listing_id,
          oi.seller_id,
          oi.quantity,
          oi.unit_price,
          oi.subtotal,

          l.title,
          l.description,
          l.price,
          l.condition,
          l.quantity AS listing_quantity,
          l.location,
          l.size,
          l.listing_type,
          l.status AS listing_status,

          u.first_name AS seller_first_name,
          u.last_name AS seller_last_name,

          (
            SELECT li.image_url
            FROM listing_images li
            WHERE li.listing_id = l.listing_id
            ORDER BY li.is_primary DESC, li.sort_order ASC, li.image_id ASC
            LIMIT 1
          ) AS image_url

        FROM order_items oi

        JOIN listings l
          ON l.listing_id = oi.listing_id

        LEFT JOIN users u
          ON u.user_id = oi.seller_id

        WHERE oi.order_id = $1

        ORDER BY oi.order_item_id ASC
      `,
      [orderId]
    );

    return res.json({
      success: true,
      data: {
        order: {
          ...orderResult.rows[0],
          totalAmount: Number(
            orderResult.rows[0].total_amount || 0
          )
        },

        items: itemResult.rows.map((item) => ({
          orderItemId: item.order_item_id,
          orderId: item.order_id,
          listingId: item.listing_id,
          sellerId: item.seller_id,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price || 0),
          subtotal: Number(item.subtotal || 0),

          title: item.title,
          description: item.description,
          price: Number(item.price || 0),
          condition: item.condition,
          listingQuantity: item.listing_quantity,
          location: item.location,
          size: item.size,
          listingType: item.listing_type,
          listingStatus: item.listing_status,

          sellerName: [
            item.seller_first_name,
            item.seller_last_name
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),

          imageUrl: item.image_url
        }))
      }
    });
  } catch (error) {
    console.error(
      'GET /api/buyer/transactions/:orderId error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to load transaction details.',
      error: error.message
    });
  }
});


module.exports = router;
