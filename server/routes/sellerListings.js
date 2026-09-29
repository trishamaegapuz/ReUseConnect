const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

const pool = require('../config/db');

/* ============================================================ UPLOAD
DIRECTORY ============================================================
*/

const uploadDirectory = path.join( __dirname, '..', 'uploads',
'listings' );

if ( !fs.existsSync( uploadDirectory ) ) { fs.mkdirSync(
uploadDirectory, { recursive: true } ); }

/* ============================================================ MULTER
STORAGE ============================================================ */

const storage = multer.diskStorage({

    destination:
      (req, file, callback) => {

        callback(
          null,
          uploadDirectory
        );
      },

    filename:
      (req, file, callback) => {

        const extension =
          path
            .extname(
              file.originalname || ''
            )
            .toLowerCase();

        const allowedExtensions = [
          '.jpg',
          '.jpeg',
          '.png',
          '.webp'
        ];

        const safeExtension =
          allowedExtensions.includes(
            extension
          )
            ? extension
            : '.jpg';

        const filename =
          `${Date.now()}-` +
          `${crypto
            .randomBytes(8)
            .toString('hex')}` +
          `${safeExtension}`;

        callback(
          null,
          filename
        );
      }

});

/* ============================================================ FILE
FILTER ============================================================ */

const fileFilter = (req, file, callback) => {

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (
      allowedTypes.includes(
        file.mimetype
      )
    ) {

      callback(
        null,
        true
      );

      return;
    }

    callback(
      new Error(
        'Only JPG, PNG, and WEBP images are allowed.'
      )
    );

};

const upload = multer({

    storage,

    fileFilter,

    limits: {
      files: 10,
      fileSize:
        5 * 1024 * 1024
    }

});

/* ============================================================ HELPERS
============================================================ */

function getSellerId(req) {

const raw = req.user?.user_id ?? req.user?.userId ?? req.user?.id ??
req.headers['x-user-id'];

const id = Number(raw);

if ( !Number.isSafeInteger(id) || id <= 0 ) { return null; }

return id; }

/* ============================================================ STATUS
============================================================ */

function normalizeStatus(status) {

const value = String( status || '' ) .trim() .toUpperCase() .replace(
/\s+/g, '_' );

const map = {

    ACTIVE:
      'AVAILABLE',

    AVAILABLE:
      'AVAILABLE',

    PENDING:
      'PENDING',

    INACTIVE:
      'HIDDEN',

    HIDDEN:
      'HIDDEN',

    RESERVED:
      'RESERVED',

    SOLD:
      'SOLD',

    REJECTED:
      'REJECTED'

};

return ( map[value] || 'PENDING' ); }

function statusForResponse(status) {

const map = {

    AVAILABLE:
      'Active',

    PENDING:
      'Pending',

    HIDDEN:
      'Inactive',

    RESERVED:
      'Reserved',

    SOLD:
      'Sold',

    REJECTED:
      'Rejected'

};

const value = String( status || '' ) .trim() .toUpperCase();

return ( map[value] || 'Pending' ); }

function getStatusFilter(status) {

if ( !status || status === 'all' ) { return null; }

const value = String( status ) .trim() .toLowerCase();

const map = {

    active:
      'AVAILABLE',

    available:
      'AVAILABLE',

    pending:
      'PENDING',

    inactive:
      'HIDDEN',

    hidden:
      'HIDDEN',

    reserved:
      'RESERVED',

    sold:
      'SOLD',

    rejected:
      'REJECTED'

};

return ( map[value] || null ); }

/* ============================================================ LISTING
TYPE ============================================================ */

function normalizeListingType( listingType ) {

const value = String( listingType || 'SALE' ) .trim() .toUpperCase()
.replace( /[-]+/g, '_' );

const allowed = [ 'SALE', 'DONATION', 'TRADE' ];

if ( allowed.includes( value ) ) { return value; }

return 'SALE'; }

function listingTypeForResponse( listingType ) {

const value = String( listingType || 'SALE' ) .trim() .toUpperCase();

const map = {

    SALE:
      'For Sale',

    DONATION:
      'Donation',

    TRADE:
      'For Trade'

};

return ( map[value] || 'For Sale' ); }

/* ============================================================
CONDITION ============================================================
*/

function normalizeCondition(condition) {

const value = String( condition || '' ) .trim() .toUpperCase() .replace(
/[-]+/g, '_' );

const allowed = [ 'NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR' ];

if ( allowed.includes( value ) ) { return value; }

return 'GOOD'; }

function conditionForResponse(condition) {

const map = {

    NEW:
      'New',

    LIKE_NEW:
      'Like New',

    GOOD:
      'Good',

    FAIR:
      'Fair',

    POOR:
      'Poor'

};

const value = String( condition || '' ) .trim() .toUpperCase();

return ( map[value] || 'Good' ); }

/* ============================================================ ITEM
SIZE ============================================================ */

function normalizeSize(size) {

if ( size === undefined || size === null ) { return null; }

const value = String( size ).trim();

if (!value) { return null; }

return value.slice( 0, 100 ); }

function parseSizeInventory(value, legacySize = null, legacyQuantity = 0) {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = parsed.trim() ? JSON.parse(parsed) : []; } catch { parsed = []; }
  }
  const rows = Array.isArray(parsed) ? parsed : [];
  const seen = new Set();
  const normalized = [];
  for (const row of rows) {
    const size = normalizeSize(row?.size ?? row?.value ?? row);
    const quantity = Math.floor(Number(row?.quantity ?? 0));
    const key = String(size || '').toLowerCase();
    if (!size || quantity <= 0 || seen.has(key)) continue;
    seen.add(key);
    normalized.push({ size, quantity });
  }
  if (!normalized.length) {
    const size = normalizeSize(legacySize);
    const quantity = Math.floor(Number(legacyQuantity || 0));
    if (size && quantity > 0) normalized.push({ size, quantity });
  }
  return normalized;
}

async function replaceSizeInventory(client, listingId, inventory) {
  await client.query('DELETE FROM listing_size_inventory WHERE listing_id = $1', [listingId]);
  for (const entry of inventory) {
    await client.query(
      'INSERT INTO listing_size_inventory (listing_id, size, quantity) VALUES ($1, $2, $3)',
      [listingId, entry.size, entry.quantity]
    );
  }
}


/* ============================================================ NUMBER
============================================================ */

function parseNumber( value, fallback = 0 ) {

const number = Number(value);

return Number.isFinite( number ) ? number : fallback; }

/* ============================================================ IMAGE
URL ============================================================ */

function getImageUrl( req, filename ) {

if (!filename) { return null; }

return (
  `${req.protocol}://${req.get('host')}` +
  `/api/seller/listings/image/${encodeURIComponent(filename)}`
); }

/* ============================================================
NORMALIZE STORED IMAGE URL
============================================================ */

function normalizeStoredImageUrl( req, imageUrl ) {

if (!imageUrl) { return null; }

const value = String( imageUrl ).trim();

if (!value) { return null; }

/* External / data URLs. */

if ( value.startsWith( 'http://' ) || value.startsWith( 'https://' ) ||
value.startsWith( 'data:' ) || value.startsWith( 'blob:' ) ) {

    /*
     * If this is our own image route,
     * normalize it to current host.
     */

    if (
      value.includes(
        '/api/seller/listings/image/'
      )
    ) {

      const filename =
        path.basename(
          value.split('?')[0]
        );

      return getImageUrl(
        req,
        filename
      );
    }

    return value;

}

/* Old /uploads/listings/filename path. */

const filename = path.basename( value.split('?')[0] );

if ( !filename || filename === '.' ) { return null; }

/* If physical file exists, serve through our secure image route. */

const filePath = path.join( uploadDirectory, filename );

if ( fs.existsSync( filePath ) ) {

    return getImageUrl(
      req,
      filename
    );

}

/* Keep other absolute paths. */

if ( value.startsWith('/') ) {

    return (
      `${req.protocol}://` +
      `${req.get('host')}` +
      `${value}`
    );

}

return value; }

/* ============================================================ CLEANUP
UPLOADED FILES
============================================================ */

function cleanupUploadedFiles( files ) {

if ( !Array.isArray(files) ) { return; }

files.forEach( (file) => {

      if (
        !file?.path
      ) {
        return;
      }

      try {

        if (
          fs.existsSync(
            file.path
          )
        ) {

          fs.unlinkSync(
            file.path
          );
        }

      } catch (error) {

        console.error(
          'Unable to cleanup uploaded file:',
          error
        );
      }
    }

); }

/* ============================================================ IMAGE
FILE ROUTE MUST BE BEFORE /:listingId
============================================================ */

router.get( '/image/:filename', (req, res) => {

    try {

      const filename =
        path.basename(
          req.params.filename
        );

      const filePath =
        path.join(
          uploadDirectory,
          filename
        );

      if (
        !fs.existsSync(
          filePath
        )
      ) {

        return res.status(
          404
        ).json({
          message:
            'Image not found.'
        });
      }

      return res.sendFile(
        filePath
      );

    } catch (error) {

      console.error(
        'Seller image error:',
        error
      );

      return res.status(
        500
      ).json({
        message:
          'Unable to load image.'
      });
    }

} );

/* ============================================================ GET
SELLER LISTINGS
============================================================ */

router.get( '/', async (req, res) => {

    try {

      const sellerId =
        getSellerId(req);

      if (!sellerId) {

        return res.status(
          401
        ).json({
          message:
            'Seller authentication is required.'
        });
      }


      const page =
        Math.max(
          Number(
            req.query.page
          ) || 1,
          1
        );


      const limit =
        Math.min(
          Math.max(
            Number(
              req.query.limit
            ) || 8,
            1
          ),
          50
        );


      const offset =
        (page - 1) *
        limit;


      const search =
        String(
          req.query.search ||
          ''
        ).trim();


      const status =
        getStatusFilter(
          req.query.status
        );

      const listingType =
        req.query.listing_type ??
        req.query.listingType ??
        req.query.type ??
        '';

      const normalizedListingType =
        listingType
          ? normalizeListingType(listingType)
          : null;


      const where = [
        'l.seller_id = $1'
      ];


      const values = [
        sellerId
      ];


      let parameter =
        2;


      if (search) {

        where.push(
          `(
            l.title ILIKE $${parameter}
            OR COALESCE(
              l.description,
              ''
            ) ILIKE $${parameter}
            OR COALESCE(
              l.location,
              ''
            ) ILIKE $${parameter}
          )`
        );

        values.push(
          `%${search}%`
        );

        parameter += 1;
      }


      if (status) {

        where.push(
          `l.status = $${parameter}`
        );

        values.push(
          status
        );

        parameter += 1;
      }

      if (normalizedListingType) {

        where.push(
          `l.listing_type = $${parameter}`
        );

        values.push(
          normalizedListingType
        );

        parameter += 1;
      }


      const whereSql =
        where.join(
          '\nAND '
        );


      /* --------------------------------------------------------
         COUNT
      -------------------------------------------------------- */

      const countResult =
        await pool.query(
          `
          SELECT
            COUNT(*)::int AS total

          FROM listings l

          WHERE
            ${whereSql}
          `,
          values
        );


      const total =
        Number(
          countResult.rows[0]?.total ||
          0
        );


      const limitParameter =
        parameter;

      const offsetParameter =
        parameter + 1;


      const listingValues = [
        ...values,
        limit,
        offset
      ];


      /* --------------------------------------------------------
         LISTINGS
      -------------------------------------------------------- */

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

            l.size,

            COALESCE((SELECT json_agg(json_build_object('size', si.size, 'quantity', si.quantity) ORDER BY si.size) FROM listing_size_inventory si WHERE si.listing_id = l.listing_id), '[]'::json) AS size_inventory,

            l.listing_type,

            l.status,

            l.rejection_reason,

            l.created_at,

            l.updated_at,

            c.name AS category_name,

            (
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

            ) AS image_url

          FROM listings l

          LEFT JOIN categories c
            ON c.category_id =
              l.category_id

          WHERE
            ${whereSql}

          ORDER BY
            l.updated_at DESC NULLS LAST,
            l.created_at DESC,
            l.listing_id DESC

          LIMIT
            $${limitParameter}

          OFFSET
            $${offsetParameter}
          `,
          listingValues
        );


      const items =
        result.rows.map(
          (listing) => {

            const imageUrl =
              normalizeStoredImageUrl(
                req,
                listing.image_url
              );

            return {

              ...listing,

              price:
                listing.price ===
                null
                  ? null
                  : Number(
                      listing.price
                    ),

              quantity:
                Number(
                  listing.quantity ||
                  0
                ),

              size:
                normalizeSize(
                  listing.size
                ),

              size_inventory:
                Array.isArray(listing.size_inventory)
                  ? listing.size_inventory.map((entry) => ({ size: entry.size, quantity: Number(entry.quantity || 0) }))
                  : [],

              listing_type:
                normalizeListingType(
                  listing.listing_type
                ),

              listing_type_label:
                listingTypeForResponse(
                  listing.listing_type
                ),

              status:
                statusForResponse(
                  listing.status
                ),

              condition:
                conditionForResponse(
                  listing.condition
                ),

              image_url:
                imageUrl,

              primary_image_url:
                imageUrl,

              views:
                null
            };
          }
        );


      return res.json({

        items,

        data:
          items,

        listings:
          items,

        pagination: {

          page,

          limit,

          total,

          totalPages:
            Math.max(
              Math.ceil(
                total /
                limit
              ),
              1
            )
        }
      });

    } catch (error) {

      console.error(
        'GET seller listings error:',
        error
      );

      return res.status(
        500
      ).json({

        message:
          'Failed to load seller listings.',

        error:
          error.message
      });
    }

} );

/* ============================================================ GET
SELLER LISTING STATS
============================================================ */

router.get( '/stats', async (req, res) => {

    try {

      const sellerId =
        getSellerId(req);

      if (!sellerId) {

        return res.status(
          401
        ).json({
          message:
            'Seller authentication is required.'
        });
      }


      const result =
        await pool.query(
          `
          SELECT

            COUNT(*)::int
              AS total_listings,

            COUNT(*) FILTER (
              WHERE status =
                'AVAILABLE'
            )::int
              AS active_listings,

            COUNT(*) FILTER (
              WHERE status =
                'SOLD'
            )::int
              AS sold_listings,

            COUNT(*) FILTER (
              WHERE status =
                'HIDDEN'
                OR status =
                'REJECTED'
            )::int
              AS inactive_listings,

            COUNT(*) FILTER (
              WHERE status =
                'PENDING'
            )::int
              AS pending_listings

          FROM listings

          WHERE
            seller_id = $1
          `,
          [
            sellerId
          ]
        );


      const row =
        result.rows[0] ||
        {};


      return res.json({

        totalListings:
          Number(
            row.total_listings ||
            0
          ),

        activeListings:
          Number(
            row.active_listings ||
            0
          ),

        soldListings:
          Number(
            row.sold_listings ||
            0
          ),

        inactiveListings:
          Number(
            row.inactive_listings ||
            0
          ),

        pendingListings:
          Number(
            row.pending_listings ||
            0
          )
      });

    } catch (error) {

      console.error(
        'GET seller listing stats error:',
        error
      );

      return res.status(
        500
      ).json({

        message:
          'Failed to load listing statistics.',

        error:
          error.message
      });
    }

} );

/* ============================================================ GET
SELLER CATEGORIES
============================================================ */

router.get( '/categories', async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT

            category_id,

            name

          FROM categories

          ORDER BY
            name ASC
          `
        );


      const categories =
        result.rows;


      return res.json({

        categories,

        items:
          categories,

        data:
          categories
      });

    } catch (error) {

      console.error(
        'GET seller categories error:',
        error
      );

      return res.status(
        500
      ).json({

        message:
          'Failed to load categories.',

        error:
          error.message
      });
    }

} );

/* ============================================================ GET
SINGLE SELLER LISTING
============================================================ */

router.get( '/:listingId', async (req, res) => {

    try {

      const sellerId =
        getSellerId(req);

      const listingId =
        Number(
          req.params.listingId
        );


      if (!sellerId) {

        return res.status(
          401
        ).json({
          message:
            'Seller authentication is required.'
        });
      }


      if (
        !Number.isInteger(
          listingId
        ) ||
        listingId <= 0
      ) {

        return res.status(
          400
        ).json({
          message:
            'Invalid listing ID.'
        });
      }


      const listingResult =
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

            l.size,

            COALESCE((SELECT json_agg(json_build_object('size', si.size, 'quantity', si.quantity) ORDER BY si.size) FROM listing_size_inventory si WHERE si.listing_id = l.listing_id), '[]'::json) AS size_inventory,

            l.listing_type,

            l.status,

            l.rejection_reason,

            l.created_at,

            l.updated_at,

            c.name AS category_name

          FROM listings l

          LEFT JOIN categories c
            ON c.category_id =
              l.category_id

          WHERE

            l.listing_id =
              $1

            AND l.seller_id =
              $2

          LIMIT 1
          `,
          [
            listingId,
            sellerId
          ]
        );


      if (
        listingResult.rows.length ===
        0
      ) {

        return res.status(
          404
        ).json({
          message:
            'Listing not found.'
        });
      }


      const imageResult =
        await pool.query(
          `
          SELECT

            image_id,

            listing_id,

            image_url,

            is_primary,

            sort_order,

            created_at

          FROM listing_images

          WHERE
            listing_id = $1

          ORDER BY

            is_primary DESC,

            sort_order ASC,

            image_id ASC
          `,
          [
            listingId
          ]
        );


      const images =
        imageResult.rows.map(
          (image) => ({

            ...image,

            image_url:
              normalizeStoredImageUrl(
                req,
                image.image_url
              )
          })
        );


      const listing =
        listingResult.rows[0];


      const formattedListing = {

        ...listing,

        price:
          listing.price ===
          null
            ? null
            : Number(
                listing.price
              ),

        quantity:
          Number(
            listing.quantity ||
            0
          ),

        size:
          normalizeSize(
            listing.size
          ),

        listing_type:
          normalizeListingType(
            listing.listing_type
          ),

        listing_type_label:
          listingTypeForResponse(
            listing.listing_type
          ),

        status:
          statusForResponse(
            listing.status
          ),

        condition:
          conditionForResponse(
            listing.condition
          ),

        images
      };


      return res.json({

        listing:
          formattedListing,

        data:
          formattedListing,

        images
      });

    } catch (error) {

      console.error(
        'GET seller listing error:',
        error
      );

      return res.status(
        500
      ).json({

        message:
          'Failed to load listing.',

        error:
          error.message
      });
    }

} );

/* ============================================================ CREATE
SELLER LISTING
============================================================ */

router.post( '/', upload.array( 'images', 10 ), async (req, res) => {

    const sellerId =
      getSellerId(req);


    if (!sellerId) {

      cleanupUploadedFiles(
        req.files
      );

      return res.status(
        401
      ).json({
        message:
          'Seller authentication is required.'
      });
    }


    const client =
      await pool.connect();


    try {

      const {
        category_id,
        title,
        description,
        price,
        condition,
        quantity,
        location,
        size,
        size_inventory,
        listing_type,
        status
      } = req.body;


      if (
        !title ||
        !String(
          title
        ).trim()
      ) {

        cleanupUploadedFiles(
          req.files
        );

        return res.status(
          400
        ).json({
          message:
            'Listing title is required.'
        });
      }


      const parsedPrice =
        parseNumber(
          price,
          0
        );


      const parsedQuantity =
        parseNumber(
          quantity,
          0
        );


      if (
        parsedPrice < 0
      ) {

        cleanupUploadedFiles(
          req.files
        );

        return res.status(
          400
        ).json({
          message:
            'Price cannot be negative.'
        });
      }


      if (
        parsedQuantity <= 0
      ) {

        cleanupUploadedFiles(
          req.files
        );

        return res.status(
          400
        ).json({
          message:
            'Quantity must be greater than 0.'
        });
      }


      const normalizedCondition =
        normalizeCondition(
          condition
        );


      const normalizedSize =
        normalizeSize(
          size
        );

      const normalizedSizeInventory = parseSizeInventory(size_inventory, normalizedSize, parsedQuantity);
      const inventoryTotal = normalizedSizeInventory.reduce((sum, entry) => sum + entry.quantity, 0);
      const storedQuantity = inventoryTotal > 0 ? inventoryTotal : parsedQuantity;


      const normalizedListingType =
        normalizeListingType(
          listing_type
        );


      const normalizedStatus =
        normalizeStatus(
          status
        );


      const categoryValue =
        category_id ===
          undefined ||
        category_id ===
          null ||
        String(
          category_id
        ).trim() === ''
          ? null
          : Number(
              category_id
            );


      if (
        categoryValue !==
          null &&
        (
          !Number.isInteger(
            categoryValue
          ) ||
          categoryValue <= 0
        )
      ) {

        cleanupUploadedFiles(
          req.files
        );

        return res.status(
          400
        ).json({
          message:
            'Invalid category.'
        });
      }


      await client.query(
        'BEGIN'
      );


      const listingResult =
        await client.query(
          `
          INSERT INTO listings (

            seller_id,

            category_id,

            title,

            description,

            price,

            condition,

            quantity,

            location,

            size,

            listing_type,

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

            $11

          )

          RETURNING *
          `,
          [

            sellerId,

            categoryValue,

            String(
              title
            ).trim(),

            description
              ? String(
                  description
                ).trim()
              : null,

            parsedPrice,

            normalizedCondition,

            parsedQuantity,

            location
              ? String(
                  location
                ).trim()
              : null,

            normalizedSize,

            normalizedListingType,

            normalizedStatus
          ]
        );


      const listing =
        listingResult.rows[0];

      await replaceSizeInventory(client, listing.listing_id, normalizedSizeInventory);
      listing.size_inventory = normalizedSizeInventory;


      const files =
        Array.isArray(
          req.files
        )
          ? req.files
          : [];


      const savedImages =
        [];


      for (
        let index = 0;
        index < files.length;
        index += 1
      ) {

        const file =
          files[index];


        const imageUrl =
          getImageUrl(
            req,
            file.filename
          );


        const imageResult =
          await client.query(
            `
            INSERT INTO listing_images (

              listing_id,

              image_url,

              is_primary,

              sort_order

            )

            VALUES (

              $1,

              $2,

              $3,

              $4

            )

            RETURNING *
            `,
            [

              listing.listing_id,

              imageUrl,

              index === 0,

              index
            ]
          );


        savedImages.push(
          imageResult.rows[0]
        );
      }


      await client.query(
        'COMMIT'
      );


      return res.status(
        201
      ).json({

        message:
          'Listing created successfully.',

        listing: {

          ...listing,

          price:
            listing.price ===
            null
              ? null
              : Number(
                  listing.price
                ),

          quantity:
            Number(
              listing.quantity ||
              0
            ),

          size:
            normalizeSize(
              listing.size
            ),

          listing_type:
            normalizeListingType(
              listing.listing_type
            ),

          listing_type_label:
            listingTypeForResponse(
              listing.listing_type
            ),

          status:
            statusForResponse(
              listing.status
            ),

          condition:
            conditionForResponse(
              listing.condition
            ),

          images:
            savedImages
        }
      });

    } catch (error) {

      try {

        await client.query(
          'ROLLBACK'
        );

      } catch (
        rollbackError
      ) {

        console.error(
          'Rollback error:',
          rollbackError
        );
      }


      cleanupUploadedFiles(
        req.files
      );


      console.error(
        'CREATE seller listing error:',
        error
      );


      return res.status(
        500
      ).json({

        message:
          'Failed to create listing.',

        error:
          error.message
      });

    } finally {

      client.release();
    }

} );

/* ============================================================ UPDATE
SELLER LISTING
============================================================ */

router.put( '/:listingId', upload.array( 'images', 10 ), async (req,
res) => {

    const sellerId =
      getSellerId(req);

    const listingId =
      Number(
        req.params.listingId
      );


    if (!sellerId) {

      cleanupUploadedFiles(
        req.files
      );

      return res.status(
        401
      ).json({
        message:
          'Seller authentication is required.'
      });
    }


    if (
      !Number.isInteger(
        listingId
      ) ||
      listingId <= 0
    ) {

      cleanupUploadedFiles(
        req.files
      );

      return res.status(
        400
      ).json({
        message:
          'Invalid listing ID.'
      });
    }


    const client =
      await pool.connect();


    try {

      const existingResult =
        await client.query(
          `
          SELECT

            listing_id,

            status,

            listing_type

          FROM listings

          WHERE

            listing_id =
              $1

            AND seller_id =
              $2

          LIMIT 1
          `,
          [
            listingId,
            sellerId
          ]
        );


      if (
        existingResult.rows.length ===
        0
      ) {

        cleanupUploadedFiles(
          req.files
        );

        return res.status(
          404
        ).json({
          message:
            'Listing not found.'
        });
      }


      const existing =
        existingResult.rows[0];


      const {
        category_id,
        title,
        description,
        price,
        condition,
        quantity,
        location,
        size,
        size_inventory,
        listing_type,
        status
      } = req.body;


      if (
        !title ||
        !String(
          title
        ).trim()
      ) {

        cleanupUploadedFiles(
          req.files
        );

        return res.status(
          400
        ).json({
          message:
            'Listing title is required.'
        });
      }


      const parsedPrice =
        parseNumber(
          price,
          0
        );


      const parsedQuantity =
        parseNumber(
          quantity,
          0
        );


      if (
        parsedPrice < 0
      ) {

        cleanupUploadedFiles(
          req.files
        );

        return res.status(
          400
        ).json({
          message:
            'Price cannot be negative.'
        });
      }


      if (
        parsedQuantity <= 0
      ) {

        cleanupUploadedFiles(
          req.files
        );

        return res.status(
          400
        ).json({
          message:
            'Quantity must be greater than 0.'
        });
      }


      const normalizedCondition =
        normalizeCondition(
          condition
        );


      const normalizedSize =
        normalizeSize(
          size
        );

      const normalizedSizeInventory = parseSizeInventory(size_inventory, normalizedSize, parsedQuantity);
      const inventoryTotal = normalizedSizeInventory.reduce((sum, entry) => sum + entry.quantity, 0);
      const storedQuantity = inventoryTotal > 0 ? inventoryTotal : parsedQuantity;


      const normalizedListingType =
        listing_type
          ? normalizeListingType(
              listing_type
            )
          : normalizeListingType(
              existing.listing_type
            );


      const normalizedStatus =
        status
          ? normalizeStatus(
              status
            )
          : normalizeStatus(
              existing.status
            );


      const categoryValue =
        category_id ===
          undefined ||
        category_id ===
          null ||
        String(
          category_id
        ).trim() === ''
          ? null
          : Number(
              category_id
            );


      if (
        categoryValue !==
          null &&
        (
          !Number.isInteger(
            categoryValue
          ) ||
          categoryValue <= 0
        )
      ) {

        cleanupUploadedFiles(
          req.files
        );

        return res.status(
          400
        ).json({
          message:
            'Invalid category.'
        });
      }


      await client.query(
        'BEGIN'
      );


      const updatedResult =
        await client.query(
          `
          UPDATE listings

          SET

            category_id =
              $1,

            title =
              $2,

            description =
              $3,

            price =
              $4,

            condition =
              $5,

            quantity =
              $6,

            location =
              $7,

            size =
              $8,

            listing_type =
              $9,

            status =
              $10,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE

            listing_id =
              $11

            AND seller_id =
              $12

          RETURNING *
          `,
          [

            categoryValue,

            String(
              title
            ).trim(),

            description
              ? String(
                  description
                ).trim()
              : null,

            parsedPrice,

            normalizedCondition,

            storedQuantity,

            location
              ? String(
                  location
                ).trim()
              : null,

            normalizedSize,

            normalizedListingType,

            normalizedStatus,

            listingId,

            sellerId
          ]
        );


      const updatedListing =
        updatedResult.rows[0];

      await replaceSizeInventory(client, updatedListing.listing_id, normalizedSizeInventory);
      updatedListing.size_inventory = normalizedSizeInventory;


      const files =
        Array.isArray(
          req.files
        )
          ? req.files
          : [];


      if (
        files.length > 0
      ) {

        const maxOrderResult =
          await client.query(
            `
            SELECT

              COALESCE(
                MAX(
                  sort_order
                ),
                -1
              )::int
              AS max_sort_order

            FROM listing_images

            WHERE
              listing_id =
                $1
            `,
            [
              listingId
            ]
          );


        let nextSortOrder =
          Number(
            maxOrderResult
              .rows[0]
              ?.max_sort_order ??
            -1
          ) + 1;


        const primaryResult =
          await client.query(
            `
            SELECT

              image_id

            FROM listing_images

            WHERE

              listing_id =
                $1

              AND is_primary =
                TRUE

            LIMIT 1
            `,
            [
              listingId
            ]
          );


        let hasPrimary =
          primaryResult.rows.length >
          0;


        for (
          const file of files
        ) {

          const imageUrl =
            getImageUrl(
              req,
              file.filename
            );


          await client.query(
            `
            INSERT INTO listing_images (

              listing_id,

              image_url,

              is_primary,

              sort_order

            )

            VALUES (

              $1,

              $2,

              $3,

              $4

            )
            `,
            [

              listingId,

              imageUrl,

              !hasPrimary,

              nextSortOrder
            ]
          );


          hasPrimary =
            true;

          nextSortOrder +=
            1;
        }
      }


      await client.query(
        'COMMIT'
      );


      return res.json({

        message:
          'Listing updated successfully.',

        listing: {

          ...updatedListing,

          price:
            updatedListing.price ===
            null
              ? null
              : Number(
                  updatedListing.price
                ),

          quantity:
            Number(
              updatedListing.quantity ||
              0
            ),

          size:
            normalizeSize(
              updatedListing.size
            ),

          size_inventory:
            normalizedSizeInventory,

          listing_type:
            normalizeListingType(
              updatedListing.listing_type
            ),

          listing_type_label:
            listingTypeForResponse(
              updatedListing.listing_type
            ),

          status:
            statusForResponse(
              updatedListing.status
            ),

          condition:
            conditionForResponse(
              updatedListing.condition
            )
        },

        image_count:
          files.length
      });

    } catch (error) {

      try {

        await client.query(
          'ROLLBACK'
        );

      } catch (
        rollbackError
      ) {

        console.error(
          'Rollback error:',
          rollbackError
        );
      }


      cleanupUploadedFiles(
        req.files
      );


      console.error(
        'UPDATE seller listing error:',
        error
      );


      return res.status(
        500
      ).json({

        message:
          'Failed to update listing.',

        error:
          error.message
      });

    } finally {

      client.release();
    }

} );

/* ============================================================
DEACTIVATE SELLER LISTING
============================================================ */

router.patch( '/:listingId/deactivate', async (req, res) => {

    try {

      const sellerId =
        getSellerId(req);

      const listingId =
        Number(
          req.params.listingId
        );


      if (!sellerId) {

        return res.status(
          401
        ).json({
          message:
            'Seller authentication is required.'
        });
      }


      if (
        !Number.isInteger(
          listingId
        ) ||
        listingId <= 0
      ) {

        return res.status(
          400
        ).json({
          message:
            'Invalid listing ID.'
        });
      }


      const result =
        await pool.query(
          `
          UPDATE listings

          SET

            status =
              'HIDDEN',

            updated_at =
              CURRENT_TIMESTAMP

          WHERE

            listing_id =
              $1

            AND seller_id =
              $2

          RETURNING
            listing_id
          `,
          [
            listingId,
            sellerId
          ]
        );


      if (
        result.rows.length ===
        0
      ) {

        return res.status(
          404
        ).json({
          message:
            'Listing not found.'
        });
      }


      return res.json({

        message:
          'Listing deactivated successfully.',

        listing_id:
          listingId,

        status:
          'Inactive'
      });

    } catch (error) {

      console.error(
        'DEACTIVATE seller listing error:',
        error
      );

      return res.status(
        500
      ).json({

        message:
          'Failed to deactivate listing.',

        error:
          error.message
      });
    }

} );

/* ============================================================ MULTER
ERROR HANDLER
============================================================ */

router.use( ( error, req, res, next ) => {

    if (
      error instanceof
      multer.MulterError
    ) {

      cleanupUploadedFiles(
        req.files
      );


      if (
        error.code ===
        'LIMIT_FILE_SIZE'
      ) {

        return res.status(
          400
        ).json({
          message:
            'Each image must not exceed 5MB.'
        });
      }


      if (
        error.code ===
        'LIMIT_FILE_COUNT'
      ) {

        return res.status(
          400
        ).json({
          message:
            'You can upload a maximum of 10 images.'
        });
      }


      return res.status(
        400
      ).json({

        message:
          error.message
      });
    }


    if (error) {

      cleanupUploadedFiles(
        req.files
      );

      return res.status(
        400
      ).json({

        message:
          error.message ||
          'Image upload failed.'
      });
    }


    return next();

} );

/* ============================================================ EXPORT
============================================================ */

module.exports = router;
