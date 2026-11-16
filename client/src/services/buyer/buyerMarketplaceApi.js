// ============================================================
// ReUseConnect - Buyer Marketplace API
// ============================================================

const ENV_API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:5000';


// ============================================================
// API BASE URL
// ============================================================

const API_BASE_URL = ENV_API_URL.endsWith('/api')
    ? ENV_API_URL
    : `${ENV_API_URL.replace(/\/$/, '')}/api`;


// ============================================================
// AUTH TOKEN
// ============================================================

const getToken = () => {
    return (
        localStorage.getItem('reuseconnect_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('access_token') ||
        ''
    );
};


// ============================================================
// REQUEST HELPER
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
        headers.Authorization = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/')
        ? endpoint
        : `/${endpoint}`;

    const url = `${API_BASE_URL}${cleanEndpoint}`;

    console.log(
        '[Buyer Marketplace API]',
        options.method || 'GET',
        url
    );

    const response = await fetch(url, {
        ...options,
        headers
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        console.error(
            '[Buyer Marketplace API Error]',
            response.status,
            url,
            data
        );

        let message =
            data?.message ||
            data?.error ||
            '';

        if (!message) {
            if (response.status === 401) {
                message = 'Authentication required.';
            } else if (response.status === 403) {
                message = 'You are not allowed to perform this action.';
            } else if (response.status === 404) {
                message = 'API route not found.';
            } else {
                message = `Request failed with status ${response.status}.`;
            }
        }

        const error = new Error(message);
        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
};


// ============================================================
// MARKETPLACE ITEMS
// GET /api/buyer/marketplace
// ============================================================

export const getMarketplaceItems = async (params = {}) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (
            value !== undefined &&
            value !== null &&
            value !== ''
        ) {
            searchParams.append(key, value);
        }
    });

    const queryString = searchParams.toString();

    return request(
        `/buyer/marketplace${queryString ? `?${queryString}` : ''}`
    );
};


// ============================================================
// MARKETPLACE CATEGORIES
// ============================================================

export const getMarketplaceCategories = async () => {
    return request('/buyer/marketplace/categories');
};


// ============================================================
// WISHLIST / FAVORITES
// ============================================================

export const getWishlist = async () => {
    return request('/buyer/marketplace/favorites');
};

export const addToWishlist = async (listingId) => {
    return request('/buyer/marketplace/favorites', {
        method: 'POST',
        body: JSON.stringify({
            listing_id: listingId
        })
    });
};

export const removeFromWishlist = async (listingId) => {
    return request(`/buyer/marketplace/favorites/${listingId}`, {
        method: 'DELETE'
    });
};


// ============================================================
// CART
// ============================================================

export const getCart = async () => {
    return request('/buyer/marketplace/cart');
};


// ============================================================
// ADD TO CART
// POST /api/buyer/marketplace/cart
//
// size is optional for listings that do not use sizes.
// For sized listings, pass the selected size, for example:
// addToCart(listingId, 1, 'M')
// ============================================================

export const addToCart = async (
    listingId,
    quantity = 1,
    size = null
) => {
    return request('/buyer/marketplace/cart', {
        method: 'POST',
        body: JSON.stringify({
            listing_id: listingId,
            quantity,
            size: size ? String(size).trim() : null
        })
    });
};


// ============================================================
// UPDATE CART ITEM
// PATCH /api/buyer/marketplace/cart/:cartItemId
//
// IMPORTANT: Pass cart_item_id, not listing_id.
// ============================================================

export const updateCartItem = async (
    cartItemId,
    quantity
) => {
    return request(`/buyer/marketplace/cart/${cartItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({
            quantity
        })
    });
};


// ============================================================
// REMOVE CART ITEM
// DELETE /api/buyer/marketplace/cart/:cartItemId
// ============================================================

export const removeFromCart = async (cartItemId) => {
    return request(`/buyer/marketplace/cart/${cartItemId}`, {
        method: 'DELETE'
    });
};


// ============================================================
// ITEM REVIEWS
// GET /api/buyer/marketplace/:listingId/reviews
// ============================================================

export const getItemReviews = async (listingId) => {
    return request(`/buyer/marketplace/${listingId}/reviews`);
};


// ============================================================
// COMPATIBILITY ALIASES
// ============================================================

export const getBuyerWishlist = getWishlist;
export const addFavorite = addToWishlist;
export const removeFavorite = removeFromWishlist;
export const getBuyerCart = getCart;
export const addCartItem = addToCart;
export const updateCart = updateCartItem;
export const removeCartItem = removeFromCart;


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
    getMarketplaceItems,
    getMarketplaceCategories,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    getItemReviews
};
