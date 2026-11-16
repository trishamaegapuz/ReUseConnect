/*
============================================================
ReUseConnect
Buyer Marketplace API
============================================================

DATABASE TABLES USED:

- listings
- categories
- listing_images
- users
- reviews
- favorites
- cart_items

ROUTES:

GET     /api/buyer/marketplace
GET     /api/buyer/marketplace/categories
GET     /api/buyer/marketplace/favorites
POST    /api/buyer/marketplace/favorites
DELETE  /api/buyer/marketplace/favorites/:listingId
GET     /api/buyer/marketplace/cart
POST    /api/buyer/marketplace/cart
PATCH   /api/buyer/marketplace/cart/:cartItemId
DELETE  /api/buyer/marketplace/cart/:cartItemId

============================================================
*/

const express = require('express');

const router = express.Router();

const pool = require('../config/db');

const {
  authMiddleware,
  buyerOnly
} = require('../middleware/authMiddleware');


// ============================================================
// IMAGE HELPERS
// ============================================================

function normalizeImageUrl(req, value) {
  if (!value) {
    return null;
  }

  const rawValue = String(value).trim();

  if (!rawValue) {
    return null;
  }

  /*
  ------------------------------------------------------------
  DATA / BLOB
  ------------------------------------------------------------
  */

  if (
    rawValue.startsWith('data:') ||
    rawValue.startsWith('blob:')
  ) {
    return rawValue;
  }


  /*
  ------------------------------------------------------------
  EXTERNAL URL
  ------------------------------------------------------------
  If the image is from another website, keep it.
  ------------------------------------------------------------
  */

  if (/^https?:\/\/.+/i.test(rawValue)) {
    try {
      const parsed = new URL(rawValue);

      /*
      If this is one of our own uploaded LISTING images,
      convert it to the existing secure image endpoint.
      */

      if (
        parsed.pathname.includes('/uploads/listings/')
      ) {
        const filename =
          parsed.pathname
            .split('/')
            .filter(Boolean)
            .pop();

        if (filename) {
          return (
            `${req.protocol}://${req.get('host')}` +
            `/api/seller/listings/image/` +
            `${encodeURIComponent(filename)}`
          );
        }
      }

      /*
      COMMUNITY TRADE IMAGE

      Trade posts created from Community store their photo in:
        /public/uploads/community/

      Do NOT convert this to the seller listing image endpoint,
      because that endpoint looks inside /uploads/listings/.

      Return the actual community upload URL instead.
      */

      if (
        parsed.pathname.includes('/uploads/community/')
      ) {
        return (
          `${req.protocol}://${req.get('host')}` +
          `${parsed.pathname}` +
          `${parsed.search || ''}`
        );
      }

      /*
      External image.
      */

      return rawValue;

    } catch (error) {
      return rawValue;
    }
  }


  /*
  ------------------------------------------------------------
  LOCAL UPLOAD PATH
  ------------------------------------------------------------
  */

  const cleanPath =
    rawValue
      .split('?')[0]
      .split('#')[0];

  const filename =
    cleanPath
      .split('/')
      .filter(Boolean)
      .pop();

  if (!filename) {
    return null;
  }


  /*
  ------------------------------------------------------------
  COMMUNITY UPLOAD PATH
  ------------------------------------------------------------
  Trade & Exchange images created from Community are stored
  under /uploads/community/.
  */

  if (
    cleanPath.includes('/uploads/community/')
  ) {
    return (
      `${req.protocol}://${req.get('host')}` +
      `${cleanPath}`
    );
  }

  /*
  ------------------------------------------------------------
  EXISTING SELLER LISTING IMAGE ENDPOINT
  ------------------------------------------------------------
  */

  return (
    `${req.protocol}://${req.get('host')}` +
    `/api/seller/listings/image/` +
    `${encodeURIComponent(filename)}`
  );
}


function normalizeImageList(req, images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => {

      if (
        image &&
        typeof image === 'object'
      ) {
        return normalizeImageUrl(
          req,
          image.image_url ||
          image.url ||
          image.src
        );
      }

      return normalizeImageUrl(
        req,
        image
      );
    })
    .filter(Boolean);
}


// ============================================================
// PRICE FILTER
// ============================================================

function getPriceFilter(price) {

  switch (price) {

    case '0-500':
      return {
        sql: `
          AND l.price >= 0
          AND l.price <= 500
        `
      };

    case '500-1000':
      return {
        sql: `
          AND l.price > 500
          AND l.price <= 1000
        `
      };

    case '1000-5000':
      return {
        sql: `
          AND l.price > 1000
          AND l.price <= 5000
        `
      };

    case '5000-10000':
      return {
        sql: `
          AND l.price > 5000
          AND l.price <= 10000
        `
      };

    case '10000+':
      return {
        sql: `
          AND l.price > 10000
        `
      };

    default:
      return {
        sql: ''
      };
  }
}


// ============================================================
// GET MARKETPLACE ITEMS
// GET /api/buyer/marketplace
// ============================================================

router.get('/', async (req, res) => {

  try {

    const {
      search = '',
      category = '',
      condition = '',
      type = '',
      listingType = '',
      price = '',
      minPrice = '',
      maxPrice = '',
      sortBy = 'newest',
      page = 1,
      limit = 8
    } = req.query;


    // ========================================================
    // PAGINATION
    // ========================================================

    const currentPage =
      Math.max(
        parseInt(page, 10) || 1,
        1
      );

    const itemsPerPage =
      Math.min(
        Math.max(
          parseInt(limit, 10) || 8,
          1
        ),
        100
      );

    const offset =
      (currentPage - 1) *
      itemsPerPage;


    // ========================================================
    // WHERE CONDITIONS
    // ========================================================

    const conditions = [];

    const params = [];


    /*
    ------------------------------------------------------------
    ONLY AVAILABLE LISTINGS
    ------------------------------------------------------------

    Actual database status values include:

    AVAILABLE
    RESERVED
    SOLD
    HIDDEN
    REJECTED
    PENDING

    ------------------------------------------------------------
    */

    conditions.push(`
      LOWER(
        COALESCE(l.status, '')
      ) = 'available'
    `);


    // ========================================================
    // SEARCH
    // ========================================================

    if (
      String(search).trim()
    ) {

      const searchValue =
        `%${String(search).trim()}%`;

      params.push(searchValue);

      conditions.push(`
        (
          l.title ILIKE $${params.length}
          OR
          l.description ILIKE $${params.length}
        )
      `);
    }


    // ========================================================
    // CATEGORY
    // ========================================================

    if (
      String(category).trim()
    ) {

      const categoryValue =
        String(category).trim();

      const numericCategory =
        Number(categoryValue);

      if (
        Number.isSafeInteger(
          numericCategory
        ) &&
        numericCategory > 0
      ) {

        params.push(
          numericCategory
        );

        conditions.push(`
          l.category_id = $${params.length}
        `);

      } else {

        params.push(
          categoryValue
        );

        conditions.push(`
          LOWER(c.name) =
          LOWER($${params.length})
        `);
      }
    }


    // ========================================================
    // CONDITION
    // ========================================================

    if (
      String(condition).trim()
    ) {

      params.push(
        String(condition).trim()
      );

      conditions.push(`
        LOWER(
          COALESCE(l.condition, '')
        ) =
        LOWER($${params.length})
      `);
    }


    // ========================================================
    // LISTING TYPE
    // ========================================================
    //
    // Database values:
    //
    // SALE
    // DONATION
    // TRADE
    //
    // Frontend values:
    //
    // sale
    // donation
    // trade
    //
    // Both "type" and "listingType" are supported.
    //
    // "all" does not add a filter.
    //
    // ========================================================

    const requestedListingType =
      String(
        listingType || type || ''
      )
        .trim()
        .toUpperCase();

    /*
    ------------------------------------------------------------
    MARKETPLACE ONLY SHOWS SELLER ITEMS FOR SALE
    ------------------------------------------------------------

    Trade & Exchange and Donations belong to the
    Community / Trade & Exchange module, not Marketplace.

    Therefore Marketplace always filters:
        listing_type = SALE

    Even if the frontend sends "all", only SALE listings
    are returned.

    ------------------------------------------------------------
    */

    params.push('SALE');

    conditions.push(`
      UPPER(
        COALESCE(
          l.listing_type,
          ''
        )
      ) = $${params.length}
    `);


    // ========================================================
    // PRICE RANGE
    // ========================================================

    const priceFilter =
      getPriceFilter(price);

    if (
      priceFilter.sql
    ) {

      conditions.push(
        priceFilter.sql
      );
    }


    // ========================================================
    // MIN PRICE
    // ========================================================

    if (
      String(minPrice).trim() !== ''
    ) {

      const numericMin =
        Number(minPrice);

      if (
        Number.isFinite(
          numericMin
        )
      ) {

        params.push(
          numericMin
        );

        conditions.push(`
          l.price >= $${params.length}
        `);
      }
    }


    // ========================================================
    // MAX PRICE
    // ========================================================

    if (
      String(maxPrice).trim() !== ''
    ) {

      const numericMax =
        Number(maxPrice);

      if (
        Number.isFinite(
          numericMax
        )
      ) {

        params.push(
          numericMax
        );

        conditions.push(`
          l.price <= $${params.length}
        `);
      }
    }


    // ========================================================
    // WHERE CLAUSE
    // ========================================================

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';


    // ========================================================
    // SORT
    // ========================================================

    let orderBy = `
      l.created_at DESC
    `;

    switch (sortBy) {

      case 'oldest':

        orderBy = `
          l.created_at ASC
        `;

        break;


      case 'price_low':

        orderBy = `
          l.price ASC NULLS LAST,
          l.created_at DESC
        `;

        break;


      case 'price_high':

        orderBy = `
          l.price DESC NULLS LAST,
          l.created_at DESC
        `;

        break;


      case 'rating':

        orderBy = `
          COALESCE(
            review_stats.average_rating,
            0
          ) DESC,
          l.created_at DESC
        `;

        break;


      case 'newest':

      default:

        orderBy = `
          l.created_at DESC
        `;

        break;
    }


    // ========================================================
    // COUNT
    // ========================================================

    const countQuery = `
      SELECT
        COUNT(*)::int AS total
      FROM listings l

      LEFT JOIN categories c
        ON c.category_id =
           l.category_id

      ${whereClause}
    `;

    const countResult =
      await pool.query(
        countQuery,
        params
      );

    const total =
      Number(
        countResult.rows[0]?.total || 0
      );


    // ========================================================
    // MARKETPLACE DATA
    // ========================================================

    const dataParams = [
      ...params,
      itemsPerPage,
      offset
    ];

    const limitParam =
      params.length + 1;

    const offsetParam =
      params.length + 2;


    const marketplaceQuery = `
      SELECT

        l.listing_id,

        l.seller_id,

        l.category_id,

        l.title,

        l.description,

        l.price,

        l.condition,

        l.quantity,

        l.size,

        COALESCE((SELECT json_agg(json_build_object('size', si.size, 'quantity', si.quantity) ORDER BY si.size) FROM listing_size_inventory si WHERE si.listing_id = l.listing_id AND si.quantity > 0), '[]'::json) AS size_inventory,

        l.location,

        l.status,

        l.listing_type,

        l.created_at,

        l.updated_at,


        /* ====================================================
           CATEGORY
        ==================================================== */

        c.name AS category_name,

        c.description AS category_description,

        c.image_url AS category_image,


        /* ====================================================
           SELLER
        ==================================================== */

        u.user_id AS seller_user_id,

        u.first_name AS seller_first_name,

        u.last_name AS seller_last_name,

        u.profile_image AS seller_profile_image,

        u.city AS seller_city,

        u.province AS seller_province,


        /* ====================================================
           PRIMARY IMAGE

           THIS IS THE ACTUAL DATABASE IMAGE.

           Priority:

           1. is_primary = TRUE
           2. sort_order ASC
           3. image_id ASC
        ==================================================== */

        primary_image.image_url
          AS primary_image,


        /* ====================================================
           ALL LISTING IMAGES
        ==================================================== */

        COALESCE(
          image_list.images,
          '[]'::json
        ) AS images,


        /* ====================================================
           REVIEW STATISTICS
        ==================================================== */

        COALESCE(
          review_stats.average_rating,
          0
        ) AS average_rating,

        COALESCE(
          review_stats.review_count,
          0
        ) AS review_count


      FROM listings l


      LEFT JOIN categories c
        ON c.category_id =
           l.category_id


      LEFT JOIN users u
        ON u.user_id =
           l.seller_id


      /* ======================================================
         PRIMARY LISTING IMAGE
      ====================================================== */

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


      /* ======================================================
         ALL LISTING IMAGES
      ====================================================== */

      LEFT JOIN LATERAL (

        SELECT

          json_agg(
            li.image_url
            ORDER BY

              li.is_primary DESC,

              li.sort_order ASC,

              li.image_id ASC
          ) AS images

        FROM listing_images li

        WHERE
          li.listing_id =
          l.listing_id

      ) image_list

        ON TRUE


      /* ======================================================
         REVIEW STATISTICS
      ====================================================== */

      LEFT JOIN LATERAL (

        SELECT

          ROUND(
            AVG(r.rating)::numeric,
            2
          ) AS average_rating,

          COUNT(
            r.review_id
          )::int AS review_count

        FROM reviews r

        WHERE

          r.listing_id =
          l.listing_id

          AND r.rating >= 1
          AND r.rating <= 5

      ) review_stats

        ON TRUE


      ${whereClause}


      ORDER BY

        ${orderBy}


      LIMIT $${limitParam}

      OFFSET $${offsetParam}
    `;


    const result =
      await pool.query(
        marketplaceQuery,
        dataParams
      );


    // ========================================================
    // FORMAT MARKETPLACE ITEMS
    // ========================================================

    const items =
      result.rows.map(
        (item) => {

          const sellerName = [
            item.seller_first_name,
            item.seller_last_name
          ]
            .filter(Boolean)
            .join(' ')
            .trim();


          const sellerLocation = [
            item.seller_city,
            item.seller_province
          ]
            .filter(Boolean)
            .join(', ');


          return {

            listing_id:
              item.listing_id,

            seller_id:
              item.seller_id,

            category_id:
              item.category_id,


            title:
              item.title,

            name:
              item.title,


            description:
              item.description,


            price:
              Number(
                item.price || 0
              ),


            condition:
              item.condition,


            quantity:
              Number(
                item.quantity || 0
              ),


            size:
              item.size ||
              null,

            size_inventory:
              Array.isArray(item.size_inventory)
                ? item.size_inventory.map((entry) => ({ size: entry.size, quantity: Number(entry.quantity || 0) }))
                : [],

            size_options:
              Array.isArray(item.size_inventory) && item.size_inventory.length > 0
                ? item.size_inventory.map((entry) => ({ size: entry.size, quantity: Number(entry.quantity || 0) }))
                : (item.size ? [{ size: item.size, quantity: Number(item.quantity || 0) }] : []),


            location:
              item.location ||
              sellerLocation ||
              null,


            status:
              item.status,


            /*
            ====================================================
            LISTING TYPE
            ====================================================
            */

            listing_type:
              item.listing_type,


            created_at:
              item.created_at,

            updated_at:
              item.updated_at,


            // =================================================
            // CATEGORY OBJECT
            // =================================================

            category: {

              category_id:
                item.category_id,

              name:
                item.category_name,

              description:
                item.category_description,

              image_url:
                item.category_image
            },


            category_name:
              item.category_name,


            // =================================================
            // SELLER OBJECT
            // =================================================

            seller: {

              user_id:
                item.seller_user_id,

              first_name:
                item.seller_first_name,

              last_name:
                item.seller_last_name,

              name:
                sellerName ||
                'Seller',

              profile_image:
                item.seller_profile_image,

              city:
                item.seller_city,

              province:
                item.seller_province
            },


            seller_name:
              sellerName ||
              'Seller',


            // =================================================
            // ACTUAL LISTING IMAGE
            // =================================================

            image_url:
              normalizeImageUrl(
                req,
                item.primary_image
              ),


            primary_image:
              normalizeImageUrl(
                req,
                item.primary_image
              ),


            // =================================================
            // ALL ACTUAL LISTING IMAGES
            // =================================================

            images:
              normalizeImageList(
                req,
                item.images
              ),


            // =================================================
            // REVIEWS
            // =================================================

            average_rating:
              Number(
                item.average_rating || 0
              ),

            review_count:
              Number(
                item.review_count || 0
              )
          };
        }
      );


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({

      success: true,

      items,

      data:
        items,


      pagination: {

        page:
          currentPage,

        limit:
          itemsPerPage,

        total,

        totalPages:
          Math.ceil(
            total /
            itemsPerPage
          )
      },


      total,

      totalPages:
        Math.ceil(
          total /
          itemsPerPage
        )
    });


  } catch (error) {

    console.error(
      'BUYER MARKETPLACE ERROR:',
      error
    );


    return res.status(500).json({

      success: false,

      message:
        'Failed to load marketplace items.',

      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined
    });
  }
});


// ============================================================
// GET CATEGORIES
// GET /api/buyer/marketplace/categories
// ============================================================

router.get(
  '/categories',
  async (req, res) => {

    try {

      const result =
        await pool.query(`

          SELECT

            category_id,

            name,

            description,

            image_url,

            status,

            created_at,

            updated_at

          FROM categories

          WHERE LOWER(
            COALESCE(
              status,
              ''
            )
          ) IN (
            'active',
            'available',
            'published'
          )

          ORDER BY
            name ASC

        `);


      return res.json({

        success: true,

        categories:
          result.rows,

        data:
          result.rows

      });


    } catch (error) {

      console.error(
        'BUYER MARKETPLACE CATEGORIES ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to load categories.',

        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined
      });
    }
  }
);


// ============================================================
// BUYER ID HELPER
// ============================================================

function getBuyerId(req) {

  const rawId =
    req.user?.user_id ??
    req.user?.userId ??
    req.user?.id;


  const buyerId =
    Number(rawId);


  if (
    !Number.isSafeInteger(
      buyerId
    ) ||
    buyerId <= 0
  ) {

    return null;
  }


  return buyerId;
}


// ============================================================
// GET BUYER WISHLIST
// GET /api/buyer/marketplace/favorites
// ============================================================

router.get(
  '/favorites',
  authMiddleware,
  buyerOnly,
  async (req, res) => {

    try {

      const buyerId =
        getBuyerId(req);


      if (!buyerId) {

        return res.status(401).json({

          success: false,

          message:
            'Authenticated buyer ID is missing.'
        });
      }


      const result =
        await pool.query(`

          SELECT

            f.favorite_id,

            f.buyer_id,

            f.listing_id,

            f.created_at AS favorite_created_at,


            l.seller_id,

            l.category_id,

            l.title,

            l.title AS name,

            l.description,

            l.price,

            l.condition,

            l.quantity,

            l.location,

            l.status,

            l.created_at,

            l.updated_at,


            c.name AS category_name,


            u.user_id AS seller_user_id,

            u.first_name AS seller_first_name,

            u.last_name AS seller_last_name,

            u.profile_image
              AS seller_profile_image,

            u.city AS seller_city,

            u.province AS seller_province,


            li.image_url
              AS image_url,


            li.image_url
              AS primary_image,


            TRUE AS is_wishlisted

          FROM favorites f


          INNER JOIN listings l
            ON l.listing_id =
               f.listing_id


          LEFT JOIN categories c
            ON c.category_id =
               l.category_id


          LEFT JOIN users u
            ON u.user_id =
               l.seller_id


          LEFT JOIN LATERAL (

            SELECT
              image_url

            FROM listing_images

            WHERE
              listing_id =
              l.listing_id

            ORDER BY

              is_primary DESC,

              sort_order ASC,

              image_id ASC

            LIMIT 1

          ) li

            ON TRUE


          WHERE
            f.buyer_id =
            $1


          ORDER BY

            f.created_at DESC,

            f.favorite_id DESC

        `, [buyerId]);


      const items =
        result.rows.map(
          (item) => ({

            ...item,

            image_url:
              normalizeImageUrl(
                req,
                item.image_url
              ),

            primary_image:
              normalizeImageUrl(
                req,
                item.primary_image
              )
          })
        );


      return res.json({

        success: true,

        items,

        favorites:
          items,

        data:
          items

      });


    } catch (error) {

      console.error(
        'BUYER FAVORITES GET ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to load wishlist.',

        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined
      });
    }
  }
);


// ============================================================
// ADD TO BUYER WISHLIST
// POST /api/buyer/marketplace/favorites
// ============================================================

router.post(
  '/favorites',
  authMiddleware,
  buyerOnly,
  async (req, res) => {

    try {

      const buyerId =
        getBuyerId(req);


      const listingId =
        Number(
          req.body?.listing_id ??
          req.body?.product_id
        );


      if (!buyerId) {

        return res.status(401).json({

          success: false,

          message:
            'Authenticated buyer ID is missing.'
        });
      }


      if (
        !Number.isSafeInteger(
          listingId
        ) ||
        listingId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Valid listing_id is required.'
        });
      }


      // ======================================================
      // VERIFY LISTING
      // ======================================================

      const listingResult =
        await pool.query(`

          SELECT

            listing_id,

            status

          FROM listings

          WHERE

            listing_id =
            $1

            AND LOWER(
              COALESCE(
                status,
                ''
              )
            ) = 'available'

            AND UPPER(
              COALESCE(
                listing_type,
                ''
              )
            ) IN ('SALE', 'DONATION')

          LIMIT 1

        `, [listingId]);


      if (
        listingResult.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Listing is not available.'
        });
      }


      // ======================================================
      // INSERT FAVORITE
      // ======================================================

      const result =
        await pool.query(`

          INSERT INTO favorites (

            buyer_id,

            listing_id

          )

          VALUES (

            $1,

            $2

          )

          ON CONFLICT (

            buyer_id,

            listing_id

          )

          DO UPDATE SET

            created_at =
              favorites.created_at

          RETURNING

            favorite_id,

            buyer_id,

            listing_id,

            created_at

        `, [

          buyerId,

          listingId

        ]);


      return res.status(201).json({

        success: true,

        favorite:
          result.rows[0],

        message:
          'Item added to wishlist.'

      });


    } catch (error) {

      console.error(
        'BUYER FAVORITE ADD ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to add item to wishlist.',

        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined
      });
    }
  }
);


// ============================================================
// REMOVE FROM BUYER WISHLIST
// DELETE /api/buyer/marketplace/favorites/:listingId
// ============================================================

router.delete(
  '/favorites/:listingId',
  authMiddleware,
  buyerOnly,
  async (req, res) => {

    try {

      const buyerId =
        getBuyerId(req);


      const listingId =
        Number(
          req.params.listingId
        );


      if (!buyerId) {

        return res.status(401).json({

          success: false,

          message:
            'Authenticated buyer ID is missing.'
        });
      }


      if (
        !Number.isSafeInteger(
          listingId
        ) ||
        listingId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Valid listing ID is required.'
        });
      }


      const result =
        await pool.query(`

          DELETE FROM favorites

          WHERE

            buyer_id =
            $1

            AND listing_id =
            $2

          RETURNING

            favorite_id,

            listing_id

        `, [

          buyerId,

          listingId

        ]);


      return res.json({

        success: true,

        removed:
          result.rowCount,

        message:
          result.rowCount > 0
            ? 'Item removed from wishlist.'
            : 'Item was not in wishlist.'

      });


    } catch (error) {

      console.error(
        'BUYER FAVORITE DELETE ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to remove item from wishlist.',

        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined
      });
    }
  }
);


// ============================================================
// GET BUYER CART
// GET /api/buyer/marketplace/cart
// ============================================================

router.get(
  '/cart',
  authMiddleware,
  buyerOnly,
  async (req, res) => {

    try {

      const buyerId =
        getBuyerId(req);


      if (!buyerId) {

        return res.status(401).json({

          success: false,

          message:
            'Authenticated buyer ID is missing.'
        });
      }


      const result =
        await pool.query(`

          SELECT

            ci.cart_item_id,

            ci.buyer_id,

            ci.listing_id,

            ci.size,

            ci.quantity
              AS cart_quantity,

            CASE
              WHEN ci.size IS NOT NULL AND EXISTS (
                SELECT 1
                FROM listing_size_inventory stock_check
                WHERE stock_check.listing_id = l.listing_id
                  AND LOWER(stock_check.size) = LOWER(ci.size)
              ) THEN (
                SELECT stock.quantity
                FROM listing_size_inventory stock
                WHERE stock.listing_id = l.listing_id
                  AND LOWER(stock.size) = LOWER(ci.size)
                LIMIT 1
              )
              ELSE l.quantity
            END AS available_quantity,

            COALESCE((
              SELECT json_agg(
                json_build_object('size', si.size, 'quantity', si.quantity)
                ORDER BY si.size
              )
              FROM listing_size_inventory si
              WHERE si.listing_id = l.listing_id
                AND si.quantity > 0
            ), '[]'::json) AS size_inventory,

            ci.created_at
              AS cart_created_at,

            ci.updated_at
              AS cart_updated_at,


            l.seller_id,

            l.category_id,

            l.title,

            l.title AS name,

            l.description,

            l.price,

            l.condition,

            l.quantity,

            l.location,

            l.status,

            l.created_at,

            l.updated_at,


            c.name
              AS category_name,


            u.user_id
              AS seller_user_id,

            u.first_name
              AS seller_first_name,

            u.last_name
              AS seller_last_name,

            u.profile_image
              AS seller_profile_image,

            u.city
              AS seller_city,

            u.province
              AS seller_province,


            li.image_url
              AS image_url,

            li.image_url
              AS primary_image,


            EXISTS (

              SELECT 1

              FROM favorites f

              WHERE

                f.buyer_id =
                ci.buyer_id

                AND f.listing_id =
                ci.listing_id

            ) AS is_wishlisted


          FROM cart_items ci


          INNER JOIN listings l
            ON l.listing_id =
               ci.listing_id


          LEFT JOIN categories c
            ON c.category_id =
               l.category_id


          LEFT JOIN users u
            ON u.user_id =
               l.seller_id


          LEFT JOIN LATERAL (

            SELECT
              image_url

            FROM listing_images

            WHERE
              listing_id =
              l.listing_id

            ORDER BY

              is_primary DESC,

              sort_order ASC,

              image_id ASC

            LIMIT 1

          ) li

            ON TRUE


          WHERE

            ci.buyer_id =
            $1


          ORDER BY

            ci.created_at DESC,

            ci.cart_item_id DESC

        `, [buyerId]);


      const items =
        result.rows.map(
          (item) => ({

            ...item,

            image_url:
              normalizeImageUrl(
                req,
                item.image_url
              ),

            primary_image:
              normalizeImageUrl(
                req,
                item.primary_image
              )
          })
        );


      return res.json({

        success: true,

        items,

        cart:
          items,

        data:
          items

      });


    } catch (error) {

      console.error(
        'BUYER CART GET ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to load cart.',

        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined
      });
    }
  }
);


// ============================================================
// ADD TO CART
// POST /api/buyer/marketplace/cart
// Supports size-specific inventory and separate cart rows per size.
// ============================================================

router.post(
  '/cart',
  authMiddleware,
  buyerOnly,
  async (req, res) => {
    const buyerId = getBuyerId(req);
    const listingId = Number(req.body?.listing_id ?? req.body?.product_id);
    const requestedQuantity = Number(req.body?.quantity ?? 1);
    const requestedSize =
      req.body?.size === undefined || req.body?.size === null || String(req.body.size).trim() === ''
        ? null
        : String(req.body.size).trim();

    if (!buyerId) {
      return res.status(401).json({ success: false, message: 'Authenticated buyer ID is missing.' });
    }
    if (!Number.isSafeInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid listing_id is required.' });
    }
    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive whole number.' });
    }
    if (requestedSize && requestedSize.length > 100) {
      return res.status(400).json({ success: false, message: 'Selected size is too long.' });
    }

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      // Lock the listing to serialize cart stock checks for this listing.
      const listingResult = await client.query(`
        SELECT listing_id, quantity, size, status, listing_type, price
        FROM listings
        WHERE listing_id = $1
          AND LOWER(COALESCE(status, '')) = 'available'
          AND UPPER(COALESCE(listing_type, '')) IN ('SALE', 'DONATION')
        FOR UPDATE
      `, [listingId]);

      if (listingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Listing is not available.' });
      }

      const listing = listingResult.rows[0];
      const inventoryResult = await client.query(`
        SELECT inventory_id, size, quantity
        FROM listing_size_inventory
        WHERE listing_id = $1
        ORDER BY size ASC
        FOR UPDATE
      `, [listingId]);
      const hasSizeInventory = inventoryResult.rows.length > 0;

      let availableQuantity = Number(listing.quantity || 0);
      let normalizedSize = requestedSize;

      if (hasSizeInventory) {
        if (!requestedSize) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Please select a size before adding this item to your cart.' });
        }
        const selectedInventory = inventoryResult.rows.find(
          (entry) => String(entry.size).toLowerCase() === requestedSize.toLowerCase()
        );
        if (!selectedInventory) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'The selected size is not available for this listing.' });
        }
        normalizedSize = selectedInventory.size;
        availableQuantity = Number(selectedInventory.quantity || 0);
      } else if (requestedSize) {
        // Legacy single-size listings may have listings.size without inventory rows.
        if (!listing.size || String(listing.size).toLowerCase() !== requestedSize.toLowerCase()) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'The selected size is not available for this listing.' });
        }
        normalizedSize = listing.size;
      }

      if (availableQuantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: normalizedSize ? `Size ${normalizedSize} is out of stock.` : 'This item is out of stock.' });
      }

      const existingResult = await client.query(`
        SELECT cart_item_id, quantity
        FROM cart_items
        WHERE buyer_id = $1
          AND listing_id = $2
          AND COALESCE(LOWER(size), '') = COALESCE(LOWER($3::varchar), '')
        LIMIT 1
        FOR UPDATE
      `, [buyerId, listingId, normalizedSize]);

      const currentQuantity = Number(existingResult.rows[0]?.quantity || 0);
      const finalQuantity = currentQuantity + requestedQuantity;
      if (finalQuantity > availableQuantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: normalizedSize
            ? `Only ${availableQuantity} item(s) of size ${normalizedSize} are available.`
            : `Only ${availableQuantity} item(s) are available.`
        });
      }

      let savedCartItem;
      let statusCode = 200;
      if (existingResult.rows.length > 0) {
        const updateResult = await client.query(`
          UPDATE cart_items
          SET quantity = $1, updated_at = CURRENT_TIMESTAMP
          WHERE cart_item_id = $2 AND buyer_id = $3
          RETURNING cart_item_id, buyer_id, listing_id, size, quantity, created_at, updated_at
        `, [finalQuantity, existingResult.rows[0].cart_item_id, buyerId]);
        savedCartItem = updateResult.rows[0];
      } else {
        const insertResult = await client.query(`
          INSERT INTO cart_items (buyer_id, listing_id, size, quantity)
          VALUES ($1, $2, $3, $4)
          RETURNING cart_item_id, buyer_id, listing_id, size, quantity, created_at, updated_at
        `, [buyerId, listingId, normalizedSize, requestedQuantity]);
        savedCartItem = insertResult.rows[0];
        statusCode = 201;
      }

      await client.query('COMMIT');
      return res.status(statusCode).json({
        success: true,
        cartItem: savedCartItem,
        message: existingResult.rows.length > 0 ? 'Item quantity updated in cart.' : 'Item added to cart.'
      });
    } catch (error) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch (_) {}
      }
      console.error('BUYER CART ADD ERROR:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add item to cart.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      if (client) client.release();
    }
  }
);


// ============================================================
// UPDATE CART QUANTITY
// PATCH /api/buyer/marketplace/cart/:cartItemId
// Validates stock against the size saved on that cart row.
// ============================================================

router.patch(
  '/cart/:cartItemId',
  authMiddleware,
  buyerOnly,
  async (req, res) => {
    const buyerId = getBuyerId(req);
    const cartItemId = Number(req.params.cartItemId);
    const quantity = Number(req.body?.quantity);

    if (!buyerId) {
      return res.status(401).json({ success: false, message: 'Authenticated buyer ID is missing.' });
    }
    if (!Number.isSafeInteger(cartItemId) || cartItemId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid cart item ID is required.' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive whole number.' });
    }

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const cartResult = await client.query(`
        SELECT ci.cart_item_id, ci.listing_id, ci.size, l.quantity AS listing_quantity,
               l.status, l.listing_type
        FROM cart_items ci
        INNER JOIN listings l ON l.listing_id = ci.listing_id
        WHERE ci.cart_item_id = $1 AND ci.buyer_id = $2
        FOR UPDATE OF ci, l
      `, [cartItemId, buyerId]);

      if (cartResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Cart item was not found.' });
      }

      const cartItem = cartResult.rows[0];
      if (String(cartItem.status || '').toLowerCase() !== 'available' ||
          !['SALE', 'DONATION'].includes(String(cartItem.listing_type || '').toUpperCase())) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'This listing is no longer available.' });
      }

      let availableQuantity = Number(cartItem.listing_quantity || 0);
      if (cartItem.size) {
        const inventoryResult = await client.query(`
          SELECT quantity
          FROM listing_size_inventory
          WHERE listing_id = $1 AND LOWER(size) = LOWER($2)
          LIMIT 1
          FOR UPDATE
        `, [cartItem.listing_id, cartItem.size]);

        if (inventoryResult.rows.length > 0) {
          availableQuantity = Number(inventoryResult.rows[0].quantity || 0);
        }
      }

      if (quantity > availableQuantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: cartItem.size
            ? `Only ${availableQuantity} item(s) of size ${cartItem.size} are available.`
            : `Only ${availableQuantity} item(s) are available.`
        });
      }

      const updateResult = await client.query(`
        UPDATE cart_items
        SET quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE cart_item_id = $2 AND buyer_id = $3
        RETURNING cart_item_id, buyer_id, listing_id, size, quantity, created_at, updated_at
      `, [quantity, cartItemId, buyerId]);

      await client.query('COMMIT');
      return res.json({ success: true, cartItem: updateResult.rows[0], message: 'Cart quantity updated.' });
    } catch (error) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch (_) {}
      }
      console.error('BUYER CART UPDATE ERROR:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update cart item.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      if (client) client.release();
    }
  }
);


// ============================================================
// REMOVE CART ITEM
// DELETE /api/buyer/marketplace/cart/:cartItemId
// ============================================================

router.delete(
  '/cart/:cartItemId',
  authMiddleware,
  buyerOnly,
  async (req, res) => {

    try {

      const buyerId =
        getBuyerId(req);


      const cartItemId =
        Number(
          req.params.cartItemId
        );


      if (!buyerId) {

        return res.status(401).json({

          success: false,

          message:
            'Authenticated buyer ID is missing.'
        });
      }


      if (
        !Number.isSafeInteger(
          cartItemId
        ) ||
        cartItemId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Valid cart item ID is required.'
        });
      }


      const result =
        await pool.query(`

          DELETE FROM cart_items

          WHERE

            cart_item_id =
            $1

            AND buyer_id =
            $2

          RETURNING

            cart_item_id,

            listing_id

        `, [

          cartItemId,

          buyerId

        ]);


      return res.json({

        success: true,

        removed:
          result.rowCount,

        message:
          result.rowCount > 0
            ? 'Item removed from cart.'
            : 'Cart item was not found.'

      });


    } catch (error) {

      console.error(
        'BUYER CART DELETE ERROR:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to remove cart item.',

        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined
      });
    }
  }
);




// ============================================================
// GET ITEM REVIEWS
// GET /api/buyer/marketplace/:listingId/reviews
// ============================================================
//
// Buyer Marketplace uses this endpoint for the item's own
// ratings/reviews. It does NOT return seller-only reviews.
//
// ============================================================

router.get(
  '/:listingId/reviews',
  async (req, res) => {

    try {

      const listingId =
        Number(req.params.listingId);

      if (
        !Number.isSafeInteger(listingId) ||
        listingId <= 0
      ) {

        return res.status(400).json({
          success: false,
          message: 'Valid listing ID is required.'
        });
      }

      const result =
        await pool.query(`
          SELECT
            r.review_id,
            r.listing_id,
            r.rating,
            r.status
          FROM reviews r
          WHERE
            r.listing_id = $1
            AND r.rating >= 1
            AND r.rating <= 5
          ORDER BY
            r.review_id DESC
        `, [listingId]);

      return res.json({
        success: true,
        reviews: result.rows,
        data: result.rows
      });

    } catch (error) {

      console.error(
        'BUYER ITEM REVIEWS GET ERROR:',
        error
      );

      return res.status(500).json({
        success: false,
        message: 'Failed to load item reviews.',
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined
      });
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;