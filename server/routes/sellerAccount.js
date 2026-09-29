const express = require('express');
const bcrypt = require('bcryptjs');

const pool = require('../config/db');

const {
  authMiddleware,
  sellerOnly
} = require('../middleware/authMiddleware');

const router = express.Router();

router.use(
  authMiddleware,
  sellerOnly
);


// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => {
  const value =
    req.user?.user_id ??
    req.user?.userId ??
    req.user?.id;

  const userId = Number(value);

  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    return null;
  }

  return userId;
};


const getUsersColumns = async () => {
  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
  `);

  return new Set(
    result.rows.map(
      row => row.column_name
    )
  );
};


const pickColumn = (
  columns,
  possibleNames
) => {
  return possibleNames.find(
    name => columns.has(name)
  ) || null;
};


const ensurePreferencesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seller_account_preferences (
      preference_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      dark_mode BOOLEAN NOT NULL DEFAULT FALSE,
      language VARCHAR(30) NOT NULL DEFAULT 'English',
      display_settings VARCHAR(30) NOT NULL DEFAULT 'Standard',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};


const getOrCreatePreferences = async (
  userId
) => {
  await ensurePreferencesTable();

  const existing =
    await pool.query(
      `
      SELECT
        notifications_enabled,
        two_factor_enabled,
        dark_mode,
        language,
        display_settings
      FROM seller_account_preferences
      WHERE user_id = $1
      LIMIT 1
      `,
      [userId]
    );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const created =
    await pool.query(
      `
      INSERT INTO seller_account_preferences (
        user_id
      )
      VALUES ($1)
      RETURNING
        notifications_enabled,
        two_factor_enabled,
        dark_mode,
        language,
        display_settings
      `,
      [userId]
    );

  return created.rows[0];
};


// ============================================================
// GET ACCOUNT
// ============================================================

router.get(
  '/',
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated seller is required.'
        });
      }

      const columns =
        await getUsersColumns();

      const firstNameColumn =
        pickColumn(
          columns,
          [
            'first_name',
            'firstname',
            'firstName'
          ]
        );

      const lastNameColumn =
        pickColumn(
          columns,
          [
            'last_name',
            'lastname',
            'lastName'
          ]
        );

      const emailColumn =
        pickColumn(
          columns,
          ['email']
        );

      const phoneColumn =
        pickColumn(
          columns,
          [
            'phone',
            'phone_number',
            'mobile_number',
            'contact_number'
          ]
        );

      const locationColumn =
        pickColumn(
          columns,
          [
            'location',
            'address',
            'city'
          ]
        );

      const bioColumn =
        pickColumn(
          columns,
          ['bio']
        );

      const profileImageColumn =
        pickColumn(
          columns,
          [
            'profile_image',
            'profile_image_url',
            'avatar',
            'image_url'
          ]
        );


      const selectParts = [
        'user_id'
      ];


      if (firstNameColumn) {
        selectParts.push(
          `"${firstNameColumn}" AS first_name`
        );
      } else {
        selectParts.push(
          `'' AS first_name`
        );
      }


      if (lastNameColumn) {
        selectParts.push(
          `"${lastNameColumn}" AS last_name`
        );
      } else {
        selectParts.push(
          `'' AS last_name`
        );
      }


      if (emailColumn) {
        selectParts.push(
          `"${emailColumn}" AS email`
        );
      } else {
        selectParts.push(
          `'' AS email`
        );
      }


      if (phoneColumn) {
        selectParts.push(
          `"${phoneColumn}" AS phone`
        );
      } else {
        selectParts.push(
          `'' AS phone`
        );
      }


      if (locationColumn) {
        selectParts.push(
          `"${locationColumn}" AS location`
        );
      } else {
        selectParts.push(
          `'' AS location`
        );
      }


      if (bioColumn) {
        selectParts.push(
          `"${bioColumn}" AS bio`
        );
      } else {
        selectParts.push(
          `'' AS bio`
        );
      }


      if (profileImageColumn) {
        selectParts.push(
          `"${profileImageColumn}" AS profile_image`
        );
      } else {
        selectParts.push(
          `NULL AS profile_image`
        );
      }


      const userResult =
        await pool.query(
          `
          SELECT
            ${selectParts.join(', ')}
          FROM users
          WHERE user_id = $1
          LIMIT 1
          `,
          [userId]
        );


      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            'Seller account was not found.'
        });
      }


      const preferences =
        await getOrCreatePreferences(
          userId
        );


      return res.json({
        success: true,

        account: userResult.rows[0],

        preferences
      });

    } catch (error) {

      console.error(
        'SELLER ACCOUNT GET ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load seller account.'
      });
    }
  }
);


// ============================================================
// UPDATE PERSONAL INFORMATION
// ============================================================

router.put(
  '/profile',
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated seller is required.'
        });
      }


      const {
        firstName,
        lastName,
        email,
        phone,
        location,
        bio,
        profileImage
      } = req.body;


      const columns =
        await getUsersColumns();


      const firstNameColumn =
        pickColumn(
          columns,
          [
            'first_name',
            'firstname',
            'firstName'
          ]
        );

      const lastNameColumn =
        pickColumn(
          columns,
          [
            'last_name',
            'lastname',
            'lastName'
          ]
        );

      const emailColumn =
        pickColumn(
          columns,
          ['email']
        );

      const phoneColumn =
        pickColumn(
          columns,
          [
            'phone',
            'phone_number',
            'mobile_number',
            'contact_number'
          ]
        );

      const locationColumn =
        pickColumn(
          columns,
          [
            'location',
            'address',
            'city'
          ]
        );

      const bioColumn =
        pickColumn(
          columns,
          ['bio']
        );

      const profileImageColumn =
        pickColumn(
          columns,
          [
            'profile_image',
            'profile_image_url',
            'avatar',
            'image_url'
          ]
        );


      if (
        emailColumn &&
        email !== undefined &&
        email !== ''
      ) {

        const duplicate =
          await pool.query(
            `
            SELECT user_id
            FROM users
            WHERE LOWER(email) = LOWER($1)
              AND user_id <> $2
            LIMIT 1
            `,
            [
              String(email).trim(),
              userId
            ]
          );


        if (duplicate.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message:
              'That email address is already being used.'
          });
        }
      }


      const updates = [];
      const values = [];

      const addUpdate = (
        column,
        value
      ) => {
        if (
          !column ||
          value === undefined
        ) {
          return;
        }

        updates.push(
          `"${column}" = $${values.length + 1}`
        );

        values.push(value);
      };


      addUpdate(
        firstNameColumn,
        firstName
      );

      addUpdate(
        lastNameColumn,
        lastName
      );

      addUpdate(
        emailColumn,
        email
      );

      addUpdate(
        phoneColumn,
        phone
      );

      addUpdate(
        locationColumn,
        location
      );

      addUpdate(
        bioColumn,
        bio
      );


      if (
        profileImageColumn &&
        profileImage !== undefined
      ) {
        addUpdate(
          profileImageColumn,
          profileImage
        );
      }


      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            'No account information was provided.'
        });
      }


      values.push(userId);


      const result =
        await pool.query(
          `
          UPDATE users
          SET ${updates.join(', ')}
          WHERE user_id = $${values.length}
          RETURNING user_id
          `,
          values
        );


      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            'Seller account was not found.'
        });
      }


      return res.json({
        success: true,
        message:
          'Your account information has been updated.'
      });

    } catch (error) {

      console.error(
        'SELLER ACCOUNT PROFILE UPDATE ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to update account information.'
      });
    }
  }
);


// ============================================================
// CHANGE PASSWORD
// ============================================================

router.put(
  '/password',
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated seller is required.'
        });
      }


      const {
        currentPassword,
        newPassword
      } = req.body;


      if (
        !currentPassword ||
        !newPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Current password and new password are required.'
        });
      }


      if (
        String(newPassword).length < 8
      ) {
        return res.status(400).json({
          success: false,
          message:
            'New password must be at least 8 characters.'
        });
      }


      const columns =
        await getUsersColumns();


      const passwordColumn =
        pickColumn(
          columns,
          [
            'password_hash',
            'password',
            'passwordHash'
          ]
        );


      if (!passwordColumn) {
        return res.status(500).json({
          success: false,
          message:
            'Password field was not found in the users table.'
        });
      }


      const result =
        await pool.query(
          `
          SELECT
            "${passwordColumn}" AS password_value
          FROM users
          WHERE user_id = $1
          LIMIT 1
          `,
          [userId]
        );


      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            'Seller account was not found.'
        });
      }


      const storedPassword =
        result.rows[0].password_value;


      let passwordMatches = false;


      try {
        passwordMatches =
          await bcrypt.compare(
            String(currentPassword),
            String(storedPassword)
          );
      } catch {
        passwordMatches = false;
      }


      if (!passwordMatches) {
        return res.status(400).json({
          success: false,
          message:
            'Current password is incorrect.'
        });
      }


      const hashedPassword =
        await bcrypt.hash(
          String(newPassword),
          12
        );


      await pool.query(
        `
        UPDATE users
        SET "${passwordColumn}" = $1
        WHERE user_id = $2
        `,
        [
          hashedPassword,
          userId
        ]
      );


      return res.json({
        success: true,
        message:
          'Password changed successfully.'
      });

    } catch (error) {

      console.error(
        'SELLER CHANGE PASSWORD ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to change password.'
      });
    }
  }
);


// ============================================================
// UPDATE PREFERENCES
// ============================================================

router.put(
  '/preferences',
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated seller is required.'
        });
      }


      await ensurePreferencesTable();


      const {
        notificationsEnabled,
        twoFactorEnabled,
        darkMode,
        language,
        displaySettings
      } = req.body;


      const updates = [];
      const values = [];


      const addUpdate = (
        column,
        value
      ) => {
        if (value === undefined) {
          return;
        }

        updates.push(
          `"${column}" = $${values.length + 1}`
        );

        values.push(value);
      };


      addUpdate(
        'notifications_enabled',
        notificationsEnabled
      );

      addUpdate(
        'two_factor_enabled',
        twoFactorEnabled
      );

      addUpdate(
        'dark_mode',
        darkMode
      );

      addUpdate(
        'language',
        language
      );

      addUpdate(
        'display_settings',
        displaySettings
      );


      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            'No preference changes were provided.'
        });
      }


      values.push(userId);


      const result =
        await pool.query(
          `
          UPDATE seller_account_preferences
          SET
            ${updates.join(', ')},
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $${values.length}
          RETURNING
            notifications_enabled,
            two_factor_enabled,
            dark_mode,
            language,
            display_settings
          `,
          values
        );


      if (result.rows.length === 0) {

        const created =
          await pool.query(
            `
            INSERT INTO seller_account_preferences (
              user_id,
              notifications_enabled,
              two_factor_enabled,
              dark_mode,
              language,
              display_settings
            )
            VALUES (
              $1,
              COALESCE($2, TRUE),
              COALESCE($3, FALSE),
              COALESCE($4, FALSE),
              COALESCE($5, 'English'),
              COALESCE($6, 'Standard')
            )
            RETURNING
              notifications_enabled,
              two_factor_enabled,
              dark_mode,
              language,
              display_settings
            `,
            [
              userId,
              notificationsEnabled,
              twoFactorEnabled,
              darkMode,
              language,
              displaySettings
            ]
          );

        return res.json({
          success: true,
          message:
            'Preferences updated successfully.',
          preferences:
            created.rows[0]
        });
      }


      return res.json({
        success: true,
        message:
          'Preferences updated successfully.',
        preferences:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        'SELLER PREFERENCES UPDATE ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to update preferences.'
      });
    }
  }
);


// ============================================================
// LOGIN ACTIVITY
// ============================================================

router.get(
  '/login-activity',
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            'Authenticated seller is required.'
        });
      }


      const tableCheck =
        await pool.query(`
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'login_activity'
          ) AS exists
        `);


      if (!tableCheck.rows[0].exists) {
        return res.json({
          success: true,
          activities: []
        });
      }


      const result =
        await pool.query(
          `
          SELECT *
          FROM login_activity
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 10
          `,
          [userId]
        );


      return res.json({
        success: true,
        activities:
          result.rows
      });

    } catch (error) {

      console.error(
        'SELLER LOGIN ACTIVITY ERROR:',
        error
      );

      return res.json({
        success: true,
        activities: []
      });
    }
  }
);


module.exports = router;