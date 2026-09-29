const express = require('express');
const pool = require('../config/db');

const {
  authMiddleware,
  adminOnly
} = require('../middleware/authMiddleware');

const router = express.Router();

/*
============================================================
ADMIN AUTHENTICATION
============================================================
*/
router.use(
  authMiddleware,
  adminOnly
);


/*
============================================================
HELPERS
============================================================
*/

const ALLOWED_TYPES = [
  'PAGE',
  'ANNOUNCEMENT',
  'BANNER',
  'FAQ',
  'POLICY',
  'NEWS'
];

const ALLOWED_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED'
];


const createSlug = (title) => {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};


const getUniqueSlug = async (
  title,
  excludeId = null
) => {

  let baseSlug =
    createSlug(title) ||
    `content-${Date.now()}`;

  let slug = baseSlug;
  let counter = 1;

  while (true) {

    const values = [slug];

    let query = `
      SELECT content_id
      FROM contents
      WHERE slug = $1
    `;

    if (excludeId) {
      values.push(excludeId);

      query += `
        AND content_id <> $2
      `;
    }

    query += `
      LIMIT 1
    `;

    const result =
      await pool.query(
        query,
        values
      );

    if (result.rows.length === 0) {
      return slug;
    }

    counter += 1;

    slug =
      `${baseSlug}-${counter}`;
  }
};


/*
============================================================
GET SUMMARY / KPI
GET /api/admin/content/summary
============================================================
*/

router.get(
  '/summary',
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT
            COUNT(*)::int AS total_content_items,

            COUNT(*) FILTER (
              WHERE content_type = 'ANNOUNCEMENT'
            )::int AS total_announcements,

            COUNT(*) FILTER (
              WHERE content_type = 'PAGE'
            )::int AS total_pages,

            COUNT(*) FILTER (
              WHERE status = 'PUBLISHED'
            )::int AS published,

            COUNT(*) FILTER (
              WHERE status = 'DRAFT'
            )::int AS drafts,

            COUNT(*) FILTER (
              WHERE status = 'ARCHIVED'
            )::int AS archived

          FROM contents
        `);

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {

      console.error(
        'CONTENT SUMMARY ERROR:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Unable to load content summary.'
      });
    }
  }
);


/*
============================================================
GET CONTENT LIST
GET /api/admin/content/items
============================================================
*/

router.get(
  '/items',
  async (req, res) => {

    try {

      const {
        type,
        status,
        search,
        page = 1,
        limit = 8
      } = req.query;


      const safePage =
        Math.max(
          parseInt(page, 10) || 1,
          1
        );

      const safeLimit =
        Math.min(
          Math.max(
            parseInt(limit, 10) || 8,
            1
          ),
          50
        );

      const offset =
        (safePage - 1) * safeLimit;


      const values = [];
      const conditions = [];


      /*
      CONTENT TYPE
      */

      if (
        type &&
        type !== 'ALL'
      ) {

        if (
          !ALLOWED_TYPES.includes(
            String(type).toUpperCase()
          )
        ) {

          return res.status(400).json({
            success: false,
            message: 'Invalid content type.'
          });
        }

        values.push(
          String(type).toUpperCase()
        );

        conditions.push(
          `c.content_type = $${values.length}`
        );
      }


      /*
      STATUS
      */

      if (
        status &&
        status !== 'ALL'
      ) {

        if (
          !ALLOWED_STATUSES.includes(
            String(status).toUpperCase()
          )
        ) {

          return res.status(400).json({
            success: false,
            message: 'Invalid content status.'
          });
        }

        values.push(
          String(status).toUpperCase()
        );

        conditions.push(
          `c.status = $${values.length}`
        );
      }


      /*
      SEARCH
      */

      if (
        search &&
        String(search).trim()
      ) {

        values.push(
          `%${String(search).trim()}%`
        );

        conditions.push(`
          (
            c.title ILIKE $${values.length}
            OR c.slug ILIKE $${values.length}
            OR COALESCE(c.content, '') ILIKE $${values.length}
          )
        `);
      }


      const whereClause =
        conditions.length > 0
          ? `WHERE ${conditions.join(' AND ')}`
          : '';


      /*
      TOTAL COUNT
      */

      const countResult =
        await pool.query(
          `
            SELECT
              COUNT(*)::int AS total
            FROM contents c
            ${whereClause}
          `,
          values
        );


      /*
      CONTENT ROWS
      */

      const listValues = [
        ...values,
        safeLimit,
        offset
      ];


      const result =
        await pool.query(
          `
            SELECT
              c.content_id,
              c.title,
              c.slug,
              c.content_type,
              c.content,
              c.image_url,
              c.status,
              c.published_at,
              c.created_at,
              c.updated_at,

              CASE
                WHEN u.user_id IS NOT NULL
                THEN
                  TRIM(
                    CONCAT(
                      u.first_name,
                      ' ',
                      u.last_name
                    )
                  )
                ELSE
                  'System'
              END AS author_name,

              u.email AS author_email

            FROM contents c

            LEFT JOIN users u
              ON u.user_id = c.created_by

            ${whereClause}

            ORDER BY
              c.created_at DESC

            LIMIT $${values.length + 1}
            OFFSET $${values.length + 2}
          `,
          listValues
        );


      res.json({
        success: true,

        data: result.rows,

        pagination: {
          page: safePage,
          limit: safeLimit,
          total: countResult.rows[0].total,
          totalPages:
            Math.ceil(
              countResult.rows[0].total /
              safeLimit
            )
        }
      });

    } catch (error) {

      console.error(
        'CONTENT LIST ERROR:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Unable to load content records.'
      });
    }
  }
);


/*
============================================================
GET SINGLE CONTENT
GET /api/admin/content/items/:id
============================================================
*/

router.get(
  '/items/:id',
  async (req, res) => {

    try {

      const contentId =
        Number(req.params.id);

      if (
        !Number.isInteger(contentId)
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid content ID.'
        });
      }


      const result =
        await pool.query(
          `
            SELECT
              c.content_id,
              c.title,
              c.slug,
              c.content_type,
              c.content,
              c.image_url,
              c.status,
              c.published_at,
              c.created_at,
              c.updated_at,

              CASE
                WHEN u.user_id IS NOT NULL
                THEN
                  TRIM(
                    CONCAT(
                      u.first_name,
                      ' ',
                      u.last_name
                    )
                  )
                ELSE
                  'System'
              END AS author_name,

              u.email AS author_email

            FROM contents c

            LEFT JOIN users u
              ON u.user_id = c.created_by

            WHERE c.content_id = $1
          `,
          [contentId]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            'Content record not found.'
        });
      }


      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {

      console.error(
        'GET CONTENT ERROR:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Unable to load content.'
      });
    }
  }
);


/*
============================================================
CREATE CONTENT
POST /api/admin/content/items
============================================================
*/

router.post(
  '/items',
  async (req, res) => {

    try {

      const {
        title,
        contentType,
        content,
        imageUrl,
        status
      } = req.body;


      if (
        !title ||
        !String(title).trim()
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Title is required.'
        });
      }


      const normalizedType =
        String(
          contentType || 'PAGE'
        ).toUpperCase();


      const normalizedStatus =
        String(
          status || 'DRAFT'
        ).toUpperCase();


      if (
        !ALLOWED_TYPES.includes(
          normalizedType
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid content type.'
        });
      }


      if (
        !ALLOWED_STATUSES.includes(
          normalizedStatus
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid content status.'
        });
      }


      const slug =
        await getUniqueSlug(
          title
        );


      const publishedAt =
        normalizedStatus === 'PUBLISHED'
          ? new Date()
          : null;


      const result =
        await pool.query(
          `
            INSERT INTO contents (
              title,
              slug,
              content_type,
              content,
              image_url,
              status,
              created_by,
              updated_by,
              published_at
            )

            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $7,
              $8
            )

            RETURNING *
          `,
          [
            String(title).trim(),
            slug,
            normalizedType,
            content || null,
            imageUrl || null,
            normalizedStatus,
            req.user.user_id,
            publishedAt
          ]
        );


      res.status(201).json({
        success: true,
        message:
          'Content created successfully.',
        data: result.rows[0]
      });

    } catch (error) {

      console.error(
        'CREATE CONTENT ERROR:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Unable to create content.'
      });
    }
  }
);


/*
============================================================
UPDATE CONTENT
PUT /api/admin/content/items/:id
============================================================
*/

router.put(
  '/items/:id',
  async (req, res) => {

    try {

      const contentId =
        Number(req.params.id);

      if (
        !Number.isInteger(contentId)
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid content ID.'
        });
      }


      const {
        title,
        contentType,
        content,
        imageUrl,
        status
      } = req.body;


      if (
        !title ||
        !String(title).trim()
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Title is required.'
        });
      }


      const normalizedType =
        String(
          contentType || 'PAGE'
        ).toUpperCase();


      const normalizedStatus =
        String(
          status || 'DRAFT'
        ).toUpperCase();


      if (
        !ALLOWED_TYPES.includes(
          normalizedType
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid content type.'
        });
      }


      if (
        !ALLOWED_STATUSES.includes(
          normalizedStatus
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid content status.'
        });
      }


      const slug =
        await getUniqueSlug(
          title,
          contentId
        );


      const existing =
        await pool.query(
          `
            SELECT
              published_at
            FROM contents
            WHERE content_id = $1
          `,
          [contentId]
        );


      if (
        existing.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            'Content record not found.'
        });
      }


      let publishedAt =
        existing.rows[0].published_at;


      if (
        normalizedStatus === 'PUBLISHED'
      ) {

        if (!publishedAt) {
          publishedAt = new Date();
        }

      } else {

        publishedAt = null;
      }


      const result =
        await pool.query(
          `
            UPDATE contents

            SET
              title = $1,
              slug = $2,
              content_type = $3,
              content = $4,
              image_url = $5,
              status = $6,
              updated_by = $7,
              published_at = $8

            WHERE content_id = $9

            RETURNING *
          `,
          [
            String(title).trim(),
            slug,
            normalizedType,
            content || null,
            imageUrl || null,
            normalizedStatus,
            req.user.user_id,
            publishedAt,
            contentId
          ]
        );


      res.json({
        success: true,
        message:
          'Content updated successfully.',
        data: result.rows[0]
      });

    } catch (error) {

      console.error(
        'UPDATE CONTENT ERROR:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Unable to update content.'
      });
    }
  }
);


/*
============================================================
UPDATE STATUS
PATCH /api/admin/content/items/:id/status
============================================================
*/

router.patch(
  '/items/:id/status',
  async (req, res) => {

    try {

      const contentId =
        Number(req.params.id);

      const normalizedStatus =
        String(
          req.body.status || ''
        ).toUpperCase();


      if (
        !Number.isInteger(contentId)
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid content ID.'
        });
      }


      if (
        !ALLOWED_STATUSES.includes(
          normalizedStatus
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid content status.'
        });
      }


      const publishedAt =
        normalizedStatus === 'PUBLISHED'
          ? new Date()
          : null;


      const result =
        await pool.query(
          `
            UPDATE contents

            SET
              status = $1,
              updated_by = $2,
              published_at =
                CASE
                  WHEN $1 = 'PUBLISHED'
                  THEN COALESCE(
                    published_at,
                    $3
                  )
                  ELSE NULL
                END

            WHERE content_id = $4

            RETURNING *
          `,
          [
            normalizedStatus,
            req.user.user_id,
            publishedAt,
            contentId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            'Content record not found.'
        });
      }


      res.json({
        success: true,
        message:
          'Content status updated.',
        data: result.rows[0]
      });

    } catch (error) {

      console.error(
        'CONTENT STATUS ERROR:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Unable to update content status.'
      });
    }
  }
);


/*
============================================================
DELETE CONTENT
DELETE /api/admin/content/items/:id
============================================================
*/

router.delete(
  '/items/:id',
  async (req, res) => {

    try {

      const contentId =
        Number(req.params.id);


      if (
        !Number.isInteger(contentId)
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid content ID.'
        });
      }


      const result =
        await pool.query(
          `
            DELETE FROM contents

            WHERE content_id = $1

            RETURNING
              content_id,
              title
          `,
          [contentId]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            'Content record not found.'
        });
      }


      res.json({
        success: true,
        message:
          'Content deleted successfully.',
        data: result.rows[0]
      });

    } catch (error) {

      console.error(
        'DELETE CONTENT ERROR:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Unable to delete content.'
      });
    }
  }
);


/*
============================================================
RECENT ACTIVITY
GET /api/admin/content/recent
============================================================
*/

router.get(
  '/recent',
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT
            c.content_id,
            c.title,
            c.content_type,
            c.status,
            c.created_at,
            c.updated_at,

            CASE
              WHEN c.status = 'PUBLISHED'
                THEN 'Content published'
              WHEN c.status = 'DRAFT'
                THEN 'Content saved as draft'
              WHEN c.status = 'ARCHIVED'
                THEN 'Content archived'
              ELSE
                'Content updated'
            END AS activity_title

          FROM contents c

          ORDER BY
            c.updated_at DESC

          LIMIT 5
        `);


      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {

      console.error(
        'CONTENT RECENT ERROR:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Unable to load recent activity.'
      });
    }
  }
);


module.exports = router;