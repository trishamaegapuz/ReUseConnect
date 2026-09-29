const express = require('express');

const router = express.Router();

const pool = require('../config/db');

const {
  authMiddleware,
  sellerOnly
} = require('../middleware/authMiddleware');


// ============================================================
// SELLER AUTHENTICATION
// ============================================================

router.use(
  authMiddleware,
  sellerOnly
);


// ============================================================
// GET SELLER CONVERSATIONS
// ============================================================
//
// Gets all buyers who have exchanged messages with
// the currently authenticated seller.
//
// Uses existing:
// users
// messages
// listings
// listing_images
//
// No new conversations table is required.
// ============================================================

router.get(
  '/conversations',
  async (req, res) => {

    try {

      const sellerId =
        req.user.user_id;


      const result =
        await pool.query(

          `
          WITH seller_messages AS (

            SELECT

              m.message_id,

              m.sender_id,

              m.receiver_id,

              m.listing_id,

              m.order_id,

              m.message,

              m.is_read,

              m.created_at,

              CASE

                WHEN m.sender_id = $1
                  THEN m.receiver_id

                ELSE m.sender_id

              END AS buyer_id

            FROM messages m

            WHERE

              m.sender_id = $1

              OR

              m.receiver_id = $1
          ),


          latest_messages AS (

            SELECT DISTINCT ON (buyer_id)

              buyer_id,

              message_id,

              sender_id,

              receiver_id,

              listing_id,

              order_id,

              message,

              is_read,

              created_at

            FROM seller_messages

            ORDER BY

              buyer_id,

              created_at DESC,

              message_id DESC
          ),


          unread_messages AS (

            SELECT

              CASE

                WHEN m.sender_id = $1
                  THEN m.receiver_id

                ELSE m.sender_id

              END AS buyer_id,

              COUNT(*)::INTEGER AS unread_count

            FROM messages m

            WHERE

              m.receiver_id = $1

              AND m.is_read = FALSE

            GROUP BY

              CASE

                WHEN m.sender_id = $1
                  THEN m.receiver_id

                ELSE m.sender_id

              END
          )


          SELECT

            lm.buyer_id,


            CONCAT(
              u.first_name,
              ' ',
              u.last_name
            ) AS buyer_name,


            u.first_name,

            u.last_name,

            u.profile_image,

            u.status AS buyer_status,


            lm.message_id
              AS latest_message_id,


            lm.message
              AS latest_message,


            lm.created_at
              AS latest_message_at,


            lm.listing_id,


            l.title
              AS listing_title,


            l.price
              AS listing_price,


            li.image_url
              AS listing_image,


            COALESCE(
              um.unread_count,
              0
            ) AS unread_count


          FROM latest_messages lm


          INNER JOIN users u

            ON u.user_id =
              lm.buyer_id


          LEFT JOIN listings l

            ON l.listing_id =
              lm.listing_id


          LEFT JOIN LATERAL (

            SELECT

              image_url

            FROM listing_images

            WHERE

              listing_id =
                lm.listing_id

            ORDER BY

              is_primary DESC,

              sort_order ASC,

              image_id ASC

            LIMIT 1

          ) li

            ON TRUE


          LEFT JOIN unread_messages um

            ON um.buyer_id =
              lm.buyer_id


          WHERE

            u.role = 'BUYER'


          ORDER BY

            lm.created_at DESC
          `,

          [sellerId]

        );


      return res.json({

        success: true,

        conversations:
          result.rows

      });

    } catch (error) {

      console.error(
        'SELLER COMMUNICATION CONVERSATIONS ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to load seller conversations.',

        error:
          error.message

      });

    }

  }
);


// ============================================================
// GET SINGLE CONVERSATION
// ============================================================

router.get(
  '/conversations/:buyerId',
  async (req, res) => {

    try {

      const sellerId =
        req.user.user_id;


      const buyerId =
        Number(
          req.params.buyerId
        );


      if (
        !Number.isInteger(buyerId) ||
        buyerId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid buyer ID.'

        });

      }


      // ------------------------------------------------------
      // GET BUYER
      // ------------------------------------------------------

      const buyerResult =
        await pool.query(

          `
          SELECT

            user_id,

            first_name,

            last_name,

            CONCAT(
              first_name,
              ' ',
              last_name
            ) AS full_name,

            email,

            profile_image,

            status

          FROM users

          WHERE

            user_id = $1

            AND role = 'BUYER'

          LIMIT 1
          `,

          [buyerId]

        );


      if (
        buyerResult.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Buyer not found.'

        });

      }


      // ------------------------------------------------------
      // GET MESSAGES
      // ------------------------------------------------------

      const messagesResult =
        await pool.query(

          `
          SELECT

            m.message_id,

            m.sender_id,

            m.receiver_id,

            m.listing_id,

            m.order_id,

            m.message,

            m.is_read,

            m.created_at,


            CASE

              WHEN m.sender_id = $1
                THEN TRUE

              ELSE FALSE

            END AS is_mine,


            l.title
              AS listing_title,


            l.price
              AS listing_price,


            l.condition
              AS listing_condition,


            li.image_url
              AS listing_image


          FROM messages m


          LEFT JOIN listings l

            ON l.listing_id =
              m.listing_id


          LEFT JOIN LATERAL (

            SELECT

              image_url

            FROM listing_images

            WHERE

              listing_id =
                m.listing_id

            ORDER BY

              is_primary DESC,

              sort_order ASC,

              image_id ASC

            LIMIT 1

          ) li

            ON TRUE


          WHERE

            (
              m.sender_id = $1

              AND

              m.receiver_id = $2
            )

            OR

            (
              m.sender_id = $2

              AND

              m.receiver_id = $1
            )


          ORDER BY

            m.created_at ASC,

            m.message_id ASC
          `,

          [
            sellerId,
            buyerId
          ]

        );


      // ------------------------------------------------------
      // MARK BUYER MESSAGES AS READ
      // ------------------------------------------------------

      await pool.query(

        `
        UPDATE messages

        SET

          is_read = TRUE

        WHERE

          sender_id = $1

          AND receiver_id = $2

          AND is_read = FALSE
        `,

        [
          buyerId,
          sellerId
        ]

      );


      return res.json({

        success: true,

        buyer:
          buyerResult.rows[0],

        messages:
          messagesResult.rows

      });

    } catch (error) {

      console.error(
        'SELLER COMMUNICATION MESSAGE ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to load conversation.',

        error:
          error.message

      });

    }

  }
);


// ============================================================
// SEND SELLER MESSAGE
// ============================================================

router.post(
  '/messages',
  async (req, res) => {

    try {

      const sellerId =
        req.user.user_id;


      const {
        receiverId,
        message,
        listingId = null,
        orderId = null
      } = req.body;


      const buyerId =
        Number(receiverId);


      // ------------------------------------------------------
      // VALIDATE BUYER
      // ------------------------------------------------------

      if (
        !Number.isInteger(buyerId) ||
        buyerId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Valid receiverId is required.'

        });

      }


      // ------------------------------------------------------
      // VALIDATE MESSAGE
      // ------------------------------------------------------

      if (
        typeof message !== 'string' ||
        !message.trim()
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Message cannot be empty.'

        });

      }


      // ------------------------------------------------------
      // VERIFY BUYER
      // ------------------------------------------------------

      const buyerResult =
        await pool.query(

          `
          SELECT

            user_id

          FROM users

          WHERE

            user_id = $1

            AND role = 'BUYER'

          LIMIT 1
          `,

          [buyerId]

        );


      if (
        buyerResult.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Buyer not found.'

        });

      }


      // ------------------------------------------------------
      // VALIDATE LISTING IF PROVIDED
      // ------------------------------------------------------

      let validListingId = null;


      if (
        listingId !== null &&
        listingId !== undefined &&
        listingId !== ''
      ) {

        validListingId =
          Number(listingId);


        if (
          !Number.isInteger(
            validListingId
          ) ||
          validListingId <= 0
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Invalid listingId.'

          });

        }


        const listingResult =
          await pool.query(

            `
            SELECT

              listing_id,

              seller_id,

              listing_type,

              community_post_id

            FROM listings

            WHERE

              listing_id = $1

              AND (

                seller_id = $2

                OR (

                  seller_id = $3

                  AND listing_type = 'TRADE'

                  AND community_post_id IS NOT NULL

                )

              )

            LIMIT 1
            `,

            [
              validListingId,
              sellerId,
              buyerId
            ]

          );


        if (
          listingResult.rows.length === 0
        ) {

          return res.status(403).json({

            success: false,

            message:
              'The selected listing cannot be attached to this message.'

          });

        }

      }


      // ------------------------------------------------------
      // VALIDATE ORDER IF PROVIDED
      // ------------------------------------------------------

      let validOrderId = null;


      if (
        orderId !== null &&
        orderId !== undefined &&
        orderId !== ''
      ) {

        validOrderId =
          Number(orderId);


        if (
          !Number.isInteger(
            validOrderId
          ) ||
          validOrderId <= 0
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Invalid orderId.'

          });

        }

      }


      // ------------------------------------------------------
      // INSERT MESSAGE
      // ------------------------------------------------------

      const result =
        await pool.query(

          `
          INSERT INTO messages (

            sender_id,

            receiver_id,

            listing_id,

            order_id,

            message,

            is_read

          )

          VALUES (

            $1,

            $2,

            $3,

            $4,

            $5,

            FALSE

          )

          RETURNING

            message_id,

            sender_id,

            receiver_id,

            listing_id,

            order_id,

            message,

            is_read,

            created_at
          `,

          [
            sellerId,
            buyerId,
            validListingId,
            validOrderId,
            message.trim()
          ]

        );


      return res.status(201).json({

        success: true,

        message:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        'SELLER COMMUNICATION SEND ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to send message.',

        error:
          error.message

      });

    }

  }
);


// ============================================================
// MARK CONVERSATION AS READ
// ============================================================

router.patch(
  '/conversations/:buyerId/read',
  async (req, res) => {

    try {

      const sellerId =
        req.user.user_id;


      const buyerId =
        Number(
          req.params.buyerId
        );


      if (
        !Number.isInteger(buyerId) ||
        buyerId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid buyer ID.'

        });

      }


      const result =
        await pool.query(

          `
          UPDATE messages

          SET

            is_read = TRUE

          WHERE

            sender_id = $1

            AND receiver_id = $2

            AND is_read = FALSE

          RETURNING message_id
          `,

          [
            buyerId,
            sellerId
          ]

        );


      return res.json({

        success: true,

        updated:
          result.rowCount

      });

    } catch (error) {

      console.error(
        'SELLER COMMUNICATION READ ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to mark messages as read.',

        error:
          error.message

      });

    }

  }
);


module.exports = router;