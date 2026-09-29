import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import GuestHeader from '../components/guest/GuestHeader';
import GuestFooter from '../components/guest/GuestFooter';

import {
  getGuestHome,
  getGuestListings
} from '../services/guestApi';

import '../styles/GuestPage.css';


const categoryIcons = {
  electronics: '▣',
  furniture: '▰',
  'fashion & accessories': '♧',
  'books & stationery': '▤',
  'home & living': '⌂',
  'sports & outdoors': '◉',
  others: '▦'
};


const GuestPage = () => {

  const navigate = useNavigate();


  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState({});

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [sort, setSort] = useState('newest');

  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState('');


  /*
  ============================================================
  LOAD INITIAL DATA
  ============================================================
  */

  const loadHome = async () => {

    try {

      setLoading(true);
      setError('');

      const data = await getGuestHome();

      setCategories(data.categories || []);
      setListings(data.listings || []);
      setStats(data.stats || {});

    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        'Marketplace data could not be loaded.'
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {
    loadHome();
  }, []);


  /*
  ============================================================
  SEARCH / FILTER
  ============================================================
  */

  const handleSearch = async () => {

    try {

      setFilterLoading(true);
      setError('');

      const data = await getGuestListings({
        search,
        category,
        minPrice,
        maxPrice,
        condition,
        sort
      });

      setListings(data.listings || []);

    } catch (err) {

      setError(err.message);

    } finally {

      setFilterLoading(false);

    }
  };


  const handleCategoryClick = async (categoryId) => {

    setCategory(String(categoryId));

    try {

      setFilterLoading(true);

      const data = await getGuestListings({
        search,
        category: String(categoryId),
        minPrice,
        maxPrice,
        condition,
        sort
      });

      setListings(data.listings || []);

    } catch (err) {

      setError(err.message);

    } finally {

      setFilterLoading(false);

    }
  };


  const clearFilters = async () => {

    setSearch('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setCondition('');
    setSort('newest');

    try {

      setFilterLoading(true);

      const data = await getGuestListings();

      setListings(data.listings || []);

    } catch (err) {

      setError(err.message);

    } finally {

      setFilterLoading(false);

    }
  };


  /*
  ============================================================
  CATEGORY LABEL
  ============================================================
  */

  const selectedCategoryName = useMemo(() => {

    const found = categories.find(
      item =>
        String(item.category_id) === String(category)
    );

    return found?.name || '';

  }, [categories, category]);


  /*
  ============================================================
  HELPERS
  ============================================================
  */

  const formatPrice = (price) => {

    return new Intl.NumberFormat(
      'en-PH',
      {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0
      }
    ).format(Number(price || 0));

  };


  const formatCondition = (value) => {

    if (!value) return '';

    return value
      .replace('_', ' ')
      .replace(/\b\w/g, char =>
        char.toUpperCase()
      );

  };


  const getSellerName = (listing) => {

    return `${listing.seller_first_name || ''} ${
      listing.seller_last_name || ''
    }`.trim() || 'Seller';

  };


  const getCategoryIcon = (name) => {

    const key =
      String(name || '')
        .toLowerCase();

    return categoryIcons[key] || '▦';

  };


  /*
  ============================================================
  GUEST ACTION
  ============================================================
  */

  const requireLogin = () => {

    const confirmed = window.confirm(
      'Please log in or register to use this feature.'
    );

    if (confirmed) {
      navigate('/login');
    }

  };


  /*
  ============================================================
  RENDER
  ============================================================
  */

  return (
    <div className="guest-page">

      <GuestHeader />


      <main>

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="guest-hero">

          <div className="hero-copy">

            <div className="hero-eyebrow">
              SHOP • DONATE • TRADE • MAKE AN IMPACT
            </div>

            <h1>
              Give Pre-loved Items a
              <span> Brighter Future</span>
            </h1>

            <p>
              Find quality reusable items, support
              sustainable living, and be part of a
              circular economy.
            </p>

            <button
              className="hero-button"
              onClick={() =>
                document
                  .getElementById('marketplace')
                  ?.scrollIntoView({
                    behavior: 'smooth'
                  })
              }
            >
              Browse Marketplace
              <span>→</span>
            </button>

          </div>


          <div className="hero-visual">

            <div className="hero-leaf leaf-one">
              ❧
            </div>

            <div className="hero-plant">
              🌱
            </div>

            <div className="hero-bag">
              ♻
            </div>

          </div>

        </section>


        {/* ====================================================
            WHY REUSE
        ==================================================== */}

        <section
          className="why-card"
          id="about"
        >

          <div className="why-title">
            <span>❧</span>
            <h2>Why ReUse Connect?</h2>
          </div>

          <div className="why-item">
            <span>♧</span>
            <div>
              <strong>Reduce Waste</strong>
              <small>
                Give items a second life
              </small>
            </div>
          </div>

          <div className="why-item">
            <span>♙</span>
            <div>
              <strong>
                Support Local Sellers
              </strong>
              <small>
                Help local communities
              </small>
            </div>
          </div>

          <div className="why-item">
            <span>◷</span>
            <div>
              <strong>Save Money</strong>
              <small>
                Get great deals
              </small>
            </div>
          </div>

          <div className="why-item">
            <span>✣</span>
            <div>
              <strong>
                Create a Greener Future
              </strong>
              <small>
                Together we make a difference
              </small>
            </div>
          </div>

        </section>


        {/* ====================================================
            CATEGORIES
        ==================================================== */}

        <section
          className="categories-section"
          id="categories"
        >

          <div className="section-heading">
            <h2>Browse Categories</h2>

            {selectedCategoryName && (
              <button
                onClick={clearFilters}
              >
                Clear filter
              </button>
            )}
          </div>


          <div className="category-grid">

            {categories.length === 0 ? (

              <div className="empty-category">
                No categories available yet.
              </div>

            ) : (

              categories.map((item) => (

                <button
                  key={item.category_id}
                  className={
                    String(item.category_id) ===
                    String(category)
                      ? 'category-card selected'
                      : 'category-card'
                  }
                  onClick={() =>
                    handleCategoryClick(
                      item.category_id
                    )
                  }
                >

                  <div className="category-icon">
                    {getCategoryIcon(item.name)}
                  </div>

                  <strong>
                    {item.name}
                  </strong>

                  <small>
                    {item.listing_count} items
                  </small>

                </button>

              ))

            )}

          </div>

        </section>


        {/* ====================================================
            MARKETPLACE
        ==================================================== */}

        <section
          className="marketplace-section"
          id="marketplace"
        >

          <div className="filter-bar">

            <div className="search-field">

              <span>⌕</span>

              <input
                type="text"
                placeholder="Search items, categories, or sellers..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />

            </div>


            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
              }}
            >

              <option value="">
                Category
              </option>

              {categories.map((item) => (
                <option
                  key={item.category_id}
                  value={item.category_id}
                >
                  {item.name}
                </option>
              ))}

            </select>


            <select
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value)
              }
            >

              <option value="">
                Condition
              </option>

              <option value="NEW">
                New
              </option>

              <option value="LIKE_NEW">
                Like New
              </option>

              <option value="GOOD">
                Good
              </option>

              <option value="FAIR">
                Fair
              </option>

              <option value="POOR">
                Poor
              </option>

            </select>


            <select
              value={sort}
              onChange={(e) =>
                setSort(e.target.value)
              }
            >

              <option value="newest">
                Newest
              </option>

              <option value="oldest">
                Oldest
              </option>

              <option value="price_low">
                Lowest Price
              </option>

              <option value="price_high">
                Highest Price
              </option>

              <option value="name">
                Name
              </option>

            </select>


            <button
              className="search-button"
              onClick={handleSearch}
              disabled={filterLoading}
            >
              {filterLoading
                ? 'Loading...'
                : 'Search'}
            </button>

          </div>


          {/* PRICE FILTER */}

          <div className="price-filter-row">

            <input
              type="number"
              min="0"
              placeholder="Minimum price"
              value={minPrice}
              onChange={(e) =>
                setMinPrice(e.target.value)
              }
            />

            <span>to</span>

            <input
              type="number"
              min="0"
              placeholder="Maximum price"
              value={maxPrice}
              onChange={(e) =>
                setMaxPrice(e.target.value)
              }
            />

            <button
              className="apply-filter"
              onClick={handleSearch}
            >
              Apply
            </button>

            <button
              className="clear-filter"
              onClick={clearFilters}
            >
              Clear
            </button>

          </div>


          <div className="marketplace-heading">

            <div>
              <h2>Featured Listings</h2>

              <p>
                {selectedCategoryName
                  ? `Showing ${selectedCategoryName}`
                  : 'Recently listed reusable items'}
              </p>
            </div>

          </div>


          {loading ? (

            <div className="marketplace-message">
              Loading marketplace...
            </div>

          ) : error ? (

            <div className="marketplace-message error">
              {error}

              <button onClick={loadHome}>
                Try Again
              </button>
            </div>

          ) : listings.length === 0 ? (

            <div className="marketplace-message">

              <strong>
                No listings available yet.
              </strong>

              <p>
                New reusable items will appear here
                once sellers add listings to the
                marketplace.
              </p>

            </div>

          ) : (

            <div className="listing-grid">

              {listings.map((listing) => (

                <article
                  className="listing-card"
                  key={listing.listing_id}
                >

                  <div
                    className="listing-image"
                    onClick={() =>
                      navigate(
                        `/listing/${listing.listing_id}`
                      )
                    }
                  >

                    {listing.image_url ? (

                      <img
                        src={listing.image_url}
                        alt={listing.title}
                      />

                    ) : (

                      <div className="no-image">
                        No image
                      </div>

                    )}


                    <button
                      className="wishlist-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        requireLogin();
                      }}
                    >
                      ♡
                    </button>


                    <span className="condition-badge">
                      {formatCondition(
                        listing.condition
                      )}
                    </span>

                  </div>


                  <div className="listing-content">

                    <span className="listing-category">
                      {listing.category_name}
                    </span>

                    <h3>
                      {listing.title}
                    </h3>

                    <div className="listing-location">
                      ⌖{' '}
                      {listing.location ||
                        'Location not specified'}
                    </div>


                    <div className="listing-price">
                      {formatPrice(
                        listing.price
                      )}
                    </div>


                    <div className="listing-bottom">

                      <div className="seller">

                        {listing.seller_profile_image ? (

                          <img
                            src={
                              listing.seller_profile_image
                            }
                            alt={getSellerName(
                              listing
                            )}
                          />

                        ) : (

                          <div className="seller-avatar">
                            {(
                              listing.seller_first_name ||
                              'S'
                            ).charAt(0)}
                          </div>

                        )}

                        <div>

                          <strong>
                            {getSellerName(
                              listing
                            )}
                          </strong>

                          <small>
                            ★{' '}
                            {Number(
                              listing.seller_rating || 0
                            ).toFixed(1)}

                            {' '}

                            ({listing.review_count || 0})
                          </small>

                        </div>

                      </div>


                      <button
                        className="buy-button"
                        onClick={requireLogin}
                      >
                        Login to buy
                      </button>

                    </div>

                  </div>

                </article>

              ))}

            </div>

          )}

        </section>


        {/* ====================================================
            GUEST ACCESS CARD
        ==================================================== */}

        <section className="guest-access-section">

          <div className="guest-access-card">

            <div className="access-icon">
              ♧
            </div>

            <h2>
              Want to buy,
              <br />
              save, or contact a seller?
            </h2>

            <p>
              Create an account or log in to
              access more features.
            </p>


            <div className="access-list">

              <span>✓ Add to wishlist</span>
              <span>✓ Contact sellers</span>
              <span>✓ Place orders</span>
              <span>✓ Request trades</span>
              <span>✓ Donate items</span>
              <span>✓ Write reviews</span>

            </div>


            <button
              className="access-primary"
              onClick={() =>
                navigate('/login')
              }
            >
              Login / Register
            </button>


            <button
              className="access-secondary"
              onClick={() =>
                document
                  .getElementById('marketplace')
                  ?.scrollIntoView({
                    behavior: 'smooth'
                  })
              }
            >
              Continue Browsing
            </button>

          </div>

        </section>


        {/* ====================================================
            PLATFORM ACTIVITY
        ==================================================== */}

        <section className="impact-section">

          <div className="impact-header">

            <div>
              <h2>
                ReUse Connect in Action
              </h2>

              <p>
                Real activity from our marketplace
              </p>
            </div>

          </div>


          <div className="impact-grid">

            <div className="impact-item">
              <strong>
                {stats.available_listings || 0}
              </strong>
              <span>
                Available Listings
              </span>
            </div>

            <div className="impact-item">
              <strong>
                {stats.active_sellers || 0}
              </strong>
              <span>
                Active Sellers
              </span>
            </div>

            <div className="impact-item">
              <strong>
                {stats.active_users || 0}
              </strong>
              <span>
                Active Users
              </span>
            </div>

            <div className="impact-item">
              <strong>
                {stats.completed_orders || 0}
              </strong>
              <span>
                Completed Orders
              </span>
            </div>

          </div>

        </section>


        <section id="help" className="help-section">

          <h2>
            Reuse more. Waste less.
          </h2>

          <p>
            Explore reusable items from the ReUse
            Connect community.
          </p>

        </section>

      </main>


      <GuestFooter />

    </div>
  );
};

export default GuestPage;