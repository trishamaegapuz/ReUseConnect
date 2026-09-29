const express = require('express');
const pool = require('../config/db');

const {
  authMiddleware,
  buyerOnly
} = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware, buyerOnly);

/*
============================================================
ReUseConnect
Buyer Dashboard API
============================================================

All dashboard values are read from PostgreSQL.

Paginated sections:
  GET /api/buyer/dashboard?purchasesPage=1&purchasesLimit=10&activityPage=1&activityLimit=5

Recent Purchases:
  orders + order_items + listings/categories when available.

Recent Activity:
  orders + reviews + favorites + cart_items when available.

No hard-coded purchase/activity rows are returned.
No estimated environmental impact is fabricated when the
environmental impact table is unavailable.
============================================================
*/

const tableExists = async (tableName) => {
  const result = await pool.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
    ) AS exists
    `,
    [tableName]
  );

  return result.rows[0]?.exists === true;
};

const getColumns = async (tableName) => {
  const result = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    `,
    [tableName]
  );

  return result.rows.map(row => row.column_name);
};

const pickColumn = (columns, possibleColumns) =>
  possibleColumns.find(column => columns.includes(column)) || null;

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
};

const parsePage = (value) => {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
};

const parseLimit = (value, defaultLimit = 10, maxLimit = 10) => {
  const limit = Number.parseInt(value, 10);

  if (!Number.isFinite(limit) || limit <= 0) {
    return defaultLimit;
  }

  return Math.min(limit, maxLimit);
};

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit))
});

const getBuyerId = (req) => {
  const id = Number(
    req.user?.user_id ??
    req.user?.userId ??
    req.user?.id
  );

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
};


/*
============================================================
USER
============================================================
*/

const getUser = async (userId) => {
  if (!(await tableExists('users'))) {
    return {
      userId,
      firstName: '',
      lastName: '',
      name: '',
      role: 'BUYER'
    };
  }

  const columns = await getColumns('users');

  const idColumn = pickColumn(columns, ['user_id', 'id']);
  const firstNameColumn = pickColumn(columns, [
    'first_name',
    'firstname',
    'firstName'
  ]);
  const lastNameColumn = pickColumn(columns, [
    'last_name',
    'lastname',
    'lastName'
  ]);

  if (!idColumn) {
    return {
      userId,
      firstName: '',
      lastName: '',
      name: '',
      role: 'BUYER'
    };
  }

  const fields = [
    `${idColumn} AS user_id`
  ];

  fields.push(
    firstNameColumn
      ? `${firstNameColumn} AS first_name`
      : `'' AS first_name`
  );

  fields.push(
    lastNameColumn
      ? `${lastNameColumn} AS last_name`
      : `'' AS last_name`
  );

  const result = await pool.query(
    `
    SELECT ${fields.join(', ')}
    FROM users
    WHERE ${idColumn} = $1
    LIMIT 1
    `,
    [userId]
  );

  const row = result.rows[0] || {};

  const firstName = row.first_name || '';
  const lastName = row.last_name || '';

  return {
    userId,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    role: 'BUYER'
  };
};


/*
============================================================
ORDERS HELPERS
============================================================
*/

const getOrdersMeta = async () => {
  if (!(await tableExists('orders'))) {
    return null;
  }

  const columns = await getColumns('orders');

  return {
    columns,
    buyerColumn: pickColumn(columns, [
      'buyer_id',
      'user_id',
      'customer_id'
    ]),
    orderIdColumn: pickColumn(columns, [
      'order_id',
      'transaction_id',
      'purchase_id',
      'id'
    ]),
    orderNumberColumn: pickColumn(columns, [
      'order_number',
      'order_code',
      'reference_number'
    ]),
    statusColumn: pickColumn(columns, [
      'status',
      'order_status',
      'transaction_status'
    ]),
    totalColumn: pickColumn(columns, [
      'total_amount',
      'total',
      'amount',
      'grand_total'
    ]),
    dateColumn: pickColumn(columns, [
      'created_at',
      'order_date',
      'transaction_date',
      'purchase_date',
      'updated_at'
    ])
  };
};

const getOrderStats = async (userId, meta) => {
  const stats = {
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalSpent: 0,
    activeTransactions: 0
  };

  if (!meta?.buyerColumn || !meta?.orderIdColumn) {
    return stats;
  }

  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total_orders,

      COUNT(*) FILTER (
        WHERE UPPER(
          COALESCE(
            ${meta.statusColumn || `'PENDING'`}::text,
            ''
          )
        ) IN (
          'PENDING',
          'PROCESSING',
          'CONFIRMED',
          'TO_SHIP',
          'SHIPPING'
        )
      )::int AS pending_orders,

      COUNT(*) FILTER (
        WHERE UPPER(
          COALESCE(
            ${meta.statusColumn || `'COMPLETED'`}::text,
            ''
          )
        ) IN (
          'COMPLETED',
          'DELIVERED',
          'SUCCESS'
        )
      )::int AS completed_orders,

      COUNT(*) FILTER (
        WHERE UPPER(
          COALESCE(
            ${meta.statusColumn || `''`}::text,
            ''
          )
        ) IN (
          'CANCELLED',
          'CANCELED',
          'REJECTED',
          'DECLINED',
          'FAILED'
        )
      )::int AS cancelled_orders,

      ${
        meta.totalColumn
          ? `COALESCE(SUM(
              CASE
                WHEN UPPER(
                  COALESCE(
                    ${meta.statusColumn || `'PENDING'`}::text,
                    ''
                  )
                ) NOT IN (
                  'CANCELLED',
                  'CANCELED',
                  'REJECTED',
                  'DECLINED',
                  'FAILED'
                )
                THEN COALESCE(${meta.totalColumn}, 0)
                ELSE 0
              END
            ), 0)`
          : '0'
      } AS total_spent

    FROM orders
    WHERE ${meta.buyerColumn} = $1
    `,
    [userId]
  );

  const row = result.rows[0] || {};

  stats.totalOrders = safeNumber(row.total_orders);
  stats.pendingOrders = safeNumber(row.pending_orders);
  stats.completedOrders = safeNumber(row.completed_orders);
  stats.cancelledOrders = safeNumber(row.cancelled_orders);
  stats.totalSpent = safeNumber(row.total_spent);

  stats.activeTransactions =
    Math.max(
      0,
      stats.totalOrders - stats.completedOrders - stats.cancelledOrders
    );

  return stats;
};


/*
============================================================
RECENT PURCHASES
============================================================
*/

const getRecentPurchases = async (
  userId,
  meta,
  page,
  limit
) => {
  const empty = {
    rows: [],
    pagination: buildPagination(page, limit, 0)
  };

  if (!meta?.buyerColumn || !meta?.orderIdColumn) {
    return empty;
  }

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM orders
    WHERE ${meta.buyerColumn} = $1
    `,
    [userId]
  );

  const total = safeNumber(
    countResult.rows[0]?.total
  );

  if (total === 0) {
    return empty;
  }

  const offset = (page - 1) * limit;

  const orderFields = [
    `o.${meta.orderIdColumn} AS order_id`
  ];

  orderFields.push(
    meta.orderNumberColumn
      ? `o.${meta.orderNumberColumn} AS order_number`
      : `NULL AS order_number`
  );

  orderFields.push(
    meta.statusColumn
      ? `o.${meta.statusColumn} AS status`
      : `'PENDING' AS status`
  );

  orderFields.push(
    meta.totalColumn
      ? `o.${meta.totalColumn} AS total_amount`
      : `0 AS total_amount`
  );

  orderFields.push(
    meta.dateColumn
      ? `o.${meta.dateColumn} AS created_at`
      : `NULL AS created_at`
  );

  let itemJoin = '';
  let itemTitle = `'Order'`;
  let itemCategory = `'Reuse Item'`;
  let itemImage = `NULL`;
  let itemCount = `0`;

  if (await tableExists('order_items')) {
    const itemColumns = await getColumns('order_items');

    const itemOrderId = pickColumn(itemColumns, [
      'order_id'
    ]);

    const itemListingId = pickColumn(itemColumns, [
      'listing_id'
    ]);

    const itemQuantity = pickColumn(itemColumns, [
      'quantity'
    ]);

    if (itemOrderId) {
      const itemIdColumn =
        pickColumn(itemColumns, [
          'order_item_id',
          'id'
        ]);

      let listingJoin = '';

      if (
        itemListingId &&
        await tableExists('listings')
      ) {
        const listingColumns =
          await getColumns('listings');

        const listingId =
          pickColumn(listingColumns, [
            'listing_id',
            'id'
          ]);

        const titleColumn =
          pickColumn(listingColumns, [
            'title',
            'name'
          ]);

        const categoryIdColumn =
          pickColumn(listingColumns, [
            'category_id'
          ]);

        if (listingId && titleColumn) {
          let categoryJoin = '';

          if (
            categoryIdColumn &&
            await tableExists('categories')
          ) {
            const categoryColumns =
              await getColumns('categories');

            const categoryId =
              pickColumn(categoryColumns, [
                'category_id',
                'id'
              ]);

            const categoryName =
              pickColumn(categoryColumns, [
                'name',
                'category_name'
              ]);

            if (categoryId && categoryName) {
              categoryJoin = `
                LEFT JOIN categories c
                  ON c.${categoryId} =
                     l.${categoryIdColumn}
              `;

              itemCategory = `COALESCE(
                c.${categoryName},
                'Reuse Item'
              )`;
            }
          }

          listingJoin = `
            LEFT JOIN listings l
              ON l.${listingId} =
                 oi.${itemListingId}

            ${categoryJoin}
          `;

          itemTitle = `COALESCE(
            l.${titleColumn},
            'Order'
          )`;

          if (
            await tableExists('listing_images')
          ) {
            const imageColumns =
              await getColumns('listing_images');

            const imageListingId =
              pickColumn(imageColumns, [
                'listing_id'
              ]);

            const imageUrl =
              pickColumn(imageColumns, [
                'image_url',
                'url'
              ]);

            if (imageListingId && imageUrl) {
              itemImage = `(
                SELECT li.${imageUrl}
                FROM listing_images li
                WHERE li.${imageListingId} =
                      l.${listingId}
                ORDER BY
                  li.is_primary DESC NULLS LAST,
                  li.sort_order ASC NULLS LAST,
                  li.image_id ASC
                LIMIT 1
              )`;
            }
          }
        }
      }

      itemCount = itemQuantity
        ? `COALESCE(
            (
              SELECT SUM(oi2.${itemQuantity})
              FROM order_items oi2
              WHERE oi2.${itemOrderId} =
                    o.${meta.orderIdColumn}
            ),
            0
          )`
        : `(
            SELECT COUNT(*)
            FROM order_items oi2
            WHERE oi2.${itemOrderId} =
                  o.${meta.orderIdColumn}
          )`;

      itemJoin = `
        LEFT JOIN LATERAL (
          SELECT
            oi.*
          FROM order_items oi
          WHERE oi.${itemOrderId} =
                o.${meta.orderIdColumn}
          ORDER BY ${
            itemIdColumn
              ? `oi.${itemIdColumn}`
              : `oi.${itemOrderId}`
          } ASC
          LIMIT 1
        ) oi ON TRUE

        ${listingJoin}
      `;
    }
  }

  const orderBy = meta.dateColumn
    ? `o.${meta.dateColumn} DESC`
    : `o.${meta.orderIdColumn} DESC`;

  const result = await pool.query(
    `
    SELECT
      ${orderFields.join(', ')},
      ${itemTitle} AS item_name,
      ${itemCategory} AS category_name,
      ${itemImage} AS image_url,
      ${itemCount} AS item_count

    FROM orders o

    ${itemJoin}

    WHERE o.${meta.buyerColumn} = $1

    ORDER BY ${orderBy}

    LIMIT $2
    OFFSET $3
    `,
    [userId, limit, offset]
  );

  return {
    rows: result.rows.map(row => ({
      orderId: row.order_id,
      orderNumber:
        row.order_number ||
        `#${row.order_id}`,
      itemName:
        row.item_name ||
        'Reuse Item',
      category:
        row.category_name ||
        'Reuse Item',
      imageUrl:
        row.image_url ||
        null,
      itemCount:
        safeNumber(row.item_count),
      total:
        safeNumber(row.total_amount),
      status:
        row.status ||
        'Pending',
      date:
        formatDate(row.created_at)
    })),
    pagination:
      buildPagination(page, limit, total)
  };
};


/*
============================================================
FAVORITES / CART STATS
============================================================
*/

const countForBuyer = async (
  tableName,
  buyerColumn,
  userId
) => {
  if (!(await tableExists(tableName))) {
    return 0;
  }

  const columns = await getColumns(tableName);
  const actualColumn =
    pickColumn(columns, buyerColumn);

  if (!actualColumn) {
    return 0;
  }

  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM ${tableName}
    WHERE ${actualColumn} = $1
    `,
    [userId]
  );

  return safeNumber(result.rows[0]?.count);
};


/*
============================================================
RECOMMENDED PRODUCTS
============================================================
*/

const getRecommendedProducts = async () => {
  if (!(await tableExists('listings'))) {
    return [];
  }

  const columns = await getColumns('listings');

  const idColumn =
    pickColumn(columns, ['listing_id', 'id']);

  const titleColumn =
    pickColumn(columns, ['title', 'name']);

  const priceColumn =
    pickColumn(columns, ['price', 'selling_price']);

  const categoryIdColumn =
    pickColumn(columns, ['category_id']);

  const statusColumn =
    pickColumn(columns, ['status']);

  const listingTypeColumn =
    pickColumn(columns, ['listing_type']);

  if (!idColumn || !titleColumn) {
    return [];
  }

  let categoryJoin = '';
  let categorySelect = `'Category'`;

  if (
    categoryIdColumn &&
    await tableExists('categories')
  ) {
    const categoryColumns =
      await getColumns('categories');

    const categoryId =
      pickColumn(categoryColumns, [
        'category_id',
        'id'
      ]);

    const categoryName =
      pickColumn(categoryColumns, [
        'name',
        'category_name'
      ]);

    if (categoryId && categoryName) {
      categoryJoin = `
        LEFT JOIN categories c
          ON c.${categoryId} =
             l.${categoryIdColumn}
      `;

      categorySelect =
        `COALESCE(
          c.${categoryName},
          'Category'
        )`;
    }
  }

  let imageSelect = 'NULL';

  if (await tableExists('listing_images')) {
    const imageColumns =
      await getColumns('listing_images');

    const imageListingId =
      pickColumn(imageColumns, [
        'listing_id'
      ]);

    const imageUrl =
      pickColumn(imageColumns, [
        'image_url',
        'url'
      ]);

    if (imageListingId && imageUrl) {
      imageSelect = `(
        SELECT li.${imageUrl}
        FROM listing_images li
        WHERE li.${imageListingId} =
              l.${idColumn}
        ORDER BY
          li.is_primary DESC NULLS LAST,
          li.sort_order ASC NULLS LAST,
          li.image_id ASC
        LIMIT 1
      )`;
    }
  }

  const conditions = [];

  if (statusColumn) {
    conditions.push(`
      UPPER(
        COALESCE(
          l.${statusColumn}::text,
          ''
        )
      ) = 'AVAILABLE'
    `);
  }

  if (listingTypeColumn) {
    conditions.push(`
      UPPER(
        COALESCE(
          l.${listingTypeColumn}::text,
          ''
        )
      ) = 'SALE'
    `);
  }

  const whereClause =
    conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

  const result = await pool.query(
    `
    SELECT
      l.${idColumn} AS listing_id,
      l.${titleColumn} AS title,
      ${
        priceColumn
          ? `l.${priceColumn}`
          : `0`
      } AS price,
      ${categorySelect} AS category,
      ${imageSelect} AS image_url

    FROM listings l

    ${categoryJoin}

    ${whereClause}

    ORDER BY l.created_at DESC NULLS LAST,
             l.${idColumn} DESC

    LIMIT 4
    `
  );

  return result.rows.map(row => ({
    listing_id: row.listing_id,
    title: row.title,
    category: row.category || 'Category',
    price: safeNumber(row.price),
    image_url: row.image_url || null,
    average_rating: 0
  }));
};


/*
============================================================
ENVIRONMENTAL IMPACT
============================================================
*/

const getEnvironmentalImpact = async (userId) => {
  const candidates = [
    'environmental_impacts',
    'environmental_impact',
    'impact_records',
    'reuse_impact'
  ];

  let tableName = null;

  for (const table of candidates) {
    if (await tableExists(table)) {
      tableName = table;
      break;
    }
  }

  if (!tableName) {
    return {
      co2Saved: 0,
      itemsReused: 0,
      treesEquivalent: 0,
      communitiesHelped: 0,
      activities: {
        purchases: 0,
        donations: 0,
        trades: 0,
        other: 0
      }
    };
  }

  const columns = await getColumns(tableName);

  const userColumn = pickColumn(columns, [
    'user_id',
    'buyer_id',
    'customer_id'
  ]);

  if (!userColumn) {
    return {
      co2Saved: 0,
      itemsReused: 0,
      treesEquivalent: 0,
      communitiesHelped: 0,
      activities: {
        purchases: 0,
        donations: 0,
        trades: 0,
        other: 0
      }
    };
  }

  const co2Column = pickColumn(columns, [
    'co2_saved',
    'co2_saved_kg',
    'carbon_saved',
    'carbon_saved_kg'
  ]);

  const itemsColumn = pickColumn(columns, [
    'items_reused',
    'items_count',
    'reuse_count'
  ]);

  const treesColumn = pickColumn(columns, [
    'trees_equivalent',
    'tree_equivalent',
    'trees_saved'
  ]);

  const communitiesColumn = pickColumn(columns, [
    'communities_helped',
    'community_count'
  ]);

  const fields = [
    co2Column
      ? `COALESCE(SUM(${co2Column}), 0) AS co2`
      : `0 AS co2`,
    itemsColumn
      ? `COALESCE(SUM(${itemsColumn}), 0) AS items`
      : `0 AS items`,
    treesColumn
      ? `COALESCE(SUM(${treesColumn}), 0) AS trees`
      : `0 AS trees`,
    communitiesColumn
      ? `COALESCE(SUM(${communitiesColumn}), 0) AS communities`
      : `0 AS communities`
  ];

  const result = await pool.query(
    `
    SELECT ${fields.join(', ')}
    FROM ${tableName}
    WHERE ${userColumn} = $1
    `,
    [userId]
  );

  const row = result.rows[0] || {};

  return {
    co2Saved: safeNumber(row.co2),
    itemsReused: safeNumber(row.items),
    treesEquivalent: safeNumber(row.trees),
    communitiesHelped: safeNumber(row.communities),
    activities: {
      purchases: 0,
      donations: 0,
      trades: 0,
      other: 0
    }
  };
};


/*
============================================================
RECENT ACTIVITY
============================================================
*/

const getRecentActivity = async (
  userId,
  ordersMeta,
  page,
  limit
) => {
  const sources = [];

  /*
  Orders
  */
  if (
    ordersMeta?.buyerColumn &&
    ordersMeta?.orderIdColumn
  ) {
    const title =
      ordersMeta.orderNumberColumn
        ? `COALESCE(o.${ordersMeta.orderNumberColumn}::text, '#' || o.${ordersMeta.orderIdColumn}::text)`
        : `'Order #' || o.${ordersMeta.orderIdColumn}::text`;

    const date =
      ordersMeta.dateColumn
        ? `o.${ordersMeta.dateColumn}`
        : 'NULL';

    const status =
      ordersMeta.statusColumn
        ? `o.${ordersMeta.statusColumn}::text`
        : `'Completed'`;

    sources.push(`
      SELECT
        ${date} AS activity_date,
        'Order Placed' AS activity,
        ${title} AS details,
        ${status} AS status,
        o.${ordersMeta.orderIdColumn}::text AS reference_id
      FROM orders o
      WHERE o.${ordersMeta.buyerColumn} = $1
    `);
  }

  /*
  Reviews
  */
  if (await tableExists('reviews')) {
    const columns = await getColumns('reviews');

    const reviewerColumn =
      pickColumn(columns, [
        'reviewer_id',
        'user_id',
        'buyer_id'
      ]);

    const reviewIdColumn =
      pickColumn(columns, [
        'review_id',
        'id'
      ]);

    const dateColumn =
      pickColumn(columns, [
        'created_at',
        'updated_at'
      ]);

    const reviewTypeColumn =
      pickColumn(columns, [
        'review_type'
      ]);

    if (
      reviewerColumn &&
      reviewIdColumn
    ) {
      sources.push(`
        SELECT
          ${
            dateColumn
              ? `r.${dateColumn}`
              : 'NULL'
          } AS activity_date,
          'Review Submitted' AS activity,
          ${
            reviewTypeColumn
              ? `COALESCE(
                  r.${reviewTypeColumn}::text,
                  'Review'
                )`
              : `'Review'`
          } AS details,
          'Completed' AS status,
          r.${reviewIdColumn}::text AS reference_id
        FROM reviews r
        WHERE r.${reviewerColumn} = $1
      `);
    }
  }

  /*
  Favorites
  */
  if (await tableExists('favorites')) {
    const columns = await getColumns('favorites');

    const buyerColumn =
      pickColumn(columns, [
        'buyer_id',
        'user_id'
      ]);

    const idColumn =
      pickColumn(columns, [
        'favorite_id',
        'id'
      ]);

    const dateColumn =
      pickColumn(columns, [
        'created_at'
      ]);

    if (buyerColumn && idColumn) {
      sources.push(`
        SELECT
          ${
            dateColumn
              ? `f.${dateColumn}`
              : 'NULL'
          } AS activity_date,
          'Added to Wishlist' AS activity,
          'Marketplace item' AS details,
          'Completed' AS status,
          f.${idColumn}::text AS reference_id
        FROM favorites f
        WHERE f.${buyerColumn} = $1
      `);
    }
  }

  /*
  Cart
  */
  if (await tableExists('cart_items')) {
    const columns = await getColumns('cart_items');

    const buyerColumn =
      pickColumn(columns, [
        'buyer_id',
        'user_id'
      ]);

    const idColumn =
      pickColumn(columns, [
        'cart_item_id',
        'id'
      ]);

    const dateColumn =
      pickColumn(columns, [
        'created_at',
        'updated_at'
      ]);

    if (buyerColumn && idColumn) {
      sources.push(`
        SELECT
          ${
            dateColumn
              ? `ci.${dateColumn}`
              : 'NULL'
          } AS activity_date,
          'Added to Cart' AS activity,
          'Marketplace item' AS details,
          'Completed' AS status,
          ci.${idColumn}::text AS reference_id
        FROM cart_items ci
        WHERE ci.${buyerColumn} = $1
      `);
    }
  }

  if (sources.length === 0) {
    return {
      rows: [],
      pagination: buildPagination(page, limit, 0)
    };
  }

  const unionQuery = sources.join('\nUNION ALL\n');

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM (
      ${unionQuery}
    ) activities
    `,
    [userId]
  );

  const total = safeNumber(
    countResult.rows[0]?.total
  );

  if (total === 0) {
    return {
      rows: [],
      pagination: buildPagination(page, limit, 0)
    };
  }

  const offset = (page - 1) * limit;

  const result = await pool.query(
    `
    SELECT
      activity_date,
      activity,
      details,
      status,
      reference_id
    FROM (
      ${unionQuery}
    ) activities
    ORDER BY activity_date DESC NULLS LAST
    LIMIT $2
    OFFSET $3
    `,
    [userId, limit, offset]
  );

  return {
    rows: result.rows.map((row, index) => ({
      activityId:
        `${row.reference_id || 'activity'}-${index}-${page}`,
      date:
        formatDate(row.activity_date),
      activity:
        row.activity || 'Activity',
      details:
        row.details || '—',
      status:
        row.status || 'Completed',
      referenceId:
        row.reference_id || null
    })),
    pagination:
      buildPagination(page, limit, total)
  };
};


/*
============================================================
DASHBOARD ROUTE
============================================================
*/

router.get('/', async (req, res) => {
  try {
    const userId = getBuyerId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated buyer ID is missing.'
      });
    }

    const purchasesPage =
      parsePage(req.query.purchasesPage || req.query.page);

    const activityPage =
      parsePage(req.query.activityPage);

    const purchasesLimit =
      parseLimit(
        req.query.purchasesLimit,
        10,
        10
      );

    const activityLimit =
      parseLimit(
        req.query.activityLimit,
        5,
        5
      );

    const user = await getUser(userId);

    const ordersMeta = await getOrdersMeta();

    const [
      orderStats,
      wishlistItems,
      cartItems,
      recentPurchases,
      recentActivity,
      recommendedProducts,
      environmentalImpact
    ] = await Promise.all([
      getOrderStats(userId, ordersMeta),

      countForBuyer(
        'favorites',
        ['buyer_id', 'user_id', 'customer_id'],
        userId
      ),

      countForBuyer(
        'cart_items',
        ['buyer_id', 'user_id', 'customer_id'],
        userId
      ),

      getRecentPurchases(
        userId,
        ordersMeta,
        purchasesPage,
        purchasesLimit
      ),

      getRecentActivity(
        userId,
        ordersMeta,
        activityPage,
        activityLimit
      ),

      getRecommendedProducts(),

      getEnvironmentalImpact(userId)
    ]);

    const dashboard = {
      user,

      stats: {
        ...orderStats,
        wishlistItems,
        cartItems
      },

      recentPurchases:
        recentPurchases.rows,

      recentPurchasesPagination:
        recentPurchases.pagination,

      recommendedProducts,

      recentActivity:
        recentActivity.rows,

      recentActivityPagination:
        recentActivity.pagination,

      environmentalImpact
    };

    return res.json({
      success: true,
      dashboard
    });

  } catch (error) {
    console.error(
      'BUYER DASHBOARD ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to load buyer dashboard.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined
    });
  }
});

module.exports = router;
