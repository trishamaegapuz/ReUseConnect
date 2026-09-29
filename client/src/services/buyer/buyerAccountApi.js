/*
============================================================
ReUseConnect
Buyer Account API
============================================================
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';


/* ============================================================
   AUTH TOKEN
============================================================ */

const getToken = () => {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken') ||
    ''
  );
};


/* ============================================================
   USER ID
============================================================ */

const getUserId = () => {
  const keys = [
    'user',
    'currentUser',
    'authUser'
  ];

  for (const key of keys) {
    const value =
      localStorage.getItem(key);

    if (!value) continue;

    try {
      const user =
        JSON.parse(value);

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

    } catch {
      // Ignore invalid JSON
    }
  }

  return (
    localStorage.getItem('user_id') ||
    localStorage.getItem('userId') ||
    ''
  );
};


/* ============================================================
   REQUEST
============================================================ */

const request = async (
  endpoint,
  options = {}
) => {

  const token = getToken();
  const userId = getUserId();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };


  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }


  if (userId) {
    headers['x-user-id'] =
      userId;
  }


  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers
    }
  );


  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }


  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`
    );
  }


  return data;
};


/* ============================================================
   GET PROFILE
============================================================ */

export const getBuyerProfile =
  async () => {

    return request(
      '/api/buyer/account/profile'
    );

  };


/* ============================================================
   UPDATE PROFILE
============================================================ */

export const updateBuyerProfile =
  async (profile) => {

    return request(
      '/api/buyer/account/profile',
      {
        method: 'PUT',
        body: JSON.stringify(profile)
      }
    );

  };


/* ============================================================
   UPDATE PROFILE PHOTO
============================================================ */

export const updateBuyerProfilePhoto =
  async (profileImage) => {

    return request(
      '/api/buyer/account/profile/photo',
      {
        method: 'POST',
        body: JSON.stringify({
          profileImage
        })
      }
    );

  };


/* ============================================================
   REMOVE PROFILE PHOTO
============================================================ */

export const removeBuyerProfilePhoto =
  async () => {

    return request(
      '/api/buyer/account/profile/photo',
      {
        method: 'DELETE'
      }
    );

  };


/* ============================================================
   CHANGE PASSWORD
============================================================ */

export const changeBuyerPassword =
  async ({
    currentPassword,
    newPassword
  }) => {

    return request(
      '/api/buyer/account/password',
      {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      }
    );

  };


/* ============================================================
   ACCOUNT ACTIVITY
============================================================ */

export const getBuyerAccountActivity =
  async ({
    page = 1,
    limit = 10
  } = {}) => {

    return request(
      `/api/buyer/account/activity?page=${page}&limit=${limit}`
    );

  };


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default {
  getBuyerProfile,
  updateBuyerProfile,
  updateBuyerProfilePhoto,
  removeBuyerProfilePhoto,
  changeBuyerPassword,
  getBuyerAccountActivity
};