const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../config/db');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

/*
============================================================
HELPER: CREATE JWT
============================================================
*/

const createToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
};

/*
============================================================
POST /api/auth/register
============================================================
ALL PUBLIC REGISTRATIONS REQUIRE ADMIN APPROVAL
============================================================
*/

router.post('/register', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone,
      address,
      city,
      province,
      postal_code,
      role,
    } = req.body;

    /*
    --------------------------------------------------------
    VALIDATION
    --------------------------------------------------------
    */

    if (
      !first_name ||
      !last_name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          'First name, last name, email, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 6 characters.',
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    /*
    --------------------------------------------------------
    VALID ROLE
    --------------------------------------------------------
    */

    const selectedRole =
      String(role || 'BUYER').toUpperCase();

    if (
      !['BUYER', 'SELLER'].includes(
        selectedRole
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration role.',
      });
    }

    /*
    --------------------------------------------------------
    CHECK DUPLICATE EMAIL
    --------------------------------------------------------
    */

    const existingUser = await pool.query(
      `
      SELECT user_id
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          'Email is already registered.',
      });
    }

    /*
    --------------------------------------------------------
    HASH PASSWORD
    --------------------------------------------------------
    */

    const passwordHash =
      await bcrypt.hash(password, 10);

    /*
    --------------------------------------------------------
    IMPORTANT:
    BOTH BUYER AND SELLER = PENDING
    --------------------------------------------------------
    */

    const result = await pool.query(
      `
      INSERT INTO users (
        first_name,
        last_name,
        email,
        password_hash,
        role,
        phone,
        address,
        city,
        province,
        postal_code,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        'PENDING'
      )
      RETURNING
        user_id,
        first_name,
        last_name,
        email,
        role,
        phone,
        address,
        city,
        province,
        postal_code,
        status,
        created_at
      `,
      [
        first_name.trim(),
        last_name.trim(),
        normalizedEmail,
        passwordHash,
        selectedRole,
        phone || null,
        address || null,
        city || null,
        province || null,
        postal_code || null,
      ]
    );

    const user = result.rows[0];

    /*
    ========================================================
    EMAIL #1
    SEND EMAIL TO THE PERSON WHO REGISTERED
    ========================================================
    */

    const applicantName =
      `${user.first_name} ${user.last_name}`;

    await sendEmail({
      to: user.email,

      subject:
        'ReUse Connect Registration Received',

      text: `
Hello ${applicantName},

Thank you for registering with ReUse Connect.

Your ${user.role.toLowerCase()} account has been successfully submitted and is currently waiting for administrator approval.

You will not be able to log in until your account has been approved by an administrator.

You will receive another email once a decision has been made.

Thank you,
ReUse Connect Administration
      `.trim(),

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 30px;
          color: #333;
        ">

          <h2 style="color:#7c3aed;">
            ReUse Connect
          </h2>

          <h3>
            Registration Received
          </h3>

          <p>
            Hello <strong>${applicantName}</strong>,
          </p>

          <p>
            Thank you for registering with
            <strong>ReUse Connect</strong>.
          </p>

          <p>
            Your
            <strong>${user.role.toLowerCase()}</strong>
            account has been successfully submitted
            and is currently waiting for administrator
            approval.
          </p>

          <div style="
            background:#f5f3ff;
            border-left:4px solid #7c3aed;
            padding:15px;
            margin:20px 0;
          ">
            <strong>Status: Pending Approval</strong>
            <br />
            You cannot log in until an administrator
            approves your account.
          </div>

          <p>
            You will receive another email once a
            decision has been made.
          </p>

          <p>
            Thank you,<br />
            <strong>ReUse Connect Administration</strong>
          </p>

        </div>
      `,
    });

    /*
    ========================================================
    EMAIL #2
    FIND ALL ACTIVE ADMINS
    ========================================================
    */

    const adminResult = await pool.query(
      `
      SELECT
        user_id,
        first_name,
        last_name,
        email
      FROM users
      WHERE role = 'ADMIN'
        AND status = 'ACTIVE'
      ORDER BY user_id ASC
      `
    );

    /*
    ========================================================
    SEND ADMIN NOTIFICATION TO EVERY ACTIVE ADMIN
    ========================================================
    */

    for (const admin of adminResult.rows) {
      await sendEmail({
        to: admin.email,

        subject:
          'New ReUse Connect Registration Requires Approval',

        text: `
Hello ${admin.first_name || 'Administrator'},

A new user has registered on ReUse Connect and is waiting for your approval.

Applicant:
Name: ${applicantName}
Email: ${user.email}
Role: ${user.role}
Registration ID: ${user.user_id}

Please log in to the ReUse Connect Admin Dashboard to review and approve or reject this registration.

ReUse Connect Administration
        `.trim(),

        html: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            padding: 30px;
            color: #333;
          ">

            <h2 style="color:#7c3aed;">
              ReUse Connect
            </h2>

            <h3>
              New Registration Requires Approval
            </h3>

            <p>
              Hello
              <strong>
                ${admin.first_name || 'Administrator'}
              </strong>,
            </p>

            <p>
              A new user has registered on
              ReUse Connect and is waiting for
              administrator approval.
            </p>

            <div style="
              background:#f5f3ff;
              padding:20px;
              border-radius:10px;
              margin:20px 0;
            ">

              <p>
                <strong>Applicant:</strong>
                ${applicantName}
              </p>

              <p>
                <strong>Email:</strong>
                ${user.email}
              </p>

              <p>
                <strong>Role:</strong>
                ${user.role}
              </p>

              <p>
                <strong>Registration ID:</strong>
                ${user.user_id}
              </p>

              <p>
                <strong>Status:</strong>
                PENDING
              </p>

            </div>

            <p>
              Please log in to the
              <strong>ReUse Connect Admin Dashboard</strong>
              to review this registration.
            </p>

            <p>
              <strong>
                ReUse Connect Administration
              </strong>
            </p>

          </div>
        `,
      });
    }

    /*
    ========================================================
    DO NOT CREATE JWT FOR PENDING USER
    ========================================================
    */

    return res.status(201).json({
      success: true,

      message:
        'Registration submitted successfully. Your account is waiting for admin approval. Please check your email for updates.',

      requiresApproval: true,

      user,
    });

  } catch (error) {
    console.error(
      'REGISTER ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Registration failed.',
      error: error.message,
    });
  }
});

/*
============================================================
POST /api/auth/login
============================================================
PENDING USERS CANNOT LOGIN
============================================================
*/

router.post('/login', async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          'Email and password are required.',
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT
        user_id,
        first_name,
        last_name,
        email,
        password_hash,
        role,
        phone,
        profile_image,
        address,
        city,
        province,
        postal_code,
        status,
        created_at
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email or password.',
      });
    }

    const user = result.rows[0];

    /*
    --------------------------------------------------------
    PENDING
    --------------------------------------------------------
    */

    if (user.status === 'PENDING') {
      return res.status(403).json({
        success: false,
        message:
          'Your account is still waiting for admin approval. Please check your email for registration updates.',
        status: 'PENDING',
      });
    }

    /*
    --------------------------------------------------------
    INACTIVE
    --------------------------------------------------------
    */

    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message:
          'Your account has been rejected or is inactive. Please check your email for details.',
        status: 'INACTIVE',
      });
    }

    /*
    --------------------------------------------------------
    SUSPENDED
    --------------------------------------------------------
    */

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message:
          'Your account has been suspended. Please contact the administrator.',
        status: 'SUSPENDED',
      });
    }

    /*
    --------------------------------------------------------
    ONLY ACTIVE USERS CAN CONTINUE
    --------------------------------------------------------
    */

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message:
          'Your account is not active.',
      });
    }

    /*
    --------------------------------------------------------
    CHECK PASSWORD
    --------------------------------------------------------
    */

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email or password.',
      });
    }

    /*
    --------------------------------------------------------
    CREATE TOKEN
    --------------------------------------------------------
    */

    const token = createToken(user);

    delete user.password_hash;

    return res.status(200).json({
      success: true,

      message:
        'Login successful.',

      token,

      user,
    });

  } catch (error) {
    console.error(
      'LOGIN ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Login failed.',
      error: error.message,
    });
  }
});

module.exports = router;