/*
============================================================
ReUse Connect
Buyer Transactions API
============================================================

Review support:
- Seller review: POST /api/buyer/transactions/:orderId/review
- Item review:   POST /api/buyer/transactions/:orderId/item-review
- Get both:      GET  /api/buyer/transactions/:orderId/review

IMPORTANT:
- This file is isolated to Buyer Transactions.
- It does NOT modify the shared api.js.
- It does NOT modify Login, Admin, Seller, server.js, or database code.
============================================================
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';


/* ============================================================
   TOKEN
============================================================ */

const getToken = () => {
  const possibleKeys = [
    'reuseconnect_token',
    'token',
    'authToken',
    'accessToken',
    'access_token'
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);

    if (value && String(value).trim()) {
      return String(value).trim();
    }
  }

  return '';
};


/* ============================================================
   REQUEST
============================================================ */

const request = async (path, options = {}) => {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',

        ...(token
          ? {
              Authorization: `Bearer ${token}`
            }
          : {}),

        ...(options.headers || {})
      }
    }
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      payload?.message ||
      payload?.error ||
      `Request failed with status ${response.status}.`
    );

    error.status = response.status;
    error.data = payload;

    throw error;
  }

  return payload;
};


/* ============================================================
   QUERY BUILDER
============================================================ */

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        query.set(key, String(value));
      }
    }
  );

  const result = query.toString();

  return result ? `?${result}` : '';
};


/* ============================================================
   GET BUYER TRANSACTIONS
============================================================ */

export const getBuyerTransactions = async ({
  search = '',
  status = 'all',
  page = 1,
  limit = 10
} = {}) => {
  const query = buildQuery({
    search,
    status,
    page,
    limit
  });

  return request(
    `/api/buyer/transactions${query}`
  );
};


/* ============================================================
   GET TRANSACTION SUMMARY
============================================================ */

export const getBuyerTransactionSummary =
  async () => {
    return request(
      '/api/buyer/transactions/summary'
    );
  };


/* ============================================================
   GET ONE TRANSACTION
============================================================ */

export const getBuyerTransaction =
  async (orderId) => {
    return request(
      `/api/buyer/transactions/${orderId}`
    );
  };


/* ============================================================
   GET REVIEWS
============================================================ */

export const getBuyerTransactionReview =
  async (orderId) => {
    return request(
      `/api/buyer/transactions/${orderId}/review`
    );
  };


/* ============================================================
   CREATE / UPDATE SELLER REVIEW
============================================================ */

export const saveBuyerSellerReview = async ({
  orderId,
  rating,
  comment = ''
}) => {
  return request(
    `/api/buyer/transactions/${orderId}/review`,
    {
      method: 'POST',
      body: JSON.stringify({
        rating,
        comment
      })
    }
  );
};


/* ============================================================
   CREATE / UPDATE ITEM REVIEW
============================================================ */

export const saveBuyerItemReview = async ({
  orderId,
  listingId,
  rating,
  comment = ''
}) => {
  return request(
    `/api/buyer/transactions/${orderId}/item-review`,
    {
      method: 'POST',
      body: JSON.stringify({
        listingId,
        rating,
        comment
      })
    }
  );
};


/* ============================================================
   BACKWARD COMPATIBILITY
============================================================ */

export const createBuyerTransactionReview = async ({
  orderId,
  sellerId,
  listingId,
  rating,
  comment = ''
}) => {
  return saveBuyerSellerReview({
    orderId,
    rating,
    comment
  });
};


export const updateBuyerTransactionReview = async ({
  orderId,
  rating,
  comment = ''
}) => {
  return saveBuyerSellerReview({
    orderId,
    rating,
    comment
  });
};


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default {
  getBuyerTransactions,
  getBuyerTransactionSummary,
  getBuyerTransaction,
  getBuyerTransactionReview,

  saveBuyerSellerReview,
  saveBuyerItemReview,

  createBuyerTransactionReview,
  updateBuyerTransactionReview
};
