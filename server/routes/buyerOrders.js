const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const pool = require('../config/db');

const {
  authMiddleware,
  buyerOnly
} = require('../middleware/authMiddleware');


/*
============================================================
AUTHENTICATION
============================================================
*/

router.use(
  authMiddleware,
  buyerOnly
);


/*
============================================================
HELPERS
============================================================
*/

const getBuyerId = (req) => {

  return (
    req.user?.user_id ||
    req.user?.id ||
    req.user?.userId ||
    null
  );

};


/*
============================================================
GENERATE ORDER NUMBER
============================================================
*/

const generateOrderNumber = () => {

  const datePart =
    new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');

  const randomPart =
    crypto
      .randomUUID()
      .replace(/-/g, '')
      .slice(0, 10)
      .toUpperCase();

  return `RC-${datePart}-${randomPart}`;

};


/*
============================================================
NORMALIZE IMAGE URL
============================================================
*/

const normalizeImageUrl = (
  req,
  imageUrl
) => {

  if (!imageUrl) {
    return null;
  }

  const value =
    String(imageUrl).trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {

    return value;

  }

  const filename =
    value
      .split('/')
      .filter(Boolean)
      .pop();

  if (!filename) {
    return null;
  }

  return (
    `${req.protocol}://${req.get('host')}` +
    `/api/seller/listings/image/` +
    encodeURIComponent(filename)
  );

};


/*
============================================================
GET CHECKOUT LISTING
============================================================

GET

/api/buyer/orders/checkout/:listingId

Returns the current listing information
needed by the Buyer Checkout page.

The listing is NOT modified here.
============================================================
*/

router.get(
  '/checkout/:listingId',
  async (req, res) => {

    try {

      const buyerId =
        getBuyerId(req);

      if (!buyerId) {

        return res.status(401).json({

          success: false,

          message:
            'Buyer authentication is required.'

        });

      }


      const listingId =
        Number(req.params.listingId);


      if (
        !Number.isInteger(listingId) ||
        listingId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid listing ID.'

        });

      }


      const result =
        await pool.query(
          `
          SELECT

            l.listing_id,
            l.seller_id,
            l.category_id,

            l.title,
            l.description,
            l.price,
            l.condition,
            l.quantity,
            l.location,
            l.status,

            l.created_at,
            l.updated_at,


            u.first_name
              AS seller_first_name,

            u.last_name
              AS seller_last_name,


            c.name
              AS category_name,


            primary_image.image_url
              AS primary_image


          FROM listings l


          LEFT JOIN users u
            ON u.user_id =
              l.seller_id


          LEFT JOIN categories c
            ON c.category_id =
              l.category_id


          LEFT JOIN LATERAL (

            SELECT
              li.image_url

            FROM listing_images li

            WHERE
              li.listing_id =
                l.listing_id

            ORDER BY
              li.is_primary DESC,
              li.sort_order ASC,
              li.image_id ASC

            LIMIT 1

          ) primary_image
            ON TRUE


          WHERE
            l.listing_id = $1

          LIMIT 1
          `,
          [
            listingId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Listing not found.'

        });

      }


      const listing =
        result.rows[0];


      const inventoryResult =
        await pool.query(
          `
          SELECT
            inventory_id,
            size,
            quantity
          FROM listing_size_inventory
          WHERE listing_id = $1
          ORDER BY size
          `,
          [listingId]
        );


      const sizeInventory =
        inventoryResult.rows.map((row) => ({
          inventory_id: Number(row.inventory_id),
          size: row.size,
          quantity: Number(row.quantity || 0)
        }));


      /*
      --------------------------------------------------------
      AVAILABLE CHECK
      --------------------------------------------------------
      */

      if (
        String(listing.status)
          .toUpperCase() !==
        'AVAILABLE'
      ) {

        return res.status(409).json({

          success: false,

          message:
            'This item is no longer available.'

        });

      }


      /*
      --------------------------------------------------------
      STOCK CHECK
      --------------------------------------------------------
      */

      if (
        sizeInventory.length === 0 &&
        (
          !listing.quantity ||
          Number(listing.quantity) <= 0
        )
      ) {

        return res.status(409).json({

          success: false,

          message:
            'This item is out of stock.'

        });

      }

      const availableSizeInventory =
        sizeInventory.filter(
          (item) => Number(item.quantity) > 0
        );


      /*
      --------------------------------------------------------
      SELLER NAME
      --------------------------------------------------------
      */

      const sellerName =
        [
          listing.seller_first_name,
          listing.seller_last_name
        ]
          .filter(Boolean)
          .join(' ')
          .trim();


      /*
      --------------------------------------------------------
      RESPONSE
      --------------------------------------------------------
      */

      return res.json({

        success: true,

        listing: {

          listing_id:
            Number(listing.listing_id),

          seller_id:
            Number(listing.seller_id),

          category_id:
            listing.category_id
              ? Number(listing.category_id)
              : null,

          title:
            listing.title,

          description:
            listing.description,

          price:
            Number(listing.price || 0),

          condition:
            listing.condition,

          quantity:
            Number(listing.quantity),

          size_inventory:
            sizeInventory,

          available_sizes:
            availableSizeInventory,

          location:
            listing.location,

          status:
            listing.status,

          category_name:
            listing.category_name,

          seller: {

            user_id:
              Number(listing.seller_id),

            name:
              sellerName ||
              'Seller'

          },

          image_url:
            normalizeImageUrl(
              req,
              listing.primary_image
            )

        }

      });

    } catch (error) {

      console.error(
        'Buyer checkout listing error:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load checkout information.'

      });

    }

  }
);


/*
============================================================
PLACE ORDER
============================================================

POST

/api/buyer/orders

Body:

{
  listingId: 1,
  quantity: 1,
  shippingAddress: "Complete address",
  paymentMethod: "CASH_ON_DELIVERY",
  referenceNumber: "",
  notes: ""
}

============================================================
*/

router.post(
  '/',
  async (req, res) => {

    const client =
      await pool.connect();


    try {

      const buyerId =
        getBuyerId(req);


      if (!buyerId) {

        return res.status(401).json({

          success: false,

          message:
            'Buyer authentication is required.'

        });

      }


      const {
        listingId,
        quantity,
        size,
        shippingAddress,
        paymentMethod,
        referenceNumber,
        notes
      } = req.body;


      const parsedListingId =
        Number(listingId);


      const parsedQuantity =
        Number(quantity);


      /*
      --------------------------------------------------------
      VALIDATE LISTING ID
      --------------------------------------------------------
      */

      if (
        !Number.isInteger(parsedListingId) ||
        parsedListingId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid listing ID.'

        });

      }


      /*
      --------------------------------------------------------
      VALIDATE QUANTITY
      --------------------------------------------------------
      */

      if (
        !Number.isInteger(parsedQuantity) ||
        parsedQuantity <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Quantity must be at least 1.'

        });

      }


      /*
      --------------------------------------------------------
      SHIPPING ADDRESS
      --------------------------------------------------------
      */

      const cleanShippingAddress =
        typeof shippingAddress === 'string'
          ? shippingAddress.trim()
          : '';


      if (!cleanShippingAddress) {

        return res.status(400).json({

          success: false,

          message:
            'Shipping address is required.'

        });

      }


      /*
      --------------------------------------------------------
      PAYMENT METHOD
      --------------------------------------------------------
      */

      const allowedPaymentMethods = [

        'CASH_ON_DELIVERY',

        'GCASH',

        'BANK_TRANSFER',

        'OTHER'

      ];


      const cleanPaymentMethod =
        typeof paymentMethod === 'string'
          ? paymentMethod
              .trim()
              .toUpperCase()
          : '';


      if (
        !allowedPaymentMethods.includes(
          cleanPaymentMethod
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid payment method.'

        });

      }


      /*
      --------------------------------------------------------
      OPTIONAL VALUES
      --------------------------------------------------------
      */

      const cleanReferenceNumber =
        typeof referenceNumber === 'string'
          ? referenceNumber.trim()
          : null;


      const cleanNotes =
        typeof notes === 'string'
          ? notes.trim()
          : null;


      const cleanSize =
        typeof size === 'string'
          ? size.trim()
          : '';


      /*
      --------------------------------------------------------
      START TRANSACTION
      --------------------------------------------------------
      */

      await client.query(
        'BEGIN'
      );


      /*
      --------------------------------------------------------
      LOCK LISTING
      --------------------------------------------------------
      */

      const listingResult =
        await client.query(
          `
          SELECT

            l.listing_id,
            l.seller_id,
            l.title,
            l.price,
            l.quantity,
            l.status


          FROM listings l


          WHERE
            l.listing_id = $1


          FOR UPDATE
          `,
          [
            parsedListingId
          ]
        );


      if (
        listingResult.rows.length === 0
      ) {

        await client.query(
          'ROLLBACK'
        );

        return res.status(404).json({

          success: false,

          message:
            'Listing not found.'

        });

      }


      const listing =
        listingResult.rows[0];


      /*
      --------------------------------------------------------
      CHECK LISTING STATUS
      --------------------------------------------------------
      */

      if (
        String(listing.status)
          .toUpperCase() !==
        'AVAILABLE'
      ) {

        await client.query(
          'ROLLBACK'
        );

        return res.status(409).json({

          success: false,

          message:
            'This item is no longer available.'

        });

      }


      /*
      --------------------------------------------------------
      CHECK STOCK
      --------------------------------------------------------
      Per-size inventory is the source of truth when present.
      --------------------------------------------------------
      */

      const inventoryResult = await client.query(
        `SELECT inventory_id, size, quantity FROM listing_size_inventory WHERE listing_id = $1 ORDER BY size FOR UPDATE`,
        [listing.listing_id]
      );

      const inventoryRows = inventoryResult.rows;
      let selectedInventory = null;

      if (inventoryRows.length > 0) {
        if (!cleanSize) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Please select a size for this item.' });
        }
        selectedInventory = inventoryRows.find((row) => String(row.size).toLowerCase() === cleanSize.toLowerCase());
        if (!selectedInventory) {
          await client.query('ROLLBACK');
          return res.status(409).json({ success: false, message: 'The selected size is not available.' });
        }
        const availableQuantity = Number(selectedInventory.quantity || 0);
        if (availableQuantity <= 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ success: false, message: `Size ${selectedInventory.size} is out of stock.` });
        }
        if (parsedQuantity > availableQuantity) {
          await client.query('ROLLBACK');
          return res.status(409).json({ success: false, message: `Only ${availableQuantity} item(s) are available in size ${selectedInventory.size}.` });
        }
      } else {
        const availableQuantity = Number(listing.quantity || 0);
        if (availableQuantity <= 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ success: false, message: 'This item is out of stock.' });
        }
        if (parsedQuantity > availableQuantity) {
          await client.query('ROLLBACK');
          return res.status(409).json({ success: false, message: `Only ${availableQuantity} item(s) are available.` });
        }
      }

      /*
      --------------------------------------------------------
      PRICE FROM DATABASE
      --------------------------------------------------------
      */

      const unitPrice =
        Number(
          listing.price || 0
        );


      const subtotal =
        Number(
          (
            unitPrice *
            parsedQuantity
          ).toFixed(2)
        );


      const remainingQuantity = selectedInventory
        ? Number(selectedInventory.quantity) - parsedQuantity
        : Number(listing.quantity) - parsedQuantity;

      let newListingStatus;

      if (selectedInventory) {
        await client.query(
          `UPDATE listing_size_inventory SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE inventory_id = $2`,
          [remainingQuantity, selectedInventory.inventory_id]
        );

        const totalResult = await client.query(
          `SELECT COALESCE(SUM(quantity), 0) AS total FROM listing_size_inventory WHERE listing_id = $1`,
          [listing.listing_id]
        );
        const totalRemaining = Number(totalResult.rows[0].total || 0);
        newListingStatus = totalRemaining === 0 ? 'SOLD' : 'AVAILABLE';

        await client.query(
          `UPDATE listings SET quantity = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE listing_id = $3`,
          [Math.max(1, totalRemaining), newListingStatus, listing.listing_id]
        );
      } else {
        newListingStatus = remainingQuantity === 0 ? 'SOLD' : 'AVAILABLE';
        const storedQuantity = remainingQuantity === 0 ? 1 : remainingQuantity;
        await client.query(
          `UPDATE listings SET quantity = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE listing_id = $3`,
          [storedQuantity, newListingStatus, listing.listing_id]
        );
      }

      /*
      --------------------------------------------------------
      CREATE ORDER NUMBER
      --------------------------------------------------------
      */

      const orderNumber =
        generateOrderNumber();


      /*
      --------------------------------------------------------
      INSERT ORDER
      --------------------------------------------------------
      */

      const orderResult =
        await client.query(
          `
          INSERT INTO orders (

            order_number,

            buyer_id,

            total_amount,

            status,

            shipping_address,

            notes

          )

          VALUES (

            $1,

            $2,

            $3,

            'PENDING',

            $4,

            $5

          )

          RETURNING

            order_id,
            order_number,
            buyer_id,
            total_amount,
            status,
            shipping_address,
            notes,
            created_at
          `,
          [
            orderNumber,
            buyerId,
            subtotal,
            cleanShippingAddress,
            cleanNotes
          ]
        );


      const order =
        orderResult.rows[0];


      /*
      --------------------------------------------------------
      INSERT ORDER ITEM
      --------------------------------------------------------
      */

      await client.query(
        `
        INSERT INTO order_items (

          order_id,

          listing_id,

          seller_id,

          quantity,

          size,

          unit_price,

          subtotal

        )

        VALUES (

          $1,

          $2,

          $3,

          $4,

          $5,

          $6,

          $7

        )
        `,
        [
          order.order_id,
          listing.listing_id,
          listing.seller_id,
          parsedQuantity,
          selectedInventory ? selectedInventory.size : (cleanSize || null),
          unitPrice,
          subtotal
        ]
      );


      /*
      --------------------------------------------------------
      INSERT PAYMENT
      --------------------------------------------------------
      */

      await client.query(
        `
        INSERT INTO payments (

          order_id,

          payment_method,

          amount,

          status,

          reference_number

        )

        VALUES (

          $1,

          $2,

          $3,

          'PENDING',

          $4

        )
        `,
        [
          order.order_id,
          cleanPaymentMethod,
          subtotal,
          cleanReferenceNumber || null
        ]
      );


      /*
      --------------------------------------------------------
      SELLER NOTIFICATION
      --------------------------------------------------------
      */

      try {

        await client.query(
          `
          INSERT INTO notifications (

            user_id,

            type,

            title,

            message,

            reference_type,

            reference_id

          )

          VALUES (

            $1,

            'ORDER',

            $2,

            $3,

            'ORDER',

            $4

          )
          `,
          [

            listing.seller_id,

            'New Order Received',

            `You received a new order ${order.order_number}.`,

            order.order_id

          ]
        );

      } catch (notificationError) {

        console.warn(
          'Seller notification was not created:',
          notificationError.message
        );

      }


      /*
      --------------------------------------------------------
      COMMIT
      --------------------------------------------------------
      */

      await client.query(
        'COMMIT'
      );


      /*
      --------------------------------------------------------
      RESPONSE
      --------------------------------------------------------
      */

      return res.status(201).json({

        success: true,

        message:
          'Order placed successfully.',

        order: {

          order_id:
            Number(order.order_id),

          order_number:
            order.order_number,

          buyer_id:
            Number(order.buyer_id),

          total_amount:
            Number(order.total_amount),

          status:
            order.status,

          shipping_address:
            order.shipping_address,

          notes:
            order.notes,

          listing_id:
            Number(listing.listing_id),

          seller_id:
            Number(listing.seller_id),

          item_title:
            listing.title,

          quantity:
            parsedQuantity,

          size:
            selectedInventory ? selectedInventory.size : (cleanSize || null),

          unit_price:
            unitPrice,

          subtotal:
            subtotal,

          payment_method:
            cleanPaymentMethod,

          payment_status:
            'PENDING',

          remaining_quantity:
            remainingQuantity,

          listing_status:
            newListingStatus,

          created_at:
            order.created_at

        }

      });

    } catch (error) {

      /*
      --------------------------------------------------------
      ROLLBACK
      --------------------------------------------------------
      */

      try {

        await client.query(
          'ROLLBACK'
        );

      } catch (rollbackError) {

        console.error(
          'Buyer order rollback error:',
          rollbackError
        );

      }


      /*
      --------------------------------------------------------
      DUPLICATE ORDER NUMBER
      --------------------------------------------------------
      */

      if (
        error.code === '23505'
      ) {

        return res.status(409).json({

          success: false,

          message:
            'Unable to generate a unique order number. Please try again.'

        });

      }


      console.error(
        'Place buyer order error:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Unable to place order.',

        error:
          error.message

      });

    } finally {

      client.release();

    }

  }
);


/*
============================================================
GET BUYER ORDERS
============================================================

GET

/api/buyer/orders

Returns orders belonging ONLY
to the logged-in buyer.
============================================================
*/

router.get(
  '/',
  async (req, res) => {

    try {

      const buyerId =
        getBuyerId(req);


      if (!buyerId) {

        return res.status(401).json({

          success: false,

          message:
            'Buyer authentication is required.'

        });

      }


      const result =
        await pool.query(
          `
          SELECT

            o.order_id,
            o.order_number,
            o.buyer_id,
            o.total_amount,
            o.status,
            o.shipping_address,
            o.notes,
            o.created_at,
            o.updated_at,


            oi.order_item_id,
            oi.listing_id,
            oi.seller_id,
            oi.quantity,
            oi.size,
            oi.unit_price,
            oi.subtotal,


            l.title
              AS listing_title,

            l.location
              AS listing_location,

            l.condition
              AS listing_condition,


            u.first_name
              AS seller_first_name,

            u.last_name
              AS seller_last_name,


            p.payment_id,
            p.payment_method,
            p.amount
              AS payment_amount,
            p.status
              AS payment_status,
            p.reference_number,
            p.paid_at,


            primary_image.image_url
              AS primary_image


          FROM orders o


          LEFT JOIN order_items oi
            ON oi.order_id =
              o.order_id


          LEFT JOIN listings l
            ON l.listing_id =
              oi.listing_id


          LEFT JOIN users u
            ON u.user_id =
              oi.seller_id


          LEFT JOIN payments p
            ON p.order_id =
              o.order_id


          LEFT JOIN LATERAL (

            SELECT
              li.image_url

            FROM listing_images li

            WHERE
              li.listing_id =
                oi.listing_id

            ORDER BY
              li.is_primary DESC,
              li.sort_order ASC,
              li.image_id ASC

            LIMIT 1

          ) primary_image
            ON TRUE


          WHERE
            o.buyer_id = $1


          ORDER BY
            o.created_at DESC,
            o.order_id DESC
          `,
          [
            buyerId
          ]
        );


      const ordersMap =
        new Map();


      for (
        const row of result.rows
      ) {

        const orderId =
          Number(row.order_id);


        if (
          !ordersMap.has(orderId)
        ) {

          ordersMap.set(
            orderId,
            {

              order_id:
                orderId,

              order_number:
                row.order_number,

              buyer_id:
                Number(row.buyer_id),

              total_amount:
                Number(
                  row.total_amount || 0
                ),

              status:
                row.status,

              shipping_address:
                row.shipping_address,

              notes:
                row.notes,

              created_at:
                row.created_at,

              updated_at:
                row.updated_at,


              payment:
                row.payment_id
                  ? {

                      payment_id:
                        Number(
                          row.payment_id
                        ),

                      payment_method:
                        row.payment_method,

                      amount:
                        Number(
                          row.payment_amount ||
                          0
                        ),

                      status:
                        row.payment_status,

                      reference_number:
                        row.reference_number,

                      paid_at:
                        row.paid_at

                    }
                  : null,


              items: []

            }
          );

        }


        if (
          row.order_item_id
        ) {

          const sellerName =
            [
              row.seller_first_name,
              row.seller_last_name
            ]
              .filter(Boolean)
              .join(' ')
              .trim();


          ordersMap
            .get(orderId)
            .items
            .push({

              order_item_id:
                Number(
                  row.order_item_id
                ),

              listing_id:
                Number(
                  row.listing_id
                ),

              seller_id:
                Number(
                  row.seller_id
                ),

              title:
                row.listing_title,

              quantity:
                Number(
                  row.quantity
                ),

              size:
                row.size || null,

              unit_price:
                Number(
                  row.unit_price
                ),

              subtotal:
                Number(
                  row.subtotal
                ),

              location:
                row.listing_location,

              condition:
                row.listing_condition,


              seller: {

                user_id:
                  Number(
                    row.seller_id
                  ),

                name:
                  sellerName ||
                  'Seller'

              },


              image_url:
                normalizeImageUrl(
                  req,
                  row.primary_image
                )

            });

        }

      }


      return res.json({

        success: true,

        orders:
          Array.from(
            ordersMap.values()
          )

      });

    } catch (error) {

      console.error(
        'Get buyer orders error:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Unable to load buyer orders.'

      });

    }

  }
);


/*
============================================================
GET SINGLE BUYER ORDER
============================================================

GET

/api/buyer/orders/:orderId
============================================================
*/

router.get(
  '/:orderId',
  async (req, res) => {

    try {

      const buyerId =
        getBuyerId(req);


      if (!buyerId) {

        return res.status(401).json({

          success: false,

          message:
            'Buyer authentication is required.'

        });

      }


      const orderId =
        Number(
          req.params.orderId
        );


      if (
        !Number.isInteger(orderId) ||
        orderId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid order ID.'

        });

      }


      const result =
        await pool.query(
          `
          SELECT

            o.order_id,
            o.order_number,
            o.buyer_id,
            o.total_amount,
            o.status,
            o.shipping_address,
            o.notes,
            o.created_at,
            o.updated_at,


            oi.order_item_id,
            oi.listing_id,
            oi.seller_id,
            oi.quantity,
            oi.size,
            oi.unit_price,
            oi.subtotal,


            l.title
              AS listing_title,

            l.description
              AS listing_description,

            l.location
              AS listing_location,

            l.condition
              AS listing_condition,


            u.first_name
              AS seller_first_name,

            u.last_name
              AS seller_last_name,


            p.payment_id,
            p.payment_method,
            p.amount
              AS payment_amount,
            p.status
              AS payment_status,
            p.reference_number,
            p.paid_at,
            p.created_at
              AS payment_created_at,


            primary_image.image_url
              AS primary_image


          FROM orders o


          LEFT JOIN order_items oi
            ON oi.order_id =
              o.order_id


          LEFT JOIN listings l
            ON l.listing_id =
              oi.listing_id


          LEFT JOIN users u
            ON u.user_id =
              oi.seller_id


          LEFT JOIN payments p
            ON p.order_id =
              o.order_id


          LEFT JOIN LATERAL (

            SELECT
              li.image_url

            FROM listing_images li

            WHERE
              li.listing_id =
                oi.listing_id

            ORDER BY
              li.is_primary DESC,
              li.sort_order ASC,
              li.image_id ASC

            LIMIT 1

          ) primary_image
            ON TRUE


          WHERE

            o.order_id = $1

            AND o.buyer_id = $2


          ORDER BY
            oi.order_item_id ASC
          `,
          [
            orderId,
            buyerId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Order not found.'

        });

      }


      const firstRow =
        result.rows[0];


      const sellerName =
        [
          firstRow.seller_first_name,
          firstRow.seller_last_name
        ]
          .filter(Boolean)
          .join(' ')
          .trim();


      const order = {

        order_id:
          Number(
            firstRow.order_id
          ),

        order_number:
          firstRow.order_number,

        buyer_id:
          Number(
            firstRow.buyer_id
          ),

        total_amount:
          Number(
            firstRow.total_amount || 0
          ),

        status:
          firstRow.status,

        shipping_address:
          firstRow.shipping_address,

        notes:
          firstRow.notes,

        created_at:
          firstRow.created_at,

        updated_at:
          firstRow.updated_at,


        payment:
          firstRow.payment_id
            ? {

                payment_id:
                  Number(
                    firstRow.payment_id
                  ),

                payment_method:
                  firstRow.payment_method,

                amount:
                  Number(
                    firstRow.payment_amount ||
                    0
                  ),

                status:
                  firstRow.payment_status,

                reference_number:
                  firstRow.reference_number,

                paid_at:
                  firstRow.paid_at,

                created_at:
                  firstRow.payment_created_at

              }
            : null,


        items: []

      };


      for (
        const row of result.rows
      ) {

        if (
          !row.order_item_id
        ) {

          continue;

        }


        const itemSellerName =
          [
            row.seller_first_name,
            row.seller_last_name
          ]
            .filter(Boolean)
            .join(' ')
            .trim();


        order.items.push({

          order_item_id:
            Number(
              row.order_item_id
            ),

          listing_id:
            Number(
              row.listing_id
            ),

          seller_id:
            Number(
              row.seller_id
            ),

          title:
            row.listing_title,

          description:
            row.listing_description,

          quantity:
            Number(
              row.quantity
            ),

          size:
            row.size || null,

          unit_price:
            Number(
              row.unit_price
            ),

          subtotal:
            Number(
              row.subtotal
            ),

          location:
            row.listing_location,

          condition:
            row.listing_condition,


          seller: {

            user_id:
              Number(
                row.seller_id
              ),

            name:
              itemSellerName ||
              sellerName ||
              'Seller'

          },


          image_url:
            normalizeImageUrl(
              req,
              row.primary_image
            )

        });

      }


      return res.json({

        success: true,

        order

      });

    } catch (error) {

      console.error(
        'Get buyer order detail error:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Unable to load order details.'

      });

    }

  }
);


/*
============================================================
EXPORT
============================================================
*/

module.exports = router;