const express = require('express');

const pool = require('../config/db');

const {
  authMiddleware,
  sellerOnly
} = require('../middleware/authMiddleware');

const router = express.Router();


// ============================================================
// SELLER CONTENT ROUTE PROTECTION
// ============================================================

router.use(
  authMiddleware,
  sellerOnly
);


// ============================================================
// ALLOWED CONTENT TYPES
// ============================================================

const ALLOWED_TYPES = new Set([
  'PAGE',
  'ANNOUNCEMENT',
  'BANNER',
  'FAQ',
  'POLICY',
  'NEWS'
]);


// ============================================================
// GET PUBLISHED SELLER CONTENT
// GET /api/seller/content
//
// Seller can only VIEW published content.
//
// Default:
// ANNOUNCEMENT
// NEWS
// BANNER
// ============================================================

router.get(
  '/',
  async (req, res) => {

    try {

      const requestedType =
        String(req.query.type || '')
          .trim()
          .toUpperCase();

      const limitValue =
        Number(req.query.limit || 6);

      const limit =
        Number.isFinite(limitValue)
          ? Math.min(
              Math.max(
                Math.trunc(limitValue),
                1
              ),
              20
            )
          : 6;


      const defaultTypes = [
        'ANNOUNCEMENT',
        'NEWS',
        'BANNER'
      ];


      let query = `
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
      `;

      const values = [];


      // ======================================================
      // FILTER BY CONTENT TYPE
      // ======================================================

      if (requestedType) {

        if (!ALLOWED_TYPES.has(requestedType)) {

          return res.status(400).json({
            success: false,
            message: 'Invalid content type.'
          });

        }

        values.push(requestedType);

        query += `
          AND content_type = $${values.length}
        `;

      } else {

        values.push(defaultTypes);

        query += `
          AND content_type = ANY(
            $${values.length}::text[]
          )
        `;

      }


      // ======================================================
      // SORT + LIMIT
      // ======================================================

      query += `
        ORDER BY
          published_at DESC NULLS LAST,
          created_at DESC

        LIMIT $${values.length + 1}
      `;

      values.push(limit);


      // ======================================================
      // DATABASE QUERY
      // ======================================================

      const result =
        await pool.query(
          query,
          values
        );


      // ======================================================
      // RESPONSE
      // ======================================================

      return res.json({

        success: true,

        data:
          result.rows,

        total:
          result.rows.length

      });

    } catch (error) {

      console.error(
        'GET /api/seller/content error:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load published content.',

        error:
          error.message

      });

    }

  }
);


module.exports = router;