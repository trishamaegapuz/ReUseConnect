const express = require('express');

const pool = require('../config/db');

const {
  authMiddleware,
  adminOnly
} = require('../middleware/authMiddleware');

const router = express.Router();


// ============================================================
// PROTECTION
// ============================================================

router.use(
  authMiddleware
);


// ============================================================
// HELPER
// ============================================================

const getPagination = (
  page,
  limit
) => {

  const safePage =
    Math.max(
      parseInt(page, 10) || 1,
      1
    );

  const safeLimit =
    Math.min(
      Math.max(
        parseInt(limit, 10) || 10,
        1
      ),
      50
    );

  const offset =
    (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    offset
  };

};



// ============================================================
// BUYER COMMUNITY ROUTES
// ============================================================
//
// These routes use authMiddleware only.
// Logged-in buyers/users can read, create, like, comment on,
// and report community posts.
//
// The Admin Community routes below remain protected by adminOnly.
// ============================================================

const getCurrentUserId = (req) => {
  return (
    req.user?.user_id ??
    req.user?.userId ??
    req.user?.id ??
    null
  );
};

const getPaginationSafe = (page, limit) => {
  const currentPage = Math.max(
    parseInt(page, 10) || 1,
    1
  );

  const currentLimit = Math.min(
    Math.max(
      parseInt(limit, 10) || 10,
      1
    ),
    50
  );

  return {
    page: currentPage,
    limit: currentLimit,
    offset: (currentPage - 1) * currentLimit
  };
};


// ============================================================
// GET COMMUNITY POSTS
// GET /api/buyer/community
// ============================================================

router.get(
  '/',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      const {
        search = '',
        category = '',
        page = 1,
        limit = 10
      } = req.query;

      const {
        page: currentPage,
        limit: currentLimit,
        offset
      } = getPaginationSafe(page, limit);

      const values = [];
      const conditions = [
        `cp.status = 'ACTIVE'`
      ];

      if (String(search).trim()) {
        values.push(`%${String(search).trim()}%`);

        conditions.push(`
          (
            cp.title ILIKE $${values.length}
            OR cp.body ILIKE $${values.length}
            OR cp.category ILIKE $${values.length}
            OR CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) ILIKE $${values.length}
          )
        `);
      }

      if (
        category &&
        String(category).trim() &&
        String(category).toLowerCase() !== 'all'
      ) {
        values.push(String(category).trim());

        conditions.push(
          `cp.category = $${values.length}`
        );
      }

      const whereClause =
        conditions.join(' AND ');

      const countResult =
        await pool.query(
          `
          SELECT COUNT(*)::int AS total

          FROM community_posts cp

          INNER JOIN users u
            ON u.user_id = cp.user_id

          WHERE ${whereClause}
          `,
          values
        );

      const total =
        Number(
          countResult.rows[0]?.total || 0
        );

      const limitIndex =
        values.length + 1;

      const offsetIndex =
        values.length + 2;

      const userIdIndex =
        values.length + 3;

      const result =
        await pool.query(
          `
          SELECT

            cp.post_id,
            cp.user_id,
            cp.title,
            cp.body,
            cp.category,
            cp.status,
            cp.image_url,
            cp.created_at,
            cp.updated_at,

            CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) AS author_name,

            u.first_name,
            u.last_name,

            (
              SELECT COUNT(*)::int
              FROM community_post_likes l
              WHERE l.post_id = cp.post_id
            ) AS like_count,

            EXISTS (
              SELECT 1
              FROM community_post_likes l2
              WHERE l2.post_id = cp.post_id
                AND l2.user_id = $${userIdIndex}
            ) AS liked_by_current_user,

            (
              SELECT COUNT(*)::int
              FROM community_post_comments c
              WHERE c.post_id = cp.post_id
                AND (
                  c.status IS NULL
                  OR c.status = 'ACTIVE'
                )
            ) AS comment_count

          FROM community_posts cp

          INNER JOIN users u
            ON u.user_id = cp.user_id

          WHERE ${whereClause}

          ORDER BY cp.created_at DESC

          LIMIT $${limitIndex}
          OFFSET $${offsetIndex}
          `,
          [
            ...values,
            currentLimit,
            offset,
            userId
          ]
        );

      return res.json({
        success: true,
        items: result.rows,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages:
            Math.max(
              Math.ceil(
                total / currentLimit
              ),
              1
            )
        }
      });

    } catch (error) {
      console.error(
        'BUYER COMMUNITY POSTS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load community posts.'
      });
    }
  }
);


// ============================================================
// GET CATEGORIES
// ============================================================

router.get(
  '/categories',
  async (req, res) => {
    try {
      const result =
        await pool.query(`
          SELECT DISTINCT
            category
          FROM community_posts
          WHERE
            status = 'ACTIVE'
            AND category IS NOT NULL
            AND TRIM(category) <> ''
          ORDER BY category ASC
        `);

      return res.json({
        success: true,
        categories: result.rows
      });

    } catch (error) {
      console.error(
        'BUYER COMMUNITY CATEGORIES ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load community categories.'
      });
    }
  }
);


// ============================================================
// CREATE POST
// POST /api/buyer/community
// ============================================================

router.post(
  '/',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      const {
        title,
        body,
        category = 'Discussion',
        image_url = null
      } = req.body || {};

      if (!title || !String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Post title is required.'
        });
      }

      if (!body || !String(body).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Post content is required.'
        });
      }

      const result =
        await pool.query(
          `
          INSERT INTO community_posts
          (
            user_id,
            title,
            body,
            category,
            status,
            image_url
          )

          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            'ACTIVE',
            $5
          )

          RETURNING *
          `,
          [
            userId,
            String(title).trim(),
            String(body).trim(),
            String(category || 'Discussion').trim() ||
              'Discussion',
            image_url || null
          ]
        );

      return res.status(201).json({
        success: true,
        message:
          'Community post created successfully.',
        post: result.rows[0],
        data: result.rows[0]
      });

    } catch (error) {
      console.error(
        'BUYER CREATE COMMUNITY POST ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to create community post.'
      });
    }
  }
);


// MY ITEMS
// ============================================================

router.get(
  '/my-items',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      const result =
        await pool.query(
          `
          SELECT

            l.listing_id,
            l.title,
            l.description,
            l.price,
            l.condition,
            l.status,

            c.name AS category_name,

            img.image_url AS listing_image_url

          FROM listings l

          LEFT JOIN categories c
            ON c.category_id = l.category_id

          LEFT JOIN LATERAL (
            SELECT
              li.image_url
            FROM listing_images li
            WHERE li.listing_id = l.listing_id
            ORDER BY
              li.is_primary DESC,
              li.sort_order ASC,
              li.image_id ASC
            LIMIT 1
          ) img ON TRUE

          WHERE
            l.seller_id = $1
            AND UPPER(l.status::text) NOT IN (
              'REJECTED',
              'REMOVED',
              'DELETED',
              'ARCHIVED'
            )

          ORDER BY l.created_at DESC
          `,
          [userId]
        );

      return res.json({
        success: true,
        items: result.rows,
        data: result.rows
      });

    } catch (error) {
      console.error(
        'BUYER COMMUNITY MY ITEMS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load your items.'
      });
    }
  }
);


// ============================================================


// MY ACTIVITY
// ============================================================

router.get(
  '/activity',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      const {
        page = 1,
        limit = 20
      } = req.query;

      const {
        page: currentPage,
        limit: currentLimit,
        offset
      } = getPaginationSafe(
        page,
        limit
      );

      const result =
        await pool.query(
          `
          SELECT *
          FROM (
            SELECT
              cp.post_id AS activity_id,
              'POST' AS activity_type,
              cp.title AS activity_title,
              cp.body AS activity_body,
              cp.category,
              cp.created_at
            FROM community_posts cp
            WHERE cp.user_id = $1

            UNION ALL

            SELECT
              c.comment_id AS activity_id,
              'COMMENT' AS activity_type,
              c.comment_text AS activity_title,
              NULL AS activity_body,
              NULL AS category,
              c.created_at
            FROM community_post_comments c
            WHERE c.user_id = $1
          ) activity

          ORDER BY created_at DESC

          LIMIT $2
          OFFSET $3
          `,
          [
            userId,
            currentLimit,
            offset
          ]
        );

      return res.json({
        success: true,
        items: result.rows,
        activity: result.rows,
        data: result.rows,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total: result.rowCount,
          totalPages: 1
        }
      });

    } catch (error) {
      console.error(
        'BUYER COMMUNITY ACTIVITY ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load your community activity.'
      });
    }
  }
);


// ============================================================


// MY POSTS
// ============================================================

router.get(
  '/my-posts',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      const result =
        await pool.query(
          `
          SELECT
            cp.*,

            (
              SELECT COUNT(*)::int
              FROM community_post_likes l
              WHERE l.post_id = cp.post_id
            ) AS like_count,

            (
              SELECT COUNT(*)::int
              FROM community_post_comments c
              WHERE c.post_id = cp.post_id
                AND (
                  c.status IS NULL
                  OR c.status = 'ACTIVE'
                )
            ) AS comment_count

          FROM community_posts cp

          WHERE cp.user_id = $1

          ORDER BY cp.created_at DESC
          `,
          [userId]
        );

      return res.json({
        success: true,
        items: result.rows,
        data: result.rows
      });

    } catch (error) {
      console.error(
        'BUYER COMMUNITY MY POSTS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load your posts.'
      });
    }
  }
);


// ============================================================
// REPORT POST
// ============================================================

router.post(
  '/:postId/report',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      const {
        reason,
        description = ''
      } = req.body || {};

      if (
        !reason ||
        !String(reason).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Report reason is required.'
        });
      }

      const post =
        await pool.query(
          `
          SELECT post_id
          FROM community_posts
          WHERE post_id = $1
          LIMIT 1
          `,
          [req.params.postId]
        );

      if (!post.rowCount) {
        return res.status(404).json({
          success: false,
          message:
            'Community post not found.'
        });
      }

      const result =
        await pool.query(
          `
          INSERT INTO community_reports
          (
            reporter_id,
            post_id,
            reason,
            description,
            status
          )

          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            'PENDING'
          )

          RETURNING *
          `,
          [
            userId,
            req.params.postId,
            String(reason).trim(),
            String(description || '').trim()
          ]
        );

      return res.status(201).json({
        success: true,
        message:
          'Report submitted successfully.',
        report: result.rows[0]
      });

    } catch (error) {
      console.error(
        'BUYER COMMUNITY REPORT ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to submit report.'
      });
    }
  }
);


// ============================================================


// SUMMARY
// ============================================================

router.get(
  '/summary',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      const result =
        await pool.query(
          `
          SELECT

            (
              SELECT COUNT(*)::int
              FROM community_posts
              WHERE status = 'ACTIVE'
            ) AS total_posts,

            (
              SELECT COUNT(*)::int
              FROM community_posts
              WHERE user_id = $1
            ) AS my_posts,

            (
              SELECT COUNT(*)::int
              FROM community_post_comments
              WHERE user_id = $1
            ) AS my_comments
          `,
          [userId]
        );

      return res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      console.error(
        'BUYER COMMUNITY SUMMARY ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load community summary.'
      });
    }
  }
);


// ============================================================


// ============================================================
// GET POST DETAILS
// IMPORTANT: placed after /categories so "categories" is not
// treated as a post ID.
// ============================================================

router.get(
  '/:postId',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      const result =
        await pool.query(
          `
          SELECT

            cp.post_id,
            cp.user_id,
            cp.title,
            cp.body,
            cp.category,
            cp.status,
            cp.image_url,
            cp.created_at,
            cp.updated_at,

            CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) AS author_name,

            u.first_name,
            u.last_name,

            (
              SELECT COUNT(*)::int
              FROM community_post_likes l
              WHERE l.post_id = cp.post_id
            ) AS like_count,

            EXISTS (
              SELECT 1
              FROM community_post_likes l2
              WHERE l2.post_id = cp.post_id
                AND l2.user_id = $1
            ) AS liked_by_current_user,

            (
              SELECT COUNT(*)::int
              FROM community_post_comments c
              WHERE c.post_id = cp.post_id
                AND (
                  c.status IS NULL
                  OR c.status = 'ACTIVE'
                )
            ) AS comment_count

          FROM community_posts cp

          INNER JOIN users u
            ON u.user_id = cp.user_id

          WHERE
            cp.post_id = $2
            AND (
              cp.status = 'ACTIVE'
              OR cp.user_id = $1
            )

          LIMIT 1
          `,
          [
            userId,
            req.params.postId
          ]
        );

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          message:
            'Community post not found.'
        });
      }

      const comments =
        await pool.query(
          `
          SELECT

            c.comment_id,
            c.post_id,
            c.user_id,
            c.comment_text,
            c.listing_id,
            c.created_at,
            c.status,

            CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) AS comment_name,

            u.first_name,
            u.last_name,

            l.title AS listing_title,

            (
              SELECT li.image_url
              FROM listing_images li
              WHERE li.listing_id = c.listing_id
              ORDER BY
                li.is_primary DESC,
                li.sort_order ASC,
                li.image_id ASC
              LIMIT 1
            ) AS listing_image_url

          FROM community_post_comments c

          INNER JOIN users u
            ON u.user_id = c.user_id

          LEFT JOIN listings l
            ON l.listing_id = c.listing_id

          WHERE
            c.post_id = $1
            AND (
              c.status IS NULL
              OR c.status = 'ACTIVE'
            )

          ORDER BY c.created_at ASC
          `,
          [req.params.postId]
        );

      return res.json({
        success: true,
        post: result.rows[0],
        comments: comments.rows
      });

    } catch (error) {
      console.error(
        'BUYER COMMUNITY POST DETAILS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load the community post.'
      });
    }
  }
);


// ============================================================
// UPDATE OWN POST
// ============================================================

router.put(
  '/:postId',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      const {
        title,
        body,
        category,
        image_url
      } = req.body || {};

      const result =
        await pool.query(
          `
          UPDATE community_posts

          SET
            title = COALESCE($1, title),
            body = COALESCE($2, body),
            category = COALESCE($3, category),
            image_url = COALESCE($4, image_url),
            updated_at = CURRENT_TIMESTAMP

          WHERE
            post_id = $5
            AND user_id = $6

          RETURNING *
          `,
          [
            title !== undefined
              ? String(title).trim()
              : null,

            body !== undefined
              ? String(body).trim()
              : null,

            category !== undefined
              ? String(category).trim()
              : null,

            image_url !== undefined
              ? image_url
              : null,

            req.params.postId,
            userId
          ]
        );

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          message:
            'Post not found or you are not allowed to edit it.'
        });
      }

      return res.json({
        success: true,
        message:
          'Community post updated successfully.',
        post: result.rows[0],
        data: result.rows[0]
      });

    } catch (error) {
      console.error(
        'BUYER UPDATE COMMUNITY POST ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to update community post.'
      });
    }
  }
);


// ============================================================
// DELETE OWN POST
// ============================================================

router.delete(
  '/:postId',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      const result =
        await pool.query(
          `
          DELETE FROM community_posts

          WHERE
            post_id = $1
            AND user_id = $2

          RETURNING post_id
          `,
          [
            req.params.postId,
            userId
          ]
        );

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          message:
            'Post not found or you are not allowed to delete it.'
        });
      }

      return res.json({
        success: true,
        message:
          'Community post deleted successfully.'
      });

    } catch (error) {
      console.error(
        'BUYER DELETE COMMUNITY POST ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to delete community post.'
      });
    }
  }
);


// ============================================================
// LIKE / UNLIKE
// ============================================================

router.post(
  '/:postId/like',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);
      const postId = req.params.postId;

      const existing =
        await pool.query(
          `
          SELECT 1
          FROM community_post_likes
          WHERE
            post_id = $1
            AND user_id = $2
          LIMIT 1
          `,
          [postId, userId]
        );

      let liked = true;

      if (existing.rowCount) {
        await pool.query(
          `
          DELETE FROM community_post_likes
          WHERE
            post_id = $1
            AND user_id = $2
          `,
          [postId, userId]
        );

        liked = false;
      } else {
        await pool.query(
          `
          INSERT INTO community_post_likes
          (
            post_id,
            user_id
          )

          VALUES
          (
            $1,
            $2
          )
          `,
          [postId, userId]
        );
      }

      const count =
        await pool.query(
          `
          SELECT COUNT(*)::int AS like_count
          FROM community_post_likes
          WHERE post_id = $1
          `,
          [postId]
        );

      return res.json({
        success: true,
        liked,
        like_count:
          Number(
            count.rows[0]?.like_count || 0
          )
      });

    } catch (error) {
      console.error(
        'BUYER COMMUNITY LIKE ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to update post like.'
      });
    }
  }
);

router.delete(
  '/:postId/like',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      await pool.query(
        `
        DELETE FROM community_post_likes

        WHERE
          post_id = $1
          AND user_id = $2
        `,
        [
          req.params.postId,
          userId
        ]
      );

      const count =
        await pool.query(
          `
          SELECT COUNT(*)::int AS like_count
          FROM community_post_likes
          WHERE post_id = $1
          `,
          [req.params.postId]
        );

      return res.json({
        success: true,
        liked: false,
        like_count:
          Number(
            count.rows[0]?.like_count || 0
          )
      });

    } catch (error) {
      console.error(
        'BUYER COMMUNITY UNLIKE ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to remove post like.'
      });
    }
  }
);


// ============================================================
// COMMENTS
// ============================================================

router.get(
  '/:postId/comments',
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT

            c.comment_id,
            c.post_id,
            c.user_id,
            c.comment_text,
            c.listing_id,
            c.created_at,
            c.status,

            CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) AS comment_name,

            u.first_name,
            u.last_name,

            l.title AS listing_title,

            (
              SELECT li.image_url
              FROM listing_images li
              WHERE li.listing_id = c.listing_id
              ORDER BY
                li.is_primary DESC,
                li.sort_order ASC,
                li.image_id ASC
              LIMIT 1
            ) AS listing_image_url

          FROM community_post_comments c

          INNER JOIN users u
            ON u.user_id = c.user_id

          LEFT JOIN listings l
            ON l.listing_id = c.listing_id

          WHERE
            c.post_id = $1
            AND (
              c.status IS NULL
              OR c.status = 'ACTIVE'
            )

          ORDER BY c.created_at ASC
          `,
          [req.params.postId]
        );

      return res.json({
        success: true,
        comments: result.rows,
        data: result.rows
      });

    } catch (error) {
      console.error(
        'BUYER COMMUNITY COMMENTS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load comments.'
      });
    }
  }
);

router.post(
  '/:postId/comments',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      const {
        comment_text,
        listing_id = null
      } = req.body || {};

      if (
        !comment_text ||
        !String(comment_text).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Comment text is required.'
        });
      }

      const result =
        await pool.query(
          `
          INSERT INTO community_post_comments
          (
            post_id,
            user_id,
            comment_text,
            listing_id,
            status
          )

          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            'ACTIVE'
          )

          RETURNING *
          `,
          [
            req.params.postId,
            userId,
            String(comment_text).trim(),
            listing_id || null
          ]
        );

      return res.status(201).json({
        success: true,
        message:
          'Comment added successfully.',
        comment: result.rows[0],
        data: result.rows[0]
      });

    } catch (error) {
      console.error(
        'BUYER ADD COMMUNITY COMMENT ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to add comment.'
      });
    }
  }
);

router.delete(
  '/:postId/comments/:commentId',
  async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

      const result =
        await pool.query(
          `
          DELETE FROM community_post_comments

          WHERE
            comment_id = $1
            AND post_id = $2
            AND user_id = $3

          RETURNING comment_id
          `,
          [
            req.params.commentId,
            req.params.postId,
            userId
          ]
        );

      if (!result.rowCount) {
        return res.status(404).json({
          success: false,
          message:
            'Comment not found or you are not allowed to delete it.'
        });
      }

      return res.json({
        success: true,
        message:
          'Comment deleted successfully.'
      });

    } catch (error) {
      console.error(
        'BUYER DELETE COMMUNITY COMMENT ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to delete comment.'
      });
    }
  }
);


// ============================================================
// DASHBOARD STATISTICS
// ============================================================

router.get(
  '/stats',
  adminOnly,
  async (req, res) => {

    try {

      const result = await pool.query(`
        SELECT

          (
            SELECT COUNT(*)
            FROM community_posts
          )::int AS total_posts,

          (
            SELECT COUNT(*)
            FROM support_tickets
          )::int AS total_tickets,

          (
            SELECT COUNT(*)
            FROM community_reports
          )::int AS total_reports,

          (
            (
              SELECT COUNT(*)
              FROM support_tickets
              WHERE status = 'RESOLVED'
            )
            +
            (
              SELECT COUNT(*)
              FROM community_reports
              WHERE status = 'RESOLVED'
            )
          )::int AS resolved_issues,

          (
            SELECT COUNT(*)
            FROM support_tickets
            WHERE status = 'PENDING'
          )::int AS pending_tickets,

          (
            SELECT COUNT(*)
            FROM community_reports
            WHERE status IN (
              'PENDING',
              'UNDER_REVIEW'
            )
          )::int AS pending_reports

      `);

      return res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {

      console.error(
        'COMMUNITY STATS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load community statistics.'
      });

    }

  }
);


// ============================================================
// COMMUNITY POSTS
// ============================================================

router.get(
  '/posts',
  adminOnly,
  async (req, res) => {

    try {

      const {
        search = '',
        category = '',
        status = '',
        page = 1,
        limit = 8
      } = req.query;


      const {
        page: currentPage,
        limit: currentLimit,
        offset
      } =
        getPagination(
          page,
          limit
        );


      const values = [];

      const conditions = [
        '1 = 1'
      ];


      if (search.trim()) {

        values.push(
          `%${search.trim()}%`
        );

        conditions.push(`
          (
            CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) ILIKE $${values.length}

            OR cp.title ILIKE $${values.length}

            OR cp.body ILIKE $${values.length}

            OR CAST(cp.post_id AS TEXT)
              ILIKE $${values.length}
          )
        `);

      }


      if (category) {

        values.push(category);

        conditions.push(
          `cp.category = $${values.length}`
        );

      }


      if (status) {

        values.push(status);

        conditions.push(
          `cp.status = $${values.length}`
        );

      }


      const whereClause =
        conditions.join(' AND ');


      const countResult =
        await pool.query(
          `
          SELECT COUNT(*)::int AS total

          FROM community_posts cp

          INNER JOIN users u
            ON u.user_id = cp.user_id

          WHERE ${whereClause}
          `,
          values
        );


      const total =
        countResult.rows[0].total;


      values.push(currentLimit);

      values.push(offset);


      const result =
        await pool.query(
          `
          SELECT

            cp.post_id,

            cp.title,

            cp.body,

            cp.category,

            cp.status,

            cp.created_at,

            cp.updated_at,

            u.user_id,

            CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) AS user_name,

            u.email,

            (
              SELECT COUNT(*)
              FROM community_post_likes l
              WHERE l.post_id = cp.post_id
            )::int AS likes,

            (
              SELECT COUNT(*)
              FROM community_post_comments c
              WHERE c.post_id = cp.post_id
                AND c.status = 'ACTIVE'
            )::int AS replies

          FROM community_posts cp

          INNER JOIN users u
            ON u.user_id = cp.user_id

          WHERE ${whereClause}

          ORDER BY cp.created_at DESC

          LIMIT $${values.length - 1}
          OFFSET $${values.length}

          `,
          values
        );


      return res.json({
        success: true,

        data: result.rows,

        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages:
            Math.ceil(
              total / currentLimit
            )
        }

      });

    } catch (error) {

      console.error(
        'COMMUNITY POSTS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load community posts.'
      });

    }

  }
);


// ============================================================
// CREATE COMMUNITY POST
// ============================================================

router.post(
  '/posts',
  adminOnly,
  async (req, res) => {

    try {

      const {
        title,
        body,
        category = 'General'
      } = req.body;


      if (
        !title ||
        !title.trim() ||
        !body ||
        !body.trim()
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Title and post content are required.'
        });

      }


      const result =
        await pool.query(
          `
          INSERT INTO community_posts
          (
            user_id,
            title,
            body,
            category,
            status
          )

          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            'ACTIVE'
          )

          RETURNING *
          `,
          [
            req.user.user_id,
            title.trim(),
            body.trim(),
            category
          ]
        );


      return res.status(201).json({
        success: true,
        message:
          'Community post created successfully.',
        data:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        'CREATE COMMUNITY POST ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to create community post.'
      });

    }

  }
);


// ============================================================
// UPDATE POST STATUS
// ============================================================

router.patch(
  '/posts/:postId/status',
  adminOnly,
  async (req, res) => {

    try {

      const {
        status
      } = req.body;


      const allowedStatuses = [
        'ACTIVE',
        'PENDING',
        'UNDER_REVIEW',
        'RESOLVED',
        'HIDDEN'
      ];


      if (
        !allowedStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid post status.'
        });

      }


      const result =
        await pool.query(
          `
          UPDATE community_posts

          SET
            status = $1,
            updated_at = CURRENT_TIMESTAMP

          WHERE post_id = $2

          RETURNING *
          `,
          [
            status,
            req.params.postId
          ]
        );


      if (!result.rowCount) {

        return res.status(404).json({
          success: false,
          message:
            'Community post not found.'
        });

      }


      return res.json({
        success: true,
        message:
          'Post status updated.',
        data:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        'POST STATUS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to update post status.'
      });

    }

  }
);


// ============================================================
// SUPPORT TICKETS
// ============================================================

router.get(
  '/tickets',
  adminOnly,
  async (req, res) => {

    try {

      const {
        search = '',
        status = '',
        page = 1,
        limit = 8
      } = req.query;


      const {
        page: currentPage,
        limit: currentLimit,
        offset
      } =
        getPagination(
          page,
          limit
        );


      const values = [];

      const conditions = [
        '1 = 1'
      ];


      if (search.trim()) {

        values.push(
          `%${search.trim()}%`
        );

        conditions.push(`
          (
            st.subject ILIKE $${values.length}

            OR st.description
              ILIKE $${values.length}

            OR CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) ILIKE $${values.length}

            OR CAST(st.ticket_id AS TEXT)
              ILIKE $${values.length}
          )
        `);

      }


      if (status) {

        values.push(status);

        conditions.push(
          `st.status = $${values.length}`
        );

      }


      const whereClause =
        conditions.join(' AND ');


      const countResult =
        await pool.query(
          `
          SELECT COUNT(*)::int AS total

          FROM support_tickets st

          INNER JOIN users u
            ON u.user_id = st.user_id

          WHERE ${whereClause}
          `,
          values
        );


      const total =
        countResult.rows[0].total;


      values.push(currentLimit);
      values.push(offset);


      const result =
        await pool.query(
          `
          SELECT

            st.ticket_id,

            st.subject,

            st.description,

            st.category,

            st.priority,

            st.status,

            st.created_at,

            st.updated_at,

            u.user_id,

            CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) AS user_name,

            u.email

          FROM support_tickets st

          INNER JOIN users u
            ON u.user_id = st.user_id

          WHERE ${whereClause}

          ORDER BY st.created_at DESC

          LIMIT $${values.length - 1}
          OFFSET $${values.length}

          `,
          values
        );


      return res.json({
        success: true,

        data: result.rows,

        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages:
            Math.ceil(
              total / currentLimit
            )
        }

      });

    } catch (error) {

      console.error(
        'SUPPORT TICKETS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load support tickets.'
      });

    }

  }
);


// ============================================================
// UPDATE TICKET STATUS
// ============================================================

router.patch(
  '/tickets/:ticketId/status',
  adminOnly,
  async (req, res) => {

    try {

      const {
        status
      } = req.body;


      const allowedStatuses = [
        'PENDING',
        'IN_PROGRESS',
        'RESOLVED',
        'CLOSED'
      ];


      if (
        !allowedStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid ticket status.'
        });

      }


      const result =
        await pool.query(
          `
          UPDATE support_tickets

          SET
            status = $1,
            updated_at = CURRENT_TIMESTAMP

          WHERE ticket_id = $2

          RETURNING *
          `,
          [
            status,
            req.params.ticketId
          ]
        );


      if (!result.rowCount) {

        return res.status(404).json({
          success: false,
          message:
            'Support ticket not found.'
        });

      }


      return res.json({
        success: true,
        message:
          'Ticket status updated.',
        data:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        'TICKET STATUS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to update ticket status.'
      });

    }

  }
);


// ============================================================
// RECENT SUPPORT TICKETS
// ============================================================

router.get(
  '/recent-tickets',
  adminOnly,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT

            st.ticket_id,

            st.subject,

            st.status,

            st.priority,

            st.created_at,

            CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) AS user_name

          FROM support_tickets st

          INNER JOIN users u
            ON u.user_id = st.user_id

          ORDER BY
            st.created_at DESC

          LIMIT 5
          `
        );


      return res.json({
        success: true,
        data:
          result.rows
      });

    } catch (error) {

      console.error(
        'RECENT TICKETS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load recent tickets.'
      });

    }

  }
);


// ============================================================
// REPORTS
// ============================================================

router.get(
  '/reports',
  adminOnly,
  async (req, res) => {

    try {

      const {
        search = '',
        status = '',
        page = 1,
        limit = 8
      } = req.query;


      const {
        page: currentPage,
        limit: currentLimit,
        offset
      } =
        getPagination(
          page,
          limit
        );


      const values = [];

      const conditions = [
        '1 = 1'
      ];


      if (search.trim()) {

        values.push(
          `%${search.trim()}%`
        );

        conditions.push(`
          (
            cr.reason ILIKE $${values.length}

            OR cr.description
              ILIKE $${values.length}

            OR CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) ILIKE $${values.length}

            OR CAST(cr.report_id AS TEXT)
              ILIKE $${values.length}
          )
        `);

      }


      if (status) {

        values.push(status);

        conditions.push(
          `cr.status = $${values.length}`
        );

      }


      const whereClause =
        conditions.join(' AND ');


      const countResult =
        await pool.query(
          `
          SELECT COUNT(*)::int AS total

          FROM community_reports cr

          INNER JOIN users u
            ON u.user_id = cr.reporter_id

          WHERE ${whereClause}
          `,
          values
        );


      const total =
        countResult.rows[0].total;


      values.push(currentLimit);
      values.push(offset);


      const result =
        await pool.query(
          `
          SELECT

            cr.report_id,

            cr.reason,

            cr.description,

            cr.status,

            cr.created_at,

            cr.post_id,

            cr.ticket_id,

            CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) AS reporter_name,

            u.email,

            cp.title AS post_title,

            st.subject AS ticket_subject

          FROM community_reports cr

          INNER JOIN users u
            ON u.user_id = cr.reporter_id

          LEFT JOIN community_posts cp
            ON cp.post_id = cr.post_id

          LEFT JOIN support_tickets st
            ON st.ticket_id = cr.ticket_id

          WHERE ${whereClause}

          ORDER BY cr.created_at DESC

          LIMIT $${values.length - 1}
          OFFSET $${values.length}

          `,
          values
        );


      return res.json({
        success: true,

        data:
          result.rows,

        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages:
            Math.ceil(
              total / currentLimit
            )
        }

      });

    } catch (error) {

      console.error(
        'COMMUNITY REPORTS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load community reports.'
      });

    }

  }
);


// ============================================================
// UPDATE REPORT STATUS
// ============================================================

router.patch(
  '/reports/:reportId/status',
  adminOnly,
  async (req, res) => {

    try {

      const {
        status
      } = req.body;


      const allowedStatuses = [
        'PENDING',
        'UNDER_REVIEW',
        'RESOLVED',
        'DISMISSED'
      ];


      if (
        !allowedStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            'Invalid report status.'
        });

      }


      const result =
        await pool.query(
          `
          UPDATE community_reports

          SET
            status = $1,
            updated_at = CURRENT_TIMESTAMP

          WHERE report_id = $2

          RETURNING *
          `,
          [
            status,
            req.params.reportId
          ]
        );


      if (!result.rowCount) {

        return res.status(404).json({
          success: false,
          message:
            'Report not found.'
        });

      }


      return res.json({
        success: true,
        message:
          'Report status updated.',
        data:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        'REPORT STATUS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to update report status.'
      });

    }

  }
);


// ============================================================
// BANNED / SUSPENDED USERS
// ============================================================

router.get(
  '/banned-users',
  adminOnly,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT

            user_id,

            CONCAT_WS(
              ' ',
              first_name,
              last_name
            ) AS full_name,

            email,

            role,

            status,

            created_at

          FROM users

          WHERE status = 'SUSPENDED'

          ORDER BY created_at DESC
          `
        );


      return res.json({
        success: true,
        data:
          result.rows
      });

    } catch (error) {

      console.error(
        'BANNED USERS ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load suspended users.'
      });

    }

  }
);


// ============================================================
// SUPPORT SETTINGS - GET
// ============================================================

router.get(
  '/settings',
  adminOnly,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT *

          FROM support_settings

          WHERE setting_id = 1

          LIMIT 1
          `
        );


      return res.json({
        success: true,
        data:
          result.rows[0] || null
      });

    } catch (error) {

      console.error(
        'SUPPORT SETTINGS GET ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load support settings.'
      });

    }

  }
);


// ============================================================
// SUPPORT SETTINGS - SAVE
// ============================================================

router.put(
  '/settings',
  adminOnly,
  async (req, res) => {

    try {

      const {
        support_email = '',
        support_hours = '',
        auto_response_enabled = false
      } = req.body;


      const result =
        await pool.query(
          `
          INSERT INTO support_settings
          (
            setting_id,
            support_email,
            support_hours,
            auto_response_enabled,
            updated_at
          )

          VALUES
          (
            1,
            $1,
            $2,
            $3,
            CURRENT_TIMESTAMP
          )

          ON CONFLICT (
            setting_id
          )

          DO UPDATE SET

            support_email =
              EXCLUDED.support_email,

            support_hours =
              EXCLUDED.support_hours,

            auto_response_enabled =
              EXCLUDED.auto_response_enabled,

            updated_at =
              CURRENT_TIMESTAMP

          RETURNING *
          `,
          [
            support_email.trim(),
            support_hours.trim(),
            Boolean(
              auto_response_enabled
            )
          ]
        );


      return res.json({
        success: true,
        message:
          'Support settings saved.',
        data:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        'SUPPORT SETTINGS SAVE ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to save support settings.'
      });

    }

  }
);


module.exports = router;