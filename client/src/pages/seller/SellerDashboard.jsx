import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  Package,
  Eye,
  Clock3,
  ShoppingBag,
  CheckCircle2,
  PhilippinePeso,
  RefreshCw,
  ArrowUpRight,
  TrendingUp,
  ShoppingCart,
  Star,
  CalendarDays
} from 'lucide-react';

import {
  fetchSellerDashboard,
  getSellerPublishedContent
} from '../../services/seller/sellerApi';

import '../../styles/seller/SellerDashboard.css';


// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (value) => {

  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(amount);

};


const formatNumber = (value) => {

  return new Intl.NumberFormat(
    'en-PH'
  ).format(
    Number(value || 0)
  );

};


const formatDate = (dateValue) => {

  if (!dateValue) {
    return '';
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'en-PH',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  ).format(date);

};


const getSellerName = (seller) => {

  if (!seller) {
    return 'Seller';
  }

  const fullName = [
    seller.first_name,
    seller.last_name
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || 'Seller';

};


const getStatusLabel = (status) => {

  if (!status) {
    return 'Unknown';
  }

  return String(status)
    .toLowerCase()
    .replace(
      /_/g,
      ' '
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );

};


const getStatusClass = (status) => {

  const normalized =
    String(status || '')
      .toLowerCase();

  if (
    normalized === 'available' ||
    normalized === 'active'
  ) {
    return 'status-active';
  }

  if (
    normalized === 'pending'
  ) {
    return 'status-pending';
  }

  if (
    normalized === 'sold' ||
    normalized === 'completed'
  ) {
    return 'status-completed';
  }

  if (
    normalized === 'reserved'
  ) {
    return 'status-reserved';
  }

  if (
    normalized === 'hidden'
  ) {
    return 'status-hidden';
  }

  if (
    normalized === 'rejected' ||
    normalized === 'cancelled'
  ) {
    return 'status-danger';
  }

  return 'status-default';

};


// ============================================================
// CONTENT HELPERS
// ============================================================

const getContentTypeLabel = (type) => {

  const labels = {

    ANNOUNCEMENT:
      'Announcement',

    NEWS:
      'News',

    BANNER:
      'Banner',

    FAQ:
      'FAQ',

    POLICY:
      'Policy',

    PAGE:
      'Page'

  };

  return (
    labels[
      String(
        type || ''
      ).toUpperCase()
    ] ||
    'Update'
  );

};


const getContentPreview = (content) => {

  if (!content) {
    return '';
  }

  const plainText =
    String(content)
      .replace(
        /<[^>]*>/g,
        ' '
      )
      .replace(
        /&nbsp;/gi,
        ' '
      )
      .replace(
        /&amp;/gi,
        '&'
      )
      .replace(
        /&lt;/gi,
        '<'
      )
      .replace(
        /&gt;/gi,
        '>'
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  if (
    plainText.length <= 120
  ) {
    return plainText;
  }

  return `${plainText
    .slice(0, 120)
    .trim()}…`;

};


// ============================================================
// STAT CARD
// ============================================================

const StatCard = ({
  icon: Icon,
  label,
  value,
  type = 'purple',
  subtitle
}) => {

  return (
    <div
      className={
        `seller-stat-card ${type}`
      }
    >

      <div className="seller-stat-icon">

        <Icon
          size={22}
          strokeWidth={2}
        />

      </div>


      <div className="seller-stat-content">

        <span className="seller-stat-label">
          {label}
        </span>

        <strong className="seller-stat-value">
          {formatNumber(value)}
        </strong>

        {subtitle && (

          <span className="seller-stat-subtitle">
            {subtitle}
          </span>

        )}

      </div>

    </div>
  );

};


// ============================================================
// EMPTY STATE
// ============================================================

const EmptyState = ({
  icon: Icon = Package,
  title,
  description
}) => {

  return (
    <div className="seller-empty-state">

      <div className="seller-empty-icon">

        <Icon size={30} />

      </div>

      <strong>
        {title}
      </strong>

      <span>
        {description}
      </span>

    </div>
  );

};


// ============================================================
// SELLER DASHBOARD
// ============================================================

const SellerDashboard = () => {

  const [
    dashboard,
    setDashboard
  ] = useState(null);


  const [
    loading,
    setLoading
  ] = useState(true);


  const [
    error,
    setError
  ] = useState('');


  const [
    refreshing,
    setRefreshing
  ] = useState(false);


  const [
    publishedContent,
    setPublishedContent
  ] = useState([]);


  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard = async (
    isRefresh = false
  ) => {

    try {

      if (isRefresh) {

        setRefreshing(
          true
        );

      } else {

        setLoading(
          true
        );

      }


      setError('');


      const results =
        await Promise.allSettled([
          fetchSellerDashboard(),

          getSellerPublishedContent({
            limit: 6
          })
        ]);


      const dashboardResult =
        results[0];

      const contentResult =
        results[1];


      // ======================================================
      // DASHBOARD
      // ======================================================

      if (
        dashboardResult.status !==
          'fulfilled' ||
        !dashboardResult.value ||
        dashboardResult.value.success !== true
      ) {

        const dashboardResponse =
          dashboardResult.status ===
            'fulfilled'
            ? dashboardResult.value
            : null;


        throw new Error(
          dashboardResponse?.message ||
          'Unable to load seller dashboard.'
        );

      }


      setDashboard(
        dashboardResult.value
      );


      // ======================================================
      // CONTENT
      //
      // Content failure should NOT break dashboard.
      // ======================================================

      if (
        contentResult.status ===
          'fulfilled' &&
        contentResult.value?.success ===
          true
      ) {

        setPublishedContent(
          Array.isArray(
            contentResult.value.data
          )
            ? contentResult.value.data
            : []
        );

      } else {

        console.warn(
          'Seller published content could not be loaded:',
          contentResult.reason ||
          contentResult.value?.message
        );

        setPublishedContent([]);

      }

    } catch (err) {

      console.error(
        'Seller dashboard:',
        err
      );


      setError(
        err?.message ||
        'Unable to load seller dashboard.'
      );

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    loadDashboard();

  }, []);


  // ==========================================================
  // DATA
  // ==========================================================

  const seller =
    dashboard?.seller || {};


  const stats =
    dashboard?.stats || {};


  const recentListings =
    Array.isArray(
      dashboard?.recentListings
    )
      ? dashboard.recentListings
      : [];


  const recentOrders =
    Array.isArray(
      dashboard?.recentOrders
    )
      ? dashboard.recentOrders
      : [];


  const monthlySales =
    Array.isArray(
      dashboard?.monthlySales
    )
      ? dashboard.monthlySales
      : [];


  // ==========================================================
  // CHART DATA
  // ==========================================================

  const chartData =
    useMemo(() => {

      return monthlySales.map(
        (item) => ({

          label:
            item.month || '',

          sales:
            Number(
              item.sales || 0
            )

        })
      );

    }, [monthlySales]);


  const chartMax =
    useMemo(() => {

      if (
        chartData.length === 0
      ) {
        return 1;
      }


      const maximum =
        Math.max(
          ...chartData.map(
            item =>
              item.sales
          )
        );


      return maximum > 0
        ? maximum
        : 1;

    }, [chartData]);


  // ==========================================================
  // SVG LINE POINTS
  // ==========================================================

  const chartPoints =
    useMemo(() => {

      if (
        chartData.length === 0
      ) {
        return '';
      }


      const width = 620;
      const height = 220;

      const horizontalPadding = 24;
      const verticalPadding = 24;


      const usableWidth =
        width -
        horizontalPadding * 2;


      const usableHeight =
        height -
        verticalPadding * 2;


      return chartData
        .map(
          (
            item,
            index
          ) => {

            const x =
              chartData.length === 1
                ? width / 2
                : horizontalPadding +
                  (
                    index /
                    (
                      chartData.length -
                      1
                    )
                  ) *
                  usableWidth;


            const y =
              verticalPadding +
              usableHeight -
              (
                item.sales /
                chartMax
              ) *
              usableHeight;


            return `${x},${y}`;

          }
        )
        .join(' ');

    }, [
      chartData,
      chartMax
    ]);


  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading &&
    !dashboard
  ) {

    return (

      <main className="seller-dashboard">

        <div className="seller-dashboard-loading">

          <div className="seller-loading-spinner">

            <RefreshCw
              size={24}
            />

          </div>

          <strong>
            Loading dashboard...
          </strong>

          <span>
            Getting your latest seller data.
          </span>

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

      <main className="seller-dashboard">

        <div className="seller-dashboard-error">

          <div className="seller-error-icon">

            <Package
              size={28}
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
            className="seller-retry-button"
            onClick={() =>
              loadDashboard()
            }
          >

            <RefreshCw
              size={17}
            />

            Try Again

          </button>

        </div>

      </main>

    );

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <main className="seller-dashboard">


      {/* ======================================================
          DATABASE STATISTICS
          ====================================================== */}

      <section className="seller-stats-grid">

        <StatCard
          icon={Package}
          label="Total Products"
          value={
            stats.totalProducts
          }
          type="purple"
          subtitle="Your listings"
        />


        <StatCard
          icon={Eye}
          label="Active Products"
          value={
            stats.activeProducts
          }
          type="green"
          subtitle="Currently available"
        />


        <StatCard
          icon={Clock3}
          label="Pending Products"
          value={
            stats.pendingProducts
          }
          type="orange"
          subtitle="Waiting for approval"
        />


        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={
            stats.totalOrders
          }
          type="blue"
          subtitle="Orders containing your items"
        />


        <StatCard
          icon={CheckCircle2}
          label="Completed Orders"
          value={
            stats.completedOrders
          }
          type="teal"
          subtitle="Successfully completed"
        />


        <StatCard
          icon={PhilippinePeso}
          label="Total Sales"
          value={
            stats.totalSales
          }
          type="gold"
          subtitle="All seller order items"
        />

      </section>


      {/* ======================================================
          MIDDLE SECTION
          ====================================================== */}

      <section className="seller-dashboard-middle">


        {/* ====================================================
            SALES OVERVIEW
            ==================================================== */}

        <div className="seller-panel seller-sales-panel">

          <div className="seller-panel-header">

            <div>

              <div className="seller-panel-title">

                <TrendingUp
                  size={19}
                />

                <h2>
                  Sales Overview
                </h2>

              </div>

              <p>
                Completed sales from the last 6 months.
              </p>

            </div>


            <div className="seller-panel-total">

              <span>
                Total Sales
              </span>

              <strong>
                {formatCurrency(
                  stats.totalSales
                )}
              </strong>

            </div>

          </div>


          {chartData.length === 0 ? (

            <EmptyState
              icon={TrendingUp}
              title="No sales data yet"
              description="Sales will appear here once your orders have completed."
            />

          ) : (

            <div className="seller-sales-chart">

              <div className="seller-chart-y-axis">

                <span>
                  {formatCurrency(
                    chartMax
                  )}
                </span>

                <span>
                  {formatCurrency(
                    chartMax / 2
                  )}
                </span>

                <span>
                  ₱0.00
                </span>

              </div>


              <div className="seller-chart-area">

                <div className="seller-chart-grid">

                  <span />
                  <span />
                  <span />
                  <span />

                </div>


                <svg
                  className="seller-line-chart"
                  viewBox="0 0 620 220"
                  preserveAspectRatio="none"
                >

                  <polyline
                    points={
                      chartPoints
                    }
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />


                  {chartData.map(
                    (
                      item,
                      index
                    ) => {

                      const width = 620;
                      const height = 220;

                      const horizontalPadding = 24;
                      const verticalPadding = 24;


                      const usableWidth =
                        width -
                        horizontalPadding *
                          2;


                      const usableHeight =
                        height -
                        verticalPadding *
                          2;


                      const x =
                        chartData.length ===
                        1
                          ? width / 2
                          : horizontalPadding +
                            (
                              index /
                              (
                                chartData.length -
                                1
                              )
                            ) *
                            usableWidth;


                      const y =
                        verticalPadding +
                        usableHeight -
                        (
                          item.sales /
                          chartMax
                        ) *
                        usableHeight;


                      return (

                        <circle
                          key={
                            `${item.label}-${index}`
                          }
                          cx={x}
                          cy={y}
                          r="5"
                          fill="currentColor"
                        />

                      );

                    }
                  )}

                </svg>


                <div className="seller-chart-labels">

                  {chartData.map(
                    (
                      item,
                      index
                    ) => (

                      <span
                        key={
                          `${item.label}-${index}`
                        }
                      >
                        {item.label}
                      </span>

                    )
                  )}

                </div>

              </div>

            </div>

          )}

        </div>


        {/* ====================================================
            ORDER SUMMARY
            ==================================================== */}

        <div className="seller-panel seller-order-summary-panel">

          <div className="seller-panel-title">

            <ShoppingCart
              size={19}
            />

            <h2>
              Order Summary
            </h2>

          </div>


          <p className="seller-panel-description">
            Current order status from your database.
          </p>


          <div className="seller-order-summary-list">

            <div className="seller-order-summary-row">

              <span>
                Pending
              </span>

              <strong>
                {formatNumber(
                  stats.pendingOrders
                )}
              </strong>

            </div>


            <div className="seller-order-summary-row">

              <span>
                Processing
              </span>

              <strong>
                {formatNumber(
                  stats.processingOrders
                )}
              </strong>

            </div>


            <div className="seller-order-summary-row">

              <span>
                Shipped
              </span>

              <strong>
                {formatNumber(
                  stats.shippedOrders
                )}
              </strong>

            </div>


            <div className="seller-order-summary-row">

              <span>
                Delivered
              </span>

              <strong>
                {formatNumber(
                  stats.deliveredOrders
                )}
              </strong>

            </div>


            <div className="seller-order-summary-row">

              <span>
                Completed
              </span>

              <strong>
                {formatNumber(
                  stats.completedOrders
                )}
              </strong>

            </div>


            <div className="seller-order-summary-row">

              <span>
                Cancelled
              </span>

              <strong>
                {formatNumber(
                  stats.cancelledOrders
                )}
              </strong>

            </div>

          </div>


          <div className="seller-order-summary-total">

            <span>
              Total Orders
            </span>

            <strong>
              {formatNumber(
                stats.totalOrders
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* ======================================================
          LOWER SECTION
          ====================================================== */}

      <section className="seller-dashboard-bottom">


        {/* ====================================================
            RECENT LISTINGS
            ==================================================== */}

        <div className="seller-panel seller-listings-panel">

          <div className="seller-panel-header">

            <div>

              <div className="seller-panel-title">

                <Package
                  size={19}
                />

                <h2>
                  Recent Listings
                </h2>

              </div>

              <p>
                Your latest products from the database.
              </p>

            </div>

          </div>


          {recentListings.length === 0 ? (

            <EmptyState
              icon={Package}
              title="No listings yet"
              description="Your products will appear here after you create a listing."
            />

          ) : (

            <div className="seller-listings-table-wrapper">

              <table className="seller-listings-table">

                <thead>

                  <tr>

                    <th>
                      Item
                    </th>

                    <th>
                      Price
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Condition
                    </th>

                    <th>
                      Quantity
                    </th>

                    <th>
                      Date
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {recentListings.map(
                    (
                      listing
                    ) => (

                      <tr
                        key={
                          listing.listing_id
                        }
                      >

                        <td>

                          <div className="seller-listing-item">

                            <div className="seller-listing-image">

                              {listing.image_url ? (

                                <img
                                  src={
                                    listing.image_url
                                  }
                                  alt={
                                    listing.title ||
                                    'Listing'
                                  }
                                />

                              ) : (

                                <Package
                                  size={20}
                                />

                              )}

                            </div>


                            <div className="seller-listing-info">

                              <strong>
                                {
                                  listing.title ||
                                  'Untitled listing'
                                }
                              </strong>

                              <span>
                                {
                                  listing.category_name ||
                                  'Uncategorized'
                                }
                              </span>

                            </div>

                          </div>

                        </td>


                        <td>
                          {formatCurrency(
                            listing.price
                          )}
                        </td>


                        <td>

                          <span
                            className={
                              `seller-status-badge ${
                                getStatusClass(
                                  listing.status
                                )
                              }`
                            }
                          >
                            {
                              getStatusLabel(
                                listing.status
                              )
                            }
                          </span>

                        </td>


                        <td>
                          {
                            listing.condition ||
                            '—'
                          }
                        </td>


                        <td>
                          {formatNumber(
                            listing.quantity
                          )}
                        </td>


                        <td>
                          {formatDate(
                            listing.created_at
                          )}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* ====================================================
            RECENT ORDERS
            ==================================================== */}

        <div className="seller-panel seller-recent-orders-panel">

          <div className="seller-panel-header">

            <div>

              <div className="seller-panel-title">

                <ShoppingBag
                  size={19}
                />

                <h2>
                  Recent Orders
                </h2>

              </div>

              <p>
                Latest orders containing your products.
              </p>

            </div>

          </div>


          {recentOrders.length === 0 ? (

            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              description="Orders containing your products will appear here."
            />

          ) : (

            <div className="seller-recent-orders-list">

              {recentOrders.map(
                (
                  order
                ) => {

                  const buyerName = [
                    order.buyer_first_name,
                    order.buyer_last_name
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .trim();


                  return (

                    <div
                      className="seller-recent-order"
                      key={
                        order.order_id
                      }
                    >

                      <div className="seller-order-icon">

                        <ShoppingBag
                          size={18}
                        />

                      </div>


                      <div className="seller-order-content">

                        <div className="seller-order-top">

                          <strong>
                            {
                              order.order_number ||
                              `Order #${order.order_id}`
                            }
                          </strong>

                          <span
                            className={
                              `seller-status-badge ${
                                getStatusClass(
                                  order.status
                                )
                              }`
                            }
                          >
                            {
                              getStatusLabel(
                                order.status
                              )
                            }
                          </span>

                        </div>


                        <span className="seller-order-buyer">

                          {buyerName ||
                            'Buyer'}

                          {' • '}

                          {formatNumber(
                            order.item_count
                          )}

                          {' item(s)'}

                        </span>


                        <span className="seller-order-date">

                          <CalendarDays
                            size={13}
                          />

                          {formatDate(
                            order.created_at
                          )}

                        </span>

                      </div>


                      <strong className="seller-order-amount">

                        {formatCurrency(
                          order.total_amount
                        )}

                      </strong>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </div>

      </section>


      {/* ======================================================
          SELLER PERFORMANCE
          ====================================================== */}

      <section className="seller-panel seller-performance-panel">

        <div className="seller-panel-title">

          <Star
            size={19}
          />

          <h2>
            Seller Performance
          </h2>

        </div>


        <p className="seller-panel-description">
          Review information stored in your database.
        </p>


        <div className="seller-performance-grid">

          <div className="seller-performance-card">

            <span>
              Average Rating
            </span>

            <strong>
              {Number(
                stats.averageRating ||
                0
              ).toFixed(2)}
            </strong>

          </div>


          <div className="seller-performance-card">

            <span>
              Total Reviews
            </span>

            <strong>
              {formatNumber(
                stats.totalReviews
              )}
            </strong>

          </div>


          <div className="seller-performance-card">

            <span>
              5-Star Reviews
            </span>

            <strong>
              {formatNumber(
                stats.fiveStar
              )}
            </strong>

          </div>


          <div className="seller-performance-card">

            <span>
              Completed Sales
            </span>

            <strong>
              {formatCurrency(
                stats.completedSales
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* ======================================================
          ANNOUNCEMENTS & UPDATES
          ====================================================== */}

      <section className="seller-panel seller-content-panel">

        <div className="seller-panel-header">

          <div>

            <div className="seller-panel-title">

              <ArrowUpRight
                size={19}
              />

              <h2>
                Announcements &amp; Updates
              </h2>

            </div>

            <p>
              Published updates from ReUse Connect.
            </p>

          </div>

        </div>


        {publishedContent.length === 0 ? (

          <EmptyState
            icon={ArrowUpRight}
            title="No announcements yet"
            description="Published announcements and updates from the admin will appear here."
          />

        ) : (

          <div className="seller-content-table-wrapper">

            <table className="seller-content-table">

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
                  (
                    item
                  ) => (

                    <tr
                      key={
                        item.content_id
                      }
                    >

                      <td>

                        <span className="seller-content-type">

                          {
                            getContentTypeLabel(
                              item.content_type
                            )
                          }

                        </span>

                      </td>


                      <td>

                        <div className="seller-content-title-cell">

                          <strong>
                            {
                              item.title ||
                              'Untitled update'
                            }
                          </strong>


                          {item.content && (

                            <span>
                              {
                                getContentPreview(
                                  item.content
                                )
                              }
                            </span>

                          )}

                        </div>

                      </td>


                      <td>

                        {
                          formatDate(
                            item.published_at ||
                            item.created_at
                          )
                        }

                      </td>


                      <td>

                        <span className="seller-content-status">

                          Published

                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* ======================================================
          DATABASE INFORMATION
          ====================================================== */}

      <div className="seller-dashboard-footer-info">

        <span>
          Logged in as
        </span>

        <strong>
          {getSellerName(
            seller
          )}
        </strong>

        <span className="seller-footer-separator">
          •
        </span>

        <span>
          Seller account
        </span>

      </div>

    </main>

  );

};


export default SellerDashboard;