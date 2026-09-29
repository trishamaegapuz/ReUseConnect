// ============================================================
// REUSE CONNECT
// BUYER API SERVICE
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';


// ============================================================
// GET TOKEN
// ============================================================

const getToken = () => {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken') ||
    ''
  );
};


// ============================================================
// NORMALIZE API ENDPOINT
// ============================================================

const normalizeEndpoint = (endpoint) => {

  if (!endpoint) {
    return '/api';
  }

  if (endpoint.startsWith('/api/')) {
    return endpoint;
  }

  if (endpoint === '/api') {
    return endpoint;
  }

  if (endpoint.startsWith('/')) {
    return `/api${endpoint}`;
  }

  return `/api/${endpoint}`;
};


// ============================================================
// GENERIC REQUEST
// ============================================================

const request = async (
  endpoint,
  options = {}
) => {

  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const normalizedEndpoint =
    normalizeEndpoint(endpoint);

  const response = await fetch(
    `${API_BASE_URL}${normalizedEndpoint}`,
    {
      ...options,
      headers
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {

    const error = new Error(
      data?.message ||
      `Request failed with status ${response.status}`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
};


// ============================================================
// BUYER DASHBOARD
// ============================================================

export const getBuyerDashboard = async (
  params = {}
) => {

  const searchParams =
    new URLSearchParams();

  const purchasesPage =
    Number(params.purchasesPage);

  const activityPage =
    Number(params.activityPage);

  const limit =
    Number(params.limit);

  if (
    Number.isInteger(purchasesPage) &&
    purchasesPage > 0
  ) {
    searchParams.set(
      'purchasesPage',
      purchasesPage
    );
  }

  if (
    Number.isInteger(activityPage) &&
    activityPage > 0
  ) {
    searchParams.set(
      'activityPage',
      activityPage
    );
  }

  if (
    Number.isInteger(limit) &&
    limit > 0
  ) {
    searchParams.set(
      'limit',
      Math.min(limit, 10)
    );
  }

  const query =
    searchParams.toString();

  return request(
    `/buyer/dashboard${
      query
        ? `?${query}`
        : ''
    }`,
    {
      method: 'GET'
    }
  );

};


// ============================================================
// BUYER PUBLISHED CONTENT
// ============================================================

export const getBuyerPublishedContent =
  async (params = {}) => {

    const searchParams =
      new URLSearchParams();

    if (params.type) {

      searchParams.set(
        'type',
        String(params.type).toUpperCase()
      );

    }

    const limit =
      Number(params.limit);

    if (
      Number.isInteger(limit) &&
      limit > 0
    ) {

      searchParams.set(
        'limit',
        Math.min(limit, 20)
      );

    }

    const query =
      searchParams.toString();

    return request(
      `/buyer/content${
        query
          ? `?${query}`
          : ''
      }`,
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// BUYER PROFILE

// ============================================================

export const getBuyerProfile = async () => {

  return request(
    '/buyer/profile',
    {
      method: 'GET'
    }
  );

};


// ============================================================
// BUYER ORDERS
// ============================================================

export const getBuyerOrders = async (
  params = {}
) => {

  const searchParams =
    new URLSearchParams();

  if (params.page) {

    searchParams.set(
      'page',
      params.page
    );

  }

  if (params.limit) {

    searchParams.set(
      'limit',
      params.limit
    );

  }

  if (
    params.status &&
    params.status !== 'ALL'
  ) {

    searchParams.set(
      'status',
      params.status
    );

  }

  const query =
    searchParams.toString();

  return request(
    `/buyer/orders${
      query
        ? `?${query}`
        : ''
    }`,
    {
      method: 'GET'
    }
  );

};


// ============================================================
// BUYER RECENT ORDERS
// ============================================================

export const getBuyerRecentOrders =
  async () => {

    return request(
      '/buyer/orders/recent',
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// BUYER FAVORITES
// ============================================================

export const getBuyerFavorites =
  async () => {

    return request(
      '/buyer/favorites',
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// BUYER CART
// ============================================================

export const getBuyerCart =
  async () => {

    return request(
      '/buyer/cart',
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// MARKETPLACE PRODUCTS
// ============================================================

export const getBuyerProducts = async (
  params = {}
) => {

  const searchParams =
    new URLSearchParams();

  if (params.search) {

    searchParams.set(
      'search',
      params.search
    );

  }

  if (params.category) {

    searchParams.set(
      'category',
      params.category
    );

  }

  if (params.page) {

    searchParams.set(
      'page',
      params.page
    );

  }

  if (params.limit) {

    searchParams.set(
      'limit',
      params.limit
    );

  }

  const query =
    searchParams.toString();

  return request(
    `/marketplace${
      query
        ? `?${query}`
        : ''
    }`,
    {
      method: 'GET'
    }
  );

};


// ============================================================
// SINGLE PRODUCT
// ============================================================

export const getBuyerProduct =
  async (productId) => {

    return request(
      `/marketplace/${productId}`,
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// ADD TO FAVORITES
// ============================================================

export const addBuyerFavorite =
  async (productId) => {

    return request(
      '/buyer/favorites',
      {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId
        })
      }
    );

  };


// ============================================================
// REMOVE FROM FAVORITES
// ============================================================

export const removeBuyerFavorite =
  async (productId) => {

    return request(
      `/buyer/favorites/${productId}`,
      {
        method: 'DELETE'
      }
    );

  };


// ============================================================
// ADD TO CART
// ============================================================

export const addBuyerCartItem =
  async (
    productId,
    quantity = 1
  ) => {

    return request(
      '/buyer/cart',
      {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          quantity
        })
      }
    );

  };


// ============================================================
// UPDATE CART
// ============================================================

export const updateBuyerCartItem =
  async (
    cartItemId,
    quantity
  ) => {

    return request(
      `/buyer/cart/${cartItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          quantity
        })
      }
    );

  };


// ============================================================
// REMOVE CART ITEM
// ============================================================

export const removeBuyerCartItem =
  async (cartItemId) => {

    return request(
      `/buyer/cart/${cartItemId}`,
      {
        method: 'DELETE'
      }
    );

  };


// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {

  getBuyerDashboard,

  getBuyerPublishedContent,

  getBuyerProfile,

  getBuyerOrders,

  getBuyerRecentOrders,

  getBuyerFavorites,

  getBuyerCart,

  getBuyerProducts,

  getBuyerProduct,

  addBuyerFavorite,

  removeBuyerFavorite,

  addBuyerCartItem,

  updateBuyerCartItem,

  removeBuyerCartItem

};