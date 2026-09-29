const express = require('express');

const pool = require('../config/db');

const {
  authMiddleware,
  adminOnly,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.use(
  authMiddleware,
  adminOnly
);


// ============================================================
// STATUS NORMALIZATION
// ============================================================

const normalizeStatus = (status) => {

  const value =
    String(status || '')
      .trim()
      .toUpperCase();

  const statusMap = {

    ACTIVE: 'AVAILABLE',

    AVAILABLE: 'AVAILABLE',

    INACTIVE: 'HIDDEN',

    HIDDEN: 'HIDDEN',

    PENDING: 'PENDING',

    RESERVED: 'RESERVED',

    SOLD: 'SOLD',

    REJECTED: 'REJECTED',

  };

  return statusMap[value] || null;

};


// ============================================================
// OPTIONAL LISTING SIZE COLUMN SUPPORT
// ============================================================
//
// Older databases may not have a size/sizes column.
// We detect the column safely instead of assuming it exists.
// This keeps Marketplace compatible with the existing schema.
//
// Supported column names:
//   sizes
//   size
//   available_sizes
//
// The GET endpoint can still expose size data when such a
// column already exists.
//
// ============================================================

const getListingSizeColumn = async () => {

  const result =
    await pool.query(`
      SELECT
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE
        table_schema = 'public'
        AND table_name = 'listings'
        AND column_name IN (
          'sizes',
          'size',
          'available_sizes'
        )
      ORDER BY
        CASE column_name
          WHEN 'sizes' THEN 1
          WHEN 'size' THEN 2
          WHEN 'available_sizes' THEN 3
          ELSE 4
        END
      LIMIT 1
    `);

  return result.rows[0] || null;

};


const normalizeSizeValueForDatabase = (
  value,
  columnInfo
) => {

  const sizes =
    Array.isArray(value)
      ? value
      : String(value || '')
          .split(',')
          .map((item) =>
            item.trim()
          )
          .filter(Boolean);

  if (!columnInfo) {
    return null;
  }

  if (
    columnInfo.data_type ===
      'ARRAY' ||
    String(
      columnInfo.udt_name || ''
    ).startsWith('_')
  ) {

    return sizes;

  }

  if (
    columnInfo.data_type ===
      'json' ||
    columnInfo.data_type ===
      'jsonb'
  ) {

    return JSON.stringify(
      sizes
    );

  }

  return sizes.join(', ');

};


const getListingSizeExpression = () => {

  return `
    COALESCE(
      to_jsonb(l)->>'sizes',
      to_jsonb(l)->>'size',
      to_jsonb(l)->>'available_sizes',
      ''
    ) AS sizes
  `;

};


// ============================================================
// GET MARKETPLACE STATS
// ============================================================

router.get(
  '/stats',
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT

            COUNT(*)::int
              AS total_listings,

            COUNT(*) FILTER (
              WHERE UPPER(status::text) = 'AVAILABLE'
            )::int
              AS active_listings,

            COUNT(*) FILTER (
              WHERE UPPER(status::text) = 'PENDING'
            )::int
              AS pending_listings

          FROM listings
        `);


      let reportedListings = 0;


      try {

        const reportedResult =
          await pool.query(`
            SELECT
              COUNT(DISTINCT listing_id)::int
                AS reported_listings
            FROM reports
            WHERE listing_id IS NOT NULL
          `);


        reportedListings =
          Number(
            reportedResult.rows[0]
              ?.reported_listings || 0
          );

      } catch (reportError) {

        console.warn(
          'Marketplace report count unavailable:',
          reportError.message
        );

      }


      const row =
        result.rows[0] || {};


      return res.json({

        success: true,

        totalListings:
          Number(
            row.total_listings || 0
          ),

        activeListings:
          Number(
            row.active_listings || 0
          ),

        pendingListings:
          Number(
            row.pending_listings || 0
          ),

        reportedListings:

          Number(
            reportedListings || 0
          ),

      });

    } catch (error) {

      console.error(
        'GET MARKETPLACE STATS ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load marketplace statistics.',

      });

    }

  }
);


// ============================================================
// GET CATEGORIES
// ============================================================

router.get(
  '/categories',
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT
            category_id,
            name AS category_name
          FROM categories
          ORDER BY name ASC
        `);


      return res.json({

        success: true,

        categories:
          result.rows,

      });

    } catch (error) {

      console.error(
        'GET MARKETPLACE CATEGORIES ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load marketplace categories.',

      });

    }

  }
);


// ============================================================
// CREATE CATEGORY
// ============================================================

router.post(
  '/categories',
  async (req, res) => {

    try {

      const name =
        String(
          req.body?.name || ''
        ).trim();


      if (!name) {

        return res.status(400).json({

          success: false,

          message:
            'Category name is required.',

        });

      }


      if (name.length > 100) {

        return res.status(400).json({

          success: false,

          message:
            'Category name must not exceed 100 characters.',

        });

      }


      const existing =
        await pool.query(
          `
          SELECT
            category_id
          FROM categories
          WHERE LOWER(name) = LOWER($1)
          LIMIT 1
          `,
          [name]
        );


      if (
        existing.rows.length > 0
      ) {

        return res.status(409).json({

          success: false,

          message:
            'Category already exists.',

        });

      }


      const result =
        await pool.query(
          `
          INSERT INTO categories (
            name
          )

          VALUES (
            $1
          )

          RETURNING
            category_id,
            name AS category_name
          `,
          [name]
        );


      return res.status(201).json({

        success: true,

        message:
          'Category created successfully.',

        category:
          result.rows[0],

      });

    } catch (error) {

      console.error(
        'CREATE MARKETPLACE CATEGORY ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to create marketplace category.',

      });

    }

  }
);


// ============================================================
// UPDATE CATEGORY
// ============================================================

router.put(
  '/categories/:categoryId',
  async (req, res) => {

    try {

      const categoryId =
        Number(
          req.params.categoryId
        );


      const name =
        String(
          req.body?.name || ''
        ).trim();


      if (
        !Number.isInteger(categoryId) ||
        categoryId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid category ID.',

        });

      }


      if (!name) {

        return res.status(400).json({

          success: false,

          message:
            'Category name is required.',

        });

      }


      const duplicate =
        await pool.query(
          `
          SELECT
            category_id
          FROM categories
          WHERE
            LOWER(name) = LOWER($1)
            AND category_id <> $2
          LIMIT 1
          `,
          [
            name,
            categoryId
          ]
        );


      if (
        duplicate.rows.length > 0
      ) {

        return res.status(409).json({

          success: false,

          message:
            'Category already exists.',

        });

      }


      const result =
        await pool.query(
          `
          UPDATE categories

          SET name = $1

          WHERE category_id = $2

          RETURNING
            category_id,
            name AS category_name
          `,
          [
            name,
            categoryId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Category not found.',

        });

      }


      return res.json({

        success: true,

        message:
          'Category updated successfully.',

        category:
          result.rows[0],

      });

    } catch (error) {

      console.error(
        'UPDATE MARKETPLACE CATEGORY ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to update marketplace category.',

      });

    }

  }
);


// ============================================================
// DELETE CATEGORY
// ============================================================

router.delete(
  '/categories/:categoryId',
  async (req, res) => {

    try {

      const categoryId =
        Number(
          req.params.categoryId
        );


      if (
        !Number.isInteger(categoryId) ||
        categoryId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid category ID.',

        });

      }


      const listingResult =
        await pool.query(
          `
          SELECT
            COUNT(*)::int AS listing_count
          FROM listings
          WHERE category_id = $1
          `,
          [categoryId]
        );


      const listingCount =
        Number(
          listingResult.rows[0]
            ?.listing_count || 0
        );


      if (
        listingCount > 0
      ) {

        return res.status(409).json({

          success: false,

          message:
            'This category cannot be deleted because it is currently used by listings.',

          listingCount,

        });

      }


      const result =
        await pool.query(
          `
          DELETE FROM categories

          WHERE category_id = $1

          RETURNING
            category_id,
            name AS category_name
          `,
          [categoryId]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Category not found.',

        });

      }


      return res.json({

        success: true,

        message:
          'Category deleted successfully.',

        category:
          result.rows[0],

      });

    } catch (error) {

      console.error(
        'DELETE MARKETPLACE CATEGORY ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to delete marketplace category.',

      });

    }

  }
);


// ============================================================
// GET REPORTED LISTINGS
// ============================================================
//
// Uses the existing reports.listing_id relationship.
// Reports are grouped by listing so Admin can moderate the
// affected marketplace listing without exposing report schema
// assumptions that are not present in the current project.
// ============================================================

router.get(
  '/reports',
  async (req, res) => {

    try {

      const limit =
        Math.min(
          100,
          Math.max(
            1,
            Number(
              req.query.limit
            ) || 50
          )
        );


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

            c.name AS category_name,

            CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) AS seller_name,

            u.email AS seller_email,

            COUNT(r.listing_id)::int
              AS report_count,

            img.image_url

          FROM reports r

          INNER JOIN listings l
            ON l.listing_id = r.listing_id

          INNER JOIN categories c
            ON c.category_id = l.category_id

          INNER JOIN users u
            ON u.user_id = l.seller_id

          LEFT JOIN LATERAL (

            SELECT
              li.image_url

            FROM listing_images li

            WHERE li.listing_id = l.listing_id

            ORDER BY
              li.is_primary DESC,
              li.sort_order ASC,
              li.image_id ASC

            LIMIT 1

          ) img ON TRUE

          WHERE r.listing_id IS NOT NULL

          GROUP BY

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

            c.name,

            u.first_name,

            u.last_name,

            u.email,

            img.image_url

          ORDER BY
            report_count DESC,
            l.created_at DESC

          LIMIT $1
          `,
          [limit]
        );


      return res.json({

        success: true,

        reports:
          result.rows,

        reportedListings:
          result.rows,

      });

    } catch (error) {

      console.error(
        'GET REPORTED MARKETPLACE LISTINGS ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load reported marketplace listings.',

      });

    }

  }
);


// ============================================================
// GET LISTINGS
// ============================================================

router.get(
  '/',
  async (req, res) => {

    try {

      const page =
        Math.max(
          1,
          Number(
            req.query.page
          ) || 1
        );


      const limit =
        Math.min(
          50,
          Math.max(
            1,
            Number(
              req.query.limit
            ) || 8
          )
        );


      const offset =
        (page - 1) * limit;


      const search =
        String(
          req.query.search || ''
        ).trim();


      const category =
        String(
          req.query.category || ''
        ).trim();


      let status =
        String(
          req.query.status || ''
        )
        .trim()
        .toUpperCase();


      const condition =
        String(
          req.query.condition || ''
        )
        .trim()
        .toUpperCase();


      if (status) {

        status =
          normalizeStatus(
            status
          ) || status;

      }


      const values = [];

      const conditions = [];


      if (search) {

        values.push(
          `%${search}%`
        );

        const index =
          values.length;


        conditions.push(`
          (
            l.title ILIKE $${index}

            OR l.description ILIKE $${index}

            OR CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) ILIKE $${index}

            OR CAST(
              l.listing_id AS TEXT
            ) ILIKE $${index}
          )
        `);

      }


      if (category) {

        const categoryNumber =
          Number(category);


        if (
          Number.isInteger(
            categoryNumber
          )
        ) {

          values.push(
            categoryNumber
          );

          conditions.push(
            `l.category_id = $${values.length}`
          );

        } else {

          values.push(
            category
          );

          conditions.push(
            `c.name ILIKE $${values.length}`
          );

        }

      }


      if (status) {

        values.push(
          status
        );

        conditions.push(
          `UPPER(l.status::text) = $${values.length}`
        );

      }


      if (condition) {

        values.push(
          condition
        );

        conditions.push(
          `UPPER(l.condition::text) = $${values.length}`
        );

      }


      const whereClause =
        conditions.length > 0
          ? `WHERE ${conditions.join(' AND ')}`
          : '';


      const countResult =
        await pool.query(
          `
          SELECT
            COUNT(*)::int AS total
          FROM listings l

          INNER JOIN categories c
            ON c.category_id = l.category_id

          INNER JOIN users u
            ON u.user_id = l.seller_id

          ${whereClause}
          `,
          values
        );


      const total =
        Number(
          countResult.rows[0]?.total || 0
        );


      const listingValues =
        [
          ...values,
          limit,
          offset
        ];


      const limitIndex =
        listingValues.length - 1;


      const offsetIndex =
        listingValues.length;


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

            l.rejection_reason,

            l.created_at,

            l.updated_at,

            c.name AS category_name,

            CONCAT_WS(
              ' ',
              u.first_name,
              u.last_name
            ) AS seller_name,

            u.email AS seller_email,

            img.image_url,

            ${getListingSizeExpression()}

          FROM listings l

          INNER JOIN categories c
            ON c.category_id = l.category_id

          INNER JOIN users u
            ON u.user_id = l.seller_id

          LEFT JOIN LATERAL (

            SELECT
              li.image_url

            FROM listing_images li

            WHERE li.listing_id = l.listing_id

            ORDER BY
              li.is_primary DESC,
              li.sort_order ASC,
              li.image_id ASC

            LIMIT 1

          ) img ON TRUE

          ${whereClause}

          ORDER BY
            l.created_at DESC

          LIMIT $${limitIndex}

          OFFSET $${offsetIndex}
          `,
          listingValues
        );


      const sizeColumn =
        await getListingSizeColumn();

      return res.json({

        success: true,

        listings:
          result.rows,

        sizeSupported:
          Boolean(sizeColumn),

        total,

        totalPages:
          Math.max(
            1,
            Math.ceil(
              total / limit
            )
          ),

        page,

        limit,

      });

    } catch (error) {

      console.error(
        'GET MARKETPLACE LISTINGS ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load marketplace listings.',

      });

    }

  }
);


// ============================================================
// UPDATE LISTING STATUS
// ============================================================

router.patch(
  '/:listingId/status',
  async (req, res) => {

    try {

      const listingId =
        Number(
          req.params.listingId
        );


      if (
        !Number.isInteger(listingId) ||
        listingId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid listing ID.',

        });

      }


      const dbStatus =
        normalizeStatus(
          req.body?.status
        );


      if (!dbStatus) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid listing status.',

        });

      }


      const result =
        await pool.query(
          `
          UPDATE listings

          SET
            status = $1,
            updated_at = CURRENT_TIMESTAMP

          WHERE listing_id = $2

          RETURNING
            listing_id,
            status,
            updated_at
          `,
          [
            dbStatus,
            listingId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Listing not found.',

        });

      }


      return res.json({

        success: true,

        message:
          'Listing status updated successfully.',

        listing:
          result.rows[0],

      });

    } catch (error) {

      console.error(
        'UPDATE LISTING STATUS ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to update listing status.',

      });

    }

  }
);


// ============================================================
// CREATE LISTING
// ============================================================

router.post(
  '/',
  async (req, res) => {

    try {

      const sellerId =
        Number(
          req.body?.seller_id
        );


      const categoryId =
        Number(
          req.body?.category_id
        );


      const title =
        String(
          req.body?.title || ''
        ).trim();


      const description =
        String(
          req.body?.description || ''
        ).trim();


      const price =
        Number(
          req.body?.price || 0
        );


      const quantity =
        Number(
          req.body?.quantity
        );


      const condition =
        String(
          req.body?.condition || 'GOOD'
        )
        .trim()
        .toUpperCase();


      const status =
        normalizeStatus(
          req.body?.status || 'PENDING'
        );


      const location =
        String(
          req.body?.location || ''
        ).trim();


      if (
        !Number.isInteger(sellerId) ||
        sellerId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Valid seller ID is required.',

        });

      }


      if (
        !Number.isInteger(categoryId) ||
        categoryId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Valid category is required.',

        });

      }


      if (!title) {

        return res.status(400).json({

          success: false,

          message:
            'Listing title is required.',

        });

      }


      if (
        !Number.isFinite(price) ||
        price < 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Price must be zero or greater.',

        });

      }


      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Quantity must be greater than zero.',

        });

      }


      const validConditions = [
        'NEW',
        'LIKE_NEW',
        'GOOD',
        'FAIR',
        'POOR'
      ];


      if (
        !validConditions.includes(
          condition
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid listing condition.',

        });

      }


      if (!status) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid listing status.',

        });

      }


      const sizeColumn =
        await getListingSizeColumn();

      const sizeValue =
        String(
          req.body?.sizes ??
          req.body?.size ??
          ''
        ).trim();

      let result;

      if (sizeColumn && sizeValue) {

        const dbSizeValue =
          normalizeSizeValueForDatabase(
            sizeValue,
            sizeColumn
          );

        result =
          await pool.query(
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
              status,
              ${sizeColumn.column_name}

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
              $10

            )

            RETURNING
              *,
              COALESCE(
                to_jsonb(listings)->>'sizes',
                to_jsonb(listings)->>'size',
                to_jsonb(listings)->>'available_sizes',
                ''
              ) AS sizes
            `,
            [
              sellerId,
              categoryId,
              title,
              description,
              price,
              condition,
              quantity,
              location || null,
              status,
              dbSizeValue
            ]
          );

      } else {

        result =
          await pool.query(
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
              $9

            )

            RETURNING
              *,
              COALESCE(
                to_jsonb(listings)->>'sizes',
                to_jsonb(listings)->>'size',
                to_jsonb(listings)->>'available_sizes',
                ''
              ) AS sizes
            `,
            [
              sellerId,
              categoryId,
              title,
              description,
              price,
              condition,
              quantity,
              location || null,
              status
            ]
          );

      }


      return res.status(201).json({

        success: true,

        message:
          'Listing created successfully.',

        listing:
          result.rows[0],

      });

    } catch (error) {

      console.error(
        'CREATE MARKETPLACE LISTING ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to create marketplace listing.',

      });

    }

  }
);


// ============================================================
// UPDATE LISTING
// ============================================================

router.patch(
  '/:listingId',
  async (req, res) => {

    try {

      const listingId =
        Number(
          req.params.listingId
        );


      if (
        !Number.isInteger(listingId) ||
        listingId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid listing ID.',

        });

      }


      const fields = [];

      const values = [];


      const addField =
        (column, value) => {

          values.push(value);

          fields.push(
            `${column} = $${values.length}`
          );

        };


      if (
        req.body?.seller_id !== undefined
      ) {

        const sellerId =
          Number(
            req.body.seller_id
          );


        if (
          !Number.isInteger(sellerId) ||
          sellerId <= 0
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Invalid seller ID.',

          });

        }


        addField(
          'seller_id',
          sellerId
        );

      }


      if (
        req.body?.category_id !== undefined
      ) {

        const categoryId =
          Number(
            req.body.category_id
          );


        if (
          !Number.isInteger(categoryId) ||
          categoryId <= 0
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Invalid category ID.',

          });

        }


        addField(
          'category_id',
          categoryId
        );

      }


      if (
        req.body?.title !== undefined
      ) {

        const title =
          String(
            req.body.title || ''
          ).trim();


        if (!title) {

          return res.status(400).json({

            success: false,

            message:
              'Listing title is required.',

          });

        }


        addField(
          'title',
          title
        );

      }


      if (
        req.body?.description !== undefined
      ) {

        addField(
          'description',
          String(
            req.body.description || ''
          ).trim()
        );

      }


      if (
        req.body?.price !== undefined
      ) {

        const price =
          Number(
            req.body.price
          );


        if (
          !Number.isFinite(price) ||
          price < 0
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Invalid price.',

          });

        }


        addField(
          'price',
          price
        );

      }


      if (
        req.body?.quantity !== undefined
      ) {

        const quantity =
          Number(
            req.body.quantity
          );


        if (
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Quantity must be greater than zero.',

          });

        }


        addField(
          'quantity',
          quantity
        );

      }


      if (
        req.body?.condition !== undefined
      ) {

        const condition =
          String(
            req.body.condition || ''
          )
          .trim()
          .toUpperCase();


        const validConditions = [
          'NEW',
          'LIKE_NEW',
          'GOOD',
          'FAIR',
          'POOR'
        ];


        if (
          !validConditions.includes(
            condition
          )
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Invalid listing condition.',

          });

        }


        addField(
          'condition',
          condition
        );

      }


      if (
        req.body?.location !== undefined
      ) {

        addField(
          'location',
          String(
            req.body.location || ''
          ).trim() || null
        );

      }


      if (
        req.body?.status !== undefined
      ) {

        const status =
          normalizeStatus(
            req.body.status
          );


        if (!status) {

          return res.status(400).json({

            success: false,

            message:
              'Invalid listing status.',

          });

        }


        addField(
          'status',
          status
        );

      }


      const sizeColumn =
        await getListingSizeColumn();


      if (
        req.body?.sizes !== undefined ||
        req.body?.size !== undefined
      ) {

        if (sizeColumn) {

          const dbSizeValue =
            normalizeSizeValueForDatabase(
              req.body?.sizes ??
              req.body?.size ??
              '',
              sizeColumn
            );

          addField(
            sizeColumn.column_name,
            dbSizeValue
          );

        } else {

          console.warn(
            'Marketplace size update skipped: listings table has no supported size column.'
          );

        }

      }


      if (
        fields.length === 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'No listing changes were provided.',

        });

      }


      values.push(
        listingId
      );


      const result =
        await pool.query(
          `
          UPDATE listings

          SET

            ${fields.join(', ')},

            updated_at =
              CURRENT_TIMESTAMP

          WHERE listing_id =
            $${values.length}

          RETURNING
            *,
            COALESCE(
              to_jsonb(listings)->>'sizes',
              to_jsonb(listings)->>'size',
              to_jsonb(listings)->>'available_sizes',
              ''
            ) AS sizes

          `,
          values
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Listing not found.',

        });

      }


      return res.json({

        success: true,

        message:
          'Listing updated successfully.',

        listing:
          result.rows[0],

      });

    } catch (error) {

      console.error(
        'UPDATE MARKETPLACE LISTING ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to update marketplace listing.',

      });

    }

  }
);


// ============================================================
// DELETE LISTING
// ============================================================

router.delete(
  '/:listingId',
  async (req, res) => {

    try {

      const listingId =
        Number(
          req.params.listingId
        );


      if (
        !Number.isInteger(listingId) ||
        listingId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid listing ID.',

        });

      }


      const result =
        await pool.query(
          `
          DELETE FROM listings

          WHERE listing_id = $1

          RETURNING
            listing_id,
            title
          `,
          [listingId]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Listing not found.',

        });

      }


      return res.json({

        success: true,

        message:
          'Listing deleted successfully.',

        listing:
          result.rows[0],

      });

    } catch (error) {

      console.error(
        'DELETE MARKETPLACE LISTING ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to delete marketplace listing.',

      });

    }

  }
);


module.exports = router;