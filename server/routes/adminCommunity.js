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
  authMiddleware,
  adminOnly
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
// DASHBOARD STATISTICS
// ============================================================

router.get(
  '/stats',
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