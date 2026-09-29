const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

/*
============================================================
DATABASE
============================================================
*/

const pool = require('./config/db');

/*
============================================================
ROUTES
============================================================
*/

const authRoutes =
  require('./routes/auth');

const adminUsersRoutes =
  require('./routes/adminUsers');

const adminMarketplaceRoutes =
  require('./routes/adminMarketplace');

const adminCommunityRoutes =
  require('./routes/adminCommunity');

const adminReportsRoutes =
  require('./routes/adminReports');

const contentManagementRoutes =
  require('./routes/contentManagement');

const adminSystemRoutes =
  require('./routes/adminSystem');

const adminRoutes =
  require('./routes/admin');

const guestRoutes =
  require('./routes/guest');

const buyerDashboardRoutes =
  require('./routes/buyerDashboard');

const buyerContentRoutes =
  require('./routes/buyerContent');

const buyerOrdersRoutes =
  require('./routes/buyerOrders');

/*
============================================================
BUYER MARKETPLACE
============================================================
*/

const buyerMarketplaceRoutes =
  require('./routes/buyerMarketplace');

const buyerTransactionsRoutes =
  require('./routes/buyerTransactions');

const buyerCommunityRoutes =
  require('./routes/buyerCommunity');

const buyerReuseToolsRoutes =
  require('./routes/buyerReuseTools');

const buyerAccountRoutes =
  require('./routes/buyerAccount');

const buyerMessagesRoutes =
  require('./routes/buyerMessages');

/*
============================================================
SELLER
============================================================
*/

const sellerRoutes =
  require('./routes/seller');

const sellerListingsRoutes =
  require('./routes/sellerListings');

const sellerTransactionsRoutes =
  require('./routes/sellerTransactions');

const sellerTradeExchangeRoutes =
  require('./routes/sellerTradeExchange'); 

const sellerCommunicationRoutes =
  require('./routes/sellerCommunication');

const sellerReuseToolsRoutes =
  require('./routes/sellerReuseTools');

const sellerAccountRoutes =
  require('./routes/sellerAccount');

const sellerContentRoutes =
  require('./routes/sellerContent');
/*
============================================================
AUTH MIDDLEWARE
============================================================
*/

const {
  authMiddleware,
  adminOnly,
  sellerOnly,
  buyerOnly
} = require('./middleware/authMiddleware');

/*
============================================================
APP
============================================================
*/

const app = express();

const PORT =
  process.env.PORT || 5000;

/*
============================================================
CORS
============================================================
*/

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

/*
============================================================
BODY PARSER
============================================================
*/

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true
  })
);

/*
============================================================
ROOT
============================================================
*/

app.get(
  '/',
  (req, res) => {

    return res.json({
      success: true,
      message:
        'ReUse Connect API is running'
    });

  }
);

/*
============================================================
DATABASE TEST
============================================================
*/

app.get(
  '/api/test-db',
  async (req, res) => {

    try {

      const result =
        await pool.query(
          'SELECT NOW() AS current_time'
        );

      return res.json({

        success: true,

        message:
          'PostgreSQL connection successful',

        database:
          process.env.DB_NAME,

        serverTime:
          result.rows[0].current_time

      });

    } catch (error) {

      console.error(
        'Database test error:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'PostgreSQL connection failed',

        error:
          error.message

      });

    }

  }
);

/*
============================================================
AUTH
============================================================
*/

app.use(
  '/api/auth',
  authRoutes
);

/*
============================================================
ADMIN
============================================================
*/

app.use(
  '/api/admin/users',
  adminUsersRoutes
);

app.use(
  '/api/admin/marketplace',
  adminMarketplaceRoutes
);

app.use(
  '/api/admin/community',
  adminCommunityRoutes
);

app.use(
  '/api/admin/reports',
  adminReportsRoutes
);

app.use(
  '/api/admin/content',
  contentManagementRoutes
);

app.use(
  '/api/admin/system',
  adminSystemRoutes
);

/*
============================================================
COMMUNITY IMAGE
PUBLIC IMAGE ROUTE
============================================================
*/

app.get(
  '/uploads/community/:filename',
  (req, res) => {

    try {

      const filename =
        path.basename(
          req.params.filename
        );

      const possiblePaths = [

        path.join(
          __dirname,
          'public',
          'uploads',
          'community',
          filename
        ),

        path.join(
          __dirname,
          'uploads',
          'community',
          filename
        ),

        path.join(
          __dirname,
          '..',
          'public',
          'uploads',
          'community',
          filename
        )

      ];

      const fs =
        require('fs');

      const existingPath =
        possiblePaths.find(
          (imagePath) =>
            fs.existsSync(imagePath)
        );

      console.log(
        'Loading community image:',
        existingPath || possiblePaths[0]
      );

      if (!existingPath) {

        return res.status(404).json({

          success: false,

          message:
            'Community image not found.',

          filename

        });

      }

      return res.sendFile(
        existingPath,
        (error) => {

          if (error) {

            console.error(
              'Community image send error:',
              error
            );

            if (!res.headersSent) {

              return res.status(500).json({

                success: false,

                message:
                  'Unable to load community image.'

              });

            }

          }

        }
      );

    } catch (error) {

      console.error(
        'Community image route error:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load community image.'

      });

    }

  }
);

/*
============================================================
COMMUNITY IMAGE
BUYER COMMUNITY COMPATIBILITY ROUTE
============================================================
*/

app.get(
  '/api/buyer/community/image/:filename',
  (req, res) => {

    try {

      const filename =
        path.basename(
          req.params.filename
        );

      const fs =
        require('fs');

      const imagePath =
        path.join(
          __dirname,
          'public',
          'uploads',
          'community',
          filename
        );

      console.log(
        'Loading buyer community image:',
        imagePath
      );

      if (!fs.existsSync(imagePath)) {

        return res.status(404).json({

          success: false,

          message:
            'Community image not found.',

          filename

        });

      }

      return res.sendFile(
        imagePath,
        (error) => {

          if (error) {

            console.error(
              'Buyer community image send error:',
              error
            );

            if (!res.headersSent) {

              return res.status(500).json({

                success: false,

                message:
                  'Unable to load community image.'

              });

            }

          }

        }
      );

    } catch (error) {

      console.error(
        'Buyer community image route error:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load community image.'

      });

    }

  }
);

/*
============================================================
SELLER LISTING IMAGE
PUBLIC IMAGE ROUTE
============================================================
*/

app.get(
  '/api/seller/listings/image/:filename',
  (req, res) => {

    try {

      const filename =
        path.basename(
          req.params.filename
        );

      const imagePath =
        path.join(
          __dirname,
          'uploads',
          'listings',
          filename
        );

      console.log(
        'Loading listing image:',
        imagePath
      );

      res.sendFile(
        imagePath,
        (error) => {

          if (error) {

            console.error(
              'Listing image error:',
              error
            );

            if (!res.headersSent) {

              if (
                error.statusCode === 404
              ) {

                return res.status(404).json({

                  success: false,

                  message:
                    'Listing image not found.'

                });

              }

              return res.status(500).json({

                success: false,

                message:
                  'Unable to load listing image.'

              });

            }

          }

        }
      );

    } catch (error) {

      console.error(
        'Listing image route error:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load listing image.'

      });

    }

  }
);

/*
============================================================
SELLER
============================================================
*/

app.use(
  '/api/seller',
  sellerRoutes
);

app.use(
  '/api/seller/listings',
  sellerListingsRoutes
);

app.use(
  '/api/seller/transactions',
  sellerTransactionsRoutes
);

app.use(
  '/api/seller/trade-exchange',
  sellerTradeExchangeRoutes
);

app.use(
  '/api/seller/communication',
  sellerCommunicationRoutes
);

app.use(
  '/api/seller/reuse-tools',
  sellerReuseToolsRoutes
);

app.use(
  '/api/seller/account',
  sellerAccountRoutes
);

app.use(
  '/api/seller/content',
  sellerContentRoutes
);
/*
============================================================
GUEST
============================================================
*/

app.use(
  '/api/guest',
  guestRoutes
);

/*
============================================================
BUYER DASHBOARD
============================================================
*/

app.use(
  '/api/buyer/dashboard',
  buyerDashboardRoutes
);

/*
============================================================
BUYER PUBLISHED CONTENT
============================================================
*/

app.use(
  '/api/buyer/content',
  buyerContentRoutes
);

console.log(
  '✅ Buyer Published Content route loaded at /api/buyer/content'
);

/*
============================================================
BUYER ORDERS
============================================================
*/

app.use(
  '/api/buyer/orders',
  buyerOrdersRoutes
);

/*
============================================================
BUYER MARKETPLACE
============================================================
*/

app.use(
  '/api/buyer/marketplace',
  buyerMarketplaceRoutes
);

app.use(
  '/api/marketplace',
  buyerMarketplaceRoutes
);

/*
============================================================
BUYER TRANSACTIONS
============================================================

IMPORTANT:

The routes inside buyerTransactions.js are:

GET  /
GET  /summary
GET  /:orderId
GET  /:orderId/review
POST /:orderId/review

Therefore this mount creates:

GET
/api/buyer/transactions

GET
/api/buyer/transactions/summary

GET
/api/buyer/transactions/:orderId

GET
/api/buyer/transactions/:orderId/review

POST
/api/buyer/transactions/:orderId/review

============================================================
*/

app.use(
  '/api/buyer/transactions',
  buyerTransactionsRoutes
);

console.log(
  '✅ Buyer Transactions routes loaded at /api/buyer/transactions'
);

/*
============================================================
BUYER COMMUNITY
============================================================
*/

app.use(
  '/api/buyer/community',
  buyerCommunityRoutes
);

/*
============================================================
BUYER REUSE TOOLS
============================================================
*/

app.use(
  '/api/buyer/reuse-tools',
  buyerReuseToolsRoutes
);

/*
============================================================
BUYER ACCOUNT
============================================================
*/

app.use(
  '/api/buyer/account',
  buyerAccountRoutes
);

/*
============================================================
BUYER MESSAGES
============================================================
*/

app.use(
  '/api/buyer/messages',
  buyerMessagesRoutes
);

/*
============================================================
ADMIN ROUTES
============================================================
*/

app.use(
  '/api/admin',
  adminRoutes
);

/*
============================================================
PROTECTED TEST
============================================================
*/

app.get(
  '/api/protected',
  authMiddleware,
  (req, res) => {

    return res.json({

      success: true,

      message:
        'You accessed a protected route.',

      user:
        req.user

    });

  }
);

/*
============================================================
ADMIN TEST
============================================================
*/

app.get(
  '/api/admin-test',
  authMiddleware,
  adminOnly,
  (req, res) => {

    return res.json({

      success: true,

      message:
        'Admin access granted.',

      user:
        req.user

    });

  }
);

/*
============================================================
SELLER TEST
============================================================
*/

app.get(
  '/api/seller/test',
  authMiddleware,
  sellerOnly,
  (req, res) => {

    return res.json({

      success: true,

      message:
        'Seller access granted.',

      user:
        req.user

    });

  }
);

/*
============================================================
BUYER TEST
============================================================
*/

app.get(
  '/api/buyer/test',
  authMiddleware,
  buyerOnly,
  (req, res) => {

    return res.json({

      success: true,

      message:
        'Buyer access granted.',

      user:
        req.user

    });

  }
);

/*
============================================================
404
============================================================
*/

app.use(
  (req, res) => {

    console.error(
      '❌ 404 API ROUTE NOT FOUND:',
      req.method,
      req.originalUrl
    );

    return res.status(404).json({

      success: false,

      message:
        'API route not found',

      method:
        req.method,

      path:
        req.originalUrl

    });

  }
);

/*
============================================================
START SERVER
============================================================
*/

const startServer =
  async () => {

    try {

      await pool.query(
        'SELECT 1'
      );

      console.log('');

      console.log(
        '=========================================='
      );

      console.log(
        '       ReUse Connect Backend API'
      );

      console.log(
        '=========================================='
      );

      console.log(
        '✅ Database connection verified'
      );

      console.log(
        `🗄️ Database: ${process.env.DB_NAME}`
      );

      console.log(
        `🚀 Server: http://localhost:${PORT}`
      );

      console.log('');

      /*
      --------------------------------------------------------
      AUTHENTICATION
      --------------------------------------------------------
      */

      console.log(
        '🔐 Authentication:'
      );

      console.log(
        `   POST http://localhost:${PORT}/api/auth/register`
      );

      console.log(
        `   POST http://localhost:${PORT}/api/auth/login`
      );

      console.log('');

      /*
      --------------------------------------------------------
      ADMIN DASHBOARD
      --------------------------------------------------------
      */

      console.log(
        '📊 Admin Dashboard:'
      );

      console.log(
        `   GET http://localhost:${PORT}/api/admin/dashboard`
      );

      console.log('');

      /*
      --------------------------------------------------------
      ADMIN USERS
      --------------------------------------------------------
      */

      console.log(
        '👥 Admin User Management:'
      );

      console.log(
        `   GET   http://localhost:${PORT}/api/admin/users`
      );

      console.log(
        `   GET   http://localhost:${PORT}/api/admin/users/summary`
      );

      console.log(
        `   GET   http://localhost:${PORT}/api/admin/users/:userId`
      );

      console.log(
        `   PATCH http://localhost:${PORT}/api/admin/users/:userId/status`
      );

      console.log('');

      /*
      --------------------------------------------------------
      REGISTRATION APPROVAL
      --------------------------------------------------------
      */

      console.log(
        '📝 Registration Approval:'
      );

      console.log(
        `   GET   http://localhost:${PORT}/api/admin/registrations/pending`
      );

      console.log(
        `   PATCH http://localhost:${PORT}/api/admin/registrations/:userId/approve`
      );

      console.log(
        `   PATCH http://localhost:${PORT}/api/admin/registrations/:userId/reject`
      );

      console.log('');

      /*
      --------------------------------------------------------
      BUYER
      --------------------------------------------------------
      */

      console.log(
        '🛒 Buyer:'
      );

      console.log(
        `   GET http://localhost:${PORT}/api/buyer/dashboard`
      );

      console.log(
        `   GET http://localhost:${PORT}/api/buyer/content`
      );

      console.log(
        `   GET http://localhost:${PORT}/api/buyer/orders/recent`
      );

      console.log(
        `   GET http://localhost:${PORT}/api/buyer/marketplace`
      );

      console.log(
        `   GET http://localhost:${PORT}/api/marketplace`
      );

      console.log(
        `   GET http://localhost:${PORT}/api/buyer/marketplace/categories`
      );

      console.log('');

      /*
      --------------------------------------------------------
      BUYER TRANSACTIONS
      --------------------------------------------------------
      */

      console.log(
        '💳 Buyer Transactions:'
      );

      console.log(
        `   GET  http://localhost:${PORT}/api/buyer/transactions`
      );

      console.log(
        `   GET  http://localhost:${PORT}/api/buyer/transactions/summary`
      );

      console.log(
        `   GET  http://localhost:${PORT}/api/buyer/transactions/:orderId`
      );

      console.log(
        `   GET  http://localhost:${PORT}/api/buyer/transactions/:orderId/review`
      );

      console.log(
        `   POST http://localhost:${PORT}/api/buyer/transactions/:orderId/review`
      );

      console.log('');

      /*
      --------------------------------------------------------
      SELLER TRANSACTIONS
      --------------------------------------------------------
      */

      console.log(
        '🛍️ Seller Transactions:'
      );

      console.log(
        `   GET   http://localhost:${PORT}/api/seller/transactions`
      );

      console.log(
        `   GET   http://localhost:${PORT}/api/seller/transactions/stats`
      );

      console.log(
        `   GET   http://localhost:${PORT}/api/seller/transactions/orders/:orderId`
      );

      console.log(
        `   PATCH http://localhost:${PORT}/api/seller/transactions/orders/:orderId/status`
      );

      console.log(
        `   GET   http://localhost:${PORT}/api/seller/transactions/earnings`
      );

      console.log(
        `   GET   http://localhost:${PORT}/api/seller/transactions/reviews`
      );

      console.log('');

      /*
      --------------------------------------------------------
      PROTECTED
      --------------------------------------------------------
      */

      console.log(
        '🛡️ Protected routes:'
      );

      console.log(
        `   GET http://localhost:${PORT}/api/protected`
      );

      console.log(
        `   GET http://localhost:${PORT}/api/admin-test`
      );

      console.log(
        `   GET http://localhost:${PORT}/api/seller/test`
      );

      console.log(
        `   GET http://localhost:${PORT}/api/buyer/test`
      );

      console.log(
        '=========================================='
      );

      console.log('');

      app.listen(
        PORT,
        () => {

          console.log(
            `🚀 ReUse Connect API listening on port ${PORT}`
          );

          console.log('');

          console.log(
            '✅ Buyer Transactions Review API:'
          );

          console.log(
            `   GET  http://localhost:${PORT}/api/buyer/transactions/:orderId/review`
          );

          console.log(
            `   POST http://localhost:${PORT}/api/buyer/transactions/:orderId/review`
          );

          console.log('');

        }
      );

    } catch (error) {

      console.error('');

      console.error(
        '❌ DATABASE CONNECTION FAILED'
      );

      console.error(
        error.message
      );

      console.error('');

      process.exit(1);

    }

  };

startServer();