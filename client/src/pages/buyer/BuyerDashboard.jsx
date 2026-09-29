import React, {
  useEffect,
  useState
} from 'react';

import {
  ShoppingBag,
  Heart,
  ShoppingCart,
  Package,
  Clock3,
  CheckCircle2,
  Truck,
  XCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Leaf,
  Recycle,
  TreePine,
  Users,
  MessageSquare,
  ArrowLeftRight,
  Sparkles,
  Star
} from 'lucide-react';

import {
  getBuyerDashboard,
  getBuyerPublishedContent
} from '../../services/buyer/buyerApi';

import '../../styles/buyer/BuyerDashboard.css';


// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }
  ).format(amount);
};


const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(
    'en-PH',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  );
};


const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(
    'en-PH',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  );
};


// ============================================================
// FIX FOR CATEGORY OBJECT
// ============================================================

const getCategoryName = (category) => {
  if (!category) {
    return '';
  }

  if (typeof category === 'string') {
    return category;
  }

  if (typeof category === 'number') {
    return String(category);
  }

  if (typeof category === 'object') {
    return (
      category.name ||
      category.category_name ||
      category.title ||
      ''
    );
  }

  return '';
};


const getStatusClass = (status) => {
  const value = String(status || '').toUpperCase();

  if (
    value.includes('COMPLETED') ||
    value.includes('DELIVERED') ||
    value.includes('APPROVED') ||
    value.includes('SUCCESS')
  ) {
    return 'status-success';
  }

  if (
    value.includes('PENDING') ||
    value.includes('PROCESSING') ||
    value.includes('TO SHIP') ||
    value.includes('SHIPPING') ||
    value.includes('CONFIRMED')
  ) {
    return 'status-warning';
  }

  if (
    value.includes('CANCEL') ||
    value.includes('REJECT') ||
    value.includes('FAILED')
  ) {
    return 'status-danger';
  }

  return 'status-neutral';
};


const getStatusIcon = (status) => {
  const value = String(status || '').toUpperCase();

  if (
    value.includes('COMPLETED') ||
    value.includes('DELIVERED') ||
    value.includes('SUCCESS')
  ) {
    return <CheckCircle2 size={14} />;
  }

  if (
    value.includes('SHIPPING') ||
    value.includes('TO SHIP')
  ) {
    return <Truck size={14} />;
  }

  if (
    value.includes('CANCEL') ||
    value.includes('REJECT') ||
    value.includes('FAILED')
  ) {
    return <XCircle size={14} />;
  }

  return <Clock3 size={14} />;
};


const getUserName = (dashboard) => {
  const buyer =
    dashboard?.buyer ||
    dashboard?.user ||
    dashboard?.profile ||
    {};

  const firstName =
    buyer.first_name ||
    buyer.firstName ||
    '';

  const lastName =
    buyer.last_name ||
    buyer.lastName ||
    '';

  const fullName =
    buyer.name ||
    buyer.full_name ||
    buyer.fullName ||
    `${firstName} ${lastName}`.trim();

  return fullName || 'Buyer';
};


const getFirstName = (dashboard) => {
  const buyer =
    dashboard?.buyer ||
    dashboard?.user ||
    dashboard?.profile ||
    {};

  return (
    buyer.first_name ||
    buyer.firstName ||
    getUserName(dashboard).split(' ')[0] ||
    'Buyer'
  );
};


// ============================================================
// EMPTY STATS
// ============================================================

const EMPTY_STATS = {
  totalOrders: 0,
  pendingOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  wishlistItems: 0,
  cartItems: 0,
  totalSpent: 0
};


// ============================================================
// PAGINATION
// ============================================================

const PaginationControls = ({
  page,
  totalPages,
  total,
  onPrevious,
  onNext
}) => {

  if (Number(total || 0) <= 10) {
    return null;
  }

  return (
    <div className="buyer-pagination">

      <span className="buyer-pagination-info">
        Page {page} of {totalPages}
        <small>
          {total} total items
        </small>
      </span>

      <div className="buyer-pagination-buttons">

        <button
          type="button"
          onClick={onPrevious}
          disabled={page <= 1}
        >
          Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
        >
          Next
        </button>

      </div>

    </div>
  );
};



// ============================================================
// CONTENT HELPERS
// ============================================================

const getContentTypeLabel = (type) => {

  const value =
    String(type || '')
      .toUpperCase();

  const labels = {
    ANNOUNCEMENT: 'Announcement',
    NEWS: 'News',
    BANNER: 'Update',
    PAGE: 'Page',
    FAQ: 'FAQ',
    POLICY: 'Policy'
  };

  return (
    labels[value] ||
    'Update'
  );
};


const getContentPreview = (content) => {

  const plainText =
    String(content || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();

  if (!plainText) {
    return 'No additional details available.';
  }

  if (plainText.length <= 150) {
    return plainText;
  }

  return `${plainText.slice(0, 147)}...`;
};

// ============================================================
// COMPONENT
// ============================================================

const BuyerDashboard = () => {

  const [dashboard, setDashboard] = useState(null);

  const [recentOrders, setRecentOrders] = useState([]);

  const [recommendedProducts, setRecommendedProducts] = useState([]);

  const [publishedContent, setPublishedContent] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  const [purchasesPage, setPurchasesPage] = useState(1);

  const [activityPage, setActivityPage] = useState(1);

  const PURCHASES_PAGE_SIZE = 10;
  const ACTIVITY_PAGE_SIZE = 5;


  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadDashboard = async (
    showRefresh = false,
    paginationOverrides = {}
  ) => {

    const nextPurchasesPage =
      paginationOverrides.purchasesPage ??
      purchasesPage;

    const nextActivityPage =
      paginationOverrides.activityPage ??
      activityPage;

    try {

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const [
        dashboardResult,
        contentResult
      ] = await Promise.allSettled([

        getBuyerDashboard({
          purchasesPage: nextPurchasesPage,
          activityPage: nextActivityPage,
          limit: PURCHASES_PAGE_SIZE
        }),

        getBuyerPublishedContent({
          limit: 6
        })

      ]);

      if (
        dashboardResult.status === 'rejected'
      ) {

        throw dashboardResult.reason;

      }

      const dashboardResponse =
        dashboardResult.value;

      const dashboardData =
        dashboardResponse?.dashboard ||
        dashboardResponse?.data ||
        dashboardResponse ||
        {};

      setDashboard(dashboardData);

      if (
        contentResult.status === 'fulfilled'
      ) {

        const contentResponse =
          contentResult.value;

        const contentData =
          Array.isArray(contentResponse?.data)
            ? contentResponse.data
            : Array.isArray(contentResponse)
              ? contentResponse
              : [];

        setPublishedContent(
          contentData
        );

      } else {

        /*
         * Content is supplementary to the dashboard.
         * If there is no published content yet, the dashboard
         * should still load normally.
         */
        console.warn(
          'Buyer published content:',
          contentResult.reason
        );

        setPublishedContent([]);

      }

      setRecentOrders(
        Array.isArray(
          dashboardData?.recentPurchases
        )
          ? dashboardData.recentPurchases
          : []
      );

      setRecommendedProducts(
        Array.isArray(
          dashboardData?.recommendedProducts
        )
          ? dashboardData.recommendedProducts
          : []
      );

      if (
        paginationOverrides.purchasesPage !== undefined
      ) {
        setPurchasesPage(
          nextPurchasesPage
        );
      }

      if (
        paginationOverrides.activityPage !== undefined
      ) {
        setActivityPage(
          nextActivityPage
        );
      }

    } catch (err) {

      console.error(
        'Buyer Dashboard:',
        err
      );

      setError(
        err?.message ||
        'Unable to load buyer dashboard.'
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  };


  useEffect(() => {
    loadDashboard();
  }, []);


  // ==========================================================
  // DATA NORMALIZATION
  // ==========================================================

  const stats =
    dashboard?.stats ||
    dashboard?.statistics ||
    dashboard ||
    EMPTY_STATS;


  const normalizedStats = {

    totalOrders:
      Number(
        stats.totalOrders ??
        stats.total_orders ??
        0
      ),

    pendingOrders:
      Number(
        stats.pendingOrders ??
        stats.pending_orders ??
        0
      ),

    completedOrders:
      Number(
        stats.completedOrders ??
        stats.completed_orders ??
        0
      ),

    cancelledOrders:
      Number(
        stats.cancelledOrders ??
        stats.cancelled_orders ??
        0
      ),

    wishlistItems:
      Number(
        stats.wishlistItems ??
        stats.wishlist_items ??
        stats.favorites ??
        0
      ),

    cartItems:
      Number(
        stats.cartItems ??
        stats.cart_items ??
        0
      ),

    totalSpent:
      Number(
        stats.totalSpent ??
        stats.total_spent ??
        0
      )

  };


  // ==========================================================
  // DATABASE-BACKED OPTIONAL DATA
  // ==========================================================

  const impact =
    dashboard?.environmentalImpact ||
    dashboard?.environmental_impact ||
    dashboard?.impact ||
    {};

  const co2Saved =
    Number(
      impact.co2Saved ??
      impact.co2_saved ??
      dashboard?.co2Saved ??
      dashboard?.co2_saved ??
      0
    );

  const itemsReused =
    Number(
      impact.itemsReused ??
      impact.items_reused ??
      dashboard?.itemsReused ??
      dashboard?.items_reused ??
      0
    );

  const treesEquivalent =
    Number(
      impact.treesEquivalent ??
      impact.trees_equivalent ??
      dashboard?.treesEquivalent ??
      dashboard?.trees_equivalent ??
      0
    );

  const communitiesHelped =
    Number(
      impact.communitiesHelped ??
      impact.communities_helped ??
      dashboard?.communitiesHelped ??
      dashboard?.communities_helped ??
      0
    );


  const activities =
    dashboard?.recentActivity ||
    dashboard?.recent_activity ||
    dashboard?.activities ||
    dashboard?.activity ||
    [];


  const normalizedActivities =
    Array.isArray(activities)
      ? activities
      : [];


  // ==========================================================
  // REUSE ACTIVITY COUNTS
  // ==========================================================

  const readActivityCount = (
    source,
    keys
  ) => {

    for (const key of keys) {

      const value =
        source?.[key];

      if (
        value !== undefined &&
        value !== null &&
        Number.isFinite(Number(value))
      ) {
        return Number(value);
      }

    }

    return 0;
  };


  const purchaseActivityCount =
    readActivityCount(
      dashboard,
      [
        'purchaseCount',
        'purchase_count',
        'purchases',
        'totalPurchases',
        'total_purchases'
      ]
    ) ||
    normalizedStats.totalOrders;

  const donationActivityCount =
    readActivityCount(
      dashboard,
      [
        'donationCount',
        'donation_count',
        'donations',
        'totalDonations',
        'total_donations'
      ]
    );

  const tradeActivityCount =
    readActivityCount(
      dashboard,
      [
        'tradeCount',
        'trade_count',
        'trades',
        'totalTrades',
        'total_trades'
      ]
    );

  const otherActivityCount =
    readActivityCount(
      dashboard,
      [
        'otherActivityCount',
        'other_activity_count',
        'otherActivities',
        'other_activities'
      ]
    );

  const reuseActivityTotal =
    purchaseActivityCount +
    donationActivityCount +
    tradeActivityCount +
    otherActivityCount;

  const purchaseActivityPercent =
    reuseActivityTotal > 0
      ? (purchaseActivityCount / reuseActivityTotal) * 100
      : 0;

  const donationActivityPercent =
    reuseActivityTotal > 0
      ? (donationActivityCount / reuseActivityTotal) * 100
      : 0;

  const tradeActivityPercent =
    reuseActivityTotal > 0
      ? (tradeActivityCount / reuseActivityTotal) * 100
      : 0;

  const otherActivityPercent =
    reuseActivityTotal > 0
      ? (otherActivityCount / reuseActivityTotal) * 100
      : 0;

  const recentPurchasesPagination =
    dashboard?.recentPurchasesPagination ||
    {
      page: purchasesPage,
      limit: 10,
      total: recentOrders.length,
      totalPages: 1
    };

  const recentActivityPagination =
    dashboard?.recentActivityPagination ||
    {
      page: activityPage,
      limit: 10,
      total: normalizedActivities.length,
      totalPages: 1
    };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading &&
    !dashboard
  ) {

    return (
      <main className="buyer-dashboard">

        <div className="buyer-dashboard-loading">

          <div className="buyer-spinner" />

          <p>
            Loading dashboard...
          </p>

        </div>

      </main>
    );

  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error &&
    !dashboard
  ) {

    return (
      <main className="buyer-dashboard">

        <section className="buyer-error-card">

          <div className="buyer-error-icon">

            <AlertCircle
              size={30}
            />

          </div>

          <h2>
            Unable to load dashboard
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="buyer-retry-btn"
            onClick={() =>
              loadDashboard(true)
            }
          >

            <RefreshCw
              size={17}
            />

            Try Again

          </button>

        </section>

      </main>
    );

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <main className="buyer-dashboard">

      {/* ======================================================
          SIX STATS — KEEP THESE AT THE TOP
      ====================================================== */}

      <section className="buyer-stats-grid">

        <article className="buyer-stat-card">

          <div className="buyer-stat-icon purple">
            <ShoppingBag size={22} />
          </div>

          <div className="buyer-stat-content">

            <span>
              Total Orders
            </span>

            <strong>
              {normalizedStats.totalOrders}
            </strong>

          </div>

        </article>


        <article className="buyer-stat-card">

          <div className="buyer-stat-icon orange">
            <Clock3 size={22} />
          </div>

          <div className="buyer-stat-content">

            <span>
              Pending Orders
            </span>

            <strong>
              {normalizedStats.pendingOrders}
            </strong>

          </div>

        </article>


        <article className="buyer-stat-card">

          <div className="buyer-stat-icon green">
            <CheckCircle2 size={22} />
          </div>

          <div className="buyer-stat-content">

            <span>
              Completed Orders
            </span>

            <strong>
              {normalizedStats.completedOrders}
            </strong>

          </div>

        </article>


        <article className="buyer-stat-card">

          <div className="buyer-stat-icon pink">
            <Heart size={22} />
          </div>

          <div className="buyer-stat-content">

            <span>
              Wishlist
            </span>

            <strong>
              {normalizedStats.wishlistItems}
            </strong>

          </div>

        </article>


        <article className="buyer-stat-card">

          <div className="buyer-stat-icon blue">
            <ShoppingCart size={22} />
          </div>

          <div className="buyer-stat-content">

            <span>
              Cart Items
            </span>

            <strong>
              {normalizedStats.cartItems}
            </strong>

          </div>

        </article>


        <article className="buyer-stat-card">

          <div className="buyer-stat-icon teal">
            <Package size={22} />
          </div>

          <div className="buyer-stat-content">

            <span>
              Total Spent
            </span>

            <strong className="buyer-money">
              {formatCurrency(
                normalizedStats.totalSpent
              )}
            </strong>

          </div>

        </article>

      </section>


      {/* ======================================================
          FEATURE ROW
      size={18} />

                  <h2>
                    Announcements & Updates
                  </h2>

                </div>

                <p>
                  Latest published updates from ReUse Connect
                </p>

              </div>

            </div>


            <div className="buyer-updates-list">

              {publishedContent.map(
                (item) => {

                  const contentId =
                    item.content_id ??
                    item.id;

                  const contentType =
                    getContentTypeLabel(
                      item.content_type
                    );

                  const publishedDate =
                    item.published_at ??
                    item.updated_at ??
                    item.created_at;

                  return (

                    <article
                      className="buyer-update-card"
                      key={contentId}
                    >

                      <div className="buyer-update-icon">

                        <Sparkles size={17} />

                      </div>

                      <div className="buyer-update-content">

                        <div className="buyer-update-meta">

                          <span className="buyer-update-type">
                            {contentType}
                          </span>

                          <span>
                            {formatDate(publishedDate)}
                          </span>

                        </div>

                        <h3>
                          {item.title || 'ReUse Connect Update'}
                        </h3>

                        <p>
                          {getContentPreview(
                            item.content
                          )}
                        </p>

                      </div>

                    </article>

                  );

                }
              )}

            </div>

          </div>

        </section>

      )}


      {/* ======================================================
          RECENT PURCHASES + RECOMMENDED
      ====================================================== */}

      <section className="buyer-content-grid">

        {/* ====================================================
            RECENT PURCHASES
        ==================================================== */}

        <div className="buyer-large-panel">

          <div className="buyer-panel-header">

            <div>

              <div className="buyer-section-title">

                <ShoppingCart size={18} />

                <h2>
                  Recent Purchases
                </h2>

              </div>

              <p>
                Your latest purchases
              </p>

            </div>

            <button
              type="button"
              className="buyer-view-all"
              onClick={() => {
                window.location.href =
                  '/buyer/transactions';
              }}
            >

              View all

              <ArrowRight size={15} />

            </button>

          </div>


          <div className="buyer-purchases-list">

            {recentOrders.length === 0 ? (

              <div className="buyer-empty-purchases">

                <div className="buyer-empty-icon">
                  <ShoppingBag size={27} />
                </div>

                <h3>
                  No orders yet
                </h3>

                <p>
                  Your purchases will appear here.
                </p>

              </div>

            ) : (

              recentOrders
                .map((order, index) => {

                  const orderId =
                    order.orderId ??
                    order.order_id ??
                    order.id ??
                    index;

                  const orderNumber =
                    order.orderNumber ??
                    order.order_number ??
                    order.order_code ??
                    `#${orderId}`;

                  const date =
                    order.date ??
                    order.created_at ??
                    order.order_date;

                  const itemCount =
                    order.itemCount ??
                    order.item_count ??
                    order.items_count ??
                    order.quantity ??
                    0;

                  const total =
                    order.total ??
                    order.total_amount ??
                    order.amount ??
                    0;

                  const status =
                    order.status ??
                    'Pending';

                  const itemName =
                    order.itemName ??
                    order.item_name ??
                    order.product_name ??
                    order.listing_title ??
                    order.title ??
                    'Order';


                  /*
                   * FIX:
                   * category can be either a string or an object.
                   * Example object:
                   * {
                   *   category_id,
                   *   name,
                   *   description,
                   *   image_url
                   * }
                   */
                  const category =
                    getCategoryName(
                      order.category_name ??
                      order.category
                    ) ||
                    'ReUse Connect';


                  return (

                    <div
                      className="buyer-purchase-row"
                      key={orderId}
                    >

                      <div className="buyer-purchase-image">

                        <Package size={24} />

                      </div>

                      <div className="buyer-purchase-info">

                        <strong>
                          {itemName}
                        </strong>

                        <span>
                          {category}
                        </span>

                      </div>

                      <div className="buyer-purchase-date">

                        {formatDate(date)}

                      </div>

                      <div className="buyer-purchase-status">

                        <span
                          className={
                            `buyer-status ${getStatusClass(status)}`
                          }
                        >

                          {getStatusIcon(status)}

                          {status}

                        </span>

                      </div>

                      <strong className="buyer-purchase-total">

                        {formatCurrency(total)}

                      </strong>

                      <ArrowRight
                        size={15}
                        className="buyer-row-arrow"
                      />

                    </div>

                  );

                })

            )}

          </div>

          <PaginationControls
            page={
              recentPurchasesPagination.page ||
              purchasesPage
            }
            totalPages={
              recentPurchasesPagination.totalPages ||
              1
            }
            total={
              recentPurchasesPagination.total ||
              0
            }
            onPrevious={() => {
              const nextPage =
                Math.max(
                  1,
                  (recentPurchasesPagination.page || purchasesPage) - 1
                );

              loadDashboard(
                false,
                {
                  purchasesPage: nextPage
                }
              );
            }}
            onNext={() => {
              const nextPage =
                Math.min(
                  recentPurchasesPagination.totalPages || 1,
                  (recentPurchasesPagination.page || purchasesPage) + 1
                );

              loadDashboard(
                false,
                {
                  purchasesPage: nextPage
                }
              );
            }}
          />

        </div>


        {/* ====================================================
            RECOMMENDED FOR YOU
        ==================================================== */}

        <div className="buyer-large-panel">

          <div className="buyer-panel-header">

            <div>

              <div className="buyer-section-title">

                <Sparkles size={18} />

                <h2>
                  Recommended for You
                </h2>

              </div>

              <p>
                Items available in the marketplace
              </p>

            </div>

            <button
              type="button"
              className="buyer-view-all"
              onClick={() => {
                window.location.href =
                  '/buyer/marketplace';
              }}
            >

              View all

              <ArrowRight size={15} />

            </button>

          </div>


          <div className="buyer-products-grid">

            {recommendedProducts.length === 0 ? (

              <div className="buyer-empty-products">

                <div className="buyer-empty-icon">

                  <Package size={27} />

                </div>

                <h3>
                  No products available
                </h3>

                <p>
                  Marketplace items will appear here.
                </p>

              </div>

            ) : (

              recommendedProducts
                .map((product, index) => {

                  const productId =
                    product.listing_id ??
                    product.product_id ??
                    product.id ??
                    index;

                  const title =
                    product.title ??
                    product.name ??
                    'Untitled item';


                  /*
                   * FIX:
                   * product.category can be an object from
                   * the database instead of a string.
                   */
                  const category =
                    getCategoryName(
                      product.category_name ??
                      product.category
                    ) ||
                    'Category';


                  const price =
                    product.price ??
                    product.selling_price ??
                    0;

                  const rating =
                    product.average_rating ??
                    product.rating ??
                    null;


                  return (

                    <article
                      className="buyer-product-card"
                      key={productId}
                    >

                      <div className="buyer-product-image">

                        {product.image_url ||
                        product.image ? (

                          <img
                            src={
                              product.image_url ||
                              product.image
                            }
                            alt={title}
                          />

                        ) : (

                          <Package size={32} />

                        )}

                        <button
                          type="button"
                          className="buyer-product-heart"
                          aria-label="Add to wishlist"
                          onClick={() => {
                            window.location.href =
                              `/buyer/marketplace/${productId}`;
                          }}
                        >

                          <Heart size={15} />

                        </button>

                      </div>


                      <div className="buyer-product-info">

                        <strong>
                          {title}
                        </strong>

                        <span>
                          {category}
                        </span>

                        <div className="buyer-product-bottom">

                          <strong>
                            {formatCurrency(price)}
                          </strong>

                          {rating !== null && (

                            <span className="buyer-rating">

                              <Star
                                size={12}
                                fill="currentColor"
                              />

                              {Number(rating).toFixed(1)}

                            </span>

                          )}

                        </div>

                      </div>

                    </article>

                  );

                })

            )}

          </div>

        </div>

      </section>


      {/* ======================================================
          ACTIVITY + ENVIRONMENTAL SUMMARY
      ====================================================== */}

      <section className="buyer-bottom-section-grid">

        {/* ====================================================
            RECENT ACTIVITY
        ==================================================== */}

        <div className="buyer-large-panel buyer-activity-panel">

          <div className="buyer-panel-header">

            <div>

              <div className="buyer-section-title">

                <Clock3 size={18} />

                <h2>
                  Your Recent Activity
                </h2>

              </div>

              <p>
                Your latest account activities
              </p>

            </div>

          </div>


          <div className="buyer-activity-table-wrap">

            {normalizedActivities.length === 0 ? (

              <div className="buyer-empty-activity">

                <div className="buyer-empty-icon">

                  <Clock3 size={27} />

                </div>

                <h3>
                  No recent activity
                </h3>

                <p>
                  Your account activities will appear here.
                </p>

              </div>

            ) : (

              <table className="buyer-activity-table">

                <thead>

                  <tr>

                    <th>
                      Date & Time
                    </th>

                    <th>
                      Activity
                    </th>

                    <th>
                      Details
                    </th>

                    <th>
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {normalizedActivities.map(
                    (activity, index) => {

                      const activityType =
                        activity.activity ??
                        activity.type ??
                        activity.action ??
                        'Activity';

                      const details =
                        activity.details ??
                        activity.description ??
                        activity.item_name ??
                        '—';

                      const activityStatus =
                        activity.status ??
                        'Completed';

                      const activityDate =
                        activity.date ??
                        activity.created_at ??
                        activity.timestamp;

                      return (

                        <tr
                          key={
                            activity.activityId ??
                            activity.activity_id ??
                            activity.id ??
                            index
                          }
                        >

                          <td>
                            {formatDateTime(activityDate)}
                          </td>

                          <td>
                            {activityType}
                          </td>

                          <td>
                            {details}
                          </td>

                          <td>

                            <span
                              className={
                                `buyer-status ${getStatusClass(activityStatus)}`
                              }
                            >

                              {getStatusIcon(activityStatus)}

                              {activityStatus}

                            </span>

                          </td>

                        </tr>

                      );

                    }
                  )}

                </tbody>

              </table>

            )}

          </div>

          <PaginationControls
            page={
              recentActivityPagination.page ||
              activityPage
            }
            totalPages={
              recentActivityPagination.totalPages ||
              1
            }
            total={
              recentActivityPagination.total ||
              0
            }
            onPrevious={() => {
              const nextPage =
                Math.max(
                  1,
                  (recentActivityPagination.page || activityPage) - 1
                );

              loadDashboard(
                false,
                {
                  activityPage: nextPage
                }
              );
            }}
            onNext={() => {
              const nextPage =
                Math.min(
                  recentActivityPagination.totalPages || 1,
                  (recentActivityPagination.page || activityPage) + 1
                );

              loadDashboard(
                false,
                {
                  activityPage: nextPage
                }
              );
            }}
          />

        </div>


        {/* ====================================================
            ENVIRONMENTAL IMPACT
        ==================================================== */}

        <div className="buyer-large-panel buyer-environment-panel">

          <div className="buyer-panel-header">

            <div>

              <div className="buyer-section-title">

                <Leaf size={18} />

                <h2>
                  Environmental Impact Summary
                </h2>

              </div>

              <p>
                The difference your reuse activity makes
              </p>

            </div>

          </div>


          <div className="buyer-environment-content">

            <div className="buyer-impact-stat-grid">

              <div className="buyer-impact-stat">

                <Leaf size={22} />

                <strong>
                  {co2Saved}
                </strong>

                <span>
                  kg CO₂ saved
                </span>

              </div>


              <div className="buyer-impact-stat">

                <Recycle size={22} />

                <strong>
                  {itemsReused}
                </strong>

                <span>
                  Items reused
                </span>

              </div>


              <div className="buyer-impact-stat">

                <TreePine size={22} />

                <strong>
                  {treesEquivalent}
                </strong>

                <span>
                  Trees equivalent
                </span>

              </div>


              <div className="buyer-impact-stat">

                <Users size={22} />

                <strong>
                  {communitiesHelped}
                </strong>

                <span>
                  Communities helped
                </span>

              </div>

            </div>


            <div className="buyer-reuse-progress">

              <div className="buyer-progress-header">

                <span>
                  Your Reuse Activities
                </span>

                <strong>
                  {reuseActivityTotal}
                </strong>

              </div>


              <div className="buyer-progress-bar">

                <div
                  className="buyer-progress-purchases"
                  style={{
                    width:
                      `${purchaseActivityPercent}%`
                  }}
                />

                <div
                  className="buyer-progress-donations"
                  style={{
                    width:
                      `${donationActivityPercent}%`
                  }}
                />

                <div
                  className="buyer-progress-trades"
                  style={{
                    width:
                      `${tradeActivityPercent}%`
                  }}
                />

                <div
                  className="buyer-progress-other"
                  style={{
                    width:
                      `${otherActivityPercent}%`
                  }}
                />

              </div>


              <div className="buyer-progress-legend">

                <span>

                  <i className="purchase-dot" />

                  Purchases

                </span>

                <span>

                  <i className="donation-dot" />

                  Donations

                </span>

                <span>

                  <i className="trade-dot" />

                  Trades

                </span>

                <span>

                  <i className="other-dot" />

                  Other

                </span>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          ANNOUNCEMENTS & UPDATES
          COMPACT TABLE
      ====================================================== */}

      {publishedContent.length > 0 && (

        <section className="buyer-content-updates">

          <div className="buyer-updates-panel">

            <div className="buyer-panel-header">

              <div>

                <div className="buyer-section-title">

                  <MessageSquare size={17} />

                  <h2>
                    Announcements & Updates
                  </h2>

                </div>

                <p>
                  Latest published updates from ReUse Connect
                </p>

              </div>

            </div>


            <div className="buyer-updates-table-wrap">

              <table className="buyer-updates-table">

                <thead>

                  <tr>

                    <th>
                      Type
                    </th>

                    <th>
                      Title
                    </th>

                    <th>
                      Published
                    </th>

                    <th>
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {publishedContent.map(
                    (item) => {

                      const contentId =
                        item.content_id ??
                        item.id;

                      const contentType =
                        getContentTypeLabel(
                          item.content_type
                        );

                      const publishedDate =
                        item.published_at ??
                        item.updated_at ??
                        item.created_at;

                      return (

                        <tr
                          key={contentId}
                        >

                          <td>

                            <span className="buyer-update-type">
                              {contentType}
                            </span>

                          </td>

                          <td>

                            <div className="buyer-update-title-cell">

                              <span className="buyer-update-icon">
                                <Sparkles size={14} />
                              </span>

                              <div>

                                <strong>
                                  {item.title ||
                                    'ReUse Connect Update'}
                                </strong>

                                <p>
                                  {getContentPreview(
                                    item.content
                                  )}
                                </p>

                              </div>

                            </div>

                          </td>

                          <td>
                            {formatDate(
                              publishedDate
                            )}
                          </td>

                          <td>

                            <span className="buyer-update-status">
                              Published
                            </span>

                          </td>

                        </tr>

                      );

                    }
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </section>

      )}

    </main>

  );

};


export default BuyerDashboard;