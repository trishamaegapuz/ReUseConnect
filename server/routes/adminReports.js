const express = require('express');

const pool = require('../config/db');

const {
  authMiddleware,
  adminOnly
} = require('../middleware/authMiddleware');

const router = express.Router();

router.use(
  authMiddleware,
  adminOnly
);


/*
===========================================================
HELPERS
===========================================================
*/

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};


/*
===========================================================
GET REPORT OVERVIEW
===========================================================
*/

router.get(
  '/overview',
  async (req, res) => {

    try {

      const {
        startDate,
        endDate,
        category
      } = req.query;


      /*
      -------------------------------------------------------
      DATE RANGE
      -------------------------------------------------------
      */

      const start =
        startDate ||
        new Date(
          Date.now() - 6 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .slice(0, 10);

      const end =
        endDate ||
        new Date()
          .toISOString()
          .slice(0, 10);


      /*
      -------------------------------------------------------
      TOTAL USERS
      -------------------------------------------------------
      */

      const usersResult =
        await pool.query(
          `
          SELECT
            COUNT(*)::int AS total
          FROM users
          `
        );


      /*
      -------------------------------------------------------
      TOTAL LISTINGS
      -------------------------------------------------------
      */

      const listingsResult =
        await pool.query(
          `
          SELECT
            COUNT(*)::int AS total
          FROM listings
          `
        );


      /*
      -------------------------------------------------------
      TOTAL ORDERS
      -------------------------------------------------------
      */

      const ordersResult =
        await pool.query(
          `
          SELECT
            COUNT(*)::int AS total
          FROM orders
          `
        );


      /*
      -------------------------------------------------------
      TOTAL EARNINGS
      -------------------------------------------------------
      */

      const earningsResult =
        await pool.query(
          `
          SELECT
            COALESCE(
              SUM(total_amount),
              0
            ) AS total
          FROM orders
          WHERE UPPER(status) = 'COMPLETED'
          `
        );


      /*
      -------------------------------------------------------
      USER GROWTH
      -------------------------------------------------------
      */

      const userGrowthResult =
        await pool.query(
          `
          SELECT
            DATE(created_at) AS date,
            COUNT(*)::int AS total
          FROM users
          WHERE DATE(created_at)
            BETWEEN $1 AND $2
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at)
          `,
          [
            start,
            end
          ]
        );


      /*
      -------------------------------------------------------
      LISTINGS BY CATEGORY
      -------------------------------------------------------
      */

      let categoryQuery = `
        SELECT
          COALESCE(
            c.name,
            'Uncategorized'
          ) AS category,
          COUNT(l.listing_id)::int AS total
        FROM categories c
        LEFT JOIN listings l
          ON l.category_id = c.category_id
        WHERE 1 = 1
      `;

      const categoryValues = [];

      if (
        category &&
        category !== 'All Categories'
      ) {

        categoryValues.push(
          category
        );

        categoryQuery += `
          AND c.name = $${categoryValues.length}
        `;
      }

      categoryQuery += `
        GROUP BY c.category_id, c.name
        ORDER BY total DESC
      `;


      const categoryResult =
        await pool.query(
          categoryQuery,
          categoryValues
        );


      /*
      -------------------------------------------------------
      ORDER STATUS
      -------------------------------------------------------
      */

      const orderStatusResult =
        await pool.query(
          `
          SELECT
            COALESCE(
              NULLIF(TRIM(status), ''),
              'UNKNOWN'
            ) AS status,
            COUNT(*)::int AS total
          FROM orders
          GROUP BY status
          ORDER BY total DESC
          `
        );


      /*
      -------------------------------------------------------
      TOP SELLING ITEMS
      -------------------------------------------------------
      */

      const topItemsResult =
        await pool.query(
          `
          SELECT
            l.listing_id,
            l.title,
            COALESCE(
              c.name,
              'Uncategorized'
            ) AS category,
            COALESCE(
              SUM(oi.quantity),
              0
            )::int AS orders,
            COALESCE(
              SUM(
                oi.quantity *
                COALESCE(
                  oi.unit_price,
                  l.price,
                  0
                )
              ),
              0
            ) AS earnings
          FROM order_items oi
          INNER JOIN listings l
            ON l.listing_id =
               oi.listing_id
          LEFT JOIN categories c
            ON c.category_id =
               l.category_id
          INNER JOIN orders o
            ON o.order_id =
               oi.order_id
          WHERE UPPER(o.status) =
                'COMPLETED'
          GROUP BY
            l.listing_id,
            l.title,
            c.name
          ORDER BY
            orders DESC,
            earnings DESC
          LIMIT 5
          `
        );


      /*
      -------------------------------------------------------
      PLATFORM ACTIVITY
      -------------------------------------------------------
      */

      const activityResult =
        await pool.query(
          `
          SELECT *
          FROM (

            SELECT
              'User registered' AS type,
              CONCAT(
                first_name,
                ' ',
                last_name
              ) AS description,
              created_at
            FROM users

            UNION ALL

            SELECT
              'New listing posted' AS type,
              title AS description,
              created_at
            FROM listings

            UNION ALL

            SELECT
              'New order placed' AS type,
              CONCAT(
                'Order #',
                order_id
              ) AS description,
              created_at
            FROM orders

          ) activity

          ORDER BY created_at DESC

          LIMIT 6
          `
        );


      /*
      -------------------------------------------------------
      CATEGORIES FOR FILTER
      -------------------------------------------------------
      */

      const categoriesResult =
        await pool.query(
          `
          SELECT
            category_id,
            name
          FROM categories
          ORDER BY name ASC
          `
        );


      /*
      -------------------------------------------------------
      RESPONSE
      -------------------------------------------------------
      */

      res.json({

        success: true,

        filters: {
          startDate: start,
          endDate: end
        },

        summary: {

          totalUsers:
            safeNumber(
              usersResult.rows[0]?.total
            ),

          totalListings:
            safeNumber(
              listingsResult.rows[0]?.total
            ),

          totalOrders:
            safeNumber(
              ordersResult.rows[0]?.total
            ),

          totalEarnings:
            safeNumber(
              earningsResult.rows[0]?.total
            )

        },

        userGrowth:
          userGrowthResult.rows.map(
            row => ({
              date: row.date,
              total: safeNumber(
                row.total
              )
            })
          ),

        listingsByCategory:
          categoryResult.rows.map(
            row => ({
              category:
                row.category,
              total:
                safeNumber(
                  row.total
                )
            })
          ),

        orderStatus:
          orderStatusResult.rows.map(
            row => ({
              status:
                row.status,
              total:
                safeNumber(
                  row.total
                )
            })
          ),

        topSellingItems:
          topItemsResult.rows.map(
            row => ({
              listingId:
                row.listing_id,
              title:
                row.title,
              category:
                row.category,
              orders:
                safeNumber(
                  row.orders
                ),
              earnings:
                safeNumber(
                  row.earnings
                )
            })
          ),

        activity:
          activityResult.rows.map(
            row => ({
              type:
                row.type,
              description:
                row.description,
              createdAt:
                row.created_at
            })
          ),

        categories:
          categoriesResult.rows.map(
            row => ({
              id:
                row.category_id,
              name:
                row.name
            })
          )

      });

    } catch (error) {

      console.error(
        'REPORTS ANALYTICS ERROR:',
        error
      );

      res.status(500).json({

        success: false,

        message:
          'Unable to load Reports & Analytics data.',

        error:
          error.message

      });

    }

  }
);


/*
===========================================================
REPORT DATA EXPORT ENDPOINT
===========================================================
*/

router.get(
  '/export',
  async (req, res) => {

    try {

      const {
        type
      } = req.query;


      if (type === 'users') {

        const result =
          await pool.query(
            `
            SELECT
              user_id,
              first_name,
              last_name,
              email,
              role,
              status,
              created_at
            FROM users
            ORDER BY created_at DESC
            `
          );

        return res.json({
          success: true,
          report: 'User Report',
          rows: result.rows
        });

      }


      if (type === 'listings') {

        const result =
          await pool.query(
            `
            SELECT
              l.listing_id,
              l.title,
              c.name AS category,
              l.price,
              l.status,
              l.condition,
              l.created_at
            FROM listings l
            LEFT JOIN categories c
              ON c.category_id =
                 l.category_id
            ORDER BY l.created_at DESC
            `
          );

        return res.json({
          success: true,
          report: 'Listing Report',
          rows: result.rows
        });

      }


      if (type === 'sales') {

        const result =
          await pool.query(
            `
            SELECT
              o.order_id,
              o.status,
              o.total_amount,
              o.created_at
            FROM orders o
            ORDER BY o.created_at DESC
            `
          );

        return res.json({
          success: true,
          report: 'Sales Report',
          rows: result.rows
        });

      }


      if (type === 'financial') {

        const result =
          await pool.query(
            `
            SELECT
              COUNT(*)::int AS completed_orders,
              COALESCE(
                SUM(total_amount),
                0
              ) AS total_earnings
            FROM orders
            WHERE UPPER(status) =
                  'COMPLETED'
            `
          );

        return res.json({
          success: true,
          report: 'Financial Report',
          rows: result.rows
        });

      }


      return res.status(400).json({

        success: false,

        message:
          'Invalid report type.'

      });

    } catch (error) {

      console.error(
        'REPORT EXPORT ERROR:',
        error
      );

      res.status(500).json({

        success: false,

        message:
          'Unable to generate report.',

        error:
          error.message

      });

    }

  }
);


module.exports = router;