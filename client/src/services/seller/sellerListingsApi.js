/*
|--------------------------------------------------------------------------
| ReUseConnect - Seller Listings API
|--------------------------------------------------------------------------
| Seller My Listings API
|--------------------------------------------------------------------------
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';


/* ============================================================
   TOKEN
============================================================ */

const getToken = () => {
  return (
    localStorage.getItem('reuseconnect_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken') ||
    ''
  );
};


/* ============================================================
   SELLER ID
============================================================ */

const getSellerId = () => {
  const possibleKeys = [
    'reuseconnect_user',
    'user',
    'currentUser',
    'authUser'
  ];

  for (const key of possibleKeys) {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const user =
        JSON.parse(raw);

      const id =
        user?.user_id ??
        user?.userId ??
        user?.id;

      if (
        id !== undefined &&
        id !== null &&
        id !== ''
      ) {
        return String(id);
      }
    } catch (error) {
      console.error(
        `Unable to parse ${key}:`,
        error
      );
    }
  }

  return (
    localStorage.getItem('user_id') ||
    localStorage.getItem('userId') ||
    ''
  );
};


/* ============================================================
   REQUEST HELPER
============================================================ */

const request = async (
  endpoint,
  options = {}
) => {
  const token =
    getToken();

  const sellerId =
    getSellerId();

  const isFormData =
    options.body instanceof FormData;

  const headers = {
    ...(options.headers || {})
  };

  /*
   * IMPORTANT:
   * Do not manually set Content-Type when using FormData.
   * The browser automatically adds the multipart boundary.
   */

  if (!isFormData) {
    headers['Content-Type'] =
      'application/json';
  }

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  if (sellerId) {
    headers['x-user-id'] =
      sellerId;
  }

  const response =
    await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers
      }
    );

  let data = {};

  try {
    data =
      await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error =
      new Error(
        data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
      );

    error.status =
      response.status;

    error.data =
      data;

    error.url =
      `${API_BASE_URL}${endpoint}`;

    throw error;
  }

  return data;
};


/* ============================================================
   GET SELLER LISTINGS
============================================================ */

export const getSellerListings =
  async ({
    page = 1,
    limit = 8,
    search = '',
    status = 'all'
  } = {}) => {

    const params =
      new URLSearchParams();

    params.set(
      'page',
      String(page)
    );

    params.set(
      'limit',
      String(limit)
    );

    if (
      search &&
      search.trim()
    ) {
      params.set(
        'search',
        search.trim()
      );
    }

    if (
      status &&
      status !== 'all'
    ) {
      params.set(
        'status',
        status
      );
    }

    return request(
      `/api/seller/listings?${params.toString()}`
    );
  };


/* ============================================================
   GET SINGLE SELLER LISTING
============================================================ */

export const getSellerListing =
  async (listingId) => {

    return request(
      `/api/seller/listings/${listingId}`
    );
  };


/* ============================================================
   GET SELLER LISTING STATS
============================================================ */

export const getSellerListingStats =
  async () => {

    return request(
      '/api/seller/listings/stats'
    );
  };


/* ============================================================
   GET SELLER CATEGORIES
============================================================ */

export const getSellerListingCategories =
  async () => {

    return request(
      '/api/seller/listings/categories'
    );
  };


/*
 * Compatibility alias.
 *
 * This is kept because older versions of
 * SellerMyListings.jsx may use getSellerCategories().
 */

export const getSellerCategories =
  async () => {

    return getSellerListingCategories();
  };


/* ============================================================
   CREATE SELLER LISTING
============================================================ */

export const createSellerListing =
  async (
    listing = {},
    images = []
  ) => {

    const formData =
      new FormData();

    formData.append(
      'title',
      listing.title || ''
    );

    formData.append(
      'description',
      listing.description || ''
    );

    formData.append(
      'category_id',
      listing.category_id || ''
    );

    formData.append(
      'price',
      listing.price ?? ''
    );

    formData.append(
      'condition',
      listing.condition || 'GOOD'
    );

    formData.append(
      'quantity',
      listing.quantity ?? 1
    );

    formData.append(
      'size',
      listing.size || ''
    );

    formData.append(
      'size_inventory',
      JSON.stringify(Array.isArray(listing.size_inventory) ? listing.size_inventory : [])
    );

    formData.append(
      'location',
      listing.location || ''
    );

    /*
     * IMPORTANT:
     * Pass the selected listing type to the backend.
     *
     * Possible values:
     * SALE
     * DONATION
     * TRADE
     */

    formData.append(
      'listing_type',
      listing.listing_type || 'SALE'
    );

    formData.append(
      'status',
      listing.status || 'PENDING'
    );

    /*
     * Support both:
     *
     * createSellerListing(listing, files)
     *
     * and:
     *
     * createSellerListing({
     *   ...listing,
     *   images: files
     * })
     */

    const files =
      Array.isArray(images) &&
      images.length > 0
        ? images
        : (
            Array.isArray(
              listing.images
            )
              ? listing.images
              : []
          );

    files.forEach(
      (image) => {

        if (
          image instanceof File
        ) {
          formData.append(
            'images',
            image
          );
        }
      }
    );

    return request(
      '/api/seller/listings',
      {
        method: 'POST',
        body: formData
      }
    );
  };


/* ============================================================
   UPDATE SELLER LISTING
============================================================ */

export const updateSellerListing =
  async (
    listingId,
    listing = {},
    images = []
  ) => {

    const formData =
      new FormData();

    formData.append(
      'title',
      listing.title || ''
    );

    formData.append(
      'description',
      listing.description || ''
    );

    formData.append(
      'category_id',
      listing.category_id || ''
    );

    formData.append(
      'price',
      listing.price ?? ''
    );

    formData.append(
      'condition',
      listing.condition || 'GOOD'
    );

    formData.append(
      'quantity',
      listing.quantity ?? 1
    );

    formData.append(
      'size',
      listing.size || ''
    );

    formData.append(
      'size_inventory',
      JSON.stringify(Array.isArray(listing.size_inventory) ? listing.size_inventory : [])
    );

    formData.append(
      'location',
      listing.location || ''
    );

    /*
     * IMPORTANT:
     * Pass the selected listing type to the backend.
     *
     * Possible values:
     * SALE
     * DONATION
     * TRADE
     */

    formData.append(
      'listing_type',
      listing.listing_type || 'SALE'
    );

    formData.append(
      'status',
      listing.status || 'PENDING'
    );

    const files =
      Array.isArray(images) &&
      images.length > 0
        ? images
        : (
            Array.isArray(
              listing.images
            )
              ? listing.images
              : []
          );

    files.forEach(
      (image) => {

        if (
          image instanceof File
        ) {
          formData.append(
            'images',
            image
          );
        }
      }
    );

    return request(
      `/api/seller/listings/${listingId}`,
      {
        method: 'PUT',
        body: formData
      }
    );
  };


/* ============================================================
   DEACTIVATE SELLER LISTING
============================================================ */

export const deactivateSellerListing =
  async (listingId) => {

    return request(
      `/api/seller/listings/${listingId}/deactivate`,
      {
        method: 'PATCH'
      }
    );
  };


/* ============================================================
   IMAGE URL HELPER
============================================================ */

export const getSellerListingImageUrl =
  (image) => {

    if (!image) {
      return '';
    }

    const value =
      typeof image === 'string'
        ? image.trim()
        : (
            image?.image_url ||
            image?.url ||
            image?.primary_image_url ||
            ''
          );

    if (!value) {
      return '';
    }

    /*
     * Already a complete URL.
     */

    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('data:') ||
      value.startsWith('blob:')
    ) {
      return value;
    }

    /*
     * Protocol-relative URL.
     */

    if (
      value.startsWith('//')
    ) {
      return (
        `${window.location.protocol}${value}`
      );
    }

    /*
     * Our image serving route.
     */

    if (
      value.includes(
        '/api/seller/listings/image/'
      )
    ) {

      const filename =
        value
          .split('?')[0]
          .split('/')
          .pop();

      return (
        `${API_BASE_URL}` +
        `/api/seller/listings/image/` +
        `${encodeURIComponent(filename)}`
      );
    }

    /*
     * Older stored image path.
     */

    if (
      value.startsWith(
        '/uploads/listings/'
      )
    ) {

      const filename =
        value
          .split('?')[0]
          .split('/')
          .pop();

      return (
        `${API_BASE_URL}` +
        `/api/seller/listings/image/` +
        `${encodeURIComponent(filename)}`
      );
    }

    /*
     * Other backend path.
     */

    if (
      value.startsWith('/')
    ) {
      return (
        `${API_BASE_URL}${value}`
      );
    }

    /*
     * Relative path.
     */

    return (
      `${API_BASE_URL}/${value}`
    );
  };


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default {
  getSellerListings,
  getSellerListing,
  getSellerListingStats,
  getSellerListingCategories,
  getSellerCategories,
  createSellerListing,
  updateSellerListing,
  deactivateSellerListing,
  getSellerListingImageUrl
};