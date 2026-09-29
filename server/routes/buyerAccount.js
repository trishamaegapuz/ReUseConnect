/*
============================================================
ReUse Connect
Buyer Account Routes
============================================================

Uses the EXISTING PostgreSQL connection:

server/config/db.js

DO NOT create another pool here.
============================================================
*/

const express = require('express');
const router = express.Router();

const pool = require('../config/db');

/* ============================================================
   OPTIONAL PASSWORD LIBRARY
============================================================ */

let bcrypt = null;

try {
  bcrypt = require('bcryptjs');
} catch {
  bcrypt = null;
}

/* ============================================================
   AUTH USER ID
============================================================ */

function getBuyerId(req) {
  const raw =
    req.user?.user_id ??
    req.user?.userId ??
    req.user?.id ??
    req.headers['x-user-id'];

  const id = Number(raw);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

/* ============================================================
   GET PROFILE
============================================================ */

router.get('/profile', async (req, res) => {
  try {
    const buyerId = getBuyerId(req);

    if (!buyerId) {
      return res.status(401).json({
        message: 'Buyer authentication is required.'
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
      LIMIT 1
      `,
      [buyerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Buyer account was not found.'
      });
    }

    const user = result.rows[0];

    if (
      user.role &&
      String(user.role).toLowerCase() !== 'buyer'
    ) {
      return res.status(403).json({
        message: 'This account is not a buyer account.'
      });
    }

    return res.json({
      profile: user
    });

  } catch (error) {
    console.error(
      'GET /api/buyer/account/profile error:',
      error
    );

    return res.status(500).json({
      message: 'Failed to load buyer profile.'
    });
  }
});

/* ============================================================
   UPDATE PROFILE
============================================================ */

router.put('/profile', async (req, res) => {
  try {
    const buyerId = getBuyerId(req);

    if (!buyerId) {
      return res.status(401).json({
        message: 'Buyer authentication is required.'
      });
    }

    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      province,
      postal_code
    } = req.body || {};

    const cleanFirstName =
      String(first_name || '').trim();

    const cleanLastName =
      String(last_name || '').trim();

    const cleanEmail =
      String(email || '').trim().toLowerCase();

    if (!cleanFirstName) {
      return res.status(400).json({
        message: 'First name is required.'
      });
    }

    if (!cleanLastName) {
      return res.status(400).json({
        message: 'Last name is required.'
      });
    }

    if (!cleanEmail) {
      return res.status(400).json({
        message: 'Email address is required.'
      });
    }

    /* --------------------------------------------------------
       EMAIL DUPLICATE CHECK
    -------------------------------------------------------- */

    const duplicateEmail = await pool.query(
      `
      SELECT user_id
      FROM users
      WHERE LOWER(email) = $1
        AND user_id <> $2
      LIMIT 1
      `,
      [
        cleanEmail,
        buyerId
      ]
    );

    if (duplicateEmail.rows.length > 0) {
      return res.status(409).json({
        message:
          'That email address is already being used by another account.'
      });
    }

    /* --------------------------------------------------------
       UPDATE
    -------------------------------------------------------- */

    const result = await pool.query(
      `
      UPDATE users
      SET
        first_name = $1,
        last_name = $2,
        email = $3,
        phone = $4,
        address = $5,
        city = $6,
        province = $7,
        postal_code = $8,
        updated_at = NOW()
      WHERE user_id = $9
      RETURNING
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
      `,
      [
        cleanFirstName,
        cleanLastName,
        cleanEmail,
        phone ? String(phone).trim() : null,
        address ? String(address).trim() : null,
        city ? String(city).trim() : null,
        province ? String(province).trim() : null,
        postal_code ? String(postal_code).trim() : null,
        buyerId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Buyer account was not found.'
      });
    }

    return res.json({
      message: 'Profile updated successfully.',
      profile: result.rows[0]
    });

  } catch (error) {
    console.error(
      'PUT /api/buyer/account/profile error:',
      error
    );

    return res.status(500).json({
      message: 'Failed to update buyer profile.'
    });
  }
});

/* ============================================================
   UPDATE PROFILE PHOTO
============================================================

The users.profile_image column is TEXT.

The frontend sends a data URL for the selected image.
This keeps the implementation independent from multer/upload
middleware already used by other modules.

This is database-backed because the resulting value is stored
in users.profile_image.
============================================================ */

router.post('/profile/photo', async (req, res) => {
  try {
    const buyerId = getBuyerId(req);

    if (!buyerId) {
      return res.status(401).json({
        message: 'Buyer authentication is required.'
      });
    }

    const profileImage =
      String(req.body?.profileImage || '').trim();

    if (!profileImage) {
      return res.status(400).json({
        message: 'Profile image is required.'
      });
    }

    if (
      !profileImage.startsWith('data:image/')
    ) {
      return res.status(400).json({
        message:
          'Invalid image format.'
      });
    }

    /*
      Approximate 2MB original-file allowance.
      Data URLs are larger than the original file,
      so we allow a little extra database payload size.
    */

    if (profileImage.length > 3000000) {
      return res.status(400).json({
        message:
          'Profile image is too large. Please choose an image up to 2MB.'
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        profile_image = $1,
        updated_at = NOW()
      WHERE user_id = $2
      RETURNING
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
      `,
      [
        profileImage,
        buyerId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Buyer account was not found.'
      });
    }

    return res.json({
      message:
        'Profile photo updated successfully.',
      profile: result.rows[0]
    });

  } catch (error) {
    console.error(
      'POST /api/buyer/account/profile/photo error:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to update profile photo.'
    });
  }
});

/* ============================================================
   REMOVE PROFILE PHOTO
============================================================ */

router.delete('/profile/photo', async (req, res) => {
  try {
    const buyerId = getBuyerId(req);

    if (!buyerId) {
      return res.status(401).json({
        message: 'Buyer authentication is required.'
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        profile_image = NULL,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING
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
      `,
      [buyerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Buyer account was not found.'
      });
    }

    return res.json({
      message:
        'Profile photo removed successfully.',
      profile: result.rows[0]
    });

  } catch (error) {
    console.error(
      'DELETE /api/buyer/account/profile/photo error:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to remove profile photo.'
    });
  }
});

/* ============================================================
   CHANGE PASSWORD
============================================================ */

router.put('/password', async (req, res) => {
  try {
    const buyerId = getBuyerId(req);

    if (!buyerId) {
      return res.status(401).json({
        message: 'Buyer authentication is required.'
      });
    }

    if (!bcrypt) {
      return res.status(500).json({
        message:
          'Password service is not installed on the server. Run: npm install bcryptjs'
      });
    }

    const {
      currentPassword,
      newPassword
    } = req.body || {};

    if (!currentPassword) {
      return res.status(400).json({
        message:
          'Current password is required.'
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        message:
          'New password is required.'
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        message:
          'New password must contain at least 8 characters.'
      });
    }

    const result = await pool.query(
      `
      SELECT
        user_id,
        password_hash
      FROM users
      WHERE user_id = $1
      LIMIT 1
      `,
      [buyerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Buyer account was not found.'
      });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(400).json({
        message:
          'This account does not have a password configured.'
      });
    }

    const matches = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!matches) {
      return res.status(400).json({
        message:
          'Current password is incorrect.'
      });
    }

    const newHash = await bcrypt.hash(
      newPassword,
      10
    );

    await pool.query(
      `
      UPDATE users
      SET
        password_hash = $1,
        updated_at = NOW()
      WHERE user_id = $2
      `,
      [
        newHash,
        buyerId
      ]
    );

    return res.json({
      message:
        'Password changed successfully.'
    });

  } catch (error) {
    console.error(
      'PUT /api/buyer/account/password error:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to change password.'
    });
  }
});

/* ============================================================
   RECENT ACCOUNT ACTIVITY
============================================================

No dedicated account_activity table exists in the supplied
schema.

Therefore activity is derived from existing DB records:
- orders
- favorites
- community_posts

No fake activity is inserted.
============================================================ */

router.get('/activity', async (req, res) => {
  try {
    const buyerId = getBuyerId(req);

    if (!buyerId) {
      return res.status(401).json({
        message: 'Buyer authentication is required.'
      });
    }

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 10,
        1
      ),
      50
    );

    const offset = (page - 1) * limit;

    const result = await pool.query(
      `
      WITH activity AS (

        /* ORDERS */
        SELECT
          o.created_at AS activity_date,
          'order' AS activity_type,
          'Order placed' AS activity_name,
          CONCAT(
            'Order ',
            COALESCE(o.order_number, CONCAT('#', o.order_id))
          ) AS details,
          COALESCE(o.status, 'Recorded') AS status
        FROM orders o
        WHERE o.buyer_id = $1

        UNION ALL

        /* FAVORITES */
        SELECT
          f.created_at AS activity_date,
          'favorite' AS activity_type,
          'Added item to wishlist' AS activity_name,
          COALESCE(l.title, 'Marketplace item') AS details,
          'Completed' AS status
        FROM favorites f
        LEFT JOIN listings l
          ON l.listing_id = f.listing_id
        WHERE f.buyer_id = $1

        UNION ALL

        /* COMMUNITY POSTS */
        SELECT
          cp.created_at AS activity_date,
          'community' AS activity_type,
          'Created community post' AS activity_name,
          COALESCE(cp.title, 'Community post') AS details,
          COALESCE(cp.status, 'Recorded') AS status
        FROM community_posts cp
        WHERE cp.user_id = $1

      )

      SELECT
        activity_date,
        activity_type,
        activity_name,
        details,
        status
      FROM activity
      ORDER BY activity_date DESC
      LIMIT $2
      OFFSET $3
      `,
      [
        buyerId,
        limit,
        offset
      ]
    );

    const countResult = await pool.query(
      `
      SELECT COUNT(*)
      FROM (

        SELECT o.order_id
        FROM orders o
        WHERE o.buyer_id = $1

        UNION ALL

        SELECT f.favorite_id
        FROM favorites f
        WHERE f.buyer_id = $1

        UNION ALL

        SELECT cp.post_id
        FROM community_posts cp
        WHERE cp.user_id = $1

      ) activity
      `,
      [buyerId]
    );

    const total = Number(
      countResult.rows[0]?.count || 0
    );

    return res.json({
      items: result.rows,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit
        )
      }
    });

  } catch (error) {
    console.error(
      'GET /api/buyer/account/activity error:',
      error
    );

    return res.status(500).json({
      message:
        'Failed to load account activity.'
    });
  }
});

module.exports = router;