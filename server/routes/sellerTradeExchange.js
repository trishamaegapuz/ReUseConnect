/*
============================================================
ReUse Connect
Seller Trade & Exchange Routes
============================================================

Purpose:
- Seller-side browsing of Buyer Community Trade posts.
- Seller and Buyer use the SAME Community post comments.
- Comments may optionally attach an existing item.
- Does NOT transfer ownership.
- Does NOT create another listing.

Relationship:

community_posts.post_id
        ↓
listings.community_post_id
        ↓
listings.listing_id

Comment attachment:

community_post_comments.listing_id
        ↓
listings.listing_id
============================================================
*/

const express = require('express');

const router = express.Router();

const pool = require('../config/db');


/* ============================================================
   HELPERS
============================================================ */

const getUserId = (req) => {
  const possibleId =
    req.user?.user_id ??
    req.user?.userId ??
    req.user?.id ??
    req.headers['x-user-id'];

  if (
    possibleId === undefined ||
    possibleId === null ||
    possibleId === ''
  ) {
    return null;
  }

  const id = Number(possibleId);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};


const getPagination = (req) => {
  const page =
    Math.max(
      1,
      Number.parseInt(
        req.query.page,
        10
      ) || 1
    );

  const limit =
    Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(
          req.query.limit,
          10
        ) || 6
      )
    );

  const offset =
    (page - 1) * limit;

  return {
    page,
    limit,
    offset
  };
};


const tradeExchangeCategorySql = `
  LOWER(
    TRIM(
      COALESCE(
        cp.category,
        ''
      )
    )
  ) IN (
    'trade & exchange',
    'trade and exchange',
    'trade',
    'for trade'
  )
`;

const donationCategorySql = `
  LOWER(
    TRIM(
      COALESCE(
        cp.category,
        ''
      )
    )
  ) IN (
    'donations',
    'donation',
    'donate'
  )
`;

const tradeExchangeModuleCategorySql = `
  (
    ${tradeExchangeCategorySql}
    OR
    ${donationCategorySql}
  )
`;


/* ============================================================
   GET SELLER TRADE & EXCHANGE POSTS
============================================================ */

router.get(
  '/',
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message:
            'Seller authentication is required.'
        });
      }

      const {
        page,
        limit,
        offset
      } = getPagination(req);

      const search =
        String(
          req.query.search || ''
        ).trim();

      const params = [];

      let where = `
        WHERE LOWER(
          COALESCE(
            cp.status,
            ''
          )
        ) NOT IN (
          'deleted',
          'removed',
          'blocked',
          'rejected',
          'hidden'
        )

        AND ${tradeExchangeModuleCategorySql}

        AND UPPER(
          COALESCE(
            l.listing_type,
            ''
          )
        ) IN ('TRADE', 'DONATION')

        AND UPPER(
          COALESCE(
            l.status,
            ''
          )
        ) = 'AVAILABLE'
      `;

      if (search) {
        params.push(
          `%${search}%`
        );

        const searchIndex =
          params.length;

        where += `
          AND (
            cp.title ILIKE $${searchIndex}
            OR cp.body ILIKE $${searchIndex}
            OR cp.category ILIKE $${searchIndex}
          )
        `;
      }

      const countResult =
        await pool.query(
          `
          SELECT COUNT(*)::integer AS total
          FROM community_posts cp

          INNER JOIN listings l
            ON l.community_post_id =
               cp.post_id

          ${where}
          `,
          params
        );

      const total =
        Number(
          countResult.rows[0]?.total || 0
        );

      const dataParams = [
        ...params,
        limit,
        offset
      ];

      const limitIndex =
        params.length + 1;

      const offsetIndex =
        params.length + 2;

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

            cp.created_at,
            cp.updated_at,

            cp.image_url,

            u.user_id AS community_user_id,
            u.first_name,
            u.last_name,
            u.profile_image,

            l.listing_id,
            l.listing_type,
            l.status AS listing_status,
            l.title AS listing_title,
            l.description AS listing_description,
            l.price,
            l.condition,
            l.quantity,
            l.location AS listing_location,

            (
              SELECT li.image_url
              FROM listing_images li
              WHERE li.listing_id = l.listing_id
              ORDER BY
                li.is_primary DESC,
                li.sort_order ASC
              LIMIT 1
            ) AS listing_image_url

          FROM community_posts cp

          INNER JOIN users u
            ON u.user_id =
               cp.user_id

          INNER JOIN listings l
            ON l.community_post_id =
               cp.post_id

          ${where}

          ORDER BY cp.created_at DESC

          LIMIT $${limitIndex}
          OFFSET $${offsetIndex}
          `,
          dataParams
        );

      return res.json({
        items: result.rows,
        data: result.rows,

        pagination: {
          page,
          limit,
          total,
          totalPages:
            Math.max(
              1,
              Math.ceil(
                total / limit
              )
            )
        }
      });

    } catch (error) {
      console.error(
        'SELLER TRADE EXCHANGE LIST ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Unable to load Trade & Exchange posts.',
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined
      });
    }
  }
);


/* ============================================================
   GET MY ITEMS FOR COMMENT IMPORT
============================================================ */

router.get(
  '/my-items',
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message:
            'Seller authentication is required.'
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            l.listing_id,
            l.seller_id,
            l.title,
            l.description,
            l.price,
            l.condition,
            l.quantity,
            l.location,
            l.listing_type,
            l.status,

            (
              SELECT li.image_url
              FROM listing_images li
              WHERE li.listing_id = l.listing_id
              ORDER BY
                li.is_primary DESC,
                li.sort_order ASC
              LIMIT 1
            ) AS listing_image_url

          FROM listings l

          WHERE l.seller_id = $1
            AND UPPER(COALESCE(l.status, '')) IN
              ('AVAILABLE', 'ACTIVE')
            AND UPPER(COALESCE(l.listing_type, '')) <> 'TRADE'

          ORDER BY l.created_at DESC
          `,
          [userId]
        );

      return res.json({
        items: result.rows,
        data: result.rows
      });

    } catch (error) {
      console.error(
        'GET SELLER TRADE MY ITEMS ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Unable to load your items for comment import.'
      });
    }
  }
);


/* ============================================================
   GET SINGLE TRADE POST
============================================================ */

router.get(
  '/:postId',
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message:
            'Seller authentication is required.'
        });
      }

      const postId =
        Number(
          req.params.postId
        );

      if (
        !Number.isInteger(postId) ||
        postId <= 0
      ) {
        return res.status(400).json({
          message:
            'Invalid post ID.'
        });
      }

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

            cp.created_at,
            cp.updated_at,

            cp.image_url,

            u.user_id AS community_user_id,
            u.first_name,
            u.last_name,
            u.profile_image,

            l.listing_id,
            l.listing_type,
            l.status AS listing_status,
            l.title AS listing_title,
            l.description AS listing_description,
            l.price,
            l.condition,
            l.quantity,
            l.location AS listing_location,

            (
              SELECT li.image_url
              FROM listing_images li
              WHERE li.listing_id = l.listing_id
              ORDER BY
                li.is_primary DESC,
                li.sort_order ASC
              LIMIT 1
            ) AS listing_image_url

          FROM community_posts cp

          INNER JOIN users u
            ON u.user_id =
               cp.user_id

          INNER JOIN listings l
            ON l.community_post_id =
               cp.post_id

          WHERE cp.post_id = $1

            AND LOWER(
              COALESCE(
                cp.status,
                ''
              )
            ) NOT IN (
              'deleted',
              'removed',
              'blocked',
              'rejected',
              'hidden'
            )

            AND ${tradeExchangeModuleCategorySql}

            AND UPPER(
              COALESCE(
                l.listing_type,
                ''
              )
            ) IN ('TRADE', 'DONATION')

            AND UPPER(
              COALESCE(
                l.status,
                ''
              )
            ) = 'AVAILABLE'

          LIMIT 1
          `,
          [postId]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message:
            'Trade & Exchange post not found.'
        });
      }

      return res.json({
        post: result.rows[0],
        data: result.rows[0]
      });

    } catch (error) {
      console.error(
        'SELLER TRADE EXCHANGE DETAIL ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Unable to load Trade & Exchange post details.',
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined
      });
    }
  }
);


/* ============================================================
   GET COMMENTS FOR TRADE POST
============================================================ */

router.get(
  '/:postId/comments',
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message:
            'Seller authentication is required.'
        });
      }

      const postId =
        Number(req.params.postId);

      if (
        !Number.isInteger(postId) ||
        postId <= 0
      ) {
        return res.status(400).json({
          message:
            'Invalid post ID.'
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            cpc.comment_id,
            cpc.post_id,
            cpc.user_id,
            cpc.comment_text,
            cpc.listing_id,
            cpc.status,
            cpc.created_at,

            u.first_name,
            u.last_name,
            u.profile_image,

            l.title AS listing_title,
            l.description AS listing_description,
            l.price AS listing_price,
            l.condition AS listing_condition,
            l.quantity AS listing_quantity,
            l.location AS listing_location,
            l.listing_type,
            l.status AS listing_status,

            (
              SELECT li.image_url
              FROM listing_images li
              WHERE li.listing_id = l.listing_id
              ORDER BY
                li.is_primary DESC,
                li.sort_order ASC
              LIMIT 1
            ) AS listing_image_url

          FROM community_post_comments cpc

          LEFT JOIN users u
            ON u.user_id =
               cpc.user_id

          LEFT JOIN listings l
            ON l.listing_id =
               cpc.listing_id

          WHERE cpc.post_id = $1
            AND LOWER(
              COALESCE(
                cpc.status,
                ''
              )
            ) NOT IN (
              'deleted',
              'removed',
              'blocked',
              'hidden'
            )

          ORDER BY cpc.created_at ASC
          `,
          [postId]
        );

      return res.json({
        comments: result.rows,
        items: result.rows,
        data: result.rows
      });

    } catch (error) {
      console.error(
        'GET SELLER TRADE COMMENTS ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Unable to load Trade & Exchange comments.'
      });
    }
  }
);


/* ============================================================
   ADD SELLER COMMENT
   Optional listing attachment.
============================================================ */

router.post(
  '/:postId/comments',
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const postId =
        Number(req.params.postId);

      const commentText =
        String(
          req.body?.comment_text || ''
        ).trim();

      const rawListingId =
        req.body?.listing_id ??
        req.body?.listingId ??
        null;

      const listingId =
        rawListingId === null ||
        rawListingId === '' ||
        rawListingId === undefined
          ? null
          : Number(rawListingId);

      if (!userId) {
        return res.status(401).json({
          message:
            'Seller authentication is required.'
        });
      }

      if (
        !Number.isInteger(postId) ||
        postId <= 0
      ) {
        return res.status(400).json({
          message:
            'Invalid post ID.'
        });
      }

      if (!commentText) {
        return res.status(400).json({
          message:
            'Comment text is required.'
        });
      }

      if (
        listingId !== null &&
        (!Number.isInteger(listingId) ||
          listingId <= 0)
      ) {
        return res.status(400).json({
          message:
            'Invalid item ID.'
        });
      }

      const post =
        await pool.query(
          `
          SELECT
            cp.post_id
          FROM community_posts cp

          INNER JOIN listings l
            ON l.community_post_id =
               cp.post_id

          WHERE cp.post_id = $1

            AND LOWER(
              COALESCE(
                cp.status,
                ''
              )
            ) NOT IN (
              'deleted',
              'removed',
              'blocked',
              'rejected',
              'hidden'
            )

            AND ${tradeExchangeModuleCategorySql}

            AND UPPER(
              COALESCE(
                l.listing_type,
                ''
              )
            ) IN ('TRADE', 'DONATION')

            AND UPPER(
              COALESCE(
                l.status,
                ''
              )
            ) = 'AVAILABLE'

          LIMIT 1
          `,
          [postId]
        );

      if (post.rows.length === 0) {
        return res.status(404).json({
          message:
            'Trade & Exchange post not found.'
        });
      }

      /*
       * Attached item MUST belong to the logged-in seller.
       */
      if (listingId !== null) {
        const ownedListing =
          await pool.query(
            `
            SELECT listing_id
            FROM listings
            WHERE listing_id = $1
              AND seller_id = $2
              AND UPPER(
                COALESCE(
                  status,
                  ''
                )
              ) IN (
                'AVAILABLE',
                'ACTIVE'
              )
            LIMIT 1
            `,
            [listingId, userId]
          );

        if (ownedListing.rows.length === 0) {
          return res.status(403).json({
            message:
              'You can only attach an item from your own available listings.'
          });
        }
      }

      const result =
        await pool.query(
          `
          INSERT INTO community_post_comments (
            post_id,
            user_id,
            comment_text,
            listing_id,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'ACTIVE'
          )
          RETURNING
            comment_id,
            post_id,
            user_id,
            comment_text,
            listing_id,
            status,
            created_at
          `,
          [
            postId,
            userId,
            commentText,
            listingId
          ]
        );

      const comment =
        await pool.query(
          `
          SELECT
            cpc.comment_id,
            cpc.post_id,
            cpc.user_id,
            cpc.comment_text,
            cpc.listing_id,
            cpc.status,
            cpc.created_at,

            u.first_name,
            u.last_name,
            u.profile_image,

            l.title AS listing_title,
            l.description AS listing_description,
            l.price AS listing_price,
            l.condition AS listing_condition,
            l.quantity AS listing_quantity,
            l.location AS listing_location,
            l.listing_type,
            l.status AS listing_status,

            (
              SELECT li.image_url
              FROM listing_images li
              WHERE li.listing_id = l.listing_id
              ORDER BY
                li.is_primary DESC,
                li.sort_order ASC
              LIMIT 1
            ) AS listing_image_url

          FROM community_post_comments cpc

          LEFT JOIN users u
            ON u.user_id =
               cpc.user_id

          LEFT JOIN listings l
            ON l.listing_id =
               cpc.listing_id

          WHERE cpc.comment_id = $1
          LIMIT 1
          `,
          [result.rows[0].comment_id]
        );

      return res.status(201).json({
        message:
          'Comment added successfully.',
        comment:
          comment.rows[0]
      });

    } catch (error) {
      console.error(
        'ADD SELLER TRADE COMMENT ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Unable to add Trade & Exchange comment.'
      });
    }
  }
);


/* ============================================================
   DELETE OWN SELLER COMMENT
============================================================ */

router.delete(
  '/:postId/comments/:commentId',
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const postId =
        Number(req.params.postId);

      const commentId =
        Number(req.params.commentId);

      if (!userId) {
        return res.status(401).json({
          message:
            'Seller authentication is required.'
        });
      }

      if (
        !Number.isInteger(postId) ||
        postId <= 0 ||
        !Number.isInteger(commentId) ||
        commentId <= 0
      ) {
        return res.status(400).json({
          message:
            'Invalid post or comment ID.'
        });
      }

      const result =
        await pool.query(
          `
          UPDATE community_post_comments
          SET status = 'HIDDEN'
          WHERE comment_id = $1
            AND post_id = $2
            AND user_id = $3
          RETURNING comment_id
          `,
          [
            commentId,
            postId,
            userId
          ]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message:
            'Comment not found or you do not own this comment.'
        });
      }

      return res.json({
        message:
          'Comment deleted successfully.',
        comment_id:
          result.rows[0].comment_id
      });

    } catch (error) {
      console.error(
        'DELETE SELLER TRADE COMMENT ERROR:',
        error
      );

      return res.status(500).json({
        message:
          'Unable to delete Trade & Exchange comment.'
      });
    }
  }
);


module.exports = router;
