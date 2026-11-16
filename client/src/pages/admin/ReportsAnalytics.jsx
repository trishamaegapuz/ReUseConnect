import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  Users,
  Store,
  ShoppingCart,
  PhilippinePeso,
  CalendarDays,
  ChevronDown,
  TrendingUp,
  Eye,
  Download,
  FileText,
  UserRound,
  Tag,
  WalletCards,
  BarChart3,
  RefreshCw,
  X
} from 'lucide-react';

import {
  getAdminReportsOverview,
  exportAdminReport
} from '../../services/api';

import '../../styles/ReportsAnalytics.css';


/* =========================================================
   HELPERS
========================================================= */

const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 2
    }
  ).format(
    Number(value || 0)
  );
};


const formatNumber = (value) => {
  return new Intl.NumberFormat(
    'en-PH'
  ).format(
    Number(value || 0)
  );
};


const formatDate = (value) => {

  if (!value) {
    return '—';
  }

  return new Date(
    value
  ).toLocaleDateString(
    'en-PH',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  );
};


const getDefaultDates = () => {

  const today = new Date();

  const previous = new Date();

  previous.setDate(
    today.getDate() - 6
  );

  const toInputDate = (date) => {
    return date
      .toISOString()
      .slice(0, 10);
  };

  return {
    startDate:
      toInputDate(previous),

    endDate:
      toInputDate(today)
  };
};


/* =========================================================
   PAGINATION
========================================================= */

const ReportsPagination = ({ page, totalItems, pageSize, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  return (
    <div className="reports-pagination">
      <span>
        Showing {((page - 1) * pageSize) + 1}
        {' '}to{' '}
        {Math.min(page * pageSize, totalItems)}
        {' '}of {totalItems}
      </span>
      <div className="reports-pagination-controls">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
          <button
            type="button"
            key={pageNumber}
            className={pageNumber === page ? 'active' : ''}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          ›
        </button>
      </div>
    </div>
  );
};


/* =========================================================
   COMPONENT
========================================================= */

const ReportsAnalytics = () => {

  const defaults =
    getDefaultDates();


  /* -------------------------------------------------------
     STATE
  ------------------------------------------------------- */

  const [
    data,
    setData
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
    startDate,
    setStartDate
  ] = useState(
    defaults.startDate
  );


  const [
    endDate,
    setEndDate
  ] = useState(
    defaults.endDate
  );


  const [
    selectedCategory,
    setSelectedCategory
  ] = useState(
    'All Categories'
  );


  const [
    activeReport,
    setActiveReport
  ] = useState(null);


  const [
    exportLoading,
    setExportLoading
  ] = useState('');


  const [categoryPage, setCategoryPage] = useState(1);
  const [orderStatusPage, setOrderStatusPage] = useState(1);
  const [topItemsPage, setTopItemsPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [exportsPage, setExportsPage] = useState(1);

  const categoryPageSize = 4;
  const orderStatusPageSize = 4;
  const topItemsPageSize = 5;
  const activityPageSize = 5;
  const exportsPageSize = 5;


  /* -------------------------------------------------------
     LOAD REPORTS
  ------------------------------------------------------- */

  const loadReports = async () => {

    try {

      setLoading(true);

      setError('');

      const result =
        await getAdminReportsOverview({
          startDate,
          endDate,
          category:
            selectedCategory
        });

      setData(result);

    } catch (err) {

      console.error(
        'Reports Analytics:',
        err
      );

      setError(
        err.message ||
        'Unable to load report data.'
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    loadReports();

  }, []);


  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const summary =
    data?.summary || {
      totalUsers: 0,
      totalListings: 0,
      totalOrders: 0,
      totalEarnings: 0
    };


  const categories =
    data?.categories || [];


  const userGrowth =
    data?.userGrowth || [];


  const listingsByCategory =
    data?.listingsByCategory || [];


  const orderStatus =
    data?.orderStatus || [];


  const topSellingItems =
    data?.topSellingItems || [];


  const activity =
    data?.activity || [];


  const paginatedCategories = listingsByCategory.slice(
    (categoryPage - 1) * categoryPageSize,
    categoryPage * categoryPageSize
  );

  const paginatedOrderStatus = orderStatus.slice(
    (orderStatusPage - 1) * orderStatusPageSize,
    orderStatusPage * orderStatusPageSize
  );

  const paginatedTopSellingItems = topSellingItems.slice(
    (topItemsPage - 1) * topItemsPageSize,
    topItemsPage * topItemsPageSize
  );

  const paginatedActivity = activity.slice(
    (activityPage - 1) * activityPageSize,
    activityPage * activityPageSize
  );


  /* -------------------------------------------------------
     CHART VALUES
  ------------------------------------------------------- */

  const maxGrowth =
    Math.max(
      ...userGrowth.map(
        item =>
          Number(
            item.total || 0
          )
      ),
      1
    );


  const maxCategory =
    Math.max(
      ...listingsByCategory.map(
        item =>
          Number(
            item.total || 0
          )
      ),
      1
    );


  const totalOrderStatus =
    orderStatus.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.total || 0
        ),
      0
    );


  /* -------------------------------------------------------
     USER GROWTH SVG
  ------------------------------------------------------- */

  const growthPoints =
    useMemo(() => {

      if (!userGrowth.length) {
        return '';
      }

      const width = 430;

      const height = 150;

      const paddingX = 20;

      const paddingY = 20;

      const usableWidth =
        width -
        paddingX * 2;

      const usableHeight =
        height -
        paddingY * 2;

      return userGrowth
        .map(
          (
            item,
            index
          ) => {

            const x =
              userGrowth.length === 1
                ? width / 2
                : paddingX +
                  (
                    index /
                    (
                      userGrowth.length -
                      1
                    )
                  ) *
                  usableWidth;

            const y =
              height -
              paddingY -
              (
                Number(
                  item.total || 0
                ) /
                maxGrowth
              ) *
              usableHeight;

            return `${x},${y}`;
          }
        )
        .join(' ');

    }, [
      userGrowth,
      maxGrowth
    ]);


  /* =======================================================
     FILTER
  ======================================================= */

  const handleApplyFilters = () => {

    loadReports();

  };


  /* =======================================================
     EXPORT
  ======================================================= */

  const handleExport = async (
    type
  ) => {

    try {

      setExportLoading(
        type
      );

      const result =
        await exportAdminReport(
          type
        );

      const rows =
        result.rows || [];


      if (!rows.length) {

        alert(
          'There is no database data available for this report yet.'
        );

        return;

      }


      const headers =
        Object.keys(
          rows[0]
        );


      const csvRows = [
        headers.join(',')
      ];


      rows.forEach(
        row => {

          const values =
            headers.map(
              header => {

                const value =
                  row[header] ??
                  '';

                return `"${String(
                  value
                ).replace(
                  /"/g,
                  '""'
                )}"`;

              }
            );


          csvRows.push(
            values.join(',')
          );

        }
      );


      const blob =
        new Blob(
          [
            csvRows.join('\n')
          ],
          {
            type:
              'text/csv;charset=utf-8;'
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          'a'
        );


      link.href = url;


      link.download =
        `${type}-report.csv`;


      document.body.appendChild(
        link
      );


      link.click();


      document.body.removeChild(
        link
      );


      URL.revokeObjectURL(
        url
      );

    } catch (err) {

      console.error(
        err
      );

      alert(
        err.message ||
        'Unable to generate report.'
      );

    } finally {

      setExportLoading('');

    }
  };


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div className="reports-page">


      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (

        <div className="reports-error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={loadReports}
          >

            <RefreshCw
              size={15}
            />

            Retry

          </button>

        </div>

      )}


      {/* ===================================================
          KPI STATS
      =================================================== */}

      <section className="reports-kpi-grid">


        {/* TOTAL USERS */}

        <div className="reports-kpi-card">

          <div className="reports-kpi-icon purple">

            <Users
              size={23}
            />

          </div>

          <div className="reports-kpi-content">

            <span>
              Total Users
            </span>

            <strong>
              {loading
                ? '—'
                : formatNumber(
                    summary.totalUsers
                  )}
            </strong>

            <small>
              Registered accounts
            </small>

          </div>

        </div>


        {/* TOTAL LISTINGS */}

        <div className="reports-kpi-card">

          <div className="reports-kpi-icon green">

            <Store
              size={23}
            />

          </div>

          <div className="reports-kpi-content">

            <span>
              Total Listings
            </span>

            <strong>
              {loading
                ? '—'
                : formatNumber(
                    summary.totalListings
                  )}
            </strong>

            <small>
              Marketplace listings
            </small>

          </div>

        </div>


        {/* TOTAL ORDERS */}

        <div className="reports-kpi-card">

          <div className="reports-kpi-icon orange">

            <ShoppingCart
              size={23}
            />

          </div>

          <div className="reports-kpi-content">

            <span>
              Total Orders
            </span>

            <strong>
              {loading
                ? '—'
                : formatNumber(
                    summary.totalOrders
                  )}
            </strong>

            <small>
              Recorded marketplace orders
            </small>

          </div>

        </div>


        {/* TOTAL EARNINGS */}

        <div className="reports-kpi-card">

          <div className="reports-kpi-icon blue">

            <PhilippinePeso
              size={23}
            />

          </div>

          <div className="reports-kpi-content">

            <span>
              Total Earnings
            </span>

            <strong>
              {loading
                ? '—'
                : formatCurrency(
                    summary.totalEarnings
                  )}
            </strong>

            <small>
              Completed orders
            </small>

          </div>

        </div>

      </section>


      {/* ===================================================
          FILTERS
          NOW DIRECTLY AFTER STATS
      =================================================== */}

      <section className="reports-filter-bar">


        {/* START DATE */}

        <div className="report-date-field">

          <CalendarDays
            size={16}
          />

          <div>

            <label>
              Start Date
            </label>

            <input
              type="date"
              value={startDate}
              onChange={
                e =>
                  setStartDate(
                    e.target.value
                  )
              }
            />

          </div>

        </div>


        {/* END DATE */}

        <div className="report-date-field">

          <CalendarDays
            size={16}
          />

          <div>

            <label>
              End Date
            </label>

            <input
              type="date"
              value={endDate}
              onChange={
                e =>
                  setEndDate(
                    e.target.value
                  )
              }
            />

          </div>

        </div>


        {/* CATEGORY */}

        <div className="report-select-field">

          <label>
            Category
          </label>

          <div className="report-select-wrapper">

            <select
              value={
                selectedCategory
              }
              onChange={
                e =>
                  setSelectedCategory(
                    e.target.value
                  )
              }
            >

              <option>
                All Categories
              </option>

              {categories.map(
                category => (

                  <option
                    key={
                      category.id
                    }
                    value={
                      category.name
                    }
                  >
                    {category.name}
                  </option>

                )
              )}

            </select>

            <ChevronDown
              size={15}
            />

          </div>

        </div>


        {/* APPLY */}

        <button
          type="button"
          className="reports-apply-button"
          onClick={
            handleApplyFilters
          }
          disabled={loading}
        >

          <BarChart3
            size={16}
          />

          Apply Filters

        </button>


        {/* REFRESH */}

        <button
          type="button"
          className="reports-refresh-button"
          onClick={
            loadReports
          }
          disabled={loading}
          title="Refresh"
        >

          <RefreshCw
            size={16}
            className={
              loading
                ? 'reports-spin'
                : ''
            }
          />

        </button>

      </section>


      {/* ===================================================
          FIRST ANALYTICS ROW
          3 EQUAL COLUMNS
      =================================================== */}

      <section className="reports-main-grid">


        {/* =================================================
            USER GROWTH
        ================================================= */}

        <div className="reports-panel">

          <div className="reports-panel-header">

            <div>

              <h2>
                User Growth
              </h2>

              <p>
                New users registered within the selected period
              </p>

            </div>

            <TrendingUp
              size={18}
            />

          </div>


          <div className="reports-chart">

            {userGrowth.length === 0 ? (

              <div className="reports-empty-chart">

                <Users
                  size={28}
                />

                <span>
                  No user registration data for this period.
                </span>

              </div>

            ) : (

              <>

                <svg
                  viewBox="0 0 430 150"
                  preserveAspectRatio="none"
                  className="reports-line-chart"
                >

                  <line
                    x1="20"
                    y1="20"
                    x2="20"
                    y2="130"
                  />

                  <line
                    x1="20"
                    y1="130"
                    x2="410"
                    y2="130"
                  />


                  <polyline
                    points={
                      growthPoints
                    }
                    fill="none"
                    className="reports-chart-line"
                  />


                  {userGrowth.map(
                    (
                      item,
                      index
                    ) => {

                      const x =
                        userGrowth.length === 1
                          ? 215
                          : 20 +
                            (
                              index /
                              (
                                userGrowth.length -
                                1
                              )
                            ) *
                            390;


                      const y =
                        130 -
                        (
                          Number(
                            item.total || 0
                          ) /
                          maxGrowth
                        ) *
                        110;


                      return (

                        <circle
                          key={
                            `${item.date}-${index}`
                          }
                          cx={x}
                          cy={y}
                          r="4"
                          className="reports-chart-dot"
                        />

                      );

                    }
                  )}

                </svg>


                <div className="reports-chart-labels">

                  {userGrowth.map(
                    (
                      item,
                      index
                    ) => (

                      <span
                        key={
                          `${item.date}-label-${index}`
                        }
                      >
                        {formatDate(
                          item.date
                        )}
                      </span>

                    )
                  )}

                </div>

              </>

            )}

          </div>

        </div>


        {/* =================================================
            LISTINGS BY CATEGORY
        ================================================= */}

        <div className="reports-panel">

          <div className="reports-panel-header">

            <div>

              <h2>
                Listings by Category
              </h2>

              <p>
                Current listing distribution
              </p>

            </div>

            <Tag
              size={18}
            />

          </div>


          <div className="reports-category-list">

            {listingsByCategory.length === 0 ? (

              <div className="reports-empty-state">

                <Tag
                  size={26}
                />

                <span>
                  No categories or listings found.
                </span>

              </div>

            ) : (

              paginatedCategories
                .map(
                  (
                    item,
                    index
                  ) => {

                    const totalListings =
                      listingsByCategory.reduce(
                        (
                          sum,
                          current
                        ) =>
                          sum +
                          Number(
                            current.total ||
                            0
                          ),
                        0
                      );


                    const percentage =
                      totalListings > 0
                        ? (
                            Number(
                              item.total ||
                              0
                            ) /
                            totalListings
                          ) *
                          100
                        : 0;


                    return (

                      <div
                        className="reports-category-row"
                        key={
                          `${item.category}-${index}`
                        }
                      >

                        <div className="reports-category-top">

                          <span>
                            {item.category}
                          </span>

                          <strong>
                            {formatNumber(
                              item.total
                            )}
                          </strong>

                        </div>


                        <div className="reports-progress-track">

                          <div
                            className="reports-progress-fill"
                            style={{
                              width:
                                `${
                                  (
                                    Number(
                                      item.total ||
                                      0
                                    ) /
                                    maxCategory
                                  ) *
                                  100
                                }%`
                            }}
                          />

                        </div>


                        <small>
                          {percentage.toFixed(
                            1
                          )}%
                        </small>

                      </div>

                    );

                  }
                )

            )}

          </div>

          <ReportsPagination
            page={categoryPage}
            totalItems={listingsByCategory.length}
            pageSize={categoryPageSize}
            onPageChange={setCategoryPage}
          />

        </div>


        {/* =================================================
            ORDER STATUS
        ================================================= */}

        <div className="reports-panel">

          <div className="reports-panel-header">

            <div>

              <h2>
                Order Status
              </h2>

              <p>
                Current order distribution
              </p>

            </div>

            <ShoppingCart
              size={18}
            />

          </div>


          <div className="reports-order-status">

            {orderStatus.length === 0 ? (

              <div className="reports-empty-state">

                <ShoppingCart
                  size={26}
                />

                <span>
                  No orders recorded yet.
                </span>

              </div>

            ) : (

              paginatedOrderStatus.map(
                (
                  item,
                  index
                ) => {

                  const percentage =
                    totalOrderStatus
                      ? (
                          Number(
                            item.total ||
                            0
                          ) /
                          totalOrderStatus
                        ) *
                        100
                      : 0;


                  return (

                    <div
                      className="reports-status-row"
                      key={
                        `${item.status}-${index}`
                      }
                    >

                      <div className="reports-status-name">

                        <span className="reports-status-dot" />

                        <span>
                          {item.status}
                        </span>

                      </div>


                      <strong>
                        {formatNumber(
                          item.total
                        )}
                      </strong>


                      <small>
                        {percentage.toFixed(
                          1
                        )}%
                      </small>

                    </div>

                  );

                }
              )

            )}

          </div>

          <ReportsPagination
            page={orderStatusPage}
            totalItems={orderStatus.length}
            pageSize={orderStatusPageSize}
            onPageChange={setOrderStatusPage}
          />

        </div>

      </section>


      {/* ===================================================
          SECOND ANALYTICS ROW
          3 EQUAL COLUMNS
          NO BLACK SPACE
      =================================================== */}

      <section className="reports-lower-grid">


        {/* =================================================
            TOP SELLING ITEMS
        ================================================= */}

        <div className="reports-panel reports-lower-panel">

          <div className="reports-panel-header">

            <div>

              <h2>
                Top Selling Items
              </h2>

              <p>
                Based on completed orders
              </p>

            </div>

          </div>


          {topSellingItems.length === 0 ? (

            <div className="reports-empty-state large">

              <ShoppingCart
                size={30}
              />

              <span>
                No completed-order data available yet.
              </span>

            </div>

          ) : (

            <div className="reports-table-wrapper">

              <table className="reports-table">

                <thead>

                  <tr>

                    <th>
                      #
                    </th>

                    <th>
                      Item
                    </th>

                    <th>
                      Orders
                    </th>

                    <th>
                      Earnings
                    </th>

                    <th>
                      View
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {paginatedTopSellingItems.map(
                    (
                      item,
                      index
                    ) => (

                      <tr
                        key={
                          item.listingId
                        }
                      >

                        <td>
                          {index + 1}
                        </td>


                        <td>

                          <div className="reports-item-name">

                            <div className="reports-item-icon">

                              <Store
                                size={15}
                              />

                            </div>

                            <span>
                              {item.title}
                            </span>

                          </div>

                        </td>


                        <td>
                          {formatNumber(
                            item.orders
                          )}
                        </td>


                        <td>
                          {formatCurrency(
                            item.earnings
                          )}
                        </td>


                        <td>

                          <button
                            type="button"
                            className="reports-icon-button view"
                            title="View item"
                            onClick={() =>
                              setActiveReport({
                                type:
                                  'item',
                                title:
                                  item.title,
                                data:
                                  item
                              })
                            }
                          >

                            <Eye
                              size={15}
                            />

                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

          <ReportsPagination
            page={topItemsPage}
            totalItems={topSellingItems.length}
            pageSize={topItemsPageSize}
            onPageChange={setTopItemsPage}
          />

        </div>


        {/* =================================================
            PLATFORM ACTIVITY
        ================================================= */}

        <div className="reports-panel reports-lower-panel">

          <div className="reports-panel-header">

            <div>

              <h2>
                Platform Activity
              </h2>

              <p>
                Latest activity recorded in the database
              </p>

            </div>

          </div>


          {activity.length === 0 ? (

            <div className="reports-empty-state large">

              <BarChart3
                size={30}
              />

              <span>
                No platform activity recorded yet.
              </span>

            </div>

          ) : (

            <div className="reports-activity-list">

              {paginatedActivity.map(
                (
                  item,
                  index
                ) => {

                  let Icon =
                    UserRound;


                  if (
                    item.type ===
                    'New listing posted'
                  ) {

                    Icon = Store;

                  }


                  if (
                    item.type ===
                    'New order placed'
                  ) {

                    Icon =
                      ShoppingCart;

                  }


                  return (

                    <div
                      className="reports-activity-row"
                      key={
                        `${item.createdAt}-${index}`
                      }
                    >

                      <div className="reports-activity-icon">

                        <Icon
                          size={16}
                        />

                      </div>


                      <div className="reports-activity-info">

                        <strong>
                          {item.type}
                        </strong>

                        <span>
                          {item.description}
                        </span>

                      </div>


                      <small>
                        {formatDate(
                          item.createdAt
                        )}
                      </small>

                    </div>

                  );

                }
              )}

            </div>

          )}

          <ReportsPagination
            page={activityPage}
            totalItems={activity.length}
            pageSize={activityPageSize}
            onPageChange={setActivityPage}
          />

        </div>


        {/* =================================================
            REPORTS & EXPORTS
        ================================================= */}

        <div className="reports-panel reports-lower-panel">

          <div className="reports-panel-header">

            <div>

              <h2>
                Reports & Exports
              </h2>

              <p>
                Generate reports from database records
              </p>

            </div>

            <Download
              size={18}
            />

          </div>


          <div className="reports-export-list">
            {[
              { type: 'sales', title: 'Sales Report', description: 'Orders and sales data', Icon: BarChart3 },
              { type: 'users', title: 'User Report', description: 'User accounts and roles', Icon: UserRound },
              { type: 'listings', title: 'Listing Report', description: 'Marketplace listing data', Icon: Tag },
              { type: 'financial', title: 'Financial Report', description: 'Completed sales and earnings', Icon: WalletCards },
              { type: 'custom', title: 'Custom Report', description: 'Review current analytics', Icon: FileText }
            ].slice(
              (exportsPage - 1) * exportsPageSize,
              exportsPage * exportsPageSize
            ).map(report => {
              const Icon = report.Icon;
              return (
                <button
                  type="button"
                  key={report.type}
                  className={report.type === 'custom' ? 'reports-custom-button' : ''}
                  onClick={() => report.type === 'custom'
                    ? setActiveReport({ type: 'custom' })
                    : handleExport(report.type)}
                  disabled={report.type !== 'custom' && Boolean(exportLoading)}
                >
                  <div className="reports-export-icon"><Icon size={18} /></div>
                  <div>
                    <strong>{report.title}</strong>
                    <span>{report.description}</span>
                  </div>
                  {report.type === 'custom' ? <Eye size={15} /> : <Download size={15} />}
                </button>
              );
            })}
          </div>

          <ReportsPagination
            page={exportsPage}
            totalItems={5}
            pageSize={exportsPageSize}
            onPageChange={setExportsPage}
          />

        </div>

      </section>


      {/* ===================================================
          VIEW MODAL
      =================================================== */}

      {activeReport && (

        <div className="reports-modal-overlay">

          <div className="reports-modal">


            <div className="reports-modal-header">

              <div>

                <span>
                  Reports & Analytics
                </span>

                <h3>
                  {activeReport.type ===
                    'item'
                    ? activeReport.title
                    : 'Report Details'}
                </h3>

              </div>


              <button
                type="button"
                className="reports-modal-close"
                onClick={() =>
                  setActiveReport(null)
                }
              >

                <X
                  size={18}
                />

              </button>

            </div>


            <div className="reports-modal-body">

              {activeReport.type ===
              'item' ? (

                <>

                  <div className="reports-detail-row">

                    <span>
                      Item
                    </span>

                    <strong>
                      {
                        activeReport.data
                          ?.title
                      }
                    </strong>

                  </div>


                  <div className="reports-detail-row">

                    <span>
                      Category
                    </span>

                    <strong>
                      {
                        activeReport.data
                          ?.category
                      }
                    </strong>

                  </div>


                  <div className="reports-detail-row">

                    <span>
                      Completed Orders
                    </span>

                    <strong>
                      {formatNumber(
                        activeReport.data
                          ?.orders
                      )}
                    </strong>

                  </div>


                  <div className="reports-detail-row">

                    <span>
                      Earnings
                    </span>

                    <strong>
                      {formatCurrency(
                        activeReport.data
                          ?.earnings
                      )}
                    </strong>

                  </div>

                </>

              ) : (

                <>

                  <p className="reports-modal-description">

                    This report view is generated
                    from the current PostgreSQL
                    database records.

                  </p>


                  <div className="reports-detail-row">

                    <span>
                      Users
                    </span>

                    <strong>
                      {formatNumber(
                        summary.totalUsers
                      )}
                    </strong>

                  </div>


                  <div className="reports-detail-row">

                    <span>
                      Listings
                    </span>

                    <strong>
                      {formatNumber(
                        summary.totalListings
                      )}
                    </strong>

                  </div>


                  <div className="reports-detail-row">

                    <span>
                      Orders
                    </span>

                    <strong>
                      {formatNumber(
                        summary.totalOrders
                      )}
                    </strong>

                  </div>


                  <div className="reports-detail-row">

                    <span>
                      Completed Earnings
                    </span>

                    <strong>
                      {formatCurrency(
                        summary.totalEarnings
                      )}
                    </strong>

                  </div>

                </>

              )}

            </div>


            <div className="reports-modal-footer">

              <button
                type="button"
                onClick={() =>
                  setActiveReport(null)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};


export default ReportsAnalytics;