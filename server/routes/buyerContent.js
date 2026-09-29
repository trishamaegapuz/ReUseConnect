/*
============================================================
ReUse Connect
Buyer Published Content Routes
============================================================

Purpose:
- Allows logged-in buyers to read published content
  created through Admin Content Management.
- Admin Content Management remains admin-only.
- Only PUBLISHED content is returned here.

Supported content types:
PAGE
ANNOUNCEMENT
BANNER
FAQ
POLICY
NEWS
============================================================
*/

const express = require('express');

const router = express.Router();

const pool = require('../config/db');

const {
  authMiddleware,
  buyerOnly
} = require('../middleware/authMiddleware');


/* ============================================================
   AUTHENTICATION
============================================================ */

router.use(
  authMiddleware,
  buyerOnly
);


/* ============================================================
   GET PUBLISHED CONTENT
============================================================ */

/*
GET /api/buyer/content

Default:
- ANNOUNCEMENT
- NEWS
- BANNER

Optional query:
?type=ANNOUNCEMENT
?type=NEWS
?type=BANNER
?type=FAQ
?type=POLICY
?type=PAGE

Optional:
?limit=6
*/

router.get('/', async (req, res) => {

  try {

    const {
      type,
      limit
    } = req.query;


    /* --------------------------------------------------------
       Allowed content types
    -------------------------------------------------------- */

    const allowedTypes = [
      'PAGE',
      'ANNOUNCEMENT',
      'BANNER',
      'FAQ',
      'POLICY',
      'NEWS'
    ];


    /* --------------------------------------------------------
       Default types for Buyer Dashboard
    -------------------------------------------------------- */

    const defaultTypes = [
      'ANNOUNCEMENT',
      'NEWS',
      'BANNER'
    ];


    /* --------------------------------------------------------
       Determine content types
    -------------------------------------------------------- */

    let contentTypes = defaultTypes;

    if (type) {

      const requestedType = String(type)
        .trim()
        .toUpperCase();

      if (!allowedTypes.includes(requestedType)) {

        return res.status(400).json({
          success: false,
          message: 'Invalid content type.'
        });

      }

      contentTypes = [requestedType];
    }


    /* --------------------------------------------------------
       Limit
    -------------------------------------------------------- */

    let requestedLimit = Number(limit || 6);

    if (!Number.isFinite(requestedLimit)) {
      requestedLimit = 6;
    }

    requestedLimit = Math.max(
      1,
      Math.min(
        requestedLimit,
        20
      )
    );


    /* --------------------------------------------------------
       Query
    -------------------------------------------------------- */

    const query = `
      SELECT
        content_id,
        title,
        slug,
        content_type,
        content,
        image_url,
        published_at,
        created_at,
        updated_at
      FROM contents
      WHERE status = 'PUBLISHED'
        AND content_type = ANY($1::text[])
      ORDER BY
        published_at DESC NULLS LAST,
        created_at DESC
      LIMIT $2
    `;


    const result = await pool.query(
      query,
      [
        contentTypes,
        requestedLimit
      ]
    );


    /* --------------------------------------------------------
       Response
    -------------------------------------------------------- */

    return res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {

    console.error(
      'Buyer published content error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load published content.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined
    });
  }

});


/* ============================================================
   EXPORT
============================================================ */

module.exports = router;