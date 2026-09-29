const express = require('express');

const pool =
  require('../config/db');

const {
  authMiddleware,
  sellerOnly
} = require('../middleware/authMiddleware');

const router =
  express.Router();


// ============================================================
// SELLER AUTHENTICATION
// ============================================================

router.use(
  authMiddleware,
  sellerOnly
);


// ============================================================
// CONDITION CHECK TABLE
// ============================================================

let tableReady = false;


const ensureTable = async () => {

  if (tableReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reuse_tool_checks (
      check_id SERIAL PRIMARY KEY,

      seller_id INTEGER NOT NULL,

      listing_id INTEGER NULL,

      file_name TEXT NULL,

      title TEXT NULL,

      category TEXT NULL,

      condition TEXT NOT NULL,

      score INTEGER NULL,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    )
  `);

  tableReady = true;
};


// ============================================================
// GET SELLER ID
// ============================================================

const getSellerId = (
  req
) => {

  const id =
    req.user?.user_id ??
    req.user?.userId ??
    req.user?.id;

  const parsed =
    Number(id);

  if (
    Number.isSafeInteger(
      parsed
    ) &&
    parsed > 0
  ) {
    return parsed;
  }

  return null;
};


// ============================================================
// CATEGORY NORMALIZATION
// ============================================================

const normalizeCategory = (
  value
) => {

  if (!value) {
    return 'Other';
  }

  const text =
    String(value).trim();

  if (!text) {
    return 'Other';
  }

  return text;
};


// ============================================================
// CATEGORY INFERENCE
// ============================================================

const inferCategory = (
  title = ''
) => {

  const value =
    String(title).toLowerCase();


  if (
    /phone|iphone|samsung|laptop|macbook|tablet|computer|camera|headphone|electronic/
      .test(value)
  ) {
    return 'Electronics';
  }


  if (
    /chair|table|desk|sofa|cabinet|furniture|bed/
      .test(value)
  ) {
    return 'Furniture';
  }


  if (
    /shoe|shirt|dress|bag|jacket|clothes|clothing|jeans/
      .test(value)
  ) {
    return 'Fashion';
  }


  if (
    /book|novel|textbook/
      .test(value)
  ) {
    return 'Books';
  }


  if (
    /bike|bicycle|helmet|sports|running/
      .test(value)
  ) {
    return 'Sports & Outdoors';
  }


  if (
    /toy|game/
      .test(value)
  ) {
    return 'Toys & Games';
  }


  return 'Other';
};


// ============================================================
// GET LISTING COLUMNS
// ============================================================

const getListingColumns =
  async () => {

    const {
      rows
    } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'listings'
    `);

    return new Set(
      rows.map(
        (row) =>
          row.column_name
      )
    );
  };


// ============================================================
// PICK EXISTING COLUMN
// ============================================================

const pickColumn = (
  columns,
  names
) => {

  return names.find(
    (name) =>
      columns.has(name)
  ) || null;
};


// ============================================================
// GET SELLER LISTINGS
// ============================================================

const getSellerListings =
  async (
    sellerId,
    limit = 100
  ) => {

    const columns =
      await getListingColumns();


    const idCol =
      pickColumn(
        columns,
        [
          'listing_id',
          'id'
        ]
      );


    const sellerCol =
      pickColumn(
        columns,
        [
          'seller_id',
          'user_id',
          'owner_id'
        ]
      );


    const titleCol =
      pickColumn(
        columns,
        [
          'title',
          'name'
        ]
      );


    const priceCol =
      pickColumn(
        columns,
        [
          'price',
          'selling_price'
        ]
      );


    const conditionCol =
      pickColumn(
        columns,
        [
          'condition',
          'item_condition'
        ]
      );


    const categoryCol =
      pickColumn(
        columns,
        [
          'category',
          'category_name',
          'item_category'
        ]
      );


    const createdCol =
      pickColumn(
        columns,
        [
          'created_at',
          'date_created'
        ]
      );


    if (
      !idCol ||
      !sellerCol ||
      !titleCol
    ) {
      return [];
    }


    const selectColumns = [
      `l."${idCol}" AS listing_id`,

      `l."${titleCol}" AS title`,

      priceCol
        ? `l."${priceCol}" AS price`
        : `NULL AS price`,

      conditionCol
        ? `l."${conditionCol}" AS condition`
        : `NULL AS condition`,

      categoryCol
        ? `l."${categoryCol}" AS category`
        : `NULL AS category`,

      createdCol
        ? `l."${createdCol}" AS created_at`
        : `NULL AS created_at`
    ];


    const select =
      selectColumns.join(', ');


    const orderBy =
      createdCol
        ? `l."${createdCol}" DESC`
        : `l."${idCol}" DESC`;


    const {
      rows
    } = await pool.query(
      `
        SELECT ${select}

        FROM listings l

        WHERE l."${sellerCol}" = $1

        ORDER BY ${orderBy}

        LIMIT $2
      `,
      [
        sellerId,
        limit
      ]
    );


    return rows.map(
      (row) => ({
        ...row,

        category:
          normalizeCategory(
            row.category ||
            inferCategory(
              row.title
            )
          )
      })
    );
  };


// ============================================================
// IMPACT CALCULATOR
// ============================================================

const calculateImpactForCategory =
  (
    category,
    quantity
  ) => {

    const q =
      Math.max(
        1,
        Number(quantity) || 1
      );


    const key =
      String(
        category || 'Other'
      ).toLowerCase();


    let factors;


    if (
      key.includes(
        'electronic'
      )
    ) {

      factors = {
        waste: 3.2,
        co2: 7.5,
        trees: 0.12
      };

    } else if (
      key.includes(
        'furniture'
      )
    ) {

      factors = {
        waste: 8.0,
        co2: 12.5,
        trees: 0.20
      };

    } else if (
      key.includes(
        'fashion'
      ) ||
      key.includes(
        'clothing'
      )
    ) {

      factors = {
        waste: 2.0,
        co2: 5.0,
        trees: 0.08
      };

    } else if (
      key.includes(
        'book'
      )
    ) {

      factors = {
        waste: 0.9,
        co2: 1.8,
        trees: 0.03
      };

    } else if (
      key.includes(
        'sport'
      )
    ) {

      factors = {
        waste: 2.8,
        co2: 5.2,
        trees: 0.09
      };

    } else if (
      key.includes(
        'toy'
      )
    ) {

      factors = {
        waste: 1.6,
        co2: 3.2,
        trees: 0.05
      };

    } else {

      factors = {
        waste: 1.8,
        co2: 3.8,
        trees: 0.06
      };
    }


    return {

      wasteDiverted:
        Number(
          (
            factors.waste * q
          ).toFixed(1)
        ),

      co2Saved:
        Number(
          (
            factors.co2 * q
          ).toFixed(1)
        ),

      treesEquivalent:
        Number(
          (
            factors.trees * q
          ).toFixed(1)
        ),

      itemsReused: q
    };
  };


// ============================================================
// GET REUSE TOOLS DATA
// ============================================================

router.get(
  '/',
  async (
    req,
    res
  ) => {

    try {

      const sellerId =
        getSellerId(req);


      if (!sellerId) {

        return res
          .status(401)
          .json({
            success: false,
            message:
              'Seller identity is required.'
          });
      }


      await ensureTable();


      const listings =
        await getSellerListings(
          sellerId
        );


      // ======================================================
      // CATEGORIES
      // ======================================================

      const categoryMap =
        new Map();


      listings.forEach(
        (item) => {

          const name =
            normalizeCategory(
              item.category ||
              inferCategory(
                item.title
              )
            );


          categoryMap.set(
            name.toLowerCase(),
            {
              name,
              value: name
            }
          );
        }
      );


      if (
        !categoryMap.size
      ) {

        [
          'Electronics',
          'Furniture',
          'Fashion',
          'Books',
          'Sports & Outdoors',
          'Other'
        ].forEach(
          (name) => {

            categoryMap.set(
              name.toLowerCase(),
              {
                name,
                value: name
              }
            );
          }
        );
      }


      // ======================================================
      // RECENT CHECKS
      // ======================================================

      const {
        rows: checks
      } = await pool.query(
        `
          SELECT
            check_id,
            listing_id,
            file_name,
            title,
            category,
            condition,
            score,
            created_at

          FROM reuse_tool_checks

          WHERE seller_id = $1

          ORDER BY created_at DESC

          LIMIT 10
        `,
        [
          sellerId
        ]
      );


      let recentChecks;


      if (
        checks.length
      ) {

        recentChecks =
          checks;

      } else {

        recentChecks =
          listings
            .filter(
              (item) =>
                item.condition
            )
            .slice(0, 5)
            .map(
              (item) => ({
                check_id:
                  `listing-${item.listing_id}`,

                listing_id:
                  item.listing_id,

                title:
                  item.title,

                category:
                  item.category,

                condition:
                  item.condition,

                created_at:
                  item.created_at
              })
            );
      }


      // ======================================================
      // CURRENT IMPACT
      // ======================================================

      const listingCount =
        listings.length;


      const impact = {

        wasteDiverted:
          Number(
            (
              listingCount * 2.5
            ).toFixed(1)
          ),

        co2Saved:
          Number(
            (
              listingCount * 5.6
            ).toFixed(1)
          ),

        treesEquivalent:
          Number(
            (
              listingCount * 0.12
            ).toFixed(1)
          ),

        itemsReused:
          listingCount
      };


      return res.json({

        success: true,

        recentChecks,

        categories:
          [
            ...categoryMap.values()
          ],

        listings,

        impact
      });

    } catch (error) {

      console.error(
        'SELLER REUSE TOOLS GET ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Unable to load Reuse Tools data.'
        });
    }
  }
);


// ============================================================
// CALCULATE IMPACT
// ============================================================

router.post(
  '/impact',
  async (
    req,
    res
  ) => {

    try {

      const sellerId =
        getSellerId(req);


      if (!sellerId) {

        return res
          .status(401)
          .json({
            success: false,
            message:
              'Seller identity is required.'
          });
      }


      const {
        listingId = null,
        category = '',
        quantity = 1
      } = req.body || {};


      let selectedCategory =
        normalizeCategory(
          category
        );


      if (listingId) {

        const listings =
          await getSellerListings(
            sellerId
          );


        const listing =
          listings.find(
            (item) =>
              String(
                item.listing_id
              ) ===
              String(
                listingId
              )
          );


        if (!listing) {

          return res
            .status(404)
            .json({
              success: false,
              message:
                'Listing not found.'
            });
        }


        selectedCategory =
          normalizeCategory(
            listing.category ||
            inferCategory(
              listing.title
            )
          );
      }


      const impact =
        calculateImpactForCategory(
          selectedCategory,
          quantity
        );


      return res.json({

        success: true,

        category:
          selectedCategory,

        impact

      });

    } catch (error) {

      console.error(
        'SELLER REUSE TOOLS IMPACT ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Unable to calculate environmental impact.'
        });
    }
  }
);


// ============================================================
// SAVE CONDITION CHECK
// ============================================================

router.post(
  '/condition-check',
  async (
    req,
    res
  ) => {

    try {

      const sellerId =
        getSellerId(req);


      if (!sellerId) {

        return res
          .status(401)
          .json({
            success: false,
            message:
              'Seller identity is required.'
          });
      }


      await ensureTable();


      const {
        listingId = null,
        fileName = null,
        title = null,
        category = 'Other',
        condition,
        score = null
      } = req.body || {};


      if (!condition) {

        return res
          .status(400)
          .json({
            success: false,
            message:
              'Condition result is required.'
          });
      }


      const result =
        await pool.query(
          `
            INSERT INTO reuse_tool_checks (
              seller_id,
              listing_id,
              file_name,
              title,
              category,
              condition,
              score
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

            RETURNING
              check_id,
              seller_id,
              listing_id,
              file_name,
              title,
              category,
              condition,
              score,
              created_at
          `,
          [
            sellerId,
            listingId,
            fileName,
            title ||
              fileName ||
              'Item check',
            normalizeCategory(
              category
            ),
            condition,
            score
          ]
        );


      return res
        .status(201)
        .json({
          success: true,
          check:
            result.rows[0]
        });

    } catch (error) {

      console.error(
        'SELLER REUSE TOOLS CHECK ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Unable to save condition check.'
        });
    }
  }
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;