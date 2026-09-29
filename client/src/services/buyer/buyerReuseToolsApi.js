/*
============================================================
ReUseConnect
Buyer Reuse Tools API
============================================================
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';


/* ============================================================
   TOKEN
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

  const possibleKeys = [
    'user',
    'currentUser',
    'authUser'
  ];


  for (const key of possibleKeys) {

    const raw =
      localStorage.getItem(key);

    if (!raw) continue;


    try {

      const parsed =
        JSON.parse(raw);

      const id =
        parsed?.user_id ??
        parsed?.userId ??
        parsed?.id;


      if (id !== undefined && id !== null) {
        return id;
      }

    } catch {

      // Ignore invalid JSON and continue.

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
    ...(options.body
      ? {
          'Content-Type':
            'application/json'
        }
      : {}),
    ...(token
      ? {
          Authorization:
            `Bearer ${token}`
        }
      : {}),
    ...(userId
      ? {
          'x-user-id':
            String(userId)
        }
      : {}),
    ...(options.headers || {})
  };


  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
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

    throw new Error(
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`
    );

  }


  return data;

};


/* ============================================================
   GET ENVIRONMENTAL IMPACT
============================================================ */

export const getReuseToolsImpact =
  async () => {

    return request(
      '/api/buyer/reuse-tools/impact'
    );

  };


/* ============================================================
   CHECK ITEM CONDITION
============================================================ */

export const checkItemCondition =
  async (description) => {

    return request(
      '/api/buyer/reuse-tools/check-condition',
      {
        method: 'POST',
        body: JSON.stringify({
          description
        })
      }
    );

  };


/* ============================================================
   DEFAULT EXPORT
============================================================ */

const buyerReuseToolsApi = {

  getReuseToolsImpact,

  checkItemCondition

};


export default buyerReuseToolsApi;