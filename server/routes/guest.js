const express = require('express');
const pool = require('../config/db');

const router = express.Router();

/*
============================================================
GET GUEST HOME DATA
============================================================
Returns:
- categories
- featured listings
- platform statistics
============================================================
*/
router.get('/home', async (req, res) => {
  try {
    const categoriesResult = await pool.query(`
      SELECT
        c.category_id,
        c.name,
        c.description,
        c.image_url,
        COUNT(l.listing_id)::INTEGER AS listing_count
      FROM categories c
      LEFT JOIN listings l
        ON l.category_id = c.category_id
        AND l.status = 'AVAILABLE'
      WHERE c.status = 'ACTIVE'
      GROUP BY
        c.category_id,
        c.name,
        c.description,
        c.image_url
      ORDER BY c.name ASC
    `);

    const listingsResult = await pool.query(`
      SELECT
        l.listing_id,
        l.title,
        l.description,
        l.price,
        l.condition,
        l.quantity,
        l.location,
        l.created_at,

        c.category_id,
        c.name AS category_name,

        u.user_id AS seller_id,
        u.first_name AS seller_first_name,
        u.last_name AS seller_last_name,
        u.profile_image AS seller_profile_image,

        COALESCE(
          ROUND(AVG(r.rating)::numeric, 1),
          0
        ) AS seller_rating,

        COUNT(DISTINCT r.review_id)::INTEGER AS review_count,

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

      INNER JOIN categories c
        ON c.category_id = l.category_id

      INNER JOIN users u
        ON u.user_id = l.seller_id

      LEFT JOIN reviews r
        ON r.reviewee_id = u.user_id
        AND r.status = 'PUBLISHED'

      WHERE
        l.status = 'AVAILABLE'
        AND c.status = 'ACTIVE'
        AND u.role = 'SELLER'
        AND u.status = 'ACTIVE'

      GROUP BY
        l.listing_id,
        l.title,
        l.description,
        l.price,
        l.condition,
        l.quantity,
        l.location,
        l.created_at,
        c.category_id,
        c.name,
        u.user_id,
        u.first_name,
        u.last_name,
        u.profile_image

      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    const statsResult = await pool.query(`
      SELECT
        (
          SELECT COUNT(*)
          FROM listings
          WHERE status = 'AVAILABLE'
        )::INTEGER AS available_listings,

        (
          SELECT COUNT(*)
          FROM users
          WHERE role = 'SELLER'
          AND status = 'ACTIVE'
        )::INTEGER AS active_sellers,

        (
          SELECT COUNT(*)
          FROM users
          WHERE status = 'ACTIVE'
        )::INTEGER AS active_users,

        (
          SELECT COUNT(*)
          FROM categories
          WHERE status = 'ACTIVE'
        )::INTEGER AS active_categories,

        (
          SELECT COUNT(*)
          FROM orders
          WHERE status IN ('COMPLETED', 'DELIVERED')
        )::INTEGER AS completed_orders
    `);

    return res.json({
      success: true,
      categories: categoriesResult.rows,
      listings: listingsResult.rows,
      stats: statsResult.rows[0]
    });

  } catch (error) {
    console.error('GUEST HOME ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Guest marketplace data could not be loaded.',
      error: error.message
    });
  }
});


/*
============================================================
GET CATEGORIES
============================================================
*/
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.category_id,
        c.name,
        c.description,
        c.image_url,
        COUNT(l.listing_id)::INTEGER AS listing_count
      FROM categories c
      LEFT JOIN listings l
        ON l.category_id = c.category_id
        AND l.status = 'AVAILABLE'
      WHERE c.status = 'ACTIVE'
      GROUP BY
        c.category_id,
        c.name,
        c.description,
        c.image_url
      ORDER BY c.name ASC
    `);

    res.json({
      success: true,
      categories: result.rows
    });

  } catch (error) {
    console.error('GUEST CATEGORIES ERROR:', error);

    res.status(500).json({
      success: false,
      message: 'Categories could not be loaded.',
      error: error.message
    });
  }
});


/*
============================================================
GET LISTINGS
============================================================

Supports:

?search=
?category=
?minPrice=
?maxPrice=
?condition=
?sort=
============================================================
*/
router.get('/listings', async (req, res) => {
  try {
    const {
      search = '',
      category = '',
      minPrice = '',
      maxPrice = '',
      condition = '',
      sort = 'newest'
    } = req.query;

    const values = [];
    const conditions = [
      `l.status = 'AVAILABLE'`,
      `c.status = 'ACTIVE'`,
      `u.role = 'SELLER'`,
      `u.status = 'ACTIVE'`
    ];

    /*
    SEARCH
    */
    if (search.trim()) {
      values.push(`%${search.trim()}%`);

      conditions.push(`
        (
          l.title ILIKE $${values.length}
          OR l.description ILIKE $${values.length}
          OR c.name ILIKE $${values.length}
          OR CONCAT(u.first_name, ' ', u.last_name)
             ILIKE $${values.length}
        )
      `);
    }

    /*
    CATEGORY
    */
    if (category.trim()) {
      values.push(category.trim());

      conditions.push(`
        c.category_id = $${values.length}
      `);
    }

    /*
    MIN PRICE
    */
    if (minPrice !== '' && !isNaN(Number(minPrice))) {
      values.push(Number(minPrice));

      conditions.push(`
        l.price >= $${values.length}
      `);
    }

    /*
    MAX PRICE
    */
    if (maxPrice !== '' && !isNaN(Number(maxPrice))) {
      values.push(Number(maxPrice));

      conditions.push(`
        l.price <= $${values.length}
      `);
    }

    /*
    CONDITION
    */
    if (condition.trim()) {
      values.push(condition.trim().toUpperCase());

      conditions.push(`
        l.condition = $${values.length}
      `);
    }

    /*
    SORT
    */
    let orderBy = `
      l.created_at DESC
    `;

    if (sort === 'price_low') {
      orderBy = `
        l.price ASC,
        l.created_at DESC
      `;
    }

    if (sort === 'price_high') {
      orderBy = `
        l.price DESC,
        l.created_at DESC
      `;
    }

    if (sort === 'oldest') {
      orderBy = `
        l.created_at ASC
      `;
    }

    if (sort === 'name') {
      orderBy = `
        l.title ASC
      `;
    }

    const query = `
      SELECT
        l.listing_id,
        l.title,
        l.description,
        l.price,
        l.condition,
        l.quantity,
        l.location,
        l.created_at,

        c.category_id,
        c.name AS category_name,

        u.user_id AS seller_id,
        u.first_name AS seller_first_name,
        u.last_name AS seller_last_name,
        u.profile_image AS seller_profile_image,

        COALESCE(
          ROUND(AVG(r.rating)::numeric, 1),
          0
        ) AS seller_rating,

        COUNT(DISTINCT r.review_id)::INTEGER AS review_count,

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

      INNER JOIN categories c
        ON c.category_id = l.category_id

      INNER JOIN users u
        ON u.user_id = l.seller_id

      LEFT JOIN reviews r
        ON r.reviewee_id = u.user_id
        AND r.status = 'PUBLISHED'

      WHERE ${conditions.join(' AND ')}

      GROUP BY
        l.listing_id,
        l.title,
        l.description,
        l.price,
        l.condition,
        l.quantity,
        l.location,
        l.created_at,
        c.category_id,
        c.name,
        u.user_id,
        u.first_name,
        u.last_name,
        u.profile_image

      ORDER BY ${orderBy}
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      count: result.rows.length,
      listings: result.rows
    });

  } catch (error) {
    console.error('GUEST LISTINGS ERROR:', error);

    res.status(500).json({
      success: false,
      message: 'Listings could not be loaded.',
      error: error.message
    });
  }
});


/*
============================================================
GET SINGLE LISTING
============================================================
*/
router.get('/listings/:id', async (req, res) => {
  try {
    const listingId = Number(req.params.id);

    if (!Number.isInteger(listingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID.'
      });
    }

    const listingResult = await pool.query(`
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
        c.description AS category_description,

        u.user_id AS seller_id,
        u.first_name AS seller_first_name,
        u.last_name AS seller_last_name,
        u.email AS seller_email,
        u.phone AS seller_phone,
        u.profile_image AS seller_profile_image,
        u.city AS seller_city,
        u.province AS seller_province,

        COALESCE(
          ROUND(AVG(r.rating)::numeric, 1),
          0
        ) AS seller_rating,

        COUNT(DISTINCT r.review_id)::INTEGER AS review_count

      FROM listings l

      INNER JOIN categories c
        ON c.category_id = l.category_id

      INNER JOIN users u
        ON u.user_id = l.seller_id

      LEFT JOIN reviews r
        ON r.reviewee_id = u.user_id
        AND r.status = 'PUBLISHED'

      WHERE
        l.listing_id = $1
        AND l.status = 'AVAILABLE'
        AND c.status = 'ACTIVE'
        AND u.role = 'SELLER'
        AND u.status = 'ACTIVE'

      GROUP BY
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
        c.name,
        c.description,
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image,
        u.city,
        u.province
    `, [listingId]);

    if (listingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.'
      });
    }

    const imagesResult = await pool.query(`
      SELECT
        image_id,
        image_url,
        is_primary,
        sort_order
      FROM listing_images
      WHERE listing_id = $1
      ORDER BY
        is_primary DESC,
        sort_order ASC,
        image_id ASC
    `, [listingId]);

    res.json({
      success: true,
      listing: listingResult.rows[0],
      images: imagesResult.rows
    });

  } catch (error) {
    console.error('GUEST LISTING DETAIL ERROR:', error);

    res.status(500).json({
      success: false,
      message: 'Listing details could not be loaded.',
      error: error.message
    });
  }
});


module.exports = router;