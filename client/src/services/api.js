// ============================================================
// ReUse Connect - API Service
// ============================================================
//
// IMPORTANT API SETUP
//
// .env:
// VITE_API_URL=http://localhost:5000
//
// This service automatically adds /api exactly once.
//
// Examples:
//
// /auth/login
//      -> http://localhost:5000/api/auth/login
//
// /admin/dashboard
//      -> http://localhost:5000/api/admin/dashboard
//
// /seller/dashboard
//      -> http://localhost:5000/api/seller/dashboard
//
// /api/seller/dashboard
//      -> http://localhost:5000/api/seller/dashboard
//
// ============================================================


// ============================================================
// API BASE URL
// ============================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';


// ============================================================
// NORMALIZE API ENDPOINT
// ============================================================
//
// Makes sure /api appears exactly once.
//
// If endpoint is:
// /auth/login
//
// result:
// /api/auth/login
//
// If endpoint is already:
// /api/auth/login
//
// result remains:
// /api/auth/login
//
// ============================================================

const normalizeEndpoint = (endpoint = '') => {

  let path = String(endpoint).trim();

  if (!path) {
    return '/api';
  }

  // Make sure endpoint starts with /
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  // Remove repeated /api prefixes
  while (path.startsWith('/api/api/')) {
    path = path.substring(4);
  }

  // Add /api if it is not already present
  if (
    path !== '/api' &&
    !path.startsWith('/api/')
  ) {
    path = `/api${path}`;
  }

  return path;
};


// ============================================================
// BASIC REQUEST
// ============================================================

const request = async (
  endpoint,
  options = {}
) => {

  const apiEndpoint =
    normalizeEndpoint(endpoint);

  const url =
    `${API_URL}${apiEndpoint}`;


  // ----------------------------------------------------------
  // HEADERS
  // ----------------------------------------------------------

  const headers = {
    ...(options.headers || {})
  };


  // Only set JSON content type when body is NOT FormData
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers['Content-Type']
  ) {

    headers['Content-Type'] =
      'application/json';

  }


  // Accept JSON response
  if (!headers['Accept']) {

    headers['Accept'] =
      'application/json';

  }


  // ----------------------------------------------------------
  // FETCH
  // ----------------------------------------------------------

  const response =
    await fetch(
      url,
      {
        ...options,
        headers
      }
    );


  // ----------------------------------------------------------
  // RESPONSE DATA
  // ----------------------------------------------------------

  const contentType =
    response.headers.get(
      'content-type'
    ) || '';


  let data;


  if (
    contentType.includes(
      'application/json'
    )
  ) {

    data =
      await response
        .json()
        .catch(() => ({}));

  } else {

    data =
      await response
        .text()
        .catch(() => '');

  }


  // ----------------------------------------------------------
  // ERROR HANDLING
  // ----------------------------------------------------------

  if (!response.ok) {

    const errorMessage =
      data?.message ||
      data?.error ||
      (
        typeof data === 'string'
          ? data
          : ''
      ) ||
      `Request failed with status ${response.status}.`;


    const error =
      new Error(errorMessage);


    error.status =
      response.status;

    error.data =
      data;

    error.url =
      url;


    console.error(
      'API REQUEST ERROR:',
      {
        url,
        status: response.status,
        data
      }
    );


    throw error;

  }


  return data;

};


// ============================================================
// AUTHENTICATION
// ============================================================

export const registerUser = async (
  payload
) => {

  return request(
    '/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );

};


export const loginUser = async (
  payload
) => {

  const response = await request(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );

  /*
   * Automatically save authentication data
   * when login succeeds.
   *
   * This keeps Admin, Seller and Buyer
   * modules synchronized.
   */

  saveAuth(response);

  return response;

};


// ============================================================
// AUTH TOKEN HELPERS
// ============================================================

const getStoredToken = () => {

  const possibleKeys = [

    'reuseconnect_token',

    'token',

    'authToken',

    'accessToken',

    'access_token'

  ];


  for (
    const key of possibleKeys
  ) {

    const value =
      localStorage.getItem(key);


    if (
      value &&
      String(value).trim()
    ) {

      return String(value).trim();

    }

  }


  return '';

};


// ============================================================
// AUTH USER HELPER
// ============================================================

const getStoredUser = () => {

  const possibleKeys = [

    'reuseconnect_user',

    'user',

    'currentUser',

    'authUser'

  ];


  for (
    const key of possibleKeys
  ) {

    const raw =
      localStorage.getItem(key);


    if (!raw) {
      continue;
    }


    try {

      const user =
        JSON.parse(raw);


      if (user) {

        return user;

      }

    } catch (error) {

      console.warn(
        `Invalid user data in localStorage key "${key}".`
      );

    }

  }


  return null;

};


// ============================================================
// EXTRACT TOKEN FROM LOGIN RESPONSE
// ============================================================

const extractToken = (
  data
) => {

  if (!data) {
    return '';
  }


  /*
   * Direct token formats
   */

  const directToken =
    data?.token ||
    data?.accessToken ||
    data?.access_token;


  if (
    directToken &&
    String(directToken).trim()
  ) {

    return String(
      directToken
    ).trim();

  }


  /*
   * Nested response formats
   *
   * Example:
   *
   * {
   *   data: {
   *     token: "..."
   *   }
   * }
   */

  const nestedToken =
    data?.data?.token ||
    data?.data?.accessToken ||
    data?.data?.access_token;


  if (
    nestedToken &&
    String(nestedToken).trim()
  ) {

    return String(
      nestedToken
    ).trim();

  }


  /*
   * Auth object formats
   */

  const authToken =
    data?.auth?.token ||
    data?.auth?.accessToken ||
    data?.auth?.access_token;


  if (
    authToken &&
    String(authToken).trim()
  ) {

    return String(
      authToken
    ).trim();

  }


  return '';

};


// ============================================================
// EXTRACT USER FROM LOGIN RESPONSE
// ============================================================

const extractUser = (
  data
) => {

  if (!data) {
    return null;
  }


  /*
   * Most common format
   */

  if (data?.user) {

    return data.user;

  }


  /*
   * Nested data.user
   */

  if (data?.data?.user) {

    return data.data.user;

  }


  /*
   * Nested auth.user
   */

  if (data?.auth?.user) {

    return data.auth.user;

  }


  return null;

};


// ============================================================
// SAVE AUTHENTICATION
// ============================================================

export const saveAuth = (
  data
) => {

  if (!data) {

    console.warn(
      'saveAuth: No authentication data received.'
    );

    return;

  }


  // ----------------------------------------------------------
  // TOKEN
  // ----------------------------------------------------------

  const token =
    extractToken(data);


  if (token) {

    /*
     * Main ReUseConnect token
     */

    localStorage.setItem(
      'reuseconnect_token',
      token
    );


    /*
     * Existing modules
     */

    localStorage.setItem(
      'token',
      token
    );


    /*
     * Backward-compatible token names
     */

    localStorage.setItem(
      'authToken',
      token
    );


    localStorage.setItem(
      'accessToken',
      token
    );


    localStorage.setItem(
      'access_token',
      token
    );

  }


  // ----------------------------------------------------------
  // USER
  // ----------------------------------------------------------

  const user =
    extractUser(data);


  if (user) {

    const serializedUser =
      JSON.stringify(user);


    /*
     * Main ReUseConnect user
     */

    localStorage.setItem(
      'reuseconnect_user',
      serializedUser
    );


    /*
     * Existing modules
     */

    localStorage.setItem(
      'user',
      serializedUser
    );


    /*
     * Backward-compatible user keys
     */

    localStorage.setItem(
      'currentUser',
      serializedUser
    );


    localStorage.setItem(
      'authUser',
      serializedUser
    );


    /*
     * Save user ID separately too.
     *
     * This is useful for older seller services
     * that still read user_id / userId.
     */

    const userId =
      user?.user_id ??
      user?.userId ??
      user?.id;


    if (
      userId !== undefined &&
      userId !== null &&
      userId !== ''
    ) {

      localStorage.setItem(
        'user_id',
        String(userId)
      );


      localStorage.setItem(
        'userId',
        String(userId)
      );

    }

  }


  /*
   * Helpful debug information.
   *
   * Does NOT print the actual token.
   */

  console.log(
    'ReUseConnect authentication saved:',
    {
      hasToken: Boolean(token),
      hasUser: Boolean(user)
    }
  );

};


// ============================================================
// GET AUTHENTICATION
// ============================================================

export const getAuth = () => {

  const token =
    getStoredToken();


  const user =
    getStoredUser();


  return {

    token,

    user

  };

};


// ============================================================
// CHECK AUTHENTICATION
// ============================================================

export const isAuthenticated = () => {

  return Boolean(
    getStoredToken()
  );

};


// ============================================================
// GET CURRENT USER
// ============================================================

export const getCurrentUser = () => {

  return getStoredUser();

};


// ============================================================
// LOGOUT
// ============================================================

export const logout = () => {

  /*
   * Remove every supported authentication key.
   */

  const keys = [

    'reuseconnect_token',

    'reuseconnect_user',

    'token',

    'authToken',

    'accessToken',

    'access_token',

    'user',

    'currentUser',

    'authUser',

    'user_id',

    'userId'

  ];


  keys.forEach(
    (key) => {

      localStorage.removeItem(
        key
      );

    }
  );


  console.log(
    'ReUseConnect authentication cleared.'
  );

};


// ============================================================
// AUTHENTICATED REQUEST
// ============================================================

export const authenticatedRequest =
  async (
    endpoint,
    options = {}
  ) => {

    const {
      token
    } = getAuth();


    /*
     * Do not silently send a request without
     * authentication.
     */

    if (!token) {

      const error =
        new Error(
          'Authorization token is required.'
        );


      error.status =
        401;


      error.data = {
        success: false,
        message:
          'Authorization token is required.'
      };


      error.url =
        normalizeEndpoint(
          endpoint
        );


      console.error(
        'AUTHENTICATION ERROR: No token found.',
        {
          endpoint
        }
      );


      throw error;

    }


    const headers = {
      ...(options.headers || {})
    };


    /*
     * Always send Bearer token.
     */

    headers.Authorization =
      `Bearer ${token}`;


    return request(
      endpoint,
      {
        ...options,
        headers
      }
    );

  };

// ============================================================
// ADMIN DASHBOARD
// ============================================================

export const getAdminDashboard =
  async () => {

    return authenticatedRequest(
      '/admin/dashboard',
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// ADMIN APPROVAL
// ============================================================

export const getPendingUsers =
  async () => {

    return authenticatedRequest(
      '/admin/users/pending',
      {
        method: 'GET'
      }
    );

  };


export const approveUser =
  async (
    userId
  ) => {

    return authenticatedRequest(
      `/admin/users/${userId}/approve`,
      {
        method: 'PATCH'
      }
    );

  };


export const rejectUser =
  async (
    userId
  ) => {

    return authenticatedRequest(
      `/admin/users/${userId}/reject`,
      {
        method: 'PATCH'
      }
    );

  };


// ============================================================
// USERS & ACCOUNTS
// ============================================================

export const getAdminUsers =
  async (
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


    if (params.search) {

      searchParams.set(
        'search',
        params.search
      );

    }


    if (params.role) {

      searchParams.set(
        'role',
        params.role
      );

    }


    if (params.status) {

      searchParams.set(
        'status',
        params.status
      );

    }


    const query =
      searchParams.toString();


    return authenticatedRequest(
      `/admin/users${
        query
          ? `?${query}`
          : ''
      }`,
      {
        method: 'GET'
      }
    );

  };


export const getAdminUserStats =
  async () => {

    return authenticatedRequest(
      '/admin/users/stats',
      {
        method: 'GET'
      }
    );

  };


export const getRecentAdminUsers =
  async () => {

    return authenticatedRequest(
      '/admin/users/recent',
      {
        method: 'GET'
      }
    );

  };


export const getAdminUser =
  async (
    userId
  ) => {

    return authenticatedRequest(
      `/admin/users/${userId}`,
      {
        method: 'GET'
      }
    );

  };


export const createAdminUser =
  async (
    payload
  ) => {

    return authenticatedRequest(
      '/admin/users',
      {
        method: 'POST',

        body:
          JSON.stringify(
            payload
          )
      }
    );

  };


export const updateAdminUserStatus =
  async (
    userId,
    status
  ) => {

    return authenticatedRequest(
      `/admin/users/${userId}/status`,
      {
        method: 'PATCH',

        body:
          JSON.stringify({
            status
          })
      }
    );

  };


// ============================================================
// EXPORT USERS
// ============================================================

export const downloadAdminUsersCsv =
  async () => {

    const {
      token
    } = getAuth();


    const endpoint =
      normalizeEndpoint(
        '/admin/users/export'
      );


    const response =
      await fetch(
        `${API_URL}${endpoint}`,
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );


    if (!response.ok) {

      const data =
        await response
          .json()
          .catch(() => ({}));


      throw new Error(
        data.message ||
        'Unable to export users.'
      );

    }


    const blob =
      await response.blob();


    const url =
      window.URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        'a'
      );


    link.href =
      url;


    link.download =
      'reuse-connect-users.csv';


    document.body.appendChild(
      link
    );


    link.click();


    link.remove();


    window.URL.revokeObjectURL(
      url
    );

  };


// ============================================================
// ADMIN MARKETPLACE MANAGEMENT
// ============================================================

export const getMarketplaceSummary =
  async () => {

    return authenticatedRequest(
      '/admin/marketplace/summary',
      {
        method: 'GET'
      }
    );

  };


export const getMarketplaceCategories =
  async () => {

    return authenticatedRequest(
      '/admin/marketplace/categories',
      {
        method: 'GET'
      }
    );

  };

// ============================================================
// CREATE MARKETPLACE CATEGORY
// ============================================================

export const createMarketplaceCategory =
  async (
    name
  ) => {

    return authenticatedRequest(
      '/admin/marketplace/categories',
      {
        method: 'POST',

        body:
          JSON.stringify({
            name
          })
      }
    );

  };


// ============================================================
// UPDATE MARKETPLACE CATEGORY
// ============================================================

export const updateMarketplaceCategory =
  async (
    categoryId,
    name
  ) => {

    return authenticatedRequest(
      `/admin/marketplace/categories/${categoryId}`,
      {
        method: 'PUT',

        body:
          JSON.stringify({
            name
          })
      }
    );

  };


// ============================================================
// DELETE MARKETPLACE CATEGORY
// ============================================================

export const deleteMarketplaceCategory =
  async (
    categoryId
  ) => {

    return authenticatedRequest(
      `/admin/marketplace/categories/${categoryId}`,
      {
        method: 'DELETE'
      }
    );

  };

// ============================================================
// ADMIN MARKETPLACE CATEGORY API
// COMPATIBILITY FUNCTIONS FOR MARKETPLACE.jsx
// ============================================================

export const createAdminMarketplaceCategory =
  async (
    payload
  ) => {

    const categoryName =
      typeof payload === 'string'
        ? payload
        : payload?.category_name ??
          payload?.name ??
          '';

    return createMarketplaceCategory(
      categoryName
    );

  };


export const updateAdminMarketplaceCategory =
  async (
    categoryId,
    payload
  ) => {

    const categoryName =
      typeof payload === 'string'
        ? payload
        : payload?.category_name ??
          payload?.name ??
          '';

    return updateMarketplaceCategory(
      categoryId,
      categoryName
    );

  };


export const deleteAdminMarketplaceCategory =
  async (
    categoryId
  ) => {

    return deleteMarketplaceCategory(
      categoryId
    );

  };
export const getMarketplaceListings =
  async (
    params = {}
  ) => {

    const query =
      new URLSearchParams();


    Object.entries(
      params
    ).forEach(
      ([key, value]) => {

        if (
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {

          query.set(
            key,
            String(value)
          );

        }

      }
    );


    const queryString =
      query.toString();


    return authenticatedRequest(
      `/admin/marketplace/listings${
        queryString
          ? `?${queryString}`
          : ''
      }`,
      {
        method: 'GET'
      }
    );

  };


export const getMarketplaceListing =
  async (
    listingId
  ) => {

    return authenticatedRequest(
      `/admin/marketplace/listings/${listingId}`,
      {
        method: 'GET'
      }
    );

  };


export const updateMarketplaceListing =
  async (
    listingId,
    payload
  ) => {

    return authenticatedRequest(
      `/admin/marketplace/listings/${listingId}`,
      {
        method: 'PATCH',

        body:
          JSON.stringify(
            payload
          )
      }
    );

  };


export const updateMarketplaceListingStatus =
  async (
    listingId,
    status
  ) => {

    return authenticatedRequest(
      `/admin/marketplace/listings/${listingId}/status`,
      {
        method: 'PATCH',

        body:
          JSON.stringify({
            status
          })
      }
    );

  };


// ============================================================
// ADMIN MARKETPLACE LISTINGS
// ============================================================

export const getAdminMarketplace =
  async (
    params = {}
  ) => {

    const query =
      new URLSearchParams();


    Object.entries(
      params
    ).forEach(
      ([key, value]) => {

        if (
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {

          query.set(
            key,
            String(value)
          );

        }

      }
    );


    const queryString =
      query.toString();


    return authenticatedRequest(
      `/admin/marketplace${
        queryString
          ? `?${queryString}`
          : ''
      }`,
      {
        method: 'GET'
      }
    );

  };


export const getAdminMarketplaceStats =
  async () => {

    return authenticatedRequest(
      '/admin/marketplace/stats',
      {
        method: 'GET'
      }
    );

  };


export const getAdminMarketplaceCategories =
  async () => {

    return authenticatedRequest(
      '/admin/marketplace/categories',
      {
        method: 'GET'
      }
    );

  };


export const getAdminMarketplaceReports =
  async (
    params = {}
  ) => {

    const query =
      new URLSearchParams();


    Object.entries(
      params
    ).forEach(
      ([key, value]) => {

        if (
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {

          query.set(
            key,
            String(value)
          );

        }

      }
    );


    const queryString =
      query.toString();


    return authenticatedRequest(
      `/admin/marketplace/reports${
        queryString
          ? `?${queryString}`
          : ''
      }`,
      {
        method: 'GET'
      }
    );

  };


export const updateAdminListingStatus =
  async (
    listingId,
    status
  ) => {

    return authenticatedRequest(
      `/admin/marketplace/${listingId}/status`,
      {
        method: 'PATCH',

        body:
          JSON.stringify({
            status
          })
      }
    );

  };


export const createAdminListing =
  async (
    payload
  ) => {

    return authenticatedRequest(
      '/admin/marketplace',
      {
        method: 'POST',

        body:
          JSON.stringify(
            payload
          )
      }
    );

  };


export const updateAdminListing =
  async (
    listingId,
    payload
  ) => {

    return authenticatedRequest(
      `/admin/marketplace/${listingId}`,
      {
        method: 'PATCH',

        body:
          JSON.stringify(
            payload
          )
      }
    );

  };


export const deleteAdminListing =
  async (
    listingId
  ) => {

    return authenticatedRequest(
      `/admin/marketplace/${listingId}`,
      {
        method: 'DELETE'
      }
    );

  };

// ============================================================
// COMMUNITY & SUPPORT API
// ============================================================


// ------------------------------------------------------------
// COMMUNITY STATS
// ------------------------------------------------------------

export const getCommunitySupportStats =
  async () => {

    return authenticatedRequest(
      '/admin/community/stats',
      {
        method: 'GET'
      }
    );

  };


// ------------------------------------------------------------
// COMMUNITY POSTS
// ------------------------------------------------------------

export const getCommunityPosts =
  async (
    params = {}
  ) => {

    const query =
      new URLSearchParams(
        params
      );


    const queryString =
      query.toString();


    return authenticatedRequest(
      `/admin/community/posts${
        queryString
          ? `?${queryString}`
          : ''
      }`,
      {
        method: 'GET'
      }
    );

  };


// ------------------------------------------------------------
// CREATE COMMUNITY POST
// ------------------------------------------------------------

export const createCommunityPost =
  async (
    payload
  ) => {

    return authenticatedRequest(
      '/admin/community/posts',
      {
        method: 'POST',

        body:
          JSON.stringify(
            payload
          )
      }
    );

  };


// ------------------------------------------------------------
// UPDATE POST STATUS
// ------------------------------------------------------------

export const updateCommunityPostStatus =
  async (
    postId,
    status
  ) => {

    return authenticatedRequest(
      `/admin/community/posts/${postId}/status`,
      {
        method: 'PATCH',

        body:
          JSON.stringify({
            status
          })
      }
    );

  };


// ------------------------------------------------------------
// SUPPORT TICKETS
// ------------------------------------------------------------

export const getSupportTickets =
  async (
    params = {}
  ) => {

    const query =
      new URLSearchParams(
        params
      );


    const queryString =
      query.toString();


    return authenticatedRequest(
      `/admin/community/tickets${
        queryString
          ? `?${queryString}`
          : ''
      }`,
      {
        method: 'GET'
      }
    );

  };


// ------------------------------------------------------------
// UPDATE TICKET STATUS
// ------------------------------------------------------------

export const updateSupportTicketStatus =
  async (
    ticketId,
    status
  ) => {

    return authenticatedRequest(
      `/admin/community/tickets/${ticketId}/status`,
      {
        method: 'PATCH',

        body:
          JSON.stringify({
            status
          })
      }
    );

  };


// ------------------------------------------------------------
// RECENT TICKETS
// ------------------------------------------------------------

export const getRecentSupportTickets =
  async () => {

    return authenticatedRequest(
      '/admin/community/recent-tickets',
      {
        method: 'GET'
      }
    );

  };


// ------------------------------------------------------------
// REPORTS
// ------------------------------------------------------------

export const getCommunityReports =
  async (
    params = {}
  ) => {

    const query =
      new URLSearchParams(
        params
      );


    const queryString =
      query.toString();


    return authenticatedRequest(
      `/admin/community/reports${
        queryString
          ? `?${queryString}`
          : ''
      }`,
      {
        method: 'GET'
      }
    );

  };


// ------------------------------------------------------------
// UPDATE REPORT STATUS
// ------------------------------------------------------------

export const updateCommunityReportStatus =
  async (
    reportId,
    status
  ) => {

    return authenticatedRequest(
      `/admin/community/reports/${reportId}/status`,
      {
        method: 'PATCH',

        body:
          JSON.stringify({
            status
          })
      }
    );

  };


// ------------------------------------------------------------
// BANNED / SUSPENDED USERS
// ------------------------------------------------------------

export const getCommunityBannedUsers =
  async () => {

    return authenticatedRequest(
      '/admin/community/banned-users',
      {
        method: 'GET'
      }
    );

  };


// ------------------------------------------------------------
// SUPPORT SETTINGS
// ------------------------------------------------------------

export const getSupportSettings =
  async () => {

    return authenticatedRequest(
      '/admin/community/settings',
      {
        method: 'GET'
      }
    );

  };


export const saveSupportSettings =
  async (
    payload
  ) => {

    return authenticatedRequest(
      '/admin/community/settings',
      {
        method: 'PUT',

        body:
          JSON.stringify(
            payload
          )
      }
    );

  };


// ============================================================
// ADMIN REPORTS & ANALYTICS
// ============================================================

export const getAdminReportsOverview =
  async (
    params = {}
  ) => {

    const query =
      new URLSearchParams();


    if (params.startDate) {

      query.set(
        'startDate',
        params.startDate
      );

    }


    if (params.endDate) {

      query.set(
        'endDate',
        params.endDate
      );

    }


    if (
      params.category &&
      params.category !==
        'All Categories'
    ) {

      query.set(
        'category',
        params.category
      );

    }


    const queryString =
      query.toString();


    return authenticatedRequest(
      `/admin/reports/overview${
        queryString
          ? `?${queryString}`
          : ''
      }`,
      {
        method: 'GET'
      }
    );

  };


export const exportAdminReport =
  async (
    type
  ) => {

    return authenticatedRequest(
      `/admin/reports/export?type=${encodeURIComponent(
        type
      )}`,
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// ADMIN CONTENT MANAGEMENT API
// ============================================================


// ------------------------------------------------------------
// CONTENT SUMMARY
// ------------------------------------------------------------

export const getAdminContentSummary =
  async () => {

    return authenticatedRequest(
      '/admin/content/summary',
      {
        method: 'GET'
      }
    );

  };


// ------------------------------------------------------------
// CONTENT ITEMS
// ------------------------------------------------------------

export const getAdminContentItems =
  async ({
    type = 'ALL',
    status = 'ALL',
    search = '',
    page = 1,
    limit = 8
  } = {}) => {

    const params =
      new URLSearchParams();


    params.set(
      'type',
      type
    );


    params.set(
      'status',
      status
    );


    params.set(
      'search',
      search
    );


    params.set(
      'page',
      page
    );


    params.set(
      'limit',
      limit
    );


    return authenticatedRequest(
      `/admin/content/items?${params.toString()}`,
      {
        method: 'GET'
      }
    );

  };


// ------------------------------------------------------------
// GET SINGLE CONTENT ITEM
// ------------------------------------------------------------

export const getAdminContentItem =
  async (
    contentId
  ) => {

    return authenticatedRequest(
      `/admin/content/items/${contentId}`,
      {
        method: 'GET'
      }
    );

  };


// ------------------------------------------------------------
// CREATE CONTENT
// ------------------------------------------------------------

export const createAdminContent =
  async (
    payload
  ) => {

    return authenticatedRequest(
      '/admin/content/items',
      {
        method: 'POST',

        body:
          JSON.stringify(
            payload
          )
      }
    );

  };


// ------------------------------------------------------------
// UPDATE CONTENT
// ------------------------------------------------------------

export const updateAdminContent =
  async (
    contentId,
    payload
  ) => {

    return authenticatedRequest(
      `/admin/content/items/${contentId}`,
      {
        method: 'PUT',

        body:
          JSON.stringify(
            payload
          )
      }
    );

  };


// ------------------------------------------------------------
// UPDATE CONTENT STATUS
// ------------------------------------------------------------

export const updateAdminContentStatus =
  async (
    contentId,
    status
  ) => {

    return authenticatedRequest(
      `/admin/content/items/${contentId}/status`,
      {
        method: 'PATCH',

        body:
          JSON.stringify({
            status
          })
      }
    );

  };


// ------------------------------------------------------------
// DELETE CONTENT
// ------------------------------------------------------------

export const deleteAdminContent =
  async (
    contentId
  ) => {

    return authenticatedRequest(
      `/admin/content/items/${contentId}`,
      {
        method: 'DELETE'
      }
    );

  };


// ------------------------------------------------------------
// RECENT CONTENT ACTIVITY
// ------------------------------------------------------------

export const getAdminContentRecent =
  async () => {

    return authenticatedRequest(
      '/admin/content/recent',
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// ADMIN SYSTEM MANAGEMENT API
// ============================================================

export const getAdminSystemSummary =
  async () => {

    return authenticatedRequest(
      '/admin/system/summary',
      {
        method: 'GET'
      }
    );

  };


export const getAdminSystemAlerts =
  async () => {

    return authenticatedRequest(
      '/admin/system/alerts',
      {
        method: 'GET'
      }
    );

  };


export const getAdminSystemLogs =
  async () => {

    return authenticatedRequest(
      '/admin/system/logs',
      {
        method: 'GET'
      }
    );

  };


export const getAdminSystemInfo =
  async () => {

    return authenticatedRequest(
      '/admin/system/info',
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// API URL EXPORT
// ============================================================

export {
  API_URL
};