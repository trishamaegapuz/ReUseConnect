const express = require('express');

const router = express.Router();

const pool = require('../config/db');

const {
  authMiddleware,
  buyerOnly
} = require('../middleware/authMiddleware');


// ============================================================
// BUYER AUTHENTICATION
// ============================================================

router.use(
  authMiddleware,
  buyerOnly
);


// ============================================================
// GET BUYER CONVERSATIONS
// ============================================================
//
// Gets all sellers who have exchanged messages with
// the currently authenticated buyer.
//
// Uses existing:
// users
// messages
// listings
// listing_images
//
// No new conversation table is required.
// ============================================================

router.get(
  '/conversations',
  async (req, res) => {

    try {

      const buyerId =
        req.user.user_id;


      const result =
        await pool.query(

          `
          WITH buyer_messages AS (

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

              END AS seller_id

            FROM messages m

            WHERE

              m.sender_id = $1

              OR

              m.receiver_id = $1

          ),


          latest_messages AS (

            SELECT DISTINCT ON (seller_id)

              seller_id,

              message_id,

              sender_id,

              receiver_id,

              listing_id,

              order_id,

              message,

              is_read,

              created_at

            FROM buyer_messages

            ORDER BY

              seller_id,

              created_at DESC,

              message_id DESC

          ),


          unread_messages AS (

            SELECT

              m.sender_id AS seller_id,

              COUNT(*)::INTEGER AS unread_count

            FROM messages m

            WHERE

              m.receiver_id = $1

              AND m.is_read = FALSE

            GROUP BY

              m.sender_id

          )


          SELECT

            lm.seller_id,


            CONCAT(
              u.first_name,
              ' ',
              u.last_name
            ) AS seller_name,


            u.first_name,

            u.last_name,

            u.profile_image,

            u.status AS seller_status,


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
              lm.seller_id


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

            ON um.seller_id =
              lm.seller_id


          WHERE

            u.role = 'SELLER'


          ORDER BY

            lm.created_at DESC
          `,

          [buyerId]

        );


      return res.json({

        success: true,

        conversations:
          result.rows

      });

    } catch (error) {

      console.error(
        'BUYER MESSAGES CONVERSATIONS ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to load buyer conversations.',

        error:
          error.message

      });

    }

  }
);


// ============================================================
// GET SINGLE BUYER CONVERSATION
// ============================================================

router.get(
  '/conversations/:sellerId',
  async (req, res) => {

    try {

      const buyerId =
        req.user.user_id;


      const sellerId =
        Number(
          req.params.sellerId
        );


      if (
        !Number.isInteger(sellerId) ||
        sellerId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid seller ID.'

        });

      }


      // ------------------------------------------------------
      // GET SELLER
      // ------------------------------------------------------

      const sellerResult =
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

            AND role = 'SELLER'

          LIMIT 1
          `,

          [sellerId]

        );


      if (
        sellerResult.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Seller not found.'

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
            buyerId,
            sellerId
          ]

        );


      // ------------------------------------------------------
      // MARK SELLER MESSAGES AS READ
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
          sellerId,
          buyerId
        ]

      );


      return res.json({

        success: true,

        seller:
          sellerResult.rows[0],

        messages:
          messagesResult.rows

      });

    } catch (error) {

      console.error(
        'BUYER MESSAGES CONVERSATION ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to load buyer conversation.',

        error:
          error.message

      });

    }

  }
);


// ============================================================
// SEND BUYER MESSAGE
// ============================================================

router.post(
  '/messages',
  async (req, res) => {

    try {

      const buyerId =
        req.user.user_id;


      const {
        receiverId,
        message,
        listingId = null,
        orderId = null
      } = req.body;


      const sellerId =
        Number(receiverId);


      // ------------------------------------------------------
      // VALIDATE SELLER
      // ------------------------------------------------------

      if (
        !Number.isInteger(sellerId) ||
        sellerId <= 0
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
      // VERIFY SELLER
      // ------------------------------------------------------

      const sellerResult =
        await pool.query(

          `
          SELECT

            user_id

          FROM users

          WHERE

            user_id = $1

            AND role = 'SELLER'

          LIMIT 1
          `,

          [sellerId]

        );


      if (
        sellerResult.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Seller not found.'

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

              listing_id

            FROM listings

            WHERE

              listing_id = $1

              AND seller_id = $2

            LIMIT 1
            `,

            [
              validListingId,
              sellerId
            ]

          );


        if (
          listingResult.rows.length === 0
        ) {

          return res.status(403).json({

            success: false,

            message:
              'Listing does not belong to this seller.'

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
            buyerId,
            sellerId,
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
        'BUYER MESSAGES SEND ERROR:',
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
  '/conversations/:sellerId/read',
  async (req, res) => {

    try {

      const buyerId =
        req.user.user_id;


      const sellerId =
        Number(
          req.params.sellerId
        );


      if (
        !Number.isInteger(sellerId) ||
        sellerId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid seller ID.'

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
            sellerId,
            buyerId
          ]

        );


      return res.json({

        success: true,

        updated:
          result.rowCount

      });

    } catch (error) {

      console.error(
        'BUYER MESSAGES READ ERROR:',
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