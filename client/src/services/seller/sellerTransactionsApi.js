/*
============================================================
ReUse Connect
Seller Transactions API Service
============================================================
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ============================================================
   TOKEN
============================================================ */

const getToken = () =>
  localStorage.getItem('token') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('accessToken') ||
  '';

/* ============================================================
   CURRENT USER
============================================================ */

const getCurrentUser = () => {
  const possibleKeys = ['user', 'currentUser', 'authUser'];

  for (const key of possibleKeys) {
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;
      const parsed = JSON.parse(value);
      if (parsed) return parsed;
    } catch {
      // ignore
    }
  }

  return {};
};

/* ============================================================
   SELLER ID
============================================================ */

const getSellerId = () => {
  const user = getCurrentUser();
  return user.user_id ?? user.userId ?? user.id ?? '';
};

/* ============================================================
   REQUEST
============================================================ */

const request = async (endpoint, options = {}) => {

  const token = getToken();
  const sellerId = getSellerId();

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  if (sellerId !== '' && sellerId !== null && sellerId !== undefined) {
    headers['x-user-id'] = String(sellerId);
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
  } catch (error) {
    console.error('[Seller Transactions API] Network error:', error);
    throw new Error(
      'Unable to connect to the server. Please make sure the backend server is running.'
    );
  }

  let result = {};

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try { result = await response.json(); } catch { result = {}; }
  } else {
    try {
      const text = await response.text();
      if (text) result = { message: text };
    } catch { result = {}; }
  }

  if (!response.ok) {
    console.error('[Seller Transactions API] Request failed:', {
      endpoint, status: response.status, result
    });

    if (response.status === 401) {
      throw new Error(result.message ||
        'Seller authentication is required. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error(result.message ||
        'You are not authorized to perform this action.');
    }
    if (response.status === 404) {
      throw new Error(result.message ||
        'The requested seller transaction was not found.');
    }
    if (response.status === 400) {
      throw new Error(result.message || 'Invalid transaction request.');
    }
    if (response.status >= 500) {
      throw new Error(result.message || 'Server error. Please try again.');
    }

    throw new Error(result.message ||
      `Request failed with status ${response.status}`);
  }

  return result;
};

/* ============================================================
   GET SELLER TRANSACTIONS
============================================================ */

export const getSellerTransactions = async ({
  status = 'all',
  search = '',
  page = 1,
  limit = 8
} = {}) => {

  const params = new URLSearchParams();
  params.set('status', String(status || 'all'));
  params.set('search', String(search || ''));
  params.set('page', String(page || 1));
  params.set('limit', String(limit || 8));

  return request(`/api/seller/transactions?${params.toString()}`);
};

/* ============================================================
   GET SELLER TRANSACTION STATS
============================================================ */

export const getSellerTransactionStats = async () =>
  request('/api/seller/transactions/stats');

/* ============================================================
   GET SINGLE ORDER DETAILS
============================================================ */

export const getSellerOrderDetails = async (orderId) => {
  if (orderId === undefined || orderId === null || orderId === '') {
    throw new Error('Order ID is required.');
  }
  return request(
    `/api/seller/transactions/orders/${encodeURIComponent(orderId)}`
  );
};

/* ============================================================
   UPDATE ORDER STATUS
============================================================ */

export const updateSellerOrderStatus = async (orderId, status) => {

  if (orderId === undefined || orderId === null || orderId === '') {
    throw new Error('Order ID is required.');
  }

  const normalizedStatus = String(status || '').trim().toLowerCase();

  const allowedStatuses = [
    'pending', 'processing', 'shipped',
    'completed', 'delivered',
    'cancelled', 'canceled'
  ];

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new Error(`Invalid order status: ${status}`);
  }

  return request(
    `/api/seller/transactions/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: normalizedStatus })
    }
  );
};

/* ============================================================
   GET SELLER EARNINGS
============================================================ */

export const getSellerEarnings = async () =>
  request('/api/seller/transactions/earnings');

/* ============================================================
   GET SELLER REVIEWS (received by seller)
============================================================ */

export const getSellerReviews = async () =>
  request('/api/seller/transactions/reviews');

/* ============================================================
   GET SELLER'S OWN REVIEW FOR AN ORDER (Seller → Buyer)
============================================================ */

export const getSellerOrderReview = async (orderId) => {
  if (!orderId) throw new Error('Order ID is required.');
  return request(
    `/api/seller/transactions/orders/${encodeURIComponent(orderId)}/review`
  );
};

/* ============================================================
   SAVE SELLER'S REVIEW FOR AN ORDER (Seller → Buyer)
   ------------------------------------------------------------
   POST handles both create and update.
============================================================ */

export const saveSellerOrderReview = async (orderId, {
  rating,
  comment
} = {}) => {

  if (!orderId) throw new Error('Order ID is required.');

  const numericRating = Number(rating);

  if (
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    throw new Error('Rating must be between 1 and 5.');
  }

  return request(
    `/api/seller/transactions/orders/${encodeURIComponent(orderId)}/review`,
    {
      method: 'POST',
      body: JSON.stringify({
        rating: numericRating,
        comment: String(comment || '').trim()
      })
    }
  );
};