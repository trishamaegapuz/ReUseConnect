/*
============================================================
ReUse Connect
Seller Transactions API
============================================================

GET    /api/seller/transactions
GET    /api/seller/transactions/stats
GET    /api/seller/transactions/orders/:orderId
PATCH  /api/seller/transactions/orders/:orderId/status
GET    /api/seller/transactions/earnings
GET    /api/seller/transactions/reviews
GET    /api/seller/transactions/orders/:orderId/review
POST   /api/seller/transactions/orders/:orderId/review

Reviews:
  /reviews                    → Buyer → Seller AND Buyer → Item
  /orders/:orderId/review     → Seller's own review of the buyer

Review types:
  SELLER → Buyer rates Seller
  ITEM   → Buyer rates Item
============================================================
*/

const express = require('express');
const router = express.Router();

const pool = require('../config/db');


/* ============================================================
   CONSTANTS
============================================================ */

const ALLOWED_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REJECTED'
];


/* ============================================================
   HELPERS
============================================================ */

function getSellerId(req) {
  const raw =
    req.user?.user_id ??
    req.user?.userId ??
    req.user?.id ??
    req.headers['x-user-id'];

  const id = Number(raw);

  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

function sendServerError(res, error, message = 'Server error') {
  console.error(`[Seller Transactions] ${message}:`, error);
  return res.status(500).json({ success: false, message });
}

function normalizeOrderStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'CANCELED') return 'CANCELLED';
  return normalized;
}

function isAllowedOrderStatus(status) {
  return ALLOWED_ORDER_STATUSES.includes(status);
}


/* ============================================================
   GET TRANSACTIONS / ORDERS
============================================================ */

router.get('/', async (req, res) => {

  const sellerId = getSellerId(req);

  if (!sellerId) {
    return res.status(401).json({
      success: false,
      message: 'Seller authentication is required.'
    });
  }

  try {

    const { status = 'all', search = '', page = 1, limit = 8 } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(Math.max(Number(limit) || 8, 1), 50);
    const offset = (currentPage - 1) * perPage;

    const params = [sellerId];
    let where = `WHERE oi.seller_id = $1`;

    const requestedFilterStatus =
      String(status || '').trim().toLowerCase();

    if (requestedFilterStatus && requestedFilterStatus !== 'all') {
      const normalizedFilterStatus =
        normalizeOrderStatus(requestedFilterStatus);

      if (isAllowedOrderStatus(normalizedFilterStatus)) {
        params.push(normalizedFilterStatus);
        where += ` AND UPPER(o.status) = $${params.length}`;
      }
    }

    const cleanSearch = String(search || '').trim();

    if (cleanSearch) {
      params.push(`%${cleanSearch}%`);
      where += `
        AND (
          LOWER(COALESCE(o.order_number, '')) LIKE LOWER($${params.length})
          OR LOWER(CONCAT(COALESCE(b.first_name, ''), ' ', COALESCE(b.last_name, ''))) LIKE LOWER($${params.length})
          OR LOWER(COALESCE(l.title, '')) LIKE LOWER($${params.length})
        )
      `;
    }

    const countQuery = `
      SELECT COUNT(DISTINCT o.order_id)::int AS total
      FROM orders o
      INNER JOIN order_items oi ON oi.order_id = o.order_id
      INNER JOIN listings l ON l.listing_id = oi.listing_id
      INNER JOIN users b ON b.user_id = o.buyer_id
      ${where}
    `;

    const countResult = await pool.query(countQuery, params);
    const total = Number(countResult.rows[0]?.total || 0);

    params.push(perPage);
    params.push(offset);

    const dataQuery = `
      SELECT
        o.order_id,
        o.order_number,
        o.status AS order_status,
        o.shipping_address,
        o.notes,
        o.created_at,
        o.updated_at,

        b.user_id AS buyer_id,
        b.first_name AS buyer_first_name,
        b.last_name AS buyer_last_name,
        b.email AS buyer_email,
        b.phone AS buyer_phone,
        b.profile_image AS buyer_profile_image,

        oi.order_item_id,
        oi.listing_id,
        oi.quantity,
        oi.unit_price,
        oi.subtotal,

        l.title AS listing_title,
        l.description AS listing_description,
        l.condition AS listing_condition,
        l.location AS listing_location,

        c.category_id,
        c.name AS category_name,

        (
          SELECT li.image_url
          FROM listing_images li
          WHERE li.listing_id = l.listing_id
          ORDER BY li.is_primary DESC, li.sort_order ASC, li.image_id ASC
          LIMIT 1
        ) AS listing_image,

        EXISTS (
          SELECT 1
          FROM reviews r_my
          WHERE r_my.order_id = o.order_id
            AND r_my.reviewer_id = $1
            AND r_my.review_type = 'SELLER'
        ) AS has_my_review

      FROM orders o

      INNER JOIN order_items oi ON oi.order_id = o.order_id
      INNER JOIN listings l ON l.listing_id = oi.listing_id
      INNER JOIN users b ON b.user_id = o.buyer_id
      LEFT JOIN categories c ON c.category_id = l.category_id

      ${where}

      ORDER BY o.created_at DESC, o.order_id DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const result = await pool.query(dataQuery, params);

    const orders = result.rows.map((row) => ({
      orderId: row.order_id,
      orderNumber: row.order_number,
      status: normalizeOrderStatus(row.order_status),
      date: row.created_at,
      updatedAt: row.updated_at,

      buyer: {
        id: row.buyer_id,
        name: `${row.buyer_first_name || ''} ${row.buyer_last_name || ''}`.trim(),
        email: row.buyer_email,
        phone: row.buyer_phone,
        profileImage: row.buyer_profile_image
      },

      item: {
        orderItemId: row.order_item_id,
        listingId: row.listing_id,
        title: row.listing_title || 'Untitled Item',
        description: row.listing_description,
        categoryId: row.category_id,
        categoryName: row.category_name || 'Uncategorized',
        condition: row.listing_condition,
        location: row.listing_location,
        image: row.listing_image
      },

      quantity: Number(row.quantity || 0),
      unitPrice: Number(row.unit_price || 0),
      subtotal: Number(row.subtotal || 0),
      shippingAddress: row.shipping_address,
      notes: row.notes,
      hasMyReview: Boolean(row.has_my_review)
    }));

    return res.json({
      success: true,
      data: orders,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage)
      }
    });

  } catch (error) {
    return sendServerError(res, error, 'Unable to load seller transactions.');
  }
});


/* ============================================================
   GET TRANSACTION STATS
============================================================ */

router.get('/stats', async (req, res) => {

  const sellerId = getSellerId(req);

  if (!sellerId) {
    return res.status(401).json({
      success: false,
      message: 'Seller authentication is required.'
    });
  }

  try {

    const statsQuery = `
      WITH seller_orders AS (
        SELECT DISTINCT
          o.order_id,
          UPPER(COALESCE(o.status, '')) AS status,
          o.created_at
        FROM orders o
        INNER JOIN order_items oi ON oi.order_id = o.order_id
        WHERE oi.seller_id = $1
      )
      SELECT
        COUNT(*)::int AS total_orders,
        COUNT(*) FILTER (WHERE status IN ('PENDING','CONFIRMED','PROCESSING','SHIPPED'))::int AS pending_orders,
        COUNT(*) FILTER (WHERE status IN ('COMPLETED','DELIVERED'))::int AS completed_orders,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled_orders,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('week', CURRENT_DATE))::int AS this_week_orders,
        COUNT(*) FILTER (
          WHERE created_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 days'
            AND created_at < date_trunc('week', CURRENT_DATE)
        )::int AS previous_week_orders
      FROM seller_orders
    `;

    const statsResult = await pool.query(statsQuery, [sellerId]);
    const row = statsResult.rows[0] || {};

    const thisWeek = Number(row.this_week_orders || 0);
    const previousWeek = Number(row.previous_week_orders || 0);

    return res.json({
      success: true,
      data: {
        totalOrders: Number(row.total_orders || 0),
        pendingOrders: Number(row.pending_orders || 0),
        completedOrders: Number(row.completed_orders || 0),
        cancelledOrders: Number(row.cancelled_orders || 0),
        thisWeekOrders: thisWeek,
        previousWeekOrders: previousWeek,
        weeklyDifference: thisWeek - previousWeek
      }
    });

  } catch (error) {
    return sendServerError(res, error, 'Unable to load transaction statistics.');
  }
});


/* ============================================================
   GET SINGLE ORDER DETAILS
============================================================ */

router.get('/orders/:orderId', async (req, res) => {

  const sellerId = getSellerId(req);
  const orderId = Number(req.params.orderId);

  if (!sellerId) {
    return res.status(401).json({
      success: false,
      message: 'Seller authentication is required.'
    });
  }

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID.'
    });
  }

  try {

    const orderQuery = `
      SELECT
        o.order_id, o.order_number, o.status, o.shipping_address,
        o.notes, o.created_at, o.updated_at, o.total_amount,
        b.user_id AS buyer_id,
        b.first_name AS buyer_first_name,
        b.last_name AS buyer_last_name,
        b.email AS buyer_email,
        b.phone AS buyer_phone,
        b.profile_image AS buyer_profile_image
      FROM orders o
      INNER JOIN users b ON b.user_id = o.buyer_id
      WHERE o.order_id = $1
        AND EXISTS (
          SELECT 1 FROM order_items oi_check
          WHERE oi_check.order_id = o.order_id
            AND oi_check.seller_id = $2
        )
      LIMIT 1
    `;

    const orderResult = await pool.query(orderQuery, [orderId, sellerId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    const order = orderResult.rows[0];

    const itemsQuery = `
      SELECT
        oi.order_item_id, oi.listing_id, oi.quantity,
        oi.unit_price, oi.subtotal,
        l.title, l.description, l.condition, l.location,
        c.name AS category_name,
        (
          SELECT li.image_url FROM listing_images li
          WHERE li.listing_id = l.listing_id
          ORDER BY li.is_primary DESC, li.sort_order ASC, li.image_id ASC
          LIMIT 1
        ) AS image_url
      FROM order_items oi
      INNER JOIN listings l ON l.listing_id = oi.listing_id
      LEFT JOIN categories c ON c.category_id = l.category_id
      WHERE oi.order_id = $1 AND oi.seller_id = $2
      ORDER BY oi.order_item_id ASC
    `;

    const itemsResult = await pool.query(itemsQuery, [orderId, sellerId]);

    const sellerSubtotal = itemsResult.rows.reduce(
      (sum, item) => sum + Number(item.subtotal || 0),
      0
    );

    return res.json({
      success: true,
      data: {
        orderId: order.order_id,
        orderNumber: order.order_number,
        status: normalizeOrderStatus(order.status),
        date: order.created_at,
        updatedAt: order.updated_at,
        buyer: {
          id: order.buyer_id,
          name: `${order.buyer_first_name || ''} ${order.buyer_last_name || ''}`.trim(),
          email: order.buyer_email,
          phone: order.buyer_phone,
          profileImage: order.buyer_profile_image
        },
        shippingAddress: order.shipping_address,
        notes: order.notes,
        orderTotal: Number(order.total_amount || 0),
        sellerSubtotal,
        items: itemsResult.rows.map((item) => ({
          orderItemId: item.order_item_id,
          listingId: item.listing_id,
          title: item.title || 'Untitled Item',
          description: item.description,
          categoryName: item.category_name || 'Uncategorized',
          condition: item.condition,
          location: item.location,
          image: item.image_url,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unit_price || 0),
          subtotal: Number(item.subtotal || 0)
        }))
      }
    });

  } catch (error) {
    return sendServerError(res, error, 'Unable to load order details.');
  }
});


/* ============================================================
   UPDATE ORDER STATUS
============================================================ */

router.patch('/orders/:orderId/status', async (req, res) => {

  const sellerId = getSellerId(req);
  const orderId = Number(req.params.orderId);

  if (!sellerId) {
    return res.status(401).json({
      success: false,
      message: 'Seller authentication is required.'
    });
  }

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID.'
    });
  }

  const requestedStatus = normalizeOrderStatus(req.body?.status);

  if (!isAllowedOrderStatus(requestedStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order status.',
      allowedStatuses: ALLOWED_ORDER_STATUSES
    });
  }

  try {

    const updateQuery = `
      UPDATE orders
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $2
        AND EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = orders.order_id
            AND oi.seller_id = $3
        )
      RETURNING order_id, order_number, status, updated_at
    `;

    const result = await pool.query(updateQuery, [
      requestedStatus, orderId, sellerId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or does not belong to this seller.'
      });
    }

    const updatedOrder = result.rows[0];

    return res.json({
      success: true,
      message: 'Order status updated successfully.',
      data: {
        orderId: updatedOrder.order_id,
        orderNumber: updatedOrder.order_number,
        status: normalizeOrderStatus(updatedOrder.status),
        updatedAt: updatedOrder.updated_at
      }
    });

  } catch (error) {
    return sendServerError(res, error, 'Unable to update order status.');
  }
});


/* ============================================================
   EARNINGS
============================================================ */

router.get('/earnings', async (req, res) => {

  const sellerId = getSellerId(req);

  if (!sellerId) {
    return res.status(401).json({
      success: false,
      message: 'Seller authentication is required.'
    });
  }

  try {

    const earningsQuery = `
      SELECT
        COALESCE(SUM(CASE
          WHEN UPPER(o.status) IN ('COMPLETED','DELIVERED')
          THEN oi.subtotal ELSE 0 END), 0)::numeric AS total_earnings,

        COALESCE(SUM(CASE
          WHEN UPPER(o.status) IN ('PENDING','CONFIRMED','PROCESSING','SHIPPED')
          THEN oi.subtotal ELSE 0 END), 0)::numeric AS pending_earnings,

        COUNT(DISTINCT CASE
          WHEN UPPER(o.status) IN ('COMPLETED','DELIVERED')
          THEN o.order_id END)::int AS completed_orders,

        COUNT(DISTINCT CASE
          WHEN UPPER(o.status) IN ('PENDING','CONFIRMED','PROCESSING','SHIPPED')
          THEN o.order_id END)::int AS active_orders

      FROM order_items oi
      INNER JOIN orders o ON o.order_id = oi.order_id
      WHERE oi.seller_id = $1
    `;

    const result = await pool.query(earningsQuery, [sellerId]);
    const row = result.rows[0] || {};

    return res.json({
      success: true,
      data: {
        totalEarnings: Number(row.total_earnings || 0),
        pendingEarnings: Number(row.pending_earnings || 0),
        completedOrders: Number(row.completed_orders || 0),
        activeOrders: Number(row.active_orders || 0)
      }
    });

  } catch (error) {
    return sendServerError(res, error, 'Unable to load seller earnings.');
  }
});


/* ============================================================
   REVIEWS RECEIVED BY THE SELLER
   ------------------------------------------------------------
   Includes:
     1. Buyer → Seller reviews (review_type = SELLER)
     2. Buyer → Item reviews   (review_type = ITEM)

   The seller only receives reviews for:
     - their own seller account
     - listings that belong to this seller
============================================================ */

router.get('/reviews', async (req, res) => {

  const sellerId = getSellerId(req);

  if (!sellerId) {
    return res.status(401).json({
      success: false,
      message: 'Seller authentication is required.'
    });
  }

  try {

    const reviewsQuery = `
      SELECT
        r.review_id,
        r.review_type,
        r.listing_id,
        r.order_id,
        r.rating,
        r.comment,
        r.status,
        r.created_at,
        r.updated_at,

        u.user_id AS reviewer_id,
        u.first_name AS reviewer_first_name,
        u.last_name AS reviewer_last_name,
        u.profile_image AS reviewer_profile_image,

        l.title AS listing_title,

        (
          SELECT li.image_url
          FROM listing_images li
          WHERE li.listing_id = l.listing_id
          ORDER BY li.is_primary DESC, li.sort_order ASC, li.image_id ASC
          LIMIT 1
        ) AS listing_image

      FROM reviews r

      INNER JOIN users u
        ON u.user_id = r.reviewer_id

      LEFT JOIN listings l
        ON l.listing_id = r.listing_id

      WHERE r.status = 'PUBLISHED'
        AND (
          (
            r.review_type = 'SELLER'
            AND r.reviewee_id = $1
          )
          OR
          (
            r.review_type = 'ITEM'
            AND l.seller_id = $1
            AND r.listing_id IS NOT NULL
          )
        )

      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(reviewsQuery, [sellerId]);

    const reviews = result.rows.map((row) => ({
      reviewId: row.review_id,
      reviewType: row.review_type,
      listingId: row.listing_id,
      orderId: row.order_id,
      rating: Number(row.rating || 0),
      comment: row.comment,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,

      reviewer: {
        id: row.reviewer_id,
        name: `${row.reviewer_first_name || ''} ${row.reviewer_last_name || ''}`.trim(),
        profileImage: row.reviewer_profile_image
      },

      listing: {
        title: row.listing_title || 'Listing',
        image: row.listing_image
      }
    }));

    /* --------------------------------------------------------
       SELLER RATING SUMMARY
    -------------------------------------------------------- */

    const sellerSummaryResult = await pool.query(
      `
      SELECT
        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS average_rating,
        COUNT(*)::int AS review_count
      FROM reviews r
      WHERE r.reviewee_id = $1
        AND r.review_type = 'SELLER'
        AND r.status = 'PUBLISHED'
      `,
      [sellerId]
    );

    /* --------------------------------------------------------
       ITEM RATING SUMMARY
       One row per seller listing that has Buyer → Item reviews.
    -------------------------------------------------------- */

    const itemSummaryResult = await pool.query(
      `
      SELECT
        l.listing_id,
        l.title,
        (
          SELECT li.image_url
          FROM listing_images li
          WHERE li.listing_id = l.listing_id
          ORDER BY li.is_primary DESC, li.sort_order ASC, li.image_id ASC
          LIMIT 1
        ) AS image,
        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS average_rating,
        COUNT(r.review_id)::int AS review_count
      FROM listings l
      LEFT JOIN reviews r
        ON r.listing_id = l.listing_id
       AND r.review_type = 'ITEM'
       AND r.status = 'PUBLISHED'
      WHERE l.seller_id = $1
      GROUP BY l.listing_id, l.title
      HAVING COUNT(r.review_id) > 0
      ORDER BY l.title ASC
      `,
      [sellerId]
    );

    const sellerSummary = sellerSummaryResult.rows[0] || {};

    const itemSummaries = itemSummaryResult.rows.map((row) => ({
      listingId: row.listing_id,
      title: row.title || 'Untitled Item',
      image: row.image,
      averageRating: Number(row.average_rating || 0),
      reviewCount: Number(row.review_count || 0)
    }));

    return res.json({
      success: true,
      data: reviews,
      summary: {
        seller: {
          averageRating: Number(sellerSummary.average_rating || 0),
          reviewCount: Number(sellerSummary.review_count || 0)
        },
        items: itemSummaries
      }
    });

  } catch (error) {
    return sendServerError(res, error, 'Unable to load seller reviews.');
  }
});


/* ============================================================
   GET SELLER'S OWN REVIEW OF THE BUYER (for one order)
============================================================ */

router.get('/orders/:orderId/review', async (req, res) => {

  const sellerId = getSellerId(req);
  const orderId = Number(req.params.orderId);

  if (!sellerId) {
    return res.status(401).json({
      success: false,
      message: 'Seller authentication is required.'
    });
  }

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID.'
    });
  }

  try {

    const orderCheck = await pool.query(
      `
      SELECT o.order_id
      FROM orders o
      WHERE o.order_id = $1
        AND EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.order_id
            AND oi.seller_id = $2
        )
      LIMIT 1
      `,
      [orderId, sellerId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    const reviewResult = await pool.query(
      `
      SELECT
        review_id, reviewer_id, reviewee_id,
        listing_id, order_id, review_type,
        rating, comment,
        status, created_at, updated_at
      FROM reviews
      WHERE reviewer_id = $1
        AND order_id = $2
        AND review_type = 'SELLER'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [sellerId, orderId]
    );

    return res.json({
      success: true,
      data: {
        review: reviewResult.rows[0] || null
      }
    });

  } catch (error) {
    return sendServerError(res, error, 'Unable to load review.');
  }
});


/* ============================================================
   CREATE / UPDATE SELLER'S REVIEW OF THE BUYER
   ------------------------------------------------------------
   Seller → Buyer.
   This remains review_type = SELLER because this review is
   about the Buyer, not about the Seller's listing/item.
============================================================ */

router.post('/orders/:orderId/review', async (req, res) => {

  const sellerId = getSellerId(req);
  const orderId = Number(req.params.orderId);

  if (!sellerId) {
    return res.status(401).json({
      success: false,
      message: 'Seller authentication is required.'
    });
  }

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID.'
    });
  }

  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment || '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5.'
    });
  }

  const client = await pool.connect();

  try {

    const orderResult = await client.query(
      `
      SELECT o.order_id, o.buyer_id, o.status
      FROM orders o
      WHERE o.order_id = $1
        AND EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.order_id
            AND oi.seller_id = $2
        )
      LIMIT 1
      `,
      [orderId, sellerId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    const order = orderResult.rows[0];

    if (String(order.status || '').toLowerCase() !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed transactions can be reviewed.'
      });
    }

    const buyerId = order.buyer_id;

    if (Number(buyerId) === Number(sellerId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot review yourself.'
      });
    }

    await client.query('BEGIN');

    const existingResult = await client.query(
      `
      SELECT review_id
      FROM reviews
      WHERE reviewer_id = $1
        AND order_id = $2
        AND review_type = 'SELLER'
      LIMIT 1
      FOR UPDATE
      `,
      [sellerId, orderId]
    );

    let review;

    if (existingResult.rows.length > 0) {

      const reviewId = existingResult.rows[0].review_id;

      const updateResult = await client.query(
        `
        UPDATE reviews
        SET
          reviewee_id = $1,
          listing_id  = NULL,
          review_type = 'SELLER',
          rating      = $2,
          comment     = $3,
          status      = 'PUBLISHED',
          updated_at  = CURRENT_TIMESTAMP
        WHERE review_id = $4
          AND reviewer_id = $5
        RETURNING
          review_id, reviewer_id, reviewee_id, listing_id,
          order_id, review_type, rating, comment,
          status, created_at, updated_at
        `,
        [buyerId, rating, comment || null, reviewId, sellerId]
      );

      review = updateResult.rows[0];

    } else {

      const insertResult = await client.query(
        `
        INSERT INTO reviews (
          reviewer_id, reviewee_id, listing_id, order_id,
          review_type, rating, comment, status
        )
        VALUES ($1, $2, NULL, $3, 'SELLER', $4, $5, 'PUBLISHED')
        RETURNING
          review_id, reviewer_id, reviewee_id, listing_id,
          order_id, review_type, rating, comment,
          status, created_at, updated_at
        `,
        [sellerId, buyerId, orderId, rating, comment || null]
      );

      review = insertResult.rows[0];
    }

    await client.query('COMMIT');

    return res
      .status(existingResult.rows.length > 0 ? 200 : 201)
      .json({
        success: true,
        message:
          existingResult.rows.length > 0
            ? 'Review updated successfully.'
            : 'Review submitted successfully.',
        data: { review }
      });

  } catch (error) {

    await client.query('ROLLBACK').catch(() => {});

    return sendServerError(res, error, 'Unable to save review.');

  } finally {
    client.release();
  }
});


module.exports = router;
