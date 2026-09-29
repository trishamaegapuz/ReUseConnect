/*
============================================================
ReUse Connect
Seller Trade & Exchange API
============================================================

Seller-side Trade & Exchange:
- Browse Buyer Community Trade posts
- Load the shared comment thread
- Load seller-owned items for comment import
- Add a comment with an optional attached item
============================================================
*/

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';


const getToken = () => {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken') ||
    ''
  );
};


const getUserId = () => {
  const possibleKeys = [
    'user',
    'currentUser',
    'authUser'
  ];

  for (const key of possibleKeys) {
    const raw = localStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);

      const id =
        parsed?.user_id ??
        parsed?.userId ??
        parsed?.id;

      if (
        id !== undefined &&
        id !== null &&
        id !== ''
      ) {
        return id;
      }
    } catch {
      // Ignore invalid JSON.
    }
  }

  return (
    localStorage.getItem('user_id') ||
    localStorage.getItem('userId') ||
    ''
  );
};


const normalizeImageUrl = (value) => {
  if (!value) return '';

  const imageUrl =
    String(value).trim();

  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('data:')
  ) {
    return imageUrl;
  }

  return `${API_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};


const normalizeResult = (result) => {
  if (!result || typeof result !== 'object') {
    return result;
  }

  const normalizeComment = (comment) => {
    if (!comment || typeof comment !== 'object') {
      return comment;
    }

    return {
      ...comment,
      listing_image_url:
        normalizeImageUrl(
          comment.listing_image_url
        )
    };
  };

  return {
    ...result,

    post:
      result.post
        ? {
            ...result.post,
            image_url:
              normalizeImageUrl(
                result.post.image_url
              ),
            listing_image_url:
              normalizeImageUrl(
                result.post.listing_image_url
              )
          }
        : result.post,

    comments:
      Array.isArray(result.comments)
        ? result.comments.map(normalizeComment)
        : result.comments,

    comment:
      result.comment
        ? normalizeComment(result.comment)
        : result.comment,

    items:
      Array.isArray(result.items)
        ? result.items.map((item) => ({
            ...item,
            image_url:
              normalizeImageUrl(
                item.image_url
              ),
            listing_image_url:
              normalizeImageUrl(
                item.listing_image_url
              )
          }))
        : result.items,

    data:
      Array.isArray(result.data)
        ? result.data.map((item) => ({
            ...item,
            image_url:
              normalizeImageUrl(
                item.image_url
              ),
            listing_image_url:
              normalizeImageUrl(
                item.listing_image_url
              )
          }))
        : result.data
  };
};


const request = async (
  endpoint,
  options = {}
) => {
  const token = getToken();
  const userId = getUserId();

  const headers = {
    Accept:
      'application/json',

    ...(options.body
      ? {
          'Content-Type':
            'application/json'
        }
      : {})
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  if (userId) {
    headers['x-user-id'] =
      String(userId);
  }

  let response;

  try {
    response =
      await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          ...options,
          headers
        }
      );
  } catch {
    throw new Error(
      'Unable to connect to the server. Please make sure the backend server is running.'
    );
  }

  let result = null;

  try {
    result =
      await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
      result?.error ||
      `Request failed with status ${response.status}.`
    );
  }

  return normalizeResult(result);
};


const buildQuery = (
  params = {}
) => {
  const searchParams =
    new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        searchParams.set(
          key,
          String(value)
        );
      }
    }
  );

  const query =
    searchParams.toString();

  return query
    ? `?${query}`
    : '';
};


export const getSellerTradePosts =
  async ({
    search = '',
    type = 'all',
    page = 1,
    limit = 6
  } = {}) => {
    const query =
      buildQuery({
        search,
        type,
        page,
        limit
      });

    return request(
      `/api/seller/trade-exchange${query}`
    );
  };


export const getSellerTradePost =
  async (postId) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    return request(
      `/api/seller/trade-exchange/${postId}`
    );
  };


export const getSellerTradeComments =
  async (postId) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    return request(
      `/api/seller/trade-exchange/${postId}/comments`
    );
  };


export const getSellerTradeItems =
  async () => {
    return request(
      '/api/seller/trade-exchange/my-items'
    );
  };


export const addSellerTradeComment =
  async (
    postId,
    commentText,
    listingId = null
  ) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    if (!commentText?.trim()) {
      throw new Error(
        'Comment text is required.'
      );
    }

    const body = {
      comment_text:
        commentText.trim()
    };

    if (
      listingId !== null &&
      listingId !== undefined &&
      listingId !== ''
    ) {
      body.listing_id =
        Number(listingId);
    }

    return request(
      `/api/seller/trade-exchange/${postId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  };


export const deleteSellerTradeComment =
  async (
    postId,
    commentId
  ) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    if (!commentId) {
      throw new Error(
        'Comment ID is required.'
      );
    }

    return request(
      `/api/seller/trade-exchange/${postId}/comments/${commentId}`,
      {
        method: 'DELETE'
      }
    );
  };


export default {
  getSellerTradePosts,
  getSellerTradePost,
  getSellerTradeComments,
  getSellerTradeItems,
  addSellerTradeComment,
  deleteSellerTradeComment
};
