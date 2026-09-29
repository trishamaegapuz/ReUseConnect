/*
============================================================
ReUse Connect
Seller API
============================================================
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';


// ============================================================
// TOKEN
// ============================================================

const getToken = () => {

  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') ||
    ''
  );

};


// ============================================================
// REQUEST
// ============================================================

const request = async (
  endpoint,
  options = {}
) => {

  const token =
    getToken();


  const headers = {
    'Content-Type':
      'application/json',

    ...(options.headers || {})
  };


  if (token) {

    headers.Authorization =
      `Bearer ${token}`;

  }


  const response =
    await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers
      }
    );


  let data = null;

  try {

    data =
      await response.json();

  } catch {

    data = null;

  }


  if (!response.ok) {

    throw new Error(
      data?.message ||
      `Request failed with status ${response.status}.`
    );

  }


  return data;

};


// ============================================================
// SELLER PROFILE
// ============================================================

export const fetchSellerProfile = async () => {

  return request(
    '/api/seller/profile',
    {
      method: 'GET'
    }
  );

};


// ============================================================
// SELLER DASHBOARD
// ============================================================

export const fetchSellerDashboard = async () => {

  return request(
    '/api/seller/dashboard',
    {
      method: 'GET'
    }
  );

};


// ============================================================
// SELLER LISTINGS
// ============================================================

export const fetchSellerListings = async () => {

  return request(
    '/api/seller/listings',
    {
      method: 'GET'
    }
  );

};


// ============================================================
// SINGLE SELLER LISTING
// ============================================================

export const fetchSellerListing = async (
  listingId
) => {

  if (!listingId) {

    throw new Error(
      'Listing ID is required.'
    );

  }


  return request(
    `/api/seller/listings/${listingId}`,
    {
      method: 'GET'
    }
  );

};


// ============================================================
// SELLER RECENT ORDERS
// ============================================================

export const fetchSellerOrders = async () => {

  return request(
    '/api/seller/orders/recent',
    {
      method: 'GET'
    }
  );

};


// ============================================================
// SELLER REVIEWS
// ============================================================

export const fetchSellerReviews = async () => {

  return request(
    '/api/seller/reviews',
    {
      method: 'GET'
    }
  );

};


// ============================================================
// SELLER TEST ACCESS
// ============================================================

export const testSellerAccess = async () => {

  return request(
    '/api/seller/test',
    {
      method: 'GET'
    }
  );

};


// ============================================================
// SELLER PUBLISHED CONTENT
//
// READ-ONLY
//
// Default:
// ANNOUNCEMENT
// NEWS
// BANNER
// ============================================================

export const getSellerPublishedContent = async (
  params = {}
) => {

  const query =
    new URLSearchParams();


  if (params.type) {

    query.set(
      'type',
      String(
        params.type
      ).toUpperCase()
    );

  }


  if (params.limit) {

    query.set(
      'limit',
      String(
        params.limit
      )
    );

  }


  const queryString =
    query.toString();


  const endpoint =
    queryString
      ? `/api/seller/content?${queryString}`
      : '/api/seller/content';


  return request(
    endpoint,
    {
      method: 'GET'
    }
  );

};


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {

  fetchSellerProfile,

  fetchSellerDashboard,

  fetchSellerListings,

  fetchSellerListing,

  fetchSellerOrders,

  fetchSellerReviews,

  testSellerAccess,

  getSellerPublishedContent

};