/*
============================================================
ReUseConnect
Buyer Reuse Tools Routes
============================================================

Uses existing database tables:

- orders
- order_items
- listings
- categories
- community_posts

No new database connection.
============================================================
*/

const express = require('express');

const router = express.Router();

const pool = require('../config/db');


/* ============================================================
   GET USER ID
============================================================ */

const getUserId = (req) => {

  const candidates = [

    req.user?.user_id,

    req.user?.userId,

    req.user?.id,

    req.headers['x-user-id']

  ];


  for (const value of candidates) {

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {

      const numeric =
        Number(value);


      if (
        Number.isInteger(numeric) &&
        numeric > 0
      ) {

        return numeric;

      }

    }

  }


  return null;

};


/* ============================================================
   IMPACT FACTOR
============================================================ */

/*
Estimated CO2 saved per reused item.

This is an estimate only and does NOT create database data.
The actual item count comes from the database.
*/

const getImpactFactor = (categoryName = '') => {

  const category =
    String(categoryName).toLowerCase();


  if (
    category.includes('electronic') ||
    category.includes('computer') ||
    category.includes('phone') ||
    category.includes('appliance')
  ) {

    return 15;

  }


  if (
    category.includes('furniture') ||
    category.includes('home')
  ) {

    return 25;

  }


  if (
    category.includes('clothing') ||
    category.includes('fashion') ||
    category.includes('shirt') ||
    category.includes('shoe')
  ) {

    return 8;

  }


  if (
    category.includes('book') ||
    category.includes('school')
  ) {

    return 3;

  }


  return 7;

};


/* ============================================================
   GET ENVIRONMENTAL IMPACT
============================================================ */

router.get(
  '/impact',
  async (req, res) => {

    try {

      const buyerId =
        getUserId(req);


      if (!buyerId) {

        return res.status(401).json({
          message:
            'Buyer account could not be identified.'
        });

      }


      /*
      ----------------------------------------------------------
      Existing transaction data
      ----------------------------------------------------------
      */

      const transactionResult =
        await pool.query(
          `
          SELECT

            oi.listing_id,

            SUM(
              COALESCE(oi.quantity, 0)
            ) AS quantity,

            MAX(
              LOWER(
                COALESCE(l.condition, '')
              )
            ) AS item_condition,

            MAX(
              COALESCE(c.name, '')
            ) AS category_name

          FROM orders o

          INNER JOIN order_items oi
            ON oi.order_id = o.order_id

          INNER JOIN listings l
            ON l.listing_id = oi.listing_id

          LEFT JOIN categories c
            ON c.category_id = l.category_id

          WHERE o.buyer_id = $1

            AND LOWER(
              COALESCE(o.status, '')
            ) NOT IN (
              'cancelled',
              'canceled',
              'rejected',
              'refunded',
              'failed'
            )

          GROUP BY
            oi.listing_id

          ORDER BY
            oi.listing_id
          `,
          [buyerId]
        );


      /*
      ----------------------------------------------------------
      Calculate item reuse impact
      ----------------------------------------------------------
      */

      let itemsReused = 0;

      let totalCo2Saved = 0;


      for (
        const row
        of transactionResult.rows
      ) {

        const quantity =
          Number(row.quantity || 0);


        const factor =
          getImpactFactor(
            row.category_name
          );


        itemsReused += quantity;

        totalCo2Saved +=
          quantity * factor;

      }


      /*
      ----------------------------------------------------------
      Community activity
      ----------------------------------------------------------
      */

      const communityResult =
        await pool.query(
          `
          SELECT COUNT(*)::int AS count

          FROM community_posts

          WHERE user_id = $1

            AND LOWER(
              COALESCE(status, '')
            ) NOT IN (
              'deleted',
              'removed',
              'blocked'
            )
          `,
          [buyerId]
        );


      const communityActivity =
        Number(
          communityResult.rows[0]?.count ||
          0
        );


      /*
      ----------------------------------------------------------
      Tree equivalent
      ----------------------------------------------------------

      Estimated:
      21kg CO2 = 1 tree equivalent
      ----------------------------------------------------------
      */

      const treesEquivalent =
        Number(
          (
            totalCo2Saved / 21
          ).toFixed(1)
        );


      /*
      ----------------------------------------------------------
      Current database structure does not have transaction_type.
      Therefore existing order activity is represented as
      Purchases instead of inventing Donations / Trades data.
      ----------------------------------------------------------
      */

      const purchases =
        itemsReused;


      const donations = 0;

      const trades = 0;

      const other = 0;


      /*
      ----------------------------------------------------------
      Monthly comparison
      ----------------------------------------------------------
      */

      const monthlyResult =
        await pool.query(
          `
          SELECT

            COALESCE(
              SUM(
                oi.quantity
              ),
              0
            ) AS current_items

          FROM orders o

          INNER JOIN order_items oi
            ON oi.order_id = o.order_id

          WHERE o.buyer_id = $1

            AND LOWER(
              COALESCE(o.status, '')
            ) NOT IN (
              'cancelled',
              'canceled',
              'rejected',
              'refunded',
              'failed'
            )

            AND o.created_at >=
              date_trunc(
                'month',
                CURRENT_DATE
              )
          `,
          [buyerId]
        );


      const currentMonthItems =
        Number(
          monthlyResult.rows[0]?.current_items ||
          0
        );


      /*
      ----------------------------------------------------------
      Previous month
      ----------------------------------------------------------
      */

      const previousMonthResult =
        await pool.query(
          `
          SELECT

            COALESCE(
              SUM(
                oi.quantity
              ),
              0
            ) AS previous_items

          FROM orders o

          INNER JOIN order_items oi
            ON oi.order_id = o.order_id

          WHERE o.buyer_id = $1

            AND LOWER(
              COALESCE(o.status, '')
            ) NOT IN (
              'cancelled',
              'canceled',
              'rejected',
              'refunded',
              'failed'
            )

            AND o.created_at >=
              date_trunc(
                'month',
                CURRENT_DATE
              ) - INTERVAL '1 month'

            AND o.created_at <
              date_trunc(
                'month',
                CURRENT_DATE
              )
          `,
          [buyerId]
        );


      const previousMonthItems =
        Number(
          previousMonthResult.rows[0]
            ?.previous_items || 0
        );


      let monthlyChange = 0;


      if (previousMonthItems > 0) {

        monthlyChange =
          Math.round(
            (
              (
                currentMonthItems -
                previousMonthItems
              ) /
              previousMonthItems
            ) * 100
          );

      } else if (
        currentMonthItems > 0
      ) {

        monthlyChange = 100;

      }


      return res.json({

        total_co2_saved:
          Number(
            totalCo2Saved.toFixed(1)
          ),

        items_reused:
          itemsReused,

        trees_equivalent:
          treesEquivalent,

        community_activity:
          communityActivity,

        monthly_change:
          monthlyChange,

        breakdown: {

          purchases,

          donations,

          trades,

          other

        }

      });

    } catch (error) {

      console.error(
        'BUYER REUSE TOOLS IMPACT ERROR:',
        error
      );


      return res.status(500).json({

        message:
          'Failed to load environmental impact.',

        error:
          error.message

      });

    }

  }
);


/* ============================================================
   CHECK CONDITION
============================================================ */

router.post(
  '/check-condition',
  async (req, res) => {

    try {

      const description =
        String(
          req.body?.description || ''
        ).trim();


      if (!description) {

        return res.status(400).json({

          message:
            'Item description is required.'

        });

      }


      /*
      ----------------------------------------------------------
      Extract useful search words
      ----------------------------------------------------------
      */

      const words =
        description
          .toLowerCase()
          .replace(
            /[^a-z0-9\s-]/g,
            ' '
          )
          .split(/\s+/)
          .filter(
            word =>
              word.length >= 3
          )
          .slice(0, 8);


      if (!words.length) {

        return res.status(400).json({

          message:
            'Please provide a more detailed item description.'

        });

      }


      const searchConditions =
        words.map(
          (_, index) => `
            (
              LOWER(
                COALESCE(l.title, '')
              ) LIKE $${index + 1}

              OR

              LOWER(
                COALESCE(l.description, '')
              ) LIKE $${index + 1}

              OR

              LOWER(
                COALESCE(c.name, '')
              ) LIKE $${index + 1}
            )
          `
        );


      const values =
        words.map(
          word => `%${word}%`
        );


      /*
      ----------------------------------------------------------
      Search actual marketplace records
      ----------------------------------------------------------
      */

      const result =
        await pool.query(
          `
          SELECT

            l.listing_id,

            l.title,

            l.description,

            l.condition,

            l.price,

            l.location,

            c.name AS category_name

          FROM listings l

          LEFT JOIN categories c
            ON c.category_id = l.category_id

          WHERE LOWER(
            COALESCE(l.status, '')
          ) NOT IN (
            'deleted',
            'removed',
            'rejected',
            'blocked'
          )

          AND (
            ${searchConditions.join(' OR ')}
          )

          ORDER BY
            l.created_at DESC

          LIMIT 5
          `,
          values
        );


      if (!result.rows.length) {

        return res.json({

          found: false,

          condition: null,

          matches: [],

          message:
            'No matching marketplace item was found for the supplied description.'

        });

      }


      /*
      ----------------------------------------------------------
      Determine available condition
      ----------------------------------------------------------
      */

      const conditionPriority = {
        'new': 5,
        'like new': 5,
        'excellent': 5,
        'good': 4,
        'fair': 3,
        'poor': 2,
        'damaged': 1
      };


      let selectedCondition =
        result.rows[0].condition ||
        'Not specified';


      let highestScore = -1;


      for (
        const row
        of result.rows
      ) {

        const condition =
          String(
            row.condition || ''
          ).toLowerCase().trim();


        const score =
          conditionPriority[condition] ??
          0;


        if (score > highestScore) {

          highestScore = score;

          selectedCondition =
            row.condition ||
            'Not specified';

        }

      }


      return res.json({

        found: true,

        condition:
          selectedCondition,

        matches:
          result.rows,

        message:
          'The result is based on matching records currently available in the ReUseConnect marketplace database.'

      });

    } catch (error) {

      console.error(
        'BUYER CONDITION CHECK ERROR:',
        error
      );


      return res.status(500).json({

        message:
          'Failed to check item condition.',

        error:
          error.message

      });

    }

  }
);


module.exports = router;