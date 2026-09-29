/*
============================================================
ReUse Connect
Buyer Community API
============================================================

Supports:
- Community posts
- Comments
- Optional item attachment on comments
- Existing listing import for the logged-in user

IMPORTANT:
JAVASCRIPT ONLY.
NO JSX IN THIS FILE.
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


const getCommunityImageUrl = (imageUrl) => {
  if (!imageUrl) return '';

  const value = String(imageUrl).trim();

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:')
  ) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
};


const normalizeCommunityResult = (result) => {
  if (!result || typeof result !== 'object') {
    return result;
  }

  const normalizePost = (post) => {
    if (!post || typeof post !== 'object') {
      return post;
    }

    return {
      ...post,
      image_url: getCommunityImageUrl(post.image_url),

      comments: Array.isArray(post.comments)
        ? post.comments.map((comment) => ({
            ...comment,
            listing_image_url:
              getCommunityImageUrl(
                comment.listing_image_url
              )
          }))
        : post.comments
    };
  };

  const normalizeCommentArray = (comments) => {
    if (!Array.isArray(comments)) {
      return comments;
    }

    return comments.map((comment) => ({
      ...comment,
      listing_image_url:
        getCommunityImageUrl(
          comment.listing_image_url
        )
    }));
  };

  return {
    ...result,

    post:
      result.post
        ? normalizePost(result.post)
        : result.post,

    items:
      Array.isArray(result.items)
        ? result.items.map(normalizePost)
        : normalizeCommentArray(result.items),

    data:
      Array.isArray(result.data)
        ? result.data.map(normalizePost)
        : normalizeCommentArray(result.data),

    comments:
      normalizeCommentArray(result.comments),

    comment:
      result.comment
        ? {
            ...result.comment,
            listing_image_url:
              getCommunityImageUrl(
                result.comment.listing_image_url
              )
          }
        : result.comment
  };
};


const request = async (
  endpoint,
  options = {}
) => {
  const token = getToken();
  const userId = getUserId();

  const isFormData =
    typeof FormData !== 'undefined' &&
    options.body instanceof FormData;

  const headers = {
    Accept: 'application/json',

    ...(options.body && !isFormData
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
    response = await fetch(
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
    result = await response.json();
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

  return normalizeCommunityResult(result);
};


const buildQuery = (params = {}) => {
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

  return query ? `?${query}` : '';
};


/* ============================================================
   POSTS
============================================================ */

export const getCommunityPosts = async ({
  search = '',
  category = 'all',
  page = 1,
  limit = 10
} = {}) => {
  const query = buildQuery({
    search,
    category,
    page,
    limit
  });

  return request(
    `/api/buyer/community${query}`
  );
};

export const getPosts =
  getCommunityPosts;


export const getCommunityCategories =
  async () => {
    return request(
      '/api/buyer/community/categories'
    );
  };

export const getCategories =
  getCommunityCategories;


export const getCommunityPost =
  async (postId) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    return request(
      `/api/buyer/community/${postId}`
    );
  };

export const getCommunityPostDetails =
  getCommunityPost;

export const getPostDetails =
  getCommunityPostDetails;


/* ============================================================
   CREATE / UPDATE / DELETE POSTS
============================================================ */

export const createCommunityPost =
  async ({
    title,
    body,
    category = 'Discussion',
    image = null
  } = {}) => {
    if (!title?.trim()) {
      throw new Error(
        'Post title is required.'
      );
    }

    if (!body?.trim()) {
      throw new Error(
        'Post body is required.'
      );
    }

    const formData = new FormData();

    formData.append(
      'title',
      title.trim()
    );

    formData.append(
      'body',
      body.trim()
    );

    formData.append(
      'category',
      category?.trim() ||
      'Discussion'
    );

    if (image) {
      formData.append(
        'image',
        image
      );
    }

    return request(
      '/api/buyer/community',
      {
        method: 'POST',
        body: formData
      }
    );
  };

export const createPost =
  createCommunityPost;


export const createTradeCommunityPost =
  async ({
    title,
    body,
    category = 'Trade & Exchange'
  } = {}) => {
    return createCommunityPost({
      title,
      body,
      category:
        category?.trim() ||
        'Trade & Exchange'
    });
  };

export const createTradePost =
  createTradeCommunityPost;


export const updateCommunityPost =
  async (
    postId,
    {
      title,
      body,
      category,
      image = null
    } = {}
  ) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    const formData = new FormData();

    if (title !== undefined) {
      formData.append(
        'title',
        String(title).trim()
      );
    }

    if (body !== undefined) {
      formData.append(
        'body',
        String(body).trim()
      );
    }

    if (category !== undefined) {
      formData.append(
        'category',
        category
      );
    }

    if (image) {
      formData.append(
        'image',
        image
      );
    }

    return request(
      `/api/buyer/community/${postId}`,
      {
        method: 'PUT',
        body: formData
      }
    );
  };


export const deleteCommunityPost =
  async (postId) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    return request(
      `/api/buyer/community/${postId}`,
      {
        method: 'DELETE'
      }
    );
  };

export const deletePost =
  deleteCommunityPost;


/* ============================================================
   LIKES
============================================================ */

export const likeCommunityPost =
  async (postId) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    return request(
      `/api/buyer/community/${postId}/like`,
      {
        method: 'POST'
      }
    );
  };

export const likePost =
  likeCommunityPost;


export const unlikeCommunityPost =
  async (postId) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    return request(
      `/api/buyer/community/${postId}/like`,
      {
        method: 'DELETE'
      }
    );
  };

export const unlikePost =
  unlikeCommunityPost;


export const toggleCommunityLike =
  async (postId) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    return request(
      `/api/buyer/community/${postId}/like`,
      {
        method: 'POST'
      }
    );
  };


export const toggleCommunityPostLike =
  async (
    postId,
    liked = false
  ) => {
    if (liked) {
      return unlikeCommunityPost(
        postId
      );
    }

    return likeCommunityPost(
      postId
    );
  };


/* ============================================================
   COMMENTS
============================================================ */

export const getPostComments =
  async (postId) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    return request(
      `/api/buyer/community/${postId}/comments`
    );
  };

export const getCommunityComments =
  getPostComments;


/*
 * Backward-compatible signature:
 *
 * addPostComment(postId, text)
 *
 * New signature:
 *
 * addPostComment(postId, text, listingId)
 */
export const addPostComment =
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
      `/api/buyer/community/${postId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  };


export const addCommunityComment =
  addPostComment;

export const createComment =
  addPostComment;


export const deletePostComment =
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
      `/api/buyer/community/${postId}/comments/${commentId}`,
      {
        method: 'DELETE'
      }
    );
  };

export const deleteCommunityComment =
  deletePostComment;


/* ============================================================
   ITEM IMPORT
============================================================ */

export const getMyCommunityItems =
  async () => {
    return request(
      '/api/buyer/community/my-items'
    );
  };


export const getMyItems =
  getMyCommunityItems;


/* ============================================================
   OTHER COMMUNITY FUNCTIONS
============================================================ */

export const getCommunitySummary =
  async () => {
    return request(
      '/api/buyer/community/summary'
    );
  };


export const getMyCommunityActivity =
  async ({
    page = 1,
    limit = 10
  } = {}) => {
    const query = buildQuery({
      page,
      limit
    });

    return request(
      `/api/buyer/community/activity${query}`
    );
  };


export const getMyPosts =
  async ({
    page = 1,
    limit = 10
  } = {}) => {
    const query = buildQuery({
      page,
      limit
    });

    return request(
      `/api/buyer/community/my-posts${query}`
    );
  };


export const reportCommunityPost =
  async ({
    postId,
    reason,
    description = ''
  } = {}) => {
    if (!postId) {
      throw new Error(
        'Post ID is required.'
      );
    }

    if (!reason?.trim()) {
      throw new Error(
        'Report reason is required.'
      );
    }

    return request(
      `/api/buyer/community/${postId}/report`,
      {
        method: 'POST',
        body: JSON.stringify({
          reason:
            reason.trim(),
          description:
            description?.trim() || ''
        })
      }
    );
  };

export const reportPost =
  reportCommunityPost;


const buyerCommunityApi = {
  getCommunityPosts,
  getPosts,

  getCommunityCategories,
  getCategories,

  getCommunityPost,
  getCommunityPostDetails,
  getPostDetails,

  createCommunityPost,
  createPost,
  createTradeCommunityPost,
  createTradePost,

  updateCommunityPost,

  deleteCommunityPost,
  deletePost,

  likeCommunityPost,
  likePost,
  unlikeCommunityPost,
  unlikePost,
  toggleCommunityLike,
  toggleCommunityPostLike,

  getPostComments,
  getCommunityComments,

  addPostComment,
  addCommunityComment,
  createComment,

  deletePostComment,
  deleteCommunityComment,

  getMyCommunityItems,
  getMyItems,

  reportCommunityPost,
  reportPost,

  getCommunitySummary,
  getMyCommunityActivity,
  getMyPosts
};

export default buyerCommunityApi;
