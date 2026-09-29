const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';


const request = async (endpoint, options = {}) => {
  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Something went wrong while loading the marketplace.'
    );
  }

  return data;
};


export const getGuestHome = () =>
  request('/guest/home');


export const getGuestCategories = () =>
  request('/guest/categories');


export const getGuestListings = ({
  search = '',
  category = '',
  minPrice = '',
  maxPrice = '',
  condition = '',
  sort = 'newest'
} = {}) => {

  const params = new URLSearchParams();

  if (search) {
    params.set('search', search);
  }

  if (category) {
    params.set('category', category);
  }

  if (minPrice) {
    params.set('minPrice', minPrice);
  }

  if (maxPrice) {
    params.set('maxPrice', maxPrice);
  }

  if (condition) {
    params.set('condition', condition);
  }

  if (sort) {
    params.set('sort', sort);
  }

  return request(
    `/guest/listings?${params.toString()}`
  );
};


export const getGuestListing = (listingId) =>
  request(`/guest/listings/${listingId}`);