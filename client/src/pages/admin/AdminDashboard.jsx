import React, { useEffect, useMemo, useState } from 'react';

import {
  Users,
  Store,
  ShoppingCart,
  Leaf,
  UserRound,
  UserCheck,
  Clock,
  BarChart3,
  Package,
  RefreshCw
} from 'lucide-react';

import {
  getAdminDashboard,
  getAuth
} from '../../services/api';

import '../../styles/Admin.css';
import '../../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const auth = getAuth();

      if (!auth.token) {
        throw new Error('Admin authentication is required.');
      }

      const response = await getAdminDashboard();

      setDashboard(
        response?.data ||
        response ||
        null
      );

    } catch (err) {
      console.error(
        'ADMIN DASHBOARD ERROR:',
        err
      );

      setError(
        err?.message ||
        'Unable to load admin dashboard data.'
      );

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // ==========================================================
  // SAFE HELPERS
  // ==========================================================

  const getNumber = (...values) => {
    for (const value of values) {
      const number = Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }

    return 0;
  };

  const getArray = (...values) => {
    for (const value of values) {
      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  };

  // ==========================================================
  // DASHBOARD DATA
  // ==========================================================

  const stats =
    dashboard?.stats ||
    dashboard?.statistics ||
    {};

  const totalUsers = getNumber(
    stats.totalUsers,
    stats.total_users,
    dashboard?.totalUsers,
    dashboard?.total_users
  );

  const totalListings = getNumber(
    stats.totalListings,
    stats.total_listings,
    dashboard?.totalListings,
    dashboard?.total_listings
  );

  const totalOrders = getNumber(
    stats.totalOrders,
    stats.total_orders,
    dashboard?.totalOrders,
    dashboard?.total_orders
  );

  const totalEarnings = getNumber(
    stats.totalEarnings,
    stats.total_earnings,
    stats.platformEarnings,
    stats.platform_earnings,
    dashboard?.totalEarnings,
    dashboard?.total_earnings,
    dashboard?.platformEarnings,
    dashboard?.platform_earnings
  );

  // ==========================================================
  // ACTIVITY DATA
  // ==========================================================

  const activity = getArray(
    dashboard?.activity,
    dashboard?.activities,
    dashboard?.platformActivity,
    dashboard?.platform_activity,
    dashboard?.chartData,
    dashboard?.chart_data
  );

  const recentActivity = getArray(
    dashboard?.recentActivity,
    dashboard?.recent_activity,
    dashboard?.activities
  );

  // ==========================================================
  // USER DISTRIBUTION
  // ==========================================================

  const userDistribution = getArray(
    dashboard?.userDistribution,
    dashboard?.user_distribution,
    dashboard?.usersByRole,
    dashboard?.users_by_role
  );

  const buyerCount = getNumber(
    dashboard?.buyers,
    dashboard?.buyerCount,
    dashboard?.buyer_count,
    stats.buyers,
    stats.buyerCount,
    stats.buyer_count
  );

  const sellerCount = getNumber(
    dashboard?.sellers,
    dashboard?.sellerCount,
    dashboard?.seller_count,
    stats.sellers,
    stats.sellerCount,
    stats.seller_count
  );

  const adminCount = getNumber(
    dashboard?.admins,
    dashboard?.adminCount,
    dashboard?.admin_count,
    stats.admins,
    stats.adminCount,
    stats.admin_count
  );

  const calculatedDistribution = useMemo(() => {
    if (userDistribution.length > 0) {
      return userDistribution;
    }

    const result = [];

    if (buyerCount > 0) {
      result.push({
        role: 'BUYER',
        count: buyerCount
      });
    }

    if (sellerCount > 0) {
      result.push({
        role: 'SELLER',
        count: sellerCount
      });
    }

    if (adminCount > 0) {
      result.push({
        role: 'ADMIN',
        count: adminCount
      });
    }

    return result;
  }, [
    userDistribution,
    buyerCount,
    sellerCount,
    adminCount
  ]);

  // ==========================================================
  // TOP SELLING CATEGORIES
  // ==========================================================

  const categories = getArray(
    dashboard?.topSellingCategories,
    dashboard?.top_selling_categories,
    dashboard?.topCategories,
    dashboard?.top_categories
  );

  // ==========================================================
  // PLATFORM CHART
  // ==========================================================

  const chartWidth = 700;
  const chartHeight = 230;

  const chartLeft = 45;
  const chartRight = 680;
  const chartTop = 20;
  const chartBottom = 185;

  const getChartValue = (item, key) => {
    return getNumber(
      item?.[key],
      item?.[key?.toLowerCase()],
      item?.[
        key === 'users'
          ? 'user_count'
          : key === 'listings'
          ? 'listing_count'
          : 'order_count'
      ],
      0
    );
  };

  const buildPoints = (key) => {
    if (!activity.length) {
      return '';
    }

    const values = activity.map(
      (item) =>
        getChartValue(item, key)
    );

    const maxValue = Math.max(
      ...values,
      1
    );

    return values
      .map((value, index) => {
        const x =
          activity.length === 1
            ? (chartLeft + chartRight) / 2
            : chartLeft +
              (
                index /
                (activity.length - 1)
              ) *
                (
                  chartRight -
                  chartLeft
                );

        const y =
          chartBottom -
          (value / maxValue) *
            (
              chartBottom -
              chartTop
            );

        return `${x},${y}`;
      })
      .join(' ');
  };

  const usersPoints =
    buildPoints('users');

  const listingsPoints =
    buildPoints('listings');

  const ordersPoints =
    buildPoints('orders');

  const getActivityLabel = (
    item,
    index
  ) => {
    return (
      item?.date ||
      item?.label ||
      item?.day ||
      item?.created_at ||
      `Day ${index + 1}`
    );
  };

  // ==========================================================
  // DONUT CHART
  // ==========================================================

  const donutSegments = useMemo(() => {
    if (!calculatedDistribution.length) {
      return [];
    }

    const total = calculatedDistribution.reduce(
      (sum, item) =>
        sum +
        getNumber(
          item?.count,
          item?.total,
          item?.user_count,
          item?.userCount
        ),
      0
    );

    if (total <= 0) {
      return [];
    }

    let current = 0;

    return calculatedDistribution.map(
      (item) => {
        const count = getNumber(
          item?.count,
          item?.total,
          item?.user_count,
          item?.userCount
        );

        const percentage =
          (count / total) * 100;

        const start = current;

        current += percentage;

        const role = String(
          item?.role ||
          item?.name ||
          item?.label ||
          'OTHER'
        ).toUpperCase();

        let color = '#9b98aa';

        if (role === 'BUYER') {
          color = '#6432d7';
        } else if (role === 'SELLER') {
          color = '#27a987';
        } else if (role === 'ADMIN') {
          color = '#f0a12b';
        }

        return {
          role,
          count,
          percentage,
          start,
          end: current,
          color
        };
      }
    );
  }, [calculatedDistribution]);

  const donutBackground =
    donutSegments.length > 0
      ? `conic-gradient(${donutSegments
          .map(
            (segment) =>
              `${segment.color} ${segment.start}% ${segment.end}%`
          )
          .join(', ')})`
      : '#eeedf5';

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="dashboard-spinner"></div>

        <span>
          Loading admin dashboard...
        </span>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="admin-dashboard-error">

        <BarChart3 size={34} />

        <h3>
          Unable to load dashboard
        </h3>

        <p>
          {error}
        </p>

        <button
          type="button"
          onClick={loadDashboard}
        >
          Try Again
        </button>

      </div>
    );
  }

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  return (
    <div className="admin-dashboard">

      {/* ======================================================
          KPI CARDS
      ====================================================== */}

      <div className="dashboard-kpi-grid">

        {/* TOTAL USERS */}

        <div className="kpi-card kpi-users">

          <div className="kpi-icon">
            <Users size={22} />
          </div>

          <div className="kpi-content">

            <span>
              Total Users
            </span>

            <strong>
              {totalUsers.toLocaleString()}
            </strong>

          </div>

        </div>


        {/* TOTAL LISTINGS */}

        <div className="kpi-card kpi-listings">

          <div className="kpi-icon">
            <Store size={22} />
          </div>

          <div className="kpi-content">

            <span>
              Total Listings
            </span>

            <strong>
              {totalListings.toLocaleString()}
            </strong>

          </div>

        </div>


        {/* TOTAL ORDERS */}

        <div className="kpi-card kpi-orders">

          <div className="kpi-icon">
            <ShoppingCart size={22} />
          </div>

          <div className="kpi-content">

            <span>
              Total Orders
            </span>

            <strong>
              {totalOrders.toLocaleString()}
            </strong>

          </div>

        </div>


        {/* TOTAL EARNINGS */}

        <div className="kpi-card kpi-earnings">

          <div className="kpi-icon">
            <Leaf size={22} />
          </div>

          <div className="kpi-content">

            <span>
              Total Earnings (Platform Fee)
            </span>

            <strong>
              ₱
              {totalEarnings.toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }
              )}
            </strong>

          </div>

        </div>

      </div>


      {/* ======================================================
          PLATFORM OVERVIEW + USER DISTRIBUTION
      ====================================================== */}

      <div className="dashboard-main-grid">

        {/* ====================================================
            PLATFORM OVERVIEW
        ==================================================== */}

        <section className="dashboard-panel platform-panel">

          <div className="panel-header">

            <div>

              <h2>
                Platform Overview
              </h2>

              <p>
                Platform activity over time
              </p>

            </div>

            {activity.length > 0 && (
              <div className="period-buttons">

                <button
                  type="button"
                  className="active"
                >
                  7 Days
                </button>

                <button type="button">
                  30 Days
                </button>

                <button type="button">
                  90 Days
                </button>

              </div>
            )}

          </div>


          {activity.length === 0 ? (

            <div className="empty-dashboard-row">

              <BarChart3 size={34} />

              <strong>
                No activity trend data yet
              </strong>

              <span>
                Activity will appear here when
                database records are available.
              </span>

            </div>

          ) : (

            <div className="platform-chart">

              {/* LEGEND */}

              <div className="chart-legend">

                <span>
                  <i className="legend-dot users-dot"></i>
                  Users
                </span>

                <span>
                  <i className="legend-dot listings-dot"></i>
                  Listings
                </span>

                <span>
                  <i className="legend-dot orders-dot"></i>
                  Orders
                </span>

              </div>


              {/* LINE CHART */}

              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="platform-chart-svg"
                preserveAspectRatio="none"
              >

                {/* GRID */}

                {[0, 1, 2, 3, 4].map(
                  (line) => {

                    const y =
                      chartTop +
                      (
                        line / 4
                      ) *
                        (
                          chartBottom -
                          chartTop
                        );

                    return (
                      <line
                        key={line}
                        x1={chartLeft}
                        x2={chartRight}
                        y1={y}
                        y2={y}
                        className="chart-grid-line"
                      />
                    );
                  }
                )}


                {/* USERS */}

                {usersPoints && (
                  <polyline
                    points={usersPoints}
                    className="chart-line users-line"
                    fill="none"
                  />
                )}


                {/* LISTINGS */}

                {listingsPoints && (
                  <polyline
                    points={listingsPoints}
                    className="chart-line listings-line"
                    fill="none"
                  />
                )}


                {/* ORDERS */}

                {ordersPoints && (
                  <polyline
                    points={ordersPoints}
                    className="chart-line orders-line"
                    fill="none"
                  />
                )}


                {/* POINTS */}

                {activity.map(
                  (item, index) => {

                    const x =
                      activity.length === 1
                        ? (
                            chartLeft +
                            chartRight
                          ) / 2
                        : chartLeft +
                          (
                            index /
                            (
                              activity.length -
                              1
                            )
                          ) *
                            (
                              chartRight -
                              chartLeft
                            );

                    const userValue =
                      getChartValue(
                        item,
                        'users'
                      );

                    const listingValue =
                      getChartValue(
                        item,
                        'listings'
                      );

                    const orderValue =
                      getChartValue(
                        item,
                        'orders'
                      );

                    const maxValue =
                      Math.max(
                        ...activity.map(
                          (activityItem) =>
                            Math.max(
                              getChartValue(
                                activityItem,
                                'users'
                              ),
                              getChartValue(
                                activityItem,
                                'listings'
                              ),
                              getChartValue(
                                activityItem,
                                'orders'
                              )
                            )
                        ),
                        1
                      );

                    const userY =
                      chartBottom -
                      (
                        userValue /
                        maxValue
                      ) *
                        (
                          chartBottom -
                          chartTop
                        );

                    const listingY =
                      chartBottom -
                      (
                        listingValue /
                        maxValue
                      ) *
                        (
                          chartBottom -
                          chartTop
                        );

                    const orderY =
                      chartBottom -
                      (
                        orderValue /
                        maxValue
                      ) *
                        (
                          chartBottom -
                          chartTop
                        );

                    return (
                      <React.Fragment
                        key={`points-${index}`}
                      >

                        <circle
                          cx={x}
                          cy={userY}
                          r="4"
                          className="users-point"
                        />

                        <circle
                          cx={x}
                          cy={listingY}
                          r="4"
                          className="listings-point"
                        />

                        <circle
                          cx={x}
                          cy={orderY}
                          r="4"
                          className="orders-point"
                        />

                        <text
                          x={x}
                          y="210"
                          textAnchor="middle"
                          className="chart-date-text"
                        >
                          {getActivityLabel(
                            item,
                            index
                          )}
                        </text>

                      </React.Fragment>
                    );
                  }
                )}

              </svg>

            </div>

          )}

        </section>


        {/* ====================================================
            USER DISTRIBUTION
        ==================================================== */}

        <section className="dashboard-panel distribution-panel">

          <div className="panel-header">

            <div>

              <h2>
                User Distribution
              </h2>

              <p>
                Registered users by role
              </p>

            </div>

          </div>


          {calculatedDistribution.length === 0 ? (

            <div className="empty-dashboard-row">

              <UserRound size={34} />

              <strong>
                No users yet.
              </strong>

              <span>
                User distribution will appear after
                registrations are available.
              </span>

            </div>

          ) : (

            <div className="distribution-content">

              {/* DONUT */}

              <div
                className="donut-chart"
                style={{
                  background:
                    donutBackground
                }}
              >

                <div className="donut-hole">

                  <strong>
                    {totalUsers.toLocaleString()}
                  </strong>

                  <span>
                    Total Users
                  </span>

                </div>

              </div>


              {/* ROLE LIST */}

              <div className="distribution-list">

                {donutSegments.map(
                  (segment, index) => {

                    const role =
                      segment.role;

                    const label =
                      role === 'BUYER'
                        ? 'Buyers'
                        : role === 'SELLER'
                        ? 'Sellers'
                        : role === 'ADMIN'
                        ? 'Admins'
                        : 'Others';

                    return (
                      <div
                        className="distribution-row"
                        key={`${role}-${index}`}
                      >

                        <span className="distribution-name">

                          <i
                            style={{
                              background:
                                segment.color
                            }}
                          ></i>

                          {label}

                        </span>

                        <strong>
                          {segment.count.toLocaleString()}
                        </strong>

                        <small>
                          {segment.percentage.toFixed(
                            1
                          )}
                          %
                        </small>

                      </div>
                    );
                  }
                )}

              </div>

            </div>

          )}

        </section>

      </div>


      {/* ======================================================
          RECENT ACTIVITY + TOP SELLING CATEGORIES
      ====================================================== */}

      <div className="dashboard-bottom-grid">

        {/* ====================================================
            RECENT ACTIVITY
        ==================================================== */}

        <section className="dashboard-panel activity-panel">

          <div className="panel-header">

            <div>

              <h2>
                Recent Activity
              </h2>

              <p>
                Latest records from the platform
              </p>

            </div>

            {recentActivity.length > 0 && (
              <button
                type="button"
                className="view-all-button"
              >
                View All
                <span>→</span>
              </button>
            )}

          </div>


          {recentActivity.length === 0 ? (

            <div className="empty-dashboard-row">

              <Clock size={34} />

              <strong>
                No activity recorded yet.
              </strong>

              <span>
                Recent platform activities will
                appear here when records are available.
              </span>

            </div>

          ) : (

            <div className="activity-table">

              {/* TABLE HEADER */}

              <div className="activity-table-header">

                <div>
                  Date &amp; Time
                </div>

                <div>
                  User
                </div>

                <div>
                  Activity
                </div>

                <div>
                  Details
                </div>

                <div>
                  Status
                </div>

              </div>


              {/* TABLE ROWS */}

              {recentActivity.map(
                (item, index) => {

                  const status =
                    item?.status ||
                    item?.action_status ||
                    'Recorded';

                  const statusValue =
                    String(status)
                      .toLowerCase();

                  let statusClass =
                    'status-neutral';

                  if (
                    statusValue.includes(
                      'complete'
                    ) ||
                    statusValue.includes(
                      'active'
                    ) ||
                    statusValue.includes(
                      'verified'
                    ) ||
                    statusValue.includes(
                      'success'
                    )
                  ) {
                    statusClass =
                      'status-success';

                  } else if (
                    statusValue.includes(
                      'pending'
                    )
                  ) {
                    statusClass =
                      'status-pending';

                  } else if (
                    statusValue.includes(
                      'reject'
                    ) ||
                    statusValue.includes(
                      'inactive'
                    ) ||
                    statusValue.includes(
                      'cancel'
                    )
                  ) {
                    statusClass =
                      'status-danger';
                  }

                  const activityType =
                    String(
                      item?.type ||
                      item?.activity ||
                      item?.action ||
                      ''
                    ).toLowerCase();

                  let iconClass =
                    'user';

                  if (
                    activityType.includes(
                      'listing'
                    )
                  ) {
                    iconClass =
                      'listing';
                  } else if (
                    activityType.includes(
                      'order'
                    )
                  ) {
                    iconClass =
                      'order';
                  }

                  const userName =
                    item?.user_name ||
                    item?.user ||
                    item?.name ||
                    '—';

                  const userRole =
                    item?.role ||
                    item?.user_role ||
                    'User';

                  const initials =
                    String(userName)
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map(
                        (name) =>
                          name.charAt(0)
                      )
                      .join('')
                      .toUpperCase() ||
                    'U';

                  return (
                    <div
                      className="activity-table-row"
                      key={index}
                    >

                      {/* DATE */}

                      <div className="activity-date">

                        <div
                          className={`activity-icon ${iconClass}`}
                        >
                          {iconClass ===
                          'listing' ? (
                            <Package size={14} />
                          ) : iconClass ===
                            'order' ? (
                            <ShoppingCart size={14} />
                          ) : (
                            <UserRound size={14} />
                          )}
                        </div>

                        <span>
                          {item?.date ||
                            item?.datetime ||
                            item?.created_at ||
                            '—'}
                        </span>

                      </div>


                      {/* USER */}

                      <div className="activity-user">

                        <div className="user-avatar-small">
                          {initials}
                        </div>

                        <div>

                          <strong>
                            {userName}
                          </strong>

                          <small>
                            {userRole}
                          </small>

                        </div>

                      </div>


                      {/* ACTION */}

                      <div className="activity-action">

                        {item?.action ||
                          item?.activity ||
                          item?.type ||
                          '—'}

                      </div>


                      {/* DETAILS */}

                      <div className="activity-details">

                        {item?.details ||
                          item?.description ||
                          '—'}

                      </div>


                      {/* STATUS */}

                      <span
                        className={`activity-status ${statusClass}`}
                      >
                        {status}
                      </span>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>


        {/* ====================================================
            TOP SELLING CATEGORIES
        ==================================================== */}

        <section className="dashboard-panel categories-panel">

          <div className="panel-header">

            <div>

              <h2>
                Top Selling Categories
              </h2>

              <p>
                Based on completed orders
              </p>

            </div>

          </div>


          {categories.length === 0 ? (

            <div className="empty-category-state">

              <Package size={34} />

              <strong>
                No category sales yet.
              </strong>

              <span>
                Category performance will appear when
                completed orders are available.
              </span>

            </div>

          ) : (

            <div className="category-list">

              {categories.map(
                (item, index) => {

                  const name =
                    item?.category_name ||
                    item?.category ||
                    item?.name ||
                    'Category';

                  const orders =
                    getNumber(
                      item?.orders,
                      item?.order_count,
                      item?.completed_orders,
                      item?.completedOrders
                    );

                  const percentage =
                    getNumber(
                      item?.percentage,
                      item?.percent,
                      item?.share
                    );

                  return (
                    <div
                      className="category-item"
                      key={`${name}-${index}`}
                    >

                      <div className="category-top">

                        <div className="category-title">

                          <div className="category-rank">
                            <Package size={14} />
                          </div>

                          <div>

                            <strong>
                              {name}
                            </strong>

                            <span>
                              {orders.toLocaleString()}
                              {' '}
                              orders
                            </span>

                          </div>

                        </div>

                        <span className="category-percent">
                          {percentage.toFixed(1)}%
                        </span>

                      </div>


                      <div className="category-progress">

                        <div
                          className="category-progress-fill"
                          style={{
                            width: `${Math.min(
                              Math.max(
                                percentage,
                                0
                              ),
                              100
                            )}%`
                          }}
                        ></div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

      </div>


      {/* ======================================================
          REFRESH
      ====================================================== */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '10px'
        }}
      >

        <button
          type="button"
          onClick={loadDashboard}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid #ddd8ef',
            background: '#ffffff',
            color: '#5630a8',
            borderRadius: '6px',
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >

          <RefreshCw size={16} />

          Refresh

        </button>

      </div>

    </div>
  );
};

export default AdminDashboard;