import React, {
  useCallback,
  useEffect,
  useState
} from 'react';

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Star,
  Truck,
  User,
  Wallet,
  X,
  XCircle
} from 'lucide-react';

import {
  getSellerTransactions,
  getSellerTransactionStats,
  getSellerOrderDetails,
  updateSellerOrderStatus,
  getSellerEarnings,
  getSellerReviews,
  getSellerOrderReview,
  saveSellerOrderReview
} from '../../services/seller/sellerTransactionsApi';

import '../../styles/seller/SellerTransactions.css';

/* ============================================================
   HELPERS
============================================================ */

const formatCurrency = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(number);
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
};

const normalizeStatus = (status) =>
  String(status || '').trim().toLowerCase();

const getStatusLabel = (status) => {
  const normalized = normalizeStatus(status);
  const labels = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    completed: 'Completed',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    canceled: 'Cancelled'
  };
  return labels[normalized] || (status ? String(status) : 'Unknown');
};

const getStatusClass = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'completed' || normalized === 'delivered') return 'status-completed';
  if (normalized === 'pending' || normalized === 'processing') return 'status-pending';
  if (normalized === 'shipped') return 'status-shipped';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'status-cancelled';
  return 'status-default';
};

const StatusIcon = ({ status }) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'completed' || normalized === 'delivered') return <Check size={14} />;
  if (normalized === 'pending' || normalized === 'processing') return <Clock3 size={14} />;
  if (normalized === 'shipped') return <Truck size={14} />;
  if (normalized === 'cancelled' || normalized === 'canceled') return <XCircle size={14} />;
  return <AlertCircle size={14} />;
};

const StatusBadge = ({ status }) => (
  <span className={`seller-transaction-status ${getStatusClass(status)}`}>
    <StatusIcon status={status} />
    {getStatusLabel(status)}
  </span>
);

/* ============================================================
   MAIN COMPONENT
============================================================ */

const SellerTransactions = () => {

  const [activeTab, setActiveTab] = useState('orders');

  const [stats, setStats] = useState({
    totalOrders: 0, pendingOrders: 0, completedOrders: 0,
    cancelledOrders: 0, thisWeekOrders: 0,
    previousWeekOrders: 0, weeklyDifference: 0
  });

  const [orders, setOrders] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1, limit: 8, total: 0, totalPages: 0
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [earnings, setEarnings] = useState({
    totalEarnings: 0, pendingEarnings: 0,
    completedOrders: 0, activeOrders: 0
  });

  const REVIEW_PAGE_SIZE = 5;

  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewSummary, setReviewSummary] = useState({
    seller: {
      averageRating: 0,
      reviewCount: 0
    },
    items: []
  });

  /* ==========================================================
     REVIEW STATE (Seller → Buyer)
  ========================================================== */

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTransaction, setReviewTransaction] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [existingReview, setExistingReview] = useState(null);
  const [reviewMode, setReviewMode] = useState('create');

  /* ==========================================================
     LOAD STATS
  ========================================================== */

  const loadStats = useCallback(async () => {
    try {
      const response = await getSellerTransactionStats();
      if (response?.success) {
        setStats({
          totalOrders: Number(response.data?.totalOrders || 0),
          pendingOrders: Number(response.data?.pendingOrders || 0),
          completedOrders: Number(response.data?.completedOrders || 0),
          cancelledOrders: Number(response.data?.cancelledOrders || 0),
          thisWeekOrders: Number(response.data?.thisWeekOrders || 0),
          previousWeekOrders: Number(response.data?.previousWeekOrders || 0),
          weeklyDifference: Number(response.data?.weeklyDifference || 0)
        });
      }
    } catch (err) {
      console.error('Seller transaction stats error:', err);
    }
  }, []);

  /* ==========================================================
     LOAD ORDERS
  ========================================================== */

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getSellerTransactions({
        status: statusFilter,
        search: search.trim(),
        page: pagination.page,
        limit: pagination.limit
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Unable to load transactions.');
      }

      const transactionData = Array.isArray(response.data) ? response.data : [];
      setOrders(transactionData);

      const rp = response.pagination || {};
      setPagination((prev) => ({
        ...prev,
        page: Number(rp.page || prev.page || 1),
        limit: Number(rp.limit || prev.limit || 8),
        total: Number(rp.total || 0),
        totalPages: Number(rp.totalPages || 0)
      }));
    } catch (err) {
      console.error('Seller transactions error:', err);
      setOrders([]);
      setError(err?.message || 'Unable to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, pagination.page, pagination.limit]);

  /* ==========================================================
     LOAD EARNINGS
  ========================================================== */

  const loadEarnings = useCallback(async () => {
    try {
      const response = await getSellerEarnings();
      if (response?.success) {
        setEarnings({
          totalEarnings: Number(response.data?.totalEarnings || 0),
          pendingEarnings: Number(response.data?.pendingEarnings || 0),
          completedOrders: Number(response.data?.completedOrders || 0),
          activeOrders: Number(response.data?.activeOrders || 0)
        });
      }
    } catch (err) {
      console.error('Seller earnings error:', err);
    }
  }, []);

  /* ==========================================================
     LOAD REVIEWS RECEIVED BY SELLER
  ========================================================== */

  const loadReviews = useCallback(async () => {
    try {
      const response = await getSellerReviews();
      if (response?.success) {
        setReviews(Array.isArray(response.data) ? response.data : []);
        setReviewPage(1);

        setReviewSummary({
          seller: {
            averageRating: Number(
              response.summary?.seller?.averageRating || 0
            ),
            reviewCount: Number(
              response.summary?.seller?.reviewCount || 0
            )
          },
          items: Array.isArray(response.summary?.items)
            ? response.summary.items
            : []
        });
      }
    } catch (err) {
      console.error('Seller reviews error:', err);
    }
  }, []);

  /* ==========================================================
     INITIAL DATA
  ========================================================== */

  useEffect(() => {
    loadStats();
    loadEarnings();
    loadReviews();
  }, [loadStats, loadEarnings, loadReviews]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setReviewPage((prev) =>
      Math.min(
        Math.max(1, prev),
        Math.max(1, Math.ceil(reviews.length / REVIEW_PAGE_SIZE))
      )
    );
  }, [reviews.length]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRefresh = async () => {
    setError('');
    await Promise.all([
      loadStats(),
      loadEarnings(),
      loadReviews(),
      loadOrders()
    ]);
  };

  /* ==========================================================
     VIEW ORDER
  ========================================================== */

  const handleViewOrder = async (orderId) => {
    if (!orderId) {
      setError('Unable to open order details because the order ID is missing.');
      return;
    }
    setDetailsLoading(true);
    setShowDetailsModal(true);
    setSelectedOrder(null);
    setError('');

    try {
      const response = await getSellerOrderDetails(orderId);
      if (!response?.success) {
        throw new Error(response?.message || 'Unable to load order details.');
      }
      setSelectedOrder(response.data || null);
    } catch (err) {
      console.error('Order details error:', err);
      setError(err?.message || 'Unable to load order details.');
      setShowDetailsModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  /* ==========================================================
     UPDATE STATUS
  ========================================================== */

  const handleUpdateStatus = async (orderId, status) => {
    if (!orderId || !status || updatingStatus) return;

    setUpdatingStatus(true);
    setError('');

    try {
      const response = await updateSellerOrderStatus(orderId, status);
      if (!response?.success) {
        throw new Error(response?.message || 'Unable to update order status.');
      }

      setOrders((prev) =>
        prev.map((order) =>
          String(order.orderId) === String(orderId)
            ? { ...order, status }
            : order
        )
      );

      setSelectedOrder((prev) =>
        prev && String(prev.orderId) === String(orderId)
          ? { ...prev, status }
          : prev
      );

      await Promise.all([loadOrders(), loadStats(), loadEarnings()]);
    } catch (err) {
      console.error('Update seller order status error:', err);
      setError(err?.message || 'Unable to update order status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCloseModal = () => {
    if (detailsLoading) return;
    setShowDetailsModal(false);
    setSelectedOrder(null);
  };

  /* ==========================================================
     OPEN REVIEW (Seller → Buyer)
  ========================================================== */

  const handleOpenReview = async (order) => {
    if (!order?.orderId) return;

    setReviewModalOpen(true);
    setReviewTransaction(order);
    setReviewLoading(true);
    setReviewError('');
    setReviewRating(0);
    setReviewComment('');
    setExistingReview(null);
    setReviewMode('create');

    try {
      const response = await getSellerOrderReview(order.orderId);
      const review = response?.data?.review || null;

      if (review) {
        setExistingReview(review);
        setReviewRating(Number(review.rating || 0));
        setReviewComment(review.comment || '');
        setReviewMode('view');
      }
    } catch (err) {
      if (!String(err?.message || '').includes('404')) {
        console.error('Review loading error:', err);
      }
    } finally {
      setReviewLoading(false);
    }
  };

  const closeReviewModal = () => {
    if (reviewSubmitting) return;

    setReviewModalOpen(false);
    setReviewTransaction(null);
    setReviewLoading(false);
    setReviewSubmitting(false);
    setReviewError('');
    setReviewRating(0);
    setReviewComment('');
    setExistingReview(null);
    setReviewMode('create');
  };

  /* ==========================================================
     SUBMIT REVIEW (Seller → Buyer)
  ========================================================== */

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!reviewTransaction?.orderId) return;

    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewError('Please select a rating from 1 to 5 stars.');
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError('');

      const response = await saveSellerOrderReview(
        reviewTransaction.orderId,
        { rating: reviewRating, comment: reviewComment }
      );

      const saved =
        response?.data?.review ||
        { ...(existingReview || {}), rating: reviewRating, comment: reviewComment };

      setExistingReview(saved);
      setReviewMode('view');

      await loadOrders();
    } catch (err) {
      console.error('Review submit error:', err);
      setReviewError(err?.message || 'Unable to save your review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  /* ==========================================================
     TABS
  ========================================================== */

  const tabs = [
    { id: 'orders', label: 'Orders', icon: <Package size={18} /> },
    { id: 'earnings', label: 'Earnings', icon: <Wallet size={18} /> },
    { id: 'reviews', label: 'Reviews', icon: <Star size={18} /> }
  ];

  const weeklyDifference = Number(stats.weeklyDifference || 0);

  const reviewTotalPages = Math.max(
    1,
    Math.ceil(reviews.length / REVIEW_PAGE_SIZE)
  );

  const safeReviewPage = Math.min(
    Math.max(1, reviewPage),
    reviewTotalPages
  );

  const reviewStartIndex = (safeReviewPage - 1) * REVIEW_PAGE_SIZE;

  const paginatedReviews = reviews.slice(
    reviewStartIndex,
    reviewStartIndex + REVIEW_PAGE_SIZE
  );

  const reviewFrom = reviews.length > 0 ? reviewStartIndex + 1 : 0;

  const reviewTo = Math.min(
    reviewStartIndex + REVIEW_PAGE_SIZE,
    reviews.length
  );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="seller-transactions-page">

      {/* STYLES: review-specific only */}
      <style>{`
        .seller-transactions-page .transaction-actions .review-action-btn {
          color: #e0a800;
        }
        .seller-transactions-page .transaction-actions .review-action-btn.has-review {
          color: #6d5a98;
        }
        .seller-transactions-page .review-stars {
          display: flex; align-items: center; gap: 5px;
        }
        .seller-transactions-page .review-star-button {
          border: 0; background: transparent; padding: 3px;
          cursor: pointer; line-height: 0;
        }
        .seller-transactions-page .review-star {
          fill: transparent;
        }
        .seller-transactions-page .review-star.active {
          fill: currentColor;
        }
        .seller-transactions-page .review-form-label {
          display: block; font-size: 12px;
          font-weight: 700; margin-bottom: 8px;
        }
        .seller-transactions-page .review-textarea {
          width: 100%; min-height: 110px; resize: vertical;
          border: 1px solid #ddd6ea; border-radius: 10px;
          padding: 11px 12px; font-family: inherit;
          font-size: 12px; outline: none; box-sizing: border-box;
        }
        .seller-transactions-page .review-submit-button {
          border: 0; border-radius: 9px; padding: 10px 18px;
          background: #8064a2; color: #fff;
          font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .seller-transactions-page .review-submit-button:disabled {
          opacity: 0.6; cursor: not-allowed;
        }
        .seller-transactions-page .review-cancel-button {
          border: 1px solid #ddd6ea; border-radius: 9px;
          padding: 10px 18px; background: #fff; color: #5d5668;
          font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .seller-transactions-page .review-actions {
          display: flex; justify-content: flex-end;
          gap: 8px; margin-top: 14px;
        }
        .seller-transactions-page .review-error {
          margin-top: 10px; padding: 9px 11px; border-radius: 8px;
          background: #fff1f1; color: #b84a4a; font-size: 11px;
        }
        .seller-transactions-page .review-existing {
          padding: 12px; border-radius: 10px;
          background: #faf8fd; border: 1px solid #eee8f5;
        }
        .seller-transactions-page .review-existing-comment {
          margin: 10px 0 0; font-size: 12px;
          line-height: 1.55; color: #5e5867;
        }
        .seller-transactions-page .review-modal-loading {
          min-height: 180px; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }
        .seller-transactions-page .seller-review-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 22px;
        }
        .seller-transactions-page .seller-review-summary-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          border: 1px solid #eee8f5;
          border-radius: 12px;
          background: #faf8fd;
        }
        .seller-transactions-page .seller-review-summary-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8064a2;
          background: #f0eafa;
        }
        .seller-transactions-page .seller-review-summary-card div:last-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .seller-transactions-page .seller-review-summary-card span {
          font-size: 11px;
          color: #777;
        }
        .seller-transactions-page .seller-review-summary-card strong {
          font-size: 22px;
          color: #403a48;
          line-height: 1.1;
        }
        .seller-transactions-page .seller-review-summary-card small {
          font-size: 10px;
          color: #888;
        }
        .seller-transactions-page .seller-review-section-heading {
          margin: 20px 0 12px;
        }
        .seller-transactions-page .seller-review-section-heading h3 {
          margin: 0;
          font-size: 15px;
          color: #403a48;
        }
        .seller-transactions-page .seller-review-section-heading p {
          margin: 4px 0 0;
          font-size: 11px;
          color: #888;
        }
        .seller-transactions-page .seller-item-rating-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 22px;
        }
        .seller-transactions-page .seller-item-rating-card {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px;
          border: 1px solid #eee8f5;
          border-radius: 11px;
          background: #fff;
        }
        .seller-transactions-page .seller-item-rating-image {
          width: 52px;
          height: 52px;
          border-radius: 9px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #f5f2f8;
          color: #8a8295;
        }
        .seller-transactions-page .seller-item-rating-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .seller-transactions-page .seller-item-rating-info {
          min-width: 0;
        }
        .seller-transactions-page .seller-item-rating-info strong {
          display: block;
          font-size: 12px;
          color: #403a48;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .seller-transactions-page .seller-item-rating-stars {
          display: flex;
          align-items: center;
          gap: 3px;
          margin-top: 5px;
          color: #e0a800;
        }
        .seller-transactions-page .seller-item-rating-stars span {
          margin-left: 4px;
          font-size: 10px;
          color: #777;
          white-space: nowrap;
        }
        .seller-transactions-page .seller-review-card {
          align-items: flex-start;
        }

        /* Buyer Reviews pagination */
        .seller-transactions-page .seller-review-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #eee8f5;
          font-size: 12px;
          color: #777;
        }

        .seller-transactions-page .seller-review-pagination-controls {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .seller-transactions-page .seller-review-pagination button {
          min-width: 34px;
          height: 34px;
          border: 1px solid #ddd6ea;
          border-radius: 8px;
          background: #fff;
          color: #5d5668;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .seller-transactions-page .seller-review-pagination button:hover:not(:disabled) {
          background: #f7f3fb;
          border-color: #cfc2df;
        }

        .seller-transactions-page .seller-review-pagination button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .seller-transactions-page .seller-review-pagination .review-current-page {
          min-width: 34px;
          height: 34px;
          padding: 0 8px;
          border-radius: 8px;
          background: #6d4bd8;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          font-size: 12px;
          font-weight: 700;
        }

        .seller-transactions-page .seller-review-pagination .review-page-info {
          white-space: nowrap;
        }

        @media (max-width: 520px) {
          .seller-transactions-page .seller-review-pagination {
            flex-direction: column;
            align-items: stretch;
          }

          .seller-transactions-page .seller-review-pagination-controls {
            justify-content: flex-end;
          }
        }

        @media (max-width: 700px) {
          .seller-transactions-page .seller-review-summary,
          .seller-transactions-page .seller-item-rating-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* TABS */}
      <div className="seller-transactions-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              activeTab === tab.id
                ? 'transaction-tab active'
                : 'transaction-tab'
            }
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ============ ORDERS TAB ============ */}
      {activeTab === 'orders' && (
        <>
          <section className="seller-transaction-stats">
            <div className="transaction-stat-card stat-total">
              <div className="transaction-stat-icon"><ShoppingCart size={23} /></div>
              <div>
                <span>Total Orders</span>
                <strong>{stats.totalOrders}</strong>
                <small className={weeklyDifference >= 0 ? 'trend-positive' : 'trend-negative'}>
                  {weeklyDifference >= 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                  {Math.abs(weeklyDifference)} this week
                </small>
              </div>
            </div>

            <div className="transaction-stat-card stat-pending">
              <div className="transaction-stat-icon"><Truck size={23} /></div>
              <div>
                <span>Pending Orders</span>
                <strong>{stats.pendingOrders}</strong>
                <small>Currently active</small>
              </div>
            </div>

            <div className="transaction-stat-card stat-completed">
              <div className="transaction-stat-icon"><Package size={23} /></div>
              <div>
                <span>Completed Orders</span>
                <strong>{stats.completedOrders}</strong>
                <small>Successfully completed</small>
              </div>
            </div>

            <div className="transaction-stat-card stat-cancelled">
              <div className="transaction-stat-icon"><XCircle size={23} /></div>
              <div>
                <span>Cancelled Orders</span>
                <strong>{stats.cancelledOrders}</strong>
                <small>From your transactions</small>
              </div>
            </div>
          </section>

          <section className="seller-order-history">
            <div className="order-history-header">
              <div>
                <h2>Order History</h2>
                <p>Transactions associated with your listings</p>
              </div>
              <button
                type="button"
                className="transaction-refresh-btn"
                onClick={handleRefresh}
                title="Refresh transactions"
                aria-label="Refresh transactions"
                disabled={loading}
              >
                <RefreshCw size={17} className={loading ? 'spin' : ''} />
              </button>
            </div>

            <div className="order-history-controls">
              <div className="transaction-search">
                <Search size={17} />
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search by order ID, buyer name, or item..."
                />
              </div>

              <select
                value={statusFilter}
                onChange={handleStatusChange}
                className="transaction-status-filter"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="completed">Completed</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {error && (
              <div className="transaction-error">
                <AlertCircle size={17} />
                <span>{error}</span>
                <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
                  <X size={15} />
                </button>
              </div>
            )}

            <div className="seller-order-table-wrapper">
              {loading ? (
                <div className="transaction-loading">
                  <RefreshCw size={25} className="spin" />
                  <span>Loading transactions...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="transaction-empty">
                  <Package size={38} />
                  <h3>No transactions found</h3>
                  <p>There are no seller transactions matching your current filters.</p>
                </div>
              ) : (
                <table className="seller-order-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Item</th>
                      <th>Buyer</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, index) => {
                      const item = order?.item || {};
                      const buyer = order?.buyer || {};
                      const orderKey = order?.orderId || order?.orderNumber || index;
                      const isCompleted = normalizeStatus(order?.status) === 'completed';
                      const hasReview = Boolean(order?.hasMyReview);

                      return (
                        <tr key={`${orderKey}-${item?.orderItemId || index}`}>
                          <td>
                            <span className="order-number">
                              #{order?.orderNumber || order?.orderId || '—'}
                            </span>
                          </td>

                          <td>
                            <div className="transaction-item">
                              <div className="transaction-item-image">
                                {item?.image ? (
                                  <img
                                    src={item.image}
                                    alt={item?.title || 'Item'}
                                    onError={(event) => {
                                      event.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package size={20} />
                                )}
                              </div>
                              <div>
                                <strong>{item?.title || 'Item unavailable'}</strong>
                                <small>{item?.categoryName || 'Uncategorized'}</small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="transaction-buyer">
                              <div className="transaction-avatar">
                                {buyer?.profileImage ? (
                                  <img
                                    src={buyer.profileImage}
                                    alt={buyer?.name || 'Buyer'}
                                  />
                                ) : (
                                  <User size={17} />
                                )}
                              </div>
                              <span>{buyer?.name || 'Buyer'}</span>
                            </div>
                          </td>

                          <td>
                            <strong className="transaction-price">
                              {formatCurrency(order?.subtotal)}
                            </strong>
                          </td>

                          <td>
                            <StatusBadge status={order?.status} />
                          </td>

                          <td>
                            <span className="transaction-date">
                              {formatDate(order?.date)}
                            </span>
                          </td>

                          <td>
                            <div className="transaction-actions">
                              <button
                                type="button"
                                className="transaction-icon-btn view"
                                onClick={() => handleViewOrder(order?.orderId)}
                                title="View order details"
                                aria-label="View order details"
                                disabled={!order?.orderId}
                              >
                                <Eye size={17} />
                              </button>

                              {isCompleted && (
                                <button
                                  type="button"
                                  className={
                                    hasReview
                                      ? 'transaction-icon-btn review-action-btn has-review'
                                      : 'transaction-icon-btn review-action-btn'
                                  }
                                  onClick={() => handleOpenReview(order)}
                                  title={hasReview ? 'View your review' : 'Review buyer'}
                                  aria-label={hasReview ? 'View your review' : 'Review buyer'}
                                >
                                  {hasReview ? <MessageSquare size={17} /> : <Star size={17} />}
                                </button>
                              )}

                              <button
                                type="button"
                                className="transaction-icon-btn processing"
                                onClick={() => handleUpdateStatus(order?.orderId, 'processing')}
                                disabled={
                                  updatingStatus || !order?.orderId ||
                                  normalizeStatus(order?.status) === 'processing'
                                }
                                title="Set Processing"
                                aria-label="Set Processing"
                              >
                                <Clock3 size={17} />
                              </button>

                              <button
                                type="button"
                                className="transaction-icon-btn shipped"
                                onClick={() => handleUpdateStatus(order?.orderId, 'shipped')}
                                disabled={
                                  updatingStatus || !order?.orderId ||
                                  normalizeStatus(order?.status) === 'shipped'
                                }
                                title="Set Shipped"
                                aria-label="Set Shipped"
                              >
                                <Truck size={17} />
                              </button>

                              <button
                                type="button"
                                className="transaction-icon-btn completed"
                                onClick={() => handleUpdateStatus(order?.orderId, 'completed')}
                                disabled={
                                  updatingStatus || !order?.orderId ||
                                  normalizeStatus(order?.status) === 'completed'
                                }
                                title="Set Completed"
                                aria-label="Set Completed"
                              >
                                <Check size={17} />
                              </button>

                              <button
                                type="button"
                                className="transaction-icon-btn cancelled"
                                onClick={() => handleUpdateStatus(order?.orderId, 'cancelled')}
                                disabled={
                                  updatingStatus || !order?.orderId ||
                                  normalizeStatus(order?.status) === 'cancelled'
                                }
                                title="Cancel order"
                                aria-label="Cancel order"
                              >
                                <XCircle size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {!loading && orders.length > 0 && pagination.total > 0 && (
              <div className="transaction-pagination">
                <span>
                  Showing{' '}
                  {((pagination.page - 1) * pagination.limit) + 1}
                  {' '}-{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                  {' '}of{' '}{pagination.total}{' '}orders
                </span>
                <div>
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((prev) => ({
                      ...prev, page: Math.max(1, prev.page - 1)
                    }))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span className="current-page">{pagination.page}</span>
                  <button
                    type="button"
                    disabled={
                      pagination.totalPages <= 0 ||
                      pagination.page >= pagination.totalPages
                    }
                    onClick={() => setPagination((prev) => ({
                      ...prev, page: prev.page + 1
                    }))}
                    aria-label="Next page"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* ============ EARNINGS TAB ============ */}
      {activeTab === 'earnings' && (
        <section className="seller-secondary-panel">
          <div className="secondary-panel-title">
            <div>
              <h2>Earnings</h2>
              <p>Your earnings are calculated from completed seller order items.</p>
            </div>
            <CircleDollarSign size={30} />
          </div>

          <div className="earnings-summary-grid">
            <div className="earnings-card">
              <Wallet size={23} />
              <span>Total Earnings</span>
              <strong>{formatCurrency(earnings.totalEarnings)}</strong>
              <small>Completed and delivered orders</small>
            </div>
            <div className="earnings-card">
              <Clock3 size={23} />
              <span>Pending Earnings</span>
              <strong>{formatCurrency(earnings.pendingEarnings)}</strong>
              <small>Active orders</small>
            </div>
            <div className="earnings-card">
              <Package size={23} />
              <span>Completed Orders</span>
              <strong>{earnings.completedOrders}</strong>
              <small>Completed seller orders</small>
            </div>
            <div className="earnings-card">
              <Truck size={23} />
              <span>Active Orders</span>
              <strong>{earnings.activeOrders}</strong>
              <small>Pending, processing, or shipped</small>
            </div>
          </div>
        </section>
      )}

      {/* ============ REVIEWS TAB ============ */}
      {activeTab === 'reviews' && (
        <section className="seller-secondary-panel">
          <div className="secondary-panel-title">
            <div>
              <h2>Customer Reviews</h2>
              <p>Reviews connected to your seller account.</p>
            </div>
            <Star size={30} />
          </div>

          <div className="seller-review-summary">
            <div className="seller-review-summary-card">
              <div className="seller-review-summary-icon">
                <Star size={21} />
              </div>
              <div>
                <span>Seller Rating</span>
                <strong>
                  {Number(reviewSummary.seller.averageRating || 0).toFixed(1)}
                </strong>
                <small>
                  {Number(reviewSummary.seller.reviewCount || 0)} buyer review
                  {Number(reviewSummary.seller.reviewCount || 0) === 1 ? '' : 's'}
                </small>
              </div>
            </div>

            <div className="seller-review-summary-card">
              <div className="seller-review-summary-icon">
                <Package size={21} />
              </div>
              <div>
                <span>Rated Items</span>
                <strong>{reviewSummary.items.length}</strong>
                <small>Items with buyer ratings</small>
              </div>
            </div>
          </div>

          {reviewSummary.items.length > 0 && (
            <div className="seller-item-rating-section">
              <div className="seller-review-section-heading">
                <div>
                  <h3>Item Ratings</h3>
                  <p>Average ratings from buyers for your listings.</p>
                </div>
              </div>

              <div className="seller-item-rating-list">
                {reviewSummary.items.map((item) => {
                  const itemRating = Math.min(
                    5,
                    Math.max(0, Number(item?.averageRating || 0))
                  );

                  return (
                    <div
                      key={item?.listingId || item?.title}
                      className="seller-item-rating-card"
                    >
                      <div className="seller-item-rating-image">
                        {item?.image ? (
                          <img
                            src={item.image}
                            alt={item?.title || 'Item'}
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package size={22} />
                        )}
                      </div>

                      <div className="seller-item-rating-info">
                        <strong>{item?.title || 'Untitled Item'}</strong>
                        <div className="seller-item-rating-stars">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={15}
                              fill={star <= Math.round(itemRating) ? 'currentColor' : 'none'}
                            />
                          ))}
                          <span>
                            {itemRating.toFixed(1)} · {Number(item?.reviewCount || 0)} review
                            {Number(item?.reviewCount || 0) === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="seller-review-section-heading">
            <div>
              <h3>Buyer Reviews</h3>
              <p>Reviews submitted by buyers for your seller account and items.</p>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="transaction-empty reviews-empty">
              <Star size={38} />
              <h3>No reviews yet</h3>
              <p>Customer reviews associated with your seller account will appear here.</p>
            </div>
          ) : (
            <>
              <div className="seller-reviews-list">
                {paginatedReviews.map((review, index) => {
                const reviewer = review?.reviewer || {};
                const rating = Math.min(5, Math.max(0, Number(review?.rating || 0)));
                const isItemReview = review?.reviewType === 'ITEM';

                return (
                  <article
                    key={review?.reviewId || `review-${index}`}
                    className="seller-review-card"
                  >
                    <div className="reviewer-avatar">
                      {reviewer?.profileImage ? (
                        <img src={reviewer.profileImage} alt={reviewer?.name || 'Customer'} />
                      ) : (
                        <User size={20} />
                      )}
                    </div>

                    <div className="review-content">
                      <div className="review-top">
                        <div>
                          <strong>{reviewer?.name || 'Customer'}</strong>
                          <small>{formatDate(review?.createdAt)}</small>
                        </div>

                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '999px',
                            background: isItemReview ? '#f4eff9' : '#fff7df',
                            color: isItemReview ? '#6d5a98' : '#a77700'
                          }}
                        >
                          {isItemReview ? 'Item Review' : 'Seller Review'}
                        </span>
                      </div>

                      <div className="review-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={15}
                            fill={star <= rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>

                      <p>{review?.comment || 'No written comment.'}</p>

                      {review?.listing?.title && (
                        <span className="review-listing">
                          {isItemReview ? 'Item: ' : 'Listing: '}
                          {review.listing.title}
                        </span>
                      )}
                    </div>
                  </article>
                );
                })}
              </div>

              {reviewTotalPages > 1 && (
              <div className="seller-review-pagination">
                <span className="review-page-info">
                  Showing {reviewFrom}-{reviewTo} of {reviews.length} reviews
                </span>

                <div className="seller-review-pagination-controls">
                  <button
                    type="button"
                    disabled={safeReviewPage <= 1}
                    onClick={() =>
                      setReviewPage((prev) => Math.max(1, prev - 1))
                    }
                    aria-label="Previous reviews page"
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="review-current-page">
                    {safeReviewPage}
                  </span>

                  <button
                    type="button"
                    disabled={safeReviewPage >= reviewTotalPages}
                    onClick={() =>
                      setReviewPage((prev) =>
                        Math.min(reviewTotalPages, prev + 1)
                      )
                    }
                    aria-label="Next reviews page"
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ============ ORDER DETAILS MODAL ============ */}
      {showDetailsModal && (
        <div
          className="transaction-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleCloseModal();
          }}
        >
          <div className="transaction-modal" role="dialog" aria-modal="true">
            <div className="transaction-modal-header">
              <div>
                <span>Order Details</span>
                <h2>
                  {selectedOrder
                    ? `#${selectedOrder.orderNumber || selectedOrder.orderId || '—'}`
                    : 'Loading...'}
                </h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseModal}
                aria-label="Close order details"
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="transaction-modal-loading">
                <RefreshCw size={28} className="spin" />
                <span>Loading order details...</span>
              </div>
            ) : selectedOrder ? (
              <>
                <div className="modal-order-top">
                  <StatusBadge status={selectedOrder?.status} />
                  <span>{formatDateTime(selectedOrder?.date)}</span>
                </div>

                <div className="modal-section">
                  <h3>Buyer</h3>
                  <div className="modal-buyer">
                    <div className="modal-buyer-avatar">
                      {selectedOrder?.buyer?.profileImage ? (
                        <img
                          src={selectedOrder.buyer.profileImage}
                          alt={selectedOrder.buyer?.name || 'Buyer'}
                        />
                      ) : (
                        <User size={21} />
                      )}
                    </div>
                    <div>
                      <strong>{selectedOrder?.buyer?.name || 'Buyer'}</strong>
                      <span>{selectedOrder?.buyer?.email || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-section">
                  <h3>Items</h3>
                  <div className="modal-items">
                    {Array.isArray(selectedOrder?.items) && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, index) => (
                        <div
                          key={item?.orderItemId || `modal-item-${index}`}
                          className="modal-item"
                        >
                          <div className="modal-item-image">
                            {item?.image ? (
                              <img src={item.image} alt={item?.title || 'Item'} />
                            ) : (
                              <Package size={23} />
                            )}
                          </div>
                          <div className="modal-item-info">
                            <strong>{item?.title || 'Item unavailable'}</strong>
                            <span>{item?.categoryName || 'Uncategorized'}</span>
                            <small>Qty: {Number(item?.quantity || 0)}</small>
                          </div>
                          <strong>{formatCurrency(item?.subtotal)}</strong>
                        </div>
                      ))
                    ) : (
                      <div className="transaction-empty">
                        <Package size={30} />
                        <p>No item details available.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-detail-grid">
                  <div>
                    <span><CalendarDays size={15} />Date</span>
                    <strong>{formatDateTime(selectedOrder?.date)}</strong>
                  </div>
                  <div>
                    <span><User size={15} />Buyer</span>
                    <strong>{selectedOrder?.buyer?.name || '—'}</strong>
                  </div>
                  <div>
                    <span><Package size={15} />Seller Subtotal</span>
                    <strong>{formatCurrency(selectedOrder?.sellerSubtotal)}</strong>
                  </div>
                  <div>
                    <span><CircleDollarSign size={15} />Order Total</span>
                    <strong>{formatCurrency(selectedOrder?.orderTotal)}</strong>
                  </div>
                </div>

                {selectedOrder?.shippingAddress && (
                  <div className="modal-section">
                    <h3>Shipping Address</h3>
                    <p className="shipping-address">{selectedOrder.shippingAddress}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="transaction-empty">
                <AlertCircle size={35} />
                <h3>Unable to load order</h3>
                <p>The order details are not available.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ REVIEW MODAL (Seller → Buyer) ============ */}
      {reviewModalOpen && (
        <div
          className="transaction-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReviewModal();
          }}
        >
          <div className="transaction-modal" role="dialog" aria-modal="true">
            <div className="transaction-modal-header">
              <div>
                <span>
                  {reviewMode === 'view' ? 'Your Review' : 'Review Buyer'}
                </span>
                <h2>
                  {reviewTransaction?.orderNumber ||
                    `Order #${reviewTransaction?.orderId || ''}`}
                </h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeReviewModal}
                disabled={reviewSubmitting}
                aria-label="Close review"
              >
                <X size={20} />
              </button>
            </div>

            {reviewLoading ? (
              <div className="review-modal-loading">
                <RefreshCw size={28} className="spin" />
                <span>Loading review...</span>
              </div>
            ) : (
              <div className="modal-section">
                <div style={{ marginBottom: '14px' }}>
                  <strong style={{ fontSize: '14px' }}>
                    {reviewTransaction?.buyer?.name || 'Buyer'}
                  </strong>
                  <div style={{ fontSize: '11px', marginTop: '4px', color: '#777' }}>
                    {reviewTransaction?.item?.title ||
                      reviewTransaction?.orderNumber ||
                      'Order'}
                  </div>
                </div>

                {reviewMode === 'view' ? (
                  <div className="review-existing">
                    <span className="review-form-label">Your Rating</span>
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={22}
                          className={star <= reviewRating ? 'review-star active' : 'review-star'}
                        />
                      ))}
                    </div>

                    <p className="review-existing-comment">
                      {existingReview?.comment || 'No comment provided.'}
                    </p>

                    <div className="review-actions">
                      <button
                        type="button"
                        className="review-cancel-button"
                        onClick={() => setReviewMode('edit')}
                      >
                        Edit Review
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview}>
                    <label className="review-form-label">Rating</label>
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="review-star-button"
                          disabled={reviewSubmitting}
                          onClick={() => setReviewRating(star)}
                          aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        >
                          <Star
                            size={25}
                            className={star <= reviewRating ? 'review-star active' : 'review-star'}
                          />
                        </button>
                      ))}
                    </div>

                    <div style={{ marginTop: '16px' }}>
                      <label className="review-form-label" htmlFor="seller-review-comment">
                        Comment
                      </label>
                      <textarea
                        id="seller-review-comment"
                        className="review-textarea"
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        placeholder="Share your experience with this buyer..."
                        maxLength={1000}
                        disabled={reviewSubmitting}
                      />
                    </div>

                    {reviewError && (
                      <div className="review-error">{reviewError}</div>
                    )}

                    <div className="review-actions">
                      <button
                        type="button"
                        className="review-cancel-button"
                        onClick={() => {
                          if (existingReview) setReviewMode('view');
                          else closeReviewModal();
                        }}
                        disabled={reviewSubmitting}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="review-submit-button"
                        disabled={reviewSubmitting}
                      >
                        {reviewSubmitting
                          ? 'Saving...'
                          : existingReview ? 'Update Review' : 'Submit Review'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerTransactions;