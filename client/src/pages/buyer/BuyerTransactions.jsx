import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Heart,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Truck,
  X,
  ArrowLeftRight,
  Clock,
  MapPin,
  UserRound,
  Star,
  MessageSquare
} from 'lucide-react';

import {
  getBuyerTransactions,
  getBuyerTransactionSummary,
  getBuyerTransaction,
  getBuyerTransactionReview,
  saveBuyerSellerReview,
  saveBuyerItemReview
} from '../../services/buyer/buyerTransactionsApi';

import '../../styles/buyer/BuyerTransactions.css';


/* ============================================================
   HELPERS
============================================================ */

const formatCurrency = (value) => {

  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  ).format(amount);

};


const formatDate = (value) => {

  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  );

};


const formatTime = (value) => {

  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleTimeString(
    'en-US',
    {
      hour: 'numeric',
      minute: '2-digit'
    }
  );

};


/* ============================================================
   TRANSACTION IMAGE HELPERS
============================================================ */

const getApiBaseUrl = () => {

  const configured =
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000';

  return String(
    configured
  ).replace(
    /\/$/,
    ''
  );

};


const normalizeTransactionImage = (value) => {

  if (!value) {
    return '';
  }

  if (
    typeof value === 'object'
  ) {

    return normalizeTransactionImage(
      value.image_url ||
      value.url ||
      value.src ||
      value.image ||
      value.primary_image
    );

  }

  const raw =
    String(value).trim();

  if (!raw) {
    return '';
  }

  if (
    raw.startsWith('data:') ||
    raw.startsWith('blob:')
  ) {
    return raw;
  }

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://')
  ) {

    if (
      raw.includes(
        '/api/seller/listings/image/'
      )
    ) {
      return raw;
    }

    try {

      const parsed =
        new URL(raw);

      if (
        parsed.pathname.includes(
          '/uploads/listings/'
        )
      ) {

        const filename =
          parsed.pathname
            .split('/')
            .filter(Boolean)
            .pop();

        if (filename) {

          return (
            `${getApiBaseUrl()}` +
            `/api/seller/listings/image/` +
            encodeURIComponent(filename)
          );

        }

      }

    } catch (error) {

      console.warn(
        'Unable to normalize transaction image URL:',
        error
      );

    }

    return raw;

  }

  if (
    raw.startsWith('/api/')
  ) {

    return (
      `${getApiBaseUrl()}` +
      raw
    );

  }

  if (
    raw.startsWith('/uploads/')
  ) {

    const filename =
      raw
        .split('?')[0]
        .split('#')[0]
        .split('/')
        .filter(Boolean)
        .pop();

    if (!filename) {
      return '';
    }

    return (
      `${getApiBaseUrl()}` +
      `/api/seller/listings/image/` +
      encodeURIComponent(filename)
    );

  }

  const filename =
    raw
      .split('?')[0]
      .split('#')[0]
      .split('/')
      .filter(Boolean)
      .pop();

  if (!filename) {
    return '';
  }

  return (
    `${getApiBaseUrl()}` +
    `/api/seller/listings/image/` +
    encodeURIComponent(filename)
  );

};


const getTransactionImage = (
  transaction
) => {

  const firstItem =
    transaction?.items?.[0] ||
    {};

  return normalizeTransactionImage(
    transaction?.itemImage ||
    transaction?.item_image ||
    transaction?.image_url ||
    transaction?.imageUrl ||
    transaction?.primary_image ||
    transaction?.primaryImage ||
    firstItem?.image_url ||
    firstItem?.imageUrl ||
    firstItem?.primary_image ||
    firstItem?.primaryImage ||
    firstItem?.image ||
    firstItem?.photo
  );

};


const getTransactionItemImage = (
  item
) => {

  return normalizeTransactionImage(
    item?.image_url ||
    item?.imageUrl ||
    item?.primary_image ||
    item?.primaryImage ||
    item?.image ||
    item?.photo
  );

};


const statusClass = (status) => {

  switch (
    String(status || '')
      .toLowerCase()
  ) {

    case 'completed':
      return 'completed';

    case 'shipped':
      return 'shipped';

    case 'processing':
      return 'processing';

    case 'cancelled':
      return 'cancelled';

    case 'pending':
    default:
      return 'pending';

  }

};



/* ============================================================
   API TRANSACTION NORMALIZER
============================================================ */

const normalizeTransaction = (raw = {}) => {

  const items = Array.isArray(raw.items)
    ? raw.items
    : [];

  const firstItem = items[0] || {};

  const sellerName =
    raw.seller?.name ||
    raw.sellerName ||
    firstItem.sellerName ||
    firstItem.seller_name ||
    'Seller';

  const sellerId =
    raw.sellerId ||
    raw.seller_id ||
    firstItem.sellerId ||
    firstItem.seller_id ||
    null;

  const total =
    raw.total ??
    raw.totalAmount ??
    raw.total_amount ??
    0;

  const date =
    raw.date ||
    raw.createdAt ||
    raw.created_at ||
    null;

  return {
    ...raw,

    orderId:
      raw.orderId ??
      raw.order_id,

    orderNumber:
      raw.orderNumber ??
      raw.order_number,

    status:
      raw.status || 'PENDING',

    total:
      Number(total || 0),

    totalAmount:
      Number(total || 0),

    date,

    createdAt:
      raw.createdAt ||
      raw.created_at ||
      date,

    sellerId,

    seller: {
      ...(raw.seller || {}),
      id: sellerId,
      userId: sellerId,
      user_id: sellerId,
      name: sellerName
    },

    item:
      raw.item ||
      firstItem.title ||
      'Product',

    itemImage:
      raw.itemImage ||
      firstItem.imageUrl ||
      firstItem.image_url ||
      '',

    itemCount:
      raw.itemCount ??
      items.length,

    items: items.map((item) => ({
      ...item,

      orderItemId:
        item.orderItemId ??
        item.order_item_id,

      listingId:
        item.listingId ??
        item.listing_id,

      sellerId:
        item.sellerId ??
        item.seller_id,

      title:
        item.title ||
        'Product',

      quantity:
        item.quantity ??
        1,

      price:
        Number(
          item.price ??
          item.unitPrice ??
          item.unit_price ??
          0
        ),

      subtotal:
        Number(
          item.subtotal ??
          0
        ),

      sellerName:
        item.sellerName ||
        item.seller_name ||
        sellerName,

      imageUrl:
        item.imageUrl ||
        item.image_url ||
        '',

      buyerHasItemReview:
        Boolean(
          item.buyerHasItemReview ||
          item.buyer_has_item_review
        ),

      itemRating:
        item.itemRating == null
          ? null
          : Number(item.itemRating),

      itemReviewCount:
        Number(
          item.itemReviewCount ||
          item.item_review_count ||
          0
        )
    })),

    hasSellerReview:
      Boolean(
        raw.hasSellerReview ||
        raw.has_seller_review
      ),

    hasItemReview:
      Boolean(
        raw.hasItemReview ||
        raw.has_item_review
      ),

    hasReview:
      Boolean(
        raw.hasReview ||
        raw.has_review ||
        raw.hasSellerReview ||
        raw.has_seller_review ||
        raw.hasItemReview ||
        raw.has_item_review
      )
  };

};

/* ============================================================
   COMPONENT
============================================================ */

export default function BuyerTransactions() {

  const [
    activeTab,
    setActiveTab
  ] = useState('purchases');


  const [
    search,
    setSearch
  ] = useState('');


  const [
    status,
    setStatus
  ] = useState('all');


  const [
    time,
    setTime
  ] = useState('all');


  const [
    page,
    setPage
  ] = useState(1);


  const [
    transactions,
    setTransactions
  ] = useState([]);


  const [
    summary,
    setSummary
  ] = useState({
    purchases: 0,
    trades: 0,
    donations: 0,
    completed: 0
  });


  const [
    pagination,
    setPagination
  ] = useState({
    page: 1,
    limit: 7,
    total: 0,
    totalPages: 0
  });


  const [
    loading,
    setLoading
  ] = useState(true);


  const [
    summaryLoading,
    setSummaryLoading
  ] = useState(true);


  const [
    error,
    setError
  ] = useState('');


  const [
    selectedTransaction,
    setSelectedTransaction
  ] = useState(null);


  const [
    modalLoading,
    setModalLoading
  ] = useState(false);


  const [
    modalError,
    setModalError
  ] = useState('');


  const [
    refreshing,
    setRefreshing
  ] = useState(false);


  /* ==========================================================
     REVIEW STATE
  ========================================================== */

  const [
    reviewModalOpen,
    setReviewModalOpen
  ] = useState(false);


  const [
    reviewTransaction,
    setReviewTransaction
  ] = useState(null);


  const [
    reviewLoading,
    setReviewLoading
  ] = useState(false);


  const [
    reviewSubmitting,
    setReviewSubmitting
  ] = useState(false);


  const [
    reviewError,
    setReviewError
  ] = useState('');


  const [
    sellerReviewRating,
    setSellerReviewRating
  ] = useState(0);


  const [
    sellerReviewComment,
    setSellerReviewComment
  ] = useState('');


  const [
    existingSellerReview,
    setExistingSellerReview
  ] = useState(null);


  const [
    itemReviewDrafts,
    setItemReviewDrafts
  ] = useState({});


  const [
    existingItemReviews,
    setExistingItemReviews
  ] = useState({});


  /* ==========================================================
     LOAD SUMMARY
  ========================================================== */

  const loadSummary =
    useCallback(
      async () => {

        try {

          setSummaryLoading(
            true
          );

          const response =
            await getBuyerTransactionSummary();

          const data =
            response?.data || {};

          setSummary({
            purchases:
              Number(
                data.purchases ??
                data.totalPurchases ??
                0
              ),
            trades:
              Number(
                data.trades ??
                0
              ),
            donations:
              Number(
                data.donations ??
                0
              ),
            completed:
              Number(
                data.completed ??
                data.completedPurchases ??
                0
              )
          });

        } catch (err) {

          console.error(
            'Transaction summary error:',
            err
          );

        } finally {

          setSummaryLoading(
            false
          );

        }

      },
      []
    );


  /* ==========================================================
     LOAD TRANSACTIONS
  ========================================================== */

  const loadTransactions =
    useCallback(
      async () => {

        try {

          setLoading(true);
          setError('');

          const effectiveStatus =
            activeTab === 'completed'
              ? 'completed'
              : status;


          if (
            activeTab === 'trades' ||
            activeTab === 'donations'
          ) {

            setTransactions([]);

            setPagination({
              page: 1,
              limit: 7,
              total: 0,
              totalPages: 0
            });

            return;

          }


          const response =
            await getBuyerTransactions({
              search,
              status:
                effectiveStatus,
              page,
              limit: 7
            });

          const payload =
            response?.data &&
            !Array.isArray(response.data)
              ? response.data
              : response;

          const data =
            Array.isArray(
              payload?.transactions
            )
              ? payload.transactions
              : Array.isArray(response?.items)
                ? response.items
                : Array.isArray(response?.data)
                  ? response.data
                  : [];

          setTransactions(
            data.map(
              normalizeTransaction
            )
          );

          const apiPagination =
            payload?.pagination ||
            response?.pagination ||
            null;

          setPagination(
            apiPagination || {
              page,
              limit: 7,
              total: data.length,
              totalPages:
                data.length
                  ? 1
                  : 0
            }
          );

        } catch (err) {

          console.error(
            'Transactions loading error:',
            err
          );

          setError(
            err.message ||
            'Failed to load transactions.'
          );

        } finally {

          setLoading(false);

        }

      },
      [
        activeTab,
        search,
        status,
        time,
        page
      ]
    );


  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {

    loadSummary();

  }, [
    loadSummary
  ]);


  useEffect(() => {

    loadTransactions();

  }, [
    loadTransactions
  ]);


  /* ==========================================================
     SEARCH
  ========================================================== */

  const handleSearch =
    (event) => {

      setSearch(
        event.target.value
      );

      setPage(1);

    };


  /* ==========================================================
     STATUS
  ========================================================== */

  const handleStatusChange =
    (event) => {

      setStatus(
        event.target.value
      );

      setPage(1);

    };


  /* ==========================================================
     TIME
  ========================================================== */

  const handleTimeChange =
    (event) => {

      setTime(
        event.target.value
      );

      setPage(1);

    };


  /* ==========================================================
     TABS
  ========================================================== */

  const handleTabChange =
    (tab) => {

      setActiveTab(tab);

      setPage(1);

      setStatus('all');

    };


  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh =
    async () => {

      setRefreshing(true);

      await Promise.all([
        loadSummary(),
        loadTransactions()
      ]);

      setRefreshing(false);

    };


  /* ==========================================================
     VIEW DETAILS
  ========================================================== */

  const handleViewDetails =
    async (transaction) => {

      try {

        setModalLoading(true);

        setModalError('');

        setSelectedTransaction(
          transaction
        );


        const response =
          await getBuyerTransaction(
            transaction.orderId
          );

        const payload =
          response?.data || {};

        const order =
          payload?.order || {};

        const normalized =
          normalizeTransaction({
            ...transaction,
            ...order,
            orderId:
              order.order_id ??
              order.orderId ??
              transaction.orderId,
            orderNumber:
              order.order_number ??
              order.orderNumber ??
              transaction.orderNumber,
            total:
              order.total_amount ??
              order.totalAmount ??
              transaction.total,
            status:
              order.status ??
              transaction.status,
            shippingAddress:
              order.shipping_address ??
              order.shippingAddress,
            notes:
              order.notes,
            createdAt:
              order.created_at ??
              order.createdAt ??
              transaction.createdAt,
            items:
              payload.items ||
              transaction.items ||
              []
          });

        setSelectedTransaction(
          normalized
        );

      } catch (err) {

        console.error(
          'Transaction details error:',
          err
        );

        setModalError(
          err.message ||
          'Unable to load transaction details.'
        );

      } finally {

        setModalLoading(false);

      }

    };


  /* ==========================================================
     CLOSE TRANSACTION MODAL
  ========================================================== */

  const closeModal =
    () => {

      setSelectedTransaction(
        null
      );

      setModalError('');

    };


  /* ==========================================================
     OPEN REVIEW
  ========================================================== */

  const handleOpenReview =
    async (transaction) => {

      try {

        const normalized =
          normalizeTransaction(
            transaction
          );

        setReviewModalOpen(true);

        setReviewTransaction(
          normalized
        );

        setReviewLoading(true);

        setReviewError('');

        setSellerReviewRating(0);

        setSellerReviewComment('');

        setExistingSellerReview(null);

        setItemReviewDrafts({});

        setExistingItemReviews({});


        const response =
          await getBuyerTransactionReview(
            normalized.orderId
          );


        const data =
          response?.data || {};

        const sellerReview =
          data.sellerReview ||
          data.review ||
          null;

        const itemReviews =
          Array.isArray(
            data.itemReviews
          )
            ? data.itemReviews
            : [];


        if (sellerReview) {

          setExistingSellerReview(
            sellerReview
          );

          setSellerReviewRating(
            Number(
              sellerReview.rating || 0
            )
          );

          setSellerReviewComment(
            sellerReview.comment || ''
          );

        }


        const itemDrafts = {};
        const itemExisting = {};

        itemReviews.forEach(
          (review) => {

            const listingId =
              review.listingId ??
              review.listing_id;

            if (
              listingId === null ||
              listingId === undefined
            ) {
              return;
            }

            itemDrafts[
              String(listingId)
            ] = {
              rating:
                Number(
                  review.rating || 0
                ),
              comment:
                review.comment || ''
            };

            itemExisting[
              String(listingId)
            ] = review;

          }
        );


        normalized.items.forEach(
          (item) => {

            const listingId =
              item.listingId ??
              item.listing_id;

            if (
              listingId === null ||
              listingId === undefined
            ) {
              return;
            }

            const key =
              String(listingId);

            if (
              !itemDrafts[key]
            ) {

              itemDrafts[key] = {
                rating: 0,
                comment: ''
              };

            }

          }
        );


        setItemReviewDrafts(
          itemDrafts
        );

        setExistingItemReviews(
          itemExisting
        );

      } catch (err) {

        /*
         * No existing review is a valid state.
         * The modal remains open so the buyer can
         * create new seller/item reviews.
         */

        console.error(
          'Review loading error:',
          err
        );

        setReviewError(
          String(
            err?.message || ''
          ).includes('404')
            ? ''
            : (
              err?.message ||
              'Unable to load existing reviews.'
            )
        );

      } finally {

        setReviewLoading(false);

      }

    };


  /* ==========================================================
     CLOSE REVIEW
  ========================================================== */

  const closeReviewModal =
    () => {

      if (reviewSubmitting) {
        return;
      }

      setReviewModalOpen(false);

      setReviewTransaction(
        null
      );

      setReviewLoading(false);

      setReviewSubmitting(false);

      setReviewError('');

      setSellerReviewRating(0);

      setSellerReviewComment('');

      setExistingSellerReview(null);

      setItemReviewDrafts({});

      setExistingItemReviews({});

    };


  /* ==========================================================
     ITEM REVIEW DRAFT
  ========================================================== */

  const handleItemRatingChange =
    (listingId, rating) => {

      setItemReviewDrafts(
        (previous) => ({
          ...previous,
          [String(listingId)]: {
            ...(previous[
              String(listingId)
            ] || {
              rating: 0,
              comment: ''
            }),
            rating
          }
        })
      );

    };


  const handleItemCommentChange =
    (listingId, comment) => {

      setItemReviewDrafts(
        (previous) => ({
          ...previous,
          [String(listingId)]: {
            ...(previous[
              String(listingId)
            ] || {
              rating: 0,
              comment: ''
            }),
            comment
          }
        })
      );

    };


  /* ==========================================================
     SUBMIT SELLER + ITEM REVIEWS
  ========================================================== */

  const handleSubmitReview =
    async (event) => {

      event.preventDefault();


      if (!reviewTransaction) {
        return;
      }


      if (
        !sellerReviewRating ||
        sellerReviewRating < 1 ||
        sellerReviewRating > 5
      ) {

        setReviewError(
          'Please rate the seller from 1 to 5 stars.'
        );

        return;

      }


      const items =
        Array.isArray(
          reviewTransaction.items
        )
          ? reviewTransaction.items
          : [];


      const itemRatings =
        items.map(
          (item) => {

            const listingId =
              item.listingId ??
              item.listing_id;

            const draft =
              itemReviewDrafts[
                String(listingId)
              ] || {
                rating: 0,
                comment: ''
              };

            return {
              item,
              listingId,
              rating:
                Number(
                  draft.rating || 0
                ),
              comment:
                draft.comment || ''
            };

          }
        );


      const unratedItem =
        itemRatings.find(
          (entry) =>
            !entry.listingId ||
            entry.rating < 1 ||
            entry.rating > 5
        );


      if (unratedItem) {

        setReviewError(
          'Please rate every item in this transaction before submitting.'
        );

        return;

      }


      try {

        setReviewSubmitting(true);

        setReviewError('');


        await saveBuyerSellerReview({
          orderId:
            reviewTransaction.orderId,
          rating:
            sellerReviewRating,
          comment:
            sellerReviewComment
        });


        for (
          const entry of itemRatings
        ) {

          await saveBuyerItemReview({
            orderId:
              reviewTransaction.orderId,
            listingId:
              entry.listingId,
            rating:
              entry.rating,
            comment:
              entry.comment
          });

        }


        await loadTransactions();


        /*
         * Reload the reviews so the buyer sees
         * the saved ratings immediately.
         */

        await handleOpenReview(
          normalizeTransaction(
            reviewTransaction
          )
        );

      } catch (err) {

        console.error(
          'Review submit error:',
          err
        );

        setReviewError(
          err.message ||
          'Unable to save your reviews.'
        );

      } finally {

        setReviewSubmitting(false);

      }

    };


  /* ==========================================================
     SUMMARY
  ========================================================== */

  const summaryCards =
    useMemo(
      () => [

        {
          key: 'purchases',
          label: 'Purchases',
          value:
            summary.purchases,
          icon:
            ShoppingCart,
          className:
            'purple'
        },

        {
          key: 'trades',
          label: 'Trade Requests',
          value:
            summary.trades,
          icon:
            ArrowLeftRight,
          className:
            'blue'
        },

        {
          key: 'donations',
          label: 'Donations',
          value:
            summary.donations,
          icon:
            Heart,
          className:
            'pink'
        },

        {
          key: 'completed',
          label: 'Completed',
          value:
            summary.completed,
          icon:
            CheckCircle2,
          className:
            'green'
        }

      ],
      [summary]
    );


  const totalPages =
    Number(
      pagination.totalPages || 0
    );


  return (

    <div className="buyer-transactions-page buyer-transactions-enhanced">

      <style>

        {`

          .buyer-transactions-enhanced {
            font-size: 13px;
          }

          .buyer-transactions-enhanced .transactions-tabs {
            min-height: 58px;
          }

          .buyer-transactions-enhanced .transaction-tab {
            font-size: 13px !important;
            min-height: 48px;
          }

          .buyer-transactions-enhanced .transaction-tab span {
            font-size: 13px !important;
          }

          .buyer-transactions-enhanced .transaction-tab b {
            font-size: 13px !important;
          }

          .buyer-transactions-enhanced .transactions-search input {
            font-size: 13px !important;
          }

          .buyer-transactions-enhanced .transactions-filter-bar select {
            font-size: 13px !important;
            min-height: 40px;
          }

          .buyer-transactions-enhanced .transaction-filter-button {
            min-height: 40px;
            font-size: 13px !important;
          }

          .buyer-transactions-enhanced .transaction-filter-button span {
            font-size: 13px !important;
          }

          .buyer-transactions-enhanced .transactions-table-header {
            font-size: 12px !important;
            font-weight: 800;
          }

          .buyer-transactions-enhanced .transaction-row {
            min-height: 92px;
          }

          .buyer-transactions-enhanced .transaction-item-image {
            width: 72px !important;
            height: 72px !important;
            min-width: 72px;
            overflow: hidden;
            border-radius: 10px;
            background: #f4f1fb;
          }

          .buyer-transactions-enhanced .transaction-item-image img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
          }

          .buyer-transactions-enhanced .transaction-image-fallback {
            width: 100%;
            height: 100%;
            align-items: center;
            justify-content: center;
            color: #8b82b5;
          }

          .buyer-transactions-enhanced .transaction-item-info strong {
            font-size: 14px !important;
            line-height: 1.35;
          }

          .buyer-transactions-enhanced .transaction-item-info span {
            font-size: 12px !important;
          }

          .buyer-transactions-enhanced .transaction-item-info b {
            font-size: 13px !important;
          }

          .buyer-transactions-enhanced .transaction-item-info small {
            font-size: 11px !important;
          }

          .buyer-transactions-enhanced .transaction-seller-cell strong {
            font-size: 13px !important;
          }

          .buyer-transactions-enhanced .transaction-date-cell strong {
            font-size: 12px !important;
          }

          .buyer-transactions-enhanced .transaction-date-cell span {
            font-size: 11px !important;
          }

          .buyer-transactions-enhanced .transaction-total-cell strong {
            font-size: 14px !important;
          }

          .buyer-transactions-enhanced .transaction-total-cell span {
            font-size: 11px !important;
          }

          .buyer-transactions-enhanced .transaction-status {
            font-size: 11px !important;
            min-height: 26px;
            padding: 5px 10px;
          }

          .buyer-transactions-enhanced .transactions-pagination {
            font-size: 12px !important;
          }

          .buyer-transactions-enhanced .pagination-controls button {
            width: 34px;
            height: 34px;
          }

          .buyer-transactions-enhanced .summary-stat strong {
            font-size: 21px !important;
          }

          .buyer-transactions-enhanced .summary-stat span {
            font-size: 11px !important;
          }

          .buyer-transactions-enhanced .side-card-title h3 {
            font-size: 14px !important;
          }

          .buyer-transactions-enhanced .quick-actions button {
            min-height: 42px;
          }

          .buyer-transactions-enhanced .quick-actions button span {
            font-size: 12px !important;
          }

          .buyer-transactions-enhanced .status-guide strong {
            font-size: 12px !important;
          }

          .buyer-transactions-enhanced .status-guide p {
            font-size: 11px !important;
            line-height: 1.45;
          }

          .buyer-transactions-enhanced .transactions-empty h3 {
            font-size: 16px !important;
          }

          .buyer-transactions-enhanced .transactions-empty p {
            font-size: 12px !important;
          }

          .buyer-transactions-enhanced .transactions-loading p {
            font-size: 12px !important;
          }

          .buyer-transactions-enhanced .transaction-modal {
            max-width: 760px;
          }

          .buyer-transactions-enhanced .transaction-modal-header span {
            font-size: 12px !important;
          }

          .buyer-transactions-enhanced .transaction-modal-header h2 {
            font-size: 21px !important;
          }

          .buyer-transactions-enhanced .modal-summary-grid span {
            font-size: 11px !important;
          }

          .buyer-transactions-enhanced .modal-summary-grid strong {
            font-size: 14px !important;
          }

          .buyer-transactions-enhanced .modal-section h3 {
            font-size: 14px !important;
          }

          .buyer-transactions-enhanced .modal-item-image {
            width: 70px !important;
            height: 70px !important;
            min-width: 70px;
            overflow: hidden;
            border-radius: 9px;
            background: #f4f1fb;
          }

          .buyer-transactions-enhanced .modal-item-image img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
          }

          .buyer-transactions-enhanced .modal-item-image-fallback {
            width: 100%;
            height: 100%;
            align-items: center;
            justify-content: center;
            color: #8b82b5;
          }

          .buyer-transactions-enhanced .modal-item-info strong {
            font-size: 14px !important;
          }

          .buyer-transactions-enhanced .modal-item-info span {
            font-size: 12px !important;
          }

          .buyer-transactions-enhanced .modal-item-info small {
            font-size: 11px !important;
          }

          .buyer-transactions-enhanced .modal-item > strong {
            font-size: 14px !important;
          }

          .buyer-transactions-enhanced .modal-address {
            font-size: 12px !important;
            line-height: 1.55;
          }

          /*
           * Review additions only.
           * Existing page design is not changed.
           */

          .buyer-transactions-enhanced .transaction-review-action {
            width: 38px;
            height: 38px;
            border: 1px solid #e8e2f4;
            border-radius: 9px;
            background: #ffffff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .buyer-transactions-enhanced .transaction-review-action:hover {
            transform: translateY(-1px);
            border-color: #cfc4e8;
          }

          .buyer-transactions-enhanced .transaction-review-action.review {
            color: #8b6fb4;
          }

          .buyer-transactions-enhanced .transaction-review-action.review:hover {
            background: #f7f2fc;
          }

          .buyer-transactions-enhanced .transaction-review-action.view-review {
            color: #6d5a98;
          }

          .buyer-transactions-enhanced .transaction-action-cell {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          }

          .buyer-transactions-enhanced .review-stars {
            display: flex;
            align-items: center;
            gap: 5px;
          }

          .buyer-transactions-enhanced .review-star-button {
            border: 0;
            background: transparent;
            padding: 3px;
            cursor: pointer;
            line-height: 0;
            transition: transform 0.15s ease;
          }

          .buyer-transactions-enhanced .review-star-button:hover {
            transform: scale(1.08);
          }

          .buyer-transactions-enhanced .review-star-button:disabled {
            cursor: default;
          }

          .buyer-transactions-enhanced .review-star {
            fill: transparent;
          }

          .buyer-transactions-enhanced .review-star.active {
            fill: currentColor;
          }

          .buyer-transactions-enhanced .review-form-label {
            display: block;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 8px;
          }

          .buyer-transactions-enhanced .review-textarea {
            width: 100%;
            min-height: 110px;
            resize: vertical;
            border: 1px solid #ddd6ea;
            border-radius: 10px;
            padding: 11px 12px;
            font-family: inherit;
            font-size: 12px;
            outline: none;
            box-sizing: border-box;
          }

          .buyer-transactions-enhanced .review-textarea:focus {
            border-color: #9c88bd;
          }

          .buyer-transactions-enhanced .review-submit-button {
            border: 0;
            border-radius: 9px;
            padding: 10px 18px;
            background: #8064a2;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
          }

          .buyer-transactions-enhanced .review-submit-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .buyer-transactions-enhanced .review-cancel-button {
            border: 1px solid #ddd6ea;
            border-radius: 9px;
            padding: 10px 18px;
            background: #ffffff;
            color: #5d5668;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
          }

          .buyer-transactions-enhanced .review-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 14px;
          }

          .buyer-transactions-enhanced .review-error {
            margin-top: 10px;
            padding: 9px 11px;
            border-radius: 8px;
            background: #fff1f1;
            color: #b84a4a;
            font-size: 11px;
          }

          .buyer-transactions-enhanced .review-existing {
            padding: 12px;
            border-radius: 10px;
            background: #faf8fd;
            border: 1px solid #eee8f5;
          }

          .buyer-transactions-enhanced .review-existing-comment {
            margin: 10px 0 0;
            font-size: 12px;
            line-height: 1.55;
            color: #5e5867;
          }

          .buyer-transactions-enhanced .review-modal-loading {
            min-height: 180px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          @media (max-width: 1100px) {

            .buyer-transactions-enhanced .transaction-row {
              min-height: 86px;
            }

            .buyer-transactions-enhanced .transaction-item-image {
              width: 62px !important;
              height: 62px !important;
              min-width: 62px;
            }

          }

          @media (max-width: 760px) {

            .buyer-transactions-enhanced .transaction-item-image {
              width: 58px !important;
              height: 58px !important;
              min-width: 58px;
            }

            .buyer-transactions-enhanced .transaction-item-info strong {
              font-size: 13px !important;
            }

          }

        `}

      </style>


      <div className="buyer-transactions-main">


        {/* ====================================================
            TABS
        ==================================================== */}

        <div className="transactions-tabs">

          <button
            type="button"
            className={
              activeTab === 'purchases'
                ? 'transaction-tab active'
                : 'transaction-tab'
            }
            onClick={() =>
              handleTabChange(
                'purchases'
              )
            }
          >

            <ShoppingCart
              size={16}
            />

            <span>
              Purchases
            </span>

            <b>
              {summaryLoading
                ? '—'
                : summary.purchases}
            </b>

          </button>


          <button
            type="button"
            className={
              activeTab === 'completed'
                ? 'transaction-tab active'
                : 'transaction-tab'
            }
            onClick={() =>
              handleTabChange(
                'completed'
              )
            }
          >

            <CheckCircle2
              size={16}
            />

            <span>
              Completed
            </span>

            <b>
              {summaryLoading
                ? '—'
                : summary.completed}
            </b>

          </button>

        </div>


        {/* ====================================================
            CONTENT GRID
        ==================================================== */}

        <div className="transactions-content-grid">


          {/* ==================================================
              LEFT
          ================================================== */}

          <section className="transactions-list-section">


            {/* ================================================
                FILTER BAR
            ================================================ */}

            <div className="transactions-filter-bar">

              <div className="transactions-search">

                <Search
                  size={16}
                />

                <input
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  placeholder="Search transactions..."
                />

              </div>


              <select
                value={status}
                onChange={
                  handleStatusChange
                }
                aria-label="Transaction status"
              >

                <option value="all">
                  All Statuses
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="processing">
                  Processing
                </option>

                <option value="shipped">
                  Shipped
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="cancelled">
                  Cancelled
                </option>

              </select>


              <select
                value={time}
                onChange={
                  handleTimeChange
                }
                aria-label="Transaction time"
              >

                <option value="all">
                  All Time
                </option>

                <option value="30">
                  Last 30 Days
                </option>

                <option value="90">
                  Last 90 Days
                </option>

                <option value="365">
                  Last Year
                </option>

              </select>


              <button
                type="button"
                className="transaction-filter-button"
                onClick={handleRefresh}
                disabled={refreshing}
              >

                <RefreshCw
                  size={15}
                  className={
                    refreshing
                      ? 'transaction-spin'
                      : ''
                  }
                />

                <span>
                  Refresh
                </span>

              </button>

            </div>


            {/* ================================================
                ERROR
            ================================================ */}

            {error && (

              <div className="transactions-error">

                <span>
                  {error}
                </span>

                <button
                  type="button"
                  onClick={
                    loadTransactions
                  }
                >
                  Retry
                </button>

              </div>

            )}


            {/* ================================================
                TABLE
            ================================================ */}

            <div className="transactions-table-card">

              <div className="transactions-table-header">

                <span>
                  Item
                </span>

                <span>
                  Seller
                </span>

                <span>
                  Order Date
                </span>

                <span>
                  Total Amount
                </span>

                <span>
                  Status
                </span>

                <span>
                  Action
                </span>

              </div>


              {loading ? (

                <div className="transactions-loading">

                  <div className="transaction-spinner" />

                  <p>
                    Loading transactions...
                  </p>

                </div>

              ) : transactions.length === 0 ? (

                <div className="transactions-empty">

                  <Package
                    size={42}
                  />

                  <h3>
                    No transactions found
                  </h3>

                  <p>
                    There are no transactions
                    matching your current filters.
                  </p>

                </div>

              ) : (

                <div className="transactions-table-body">

                  {transactions.map(
                    (transaction) => {

                      const firstItem =
                        transaction.items?.[0] ||
                        {};

                      const isCompleted =
                        String(
                          transaction.status || ''
                        ).toLowerCase() ===
                        'completed';

                      const hasReview =
                        Boolean(
                          transaction.hasReview ||
                          transaction.has_review ||
                          transaction.hasSellerReview ||
                          transaction.has_seller_review ||
                          transaction.hasItemReview ||
                          transaction.has_item_review
                        );


                      return (

                        <div
                          className="transaction-row"
                          key={
                            transaction.orderId
                          }
                        >


                          {/* ITEM */}

                          <div className="transaction-item-cell">

                            <div className="transaction-item-image">

                              {getTransactionImage(transaction) ? (

                                <img
                                  src={
                                    getTransactionImage(transaction)
                                  }
                                  alt={
                                    transaction.item ||
                                    'Product'
                                  }
                                  loading="lazy"
                                  onError={(event) => {

                                    event.currentTarget.style.display =
                                      'none';

                                    const fallback =
                                      event.currentTarget
                                        .parentElement
                                        ?.querySelector(
                                          '.transaction-image-fallback'
                                        );

                                    if (fallback) {

                                      fallback.style.display =
                                        'flex';

                                    }

                                  }}
                                />

                              ) : null}


                              <div
                                className="transaction-image-fallback"
                                style={{
                                  display:
                                    getTransactionImage(transaction)
                                      ? 'none'
                                      : 'flex'
                                }}
                              >

                                <Package
                                  size={28}
                                />

                              </div>

                            </div>


                            <div className="transaction-item-info">

                              <strong>
                                {
                                  transaction.item
                                }
                              </strong>

                              <span>
                                {
                                  firstItem.condition ||
                                  transaction.itemCategory ||
                                  'Product'
                                }
                              </span>

                              <b>
                                {
                                  formatCurrency(
                                    firstItem.price ??
                                    transaction.total
                                  )
                                }
                              </b>

                              <small>
                                Qty:{' '}
                                {
                                  firstItem.quantity ??
                                  transaction.quantity ??
                                  1
                                }
                              </small>

                            </div>

                          </div>


                          {/* SELLER */}

                          <div className="transaction-seller-cell">

                            <div className="seller-avatar-small">

                              {transaction.seller?.image ? (

                                <img
                                  src={
                                    transaction.seller.image
                                  }
                                  alt={
                                    transaction.seller.name
                                  }
                                />

                              ) : (

                                <UserRound
                                  size={16}
                                />

                              )}

                            </div>


                            <div>

                              <strong>
                                {
                                  transaction.seller?.name ||
                                  'Seller'
                                }
                              </strong>

                            </div>

                          </div>


                          {/* DATE */}

                          <div className="transaction-date-cell">

                            <strong>
                              {
                                formatDate(
                                  transaction.date
                                )
                              }
                            </strong>

                            <span>
                              {
                                formatTime(
                                  transaction.date
                                )
                              }
                            </span>

                          </div>


                          {/* TOTAL */}

                          <div className="transaction-total-cell">

                            <strong>
                              {
                                formatCurrency(
                                  transaction.total
                                )
                              }
                            </strong>

                            <span>
                              (
                              {
                                transaction.itemCount ||
                                1
                              } item
                              {
                                Number(
                                  transaction.itemCount ||
                                  1
                                ) !== 1
                                  ? 's'
                                  : ''
                              }
                              )
                            </span>

                          </div>


                          {/* STATUS */}

                          <div>

                            <span
                              className={
                                `transaction-status ${statusClass(
                                  transaction.status
                                )}`
                              }
                            >

                              {
                                transaction.status
                              }

                            </span>

                          </div>


                          {/* ACTION */}

                          <div className="transaction-action-cell">

                            <button
                              type="button"
                              className="transaction-icon-action view"
                              title="View transaction details"
                              aria-label="View transaction details"
                              onClick={() =>
                                handleViewDetails(
                                  transaction
                                )
                              }
                            >

                              <Eye
                                size={17}
                              />

                            </button>


                            {isCompleted && (

                              <button
                                type="button"
                                className={
                                  hasReview
                                    ? 'transaction-review-action view-review'
                                    : 'transaction-review-action review'
                                }
                                title={
                                  hasReview
                                    ? 'View review'
                                    : 'Write a review'
                                }
                                aria-label={
                                  hasReview
                                    ? 'View review'
                                    : 'Write a review'
                                }
                                onClick={() =>
                                  handleOpenReview(
                                    transaction
                                  )
                                }
                              >

                                {hasReview ? (

                                  <MessageSquare
                                    size={16}
                                  />

                                ) : (

                                  <Star
                                    size={17}
                                  />

                                )}

                              </button>

                            )}

                          </div>

                        </div>

                      );

                    }

                  )}

                </div>

              )}


              {/* PAGINATION */}

              {!loading &&
                transactions.length > 0 && (

                <div className="transactions-pagination">

                  <span>

                    Showing{' '}

                    {(
                      (pagination.page - 1) *
                      pagination.limit
                    ) + 1}

                    -

                    {Math.min(
                      pagination.page *
                      pagination.limit,
                      pagination.total
                    )}{' '}

                    of{' '}

                    {pagination.total}{' '}

                    transactions

                  </span>


                  <div className="pagination-controls">

                    <button
                      type="button"
                      disabled={
                        page <= 1
                      }
                      onClick={() =>
                        setPage(
                          (previous) =>
                            Math.max(
                              previous - 1,
                              1
                            )
                        )
                      }
                      aria-label="Previous page"
                    >

                      <ChevronLeft
                        size={15}
                      />

                    </button>


                    <span className="current-page">
                      {page}
                    </span>


                    <button
                      type="button"
                      disabled={
                        page >=
                        totalPages
                      }
                      onClick={() =>
                        setPage(
                          (previous) =>
                            previous + 1
                        )
                      }
                      aria-label="Next page"
                    >

                      <ChevronRight
                        size={15}
                      />

                    </button>

                  </div>

                </div>

              )}

            </div>

          </section>


          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

          <aside className="transactions-sidebar">


            {/* SUMMARY */}

            <div className="transaction-side-card">

              <div className="side-card-title">

                <CheckCircle2
                  size={17}
                />

                <h3>
                  Transaction Summary
                </h3>

              </div>


              <div className="transaction-summary-grid">

                {summaryCards.map(
                  (card) => {

                    const Icon =
                      card.icon;

                    return (

                      <div
                        className={
                          `summary-stat ${card.className}`
                        }
                        key={
                          card.key
                        }
                      >

                        <div className="summary-stat-icon">

                          <Icon
                            size={17}
                          />

                        </div>


                        <div>

                          <strong>

                            {
                              summaryLoading
                                ? '—'
                                : card.value
                            }

                          </strong>

                          <span>
                            {
                              card.label
                            }
                          </span>

                        </div>

                      </div>

                    );

                  }

                )}

              </div>

            </div>


            {/* QUICK ACTIONS */}

            <div className="transaction-side-card">

              <div className="side-card-title">

                <Filter
                  size={17}
                />

                <h3>
                  Quick Actions
                </h3>

              </div>


              <div className="quick-actions">

                <button
                  type="button"
                  onClick={() =>
                    window.location.href =
                      '/buyer/marketplace'
                  }
                >

                  <Search
                    size={15}
                  />

                  <span>
                    Browse Marketplace
                  </span>

                  <ChevronRight
                    size={14}
                  />

                </button>


                <button
                  type="button"
                  onClick={() =>
                    window.location.href =
                      '/buyer/marketplace'
                  }
                >

                  <Heart
                    size={15}
                  />

                  <span>
                    My Wishlist
                  </span>

                  <ChevronRight
                    size={14}
                  />

                </button>


                <button
                  type="button"
                  onClick={() =>
                    window.location.href =
                      '/buyer/marketplace'
                  }
                >

                  <ArrowLeftRight
                    size={15}
                  />

                  <span>
                    Create a Trade Request
                  </span>

                  <ChevronRight
                    size={14}
                  />

                </button>


                <button
                  type="button"
                  onClick={() =>
                    window.location.href =
                      '/buyer/marketplace'
                  }
                >

                  <Heart
                    size={15}
                  />

                  <span>
                    Make a Donation
                  </span>

                  <ChevronRight
                    size={14}
                  />

                </button>

              </div>

            </div>


            {/* STATUS GUIDE */}

            <div className="transaction-side-card">

              <div className="side-card-title">

                <Clock
                  size={17}
                />

                <h3>
                  Order Status Guide
                </h3>

              </div>


              <div className="status-guide">

                <div className="guide-item">

                  <span className="guide-dot pending" />

                  <div>

                    <strong>
                      Pending
                    </strong>

                    <p>
                      Waiting for seller
                      to confirm.
                    </p>

                  </div>

                </div>


                <div className="guide-item">

                  <span className="guide-dot processing" />

                  <div>

                    <strong>
                      Processing
                    </strong>

                    <p>
                      Seller is preparing
                      your item.
                    </p>

                  </div>

                </div>


                <div className="guide-item">

                  <span className="guide-dot shipped" />

                  <div>

                    <strong>
                      Shipped
                    </strong>

                    <p>
                      Item is on the way.
                    </p>

                  </div>

                </div>


                <div className="guide-item">

                  <span className="guide-dot completed" />

                  <div>

                    <strong>
                      Completed
                    </strong>

                    <p>
                      Transaction finished
                      successfully.
                    </p>

                  </div>

                </div>


                <div className="guide-item">

                  <span className="guide-dot cancelled" />

                  <div>

                    <strong>
                      Cancelled
                    </strong>

                    <p>
                      Order was cancelled.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </aside>

        </div>

      </div>


      {/* ======================================================
          TRANSACTION DETAILS MODAL
      ====================================================== */}

      {selectedTransaction && (

        <div
          className="transaction-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeModal();

            }

          }}
        >

          <div
            className="transaction-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Transaction details"
          >

            <button
              type="button"
              className="transaction-modal-close"
              onClick={closeModal}
              aria-label="Close"
            >

              <X
                size={19}
              />

            </button>


            <div className="transaction-modal-body">

              <div className="transaction-modal-header">

                <div>

                  <span>
                    Transaction Details
                  </span>

                  <h2>

                    {
                      selectedTransaction.orderNumber ||
                      `Order #${selectedTransaction.orderId}`
                    }

                  </h2>

                </div>


                <span
                  className={
                    `transaction-status ${statusClass(
                      selectedTransaction.status
                    )}`
                  }
                >

                  {
                    selectedTransaction.status
                  }

                </span>

              </div>


              {modalLoading ? (

                <div className="modal-loading">

                  <div className="transaction-spinner" />

                  <p>
                    Loading transaction details...
                  </p>

                </div>

              ) : modalError ? (

                <div className="modal-error">

                  <p>
                    {modalError}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      handleViewDetails(
                        selectedTransaction
                      )
                    }
                  >
                    Retry
                  </button>

                </div>

              ) : (

                <>

                  <div className="modal-summary-grid">

                    <div>

                      <span>
                        Order Date
                      </span>

                      <strong>
                        {
                          formatDate(
                            selectedTransaction.createdAt
                          )
                        }
                      </strong>

                    </div>


                    <div>

                      <span>
                        Total Amount
                      </span>

                      <strong>
                        {
                          formatCurrency(
                            selectedTransaction.total
                          )
                        }
                      </strong>

                    </div>


                    <div>

                      <span>
                        Items
                      </span>

                      <strong>
                        {
                          selectedTransaction.items?.length ||
                          0
                        }
                      </strong>

                    </div>


                    <div>

                      <span>
                        Status
                      </span>

                      <strong>
                        {
                          selectedTransaction.status
                        }
                      </strong>

                    </div>

                  </div>


                  <div className="modal-section">

                    <h3>
                      Order Items
                    </h3>


                    <div className="modal-items">

                      {(
                        selectedTransaction.items ||
                        []
                      ).map(
                        (item) => (

                          <div
                            className="modal-item"
                            key={
                              item.order_item_id
                            }
                          >

                            <div className="modal-item-image">

                              {getTransactionItemImage(item) ? (

                                <img
                                  src={
                                    getTransactionItemImage(item)
                                  }
                                  alt={
                                    item.title ||
                                    'Product'
                                  }
                                  loading="lazy"
                                  onError={(event) => {

                                    event.currentTarget.style.display =
                                      'none';

                                    const fallback =
                                      event.currentTarget
                                        .parentElement
                                        ?.querySelector(
                                          '.modal-item-image-fallback'
                                        );

                                    if (fallback) {

                                      fallback.style.display =
                                        'flex';

                                    }

                                  }}
                                />

                              ) : null}


                              <div
                                className="modal-item-image-fallback"
                                style={{
                                  display:
                                    getTransactionItemImage(item)
                                      ? 'none'
                                      : 'flex'
                                }}
                              >

                                <Package
                                  size={26}
                                />

                              </div>

                            </div>


                            <div className="modal-item-info">

                              <strong>
                                {
                                  item.title ||
                                  'Product'
                                }
                              </strong>

                              <span>
                                Qty: {
                                  item.quantity
                                }
                              </span>

                              <small>
                                Seller:{' '}
                                {
                                  item.seller_name ||
                                  'Seller'
                                }
                              </small>

                            </div>


                            <strong>
                              {
                                formatCurrency(
                                  item.subtotal
                                )
                              }
                            </strong>

                          </div>

                        )

                      )}

                    </div>

                  </div>


                  {selectedTransaction.shippingAddress && (

                    <div className="modal-section">

                      <h3>

                        <MapPin
                          size={15}
                        />

                        Shipping Address

                      </h3>

                      <p className="modal-address">
                        {
                          selectedTransaction.shippingAddress
                        }
                      </p>

                    </div>

                  )}


                  {selectedTransaction.notes && (

                    <div className="modal-section">

                      <h3>
                        Notes
                      </h3>

                      <p className="modal-address">
                        {
                          selectedTransaction.notes
                        }
                      </p>

                    </div>

                  )}

                </>

              )}

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          REVIEW MODAL
      ====================================================== */}

      {reviewModalOpen && (

        <div
          className="transaction-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeReviewModal();

            }

          }}
        >

          <div
            className="transaction-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Transaction reviews"
          >

            <button
              type="button"
              className="transaction-modal-close"
              onClick={closeReviewModal}
              aria-label="Close"
              disabled={reviewSubmitting}
            >

              <X
                size={19}
              />

            </button>


            <div className="transaction-modal-body">

              <div className="transaction-modal-header">

                <div>

                  <span>
                    Transaction Review
                  </span>

                  <h2>

                    {
                      reviewTransaction?.orderNumber ||
                      `Order #${reviewTransaction?.orderId || ''}`
                    }

                  </h2>

                </div>

                <MessageSquare
                  size={21}
                />

              </div>


              {reviewLoading ? (

                <div className="review-modal-loading">

                  <div className="transaction-spinner" />

                  <p>
                    Loading review...
                  </p>

                </div>

              ) : (

                <form
                  onSubmit={
                    handleSubmitReview
                  }
                >

                  {/* =========================================
                      SELLER REVIEW
                  ========================================= */}

                  <div className="modal-section">

                    <h3>
                      Seller
                    </h3>


                    <div
                      className="review-existing"
                      style={{
                        marginTop: '10px'
                      }}
                    >

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '10px'
                        }}
                      >

                        <div
                          className="seller-avatar-small"
                        >

                          <UserRound
                            size={17}
                          />

                        </div>

                        <strong
                          style={{
                            fontSize: '13px'
                          }}
                        >

                          {
                            reviewTransaction?.seller?.name ||
                            reviewTransaction?.sellerName ||
                            reviewTransaction?.items?.[0]?.sellerName ||
                            'Seller'
                          }

                        </strong>

                      </div>


                      <span className="review-form-label">
                        Seller Rating
                      </span>


                      <div className="review-stars">

                        {[1, 2, 3, 4, 5].map(
                          (star) => (

                            <button
                              key={star}
                              type="button"
                              className="review-star-button"
                              disabled={
                                reviewSubmitting
                              }
                              onClick={() =>
                                setSellerReviewRating(
                                  star
                                )
                              }
                              aria-label={
                                `${star} star${star > 1 ? 's' : ''} for seller`
                              }
                            >

                              <Star
                                size={25}
                                className={
                                  star <= sellerReviewRating
                                    ? 'review-star active'
                                    : 'review-star'
                                }
                              />

                            </button>

                          )
                        )}

                      </div>


                      <div
                        style={{
                          marginTop: '14px'
                        }}
                      >

                        <label
                          className="review-form-label"
                          htmlFor="buyer-seller-review-comment"
                        >
                          Seller Comment
                        </label>


                        <textarea
                          id="buyer-seller-review-comment"
                          className="review-textarea"
                          value={
                            sellerReviewComment
                          }
                          onChange={(event) =>
                            setSellerReviewComment(
                              event.target.value
                            )
                          }
                          placeholder="Share your experience with the seller..."
                          maxLength={1000}
                          disabled={
                            reviewSubmitting
                          }
                        />

                      </div>

                    </div>

                  </div>


                  {/* =========================================
                      ITEM REVIEWS
                  ========================================= */}

                  <div className="modal-section">

                    <h3>
                      Items
                    </h3>


                    <div className="modal-items">

                      {(
                        reviewTransaction?.items ||
                        []
                      ).map(
                        (item, index) => {

                          const listingId =
                            item.listingId ??
                            item.listing_id;

                          const key =
                            String(
                              listingId ??
                              index
                            );

                          const draft =
                            itemReviewDrafts[key] ||
                            {
                              rating: 0,
                              comment: ''
                            };

                          return (

                            <div
                              className="modal-item"
                              key={
                                item.orderItemId ??
                                item.order_item_id ??
                                key
                              }
                              style={{
                                alignItems: 'flex-start',
                                flexWrap: 'wrap'
                              }}
                            >

                              <div className="modal-item-image">

                                {getTransactionItemImage(item) ? (

                                  <img
                                    src={
                                      getTransactionItemImage(item)
                                    }
                                    alt={
                                      item.title ||
                                      'Product'
                                    }
                                    loading="lazy"
                                    onError={(event) => {

                                      event.currentTarget.style.display =
                                        'none';

                                      const fallback =
                                        event.currentTarget
                                          .parentElement
                                          ?.querySelector(
                                            '.modal-item-image-fallback'
                                          );

                                      if (fallback) {

                                        fallback.style.display =
                                          'flex';

                                      }

                                    }}
                                  />

                                ) : null}


                                <div
                                  className="modal-item-image-fallback"
                                  style={{
                                    display:
                                      getTransactionItemImage(item)
                                        ? 'none'
                                        : 'flex'
                                  }}
                                >

                                  <Package
                                    size={26}
                                  />

                                </div>

                              </div>


                              <div
                                className="modal-item-info"
                                style={{
                                  flex: '1 1 260px',
                                  minWidth: 0
                                }}
                              >

                                <strong>
                                  {
                                    item.title ||
                                    'Product'
                                  }
                                </strong>

                                <span>
                                  Qty: {
                                    item.quantity ??
                                    1
                                  }
                                </span>

                                <small>
                                  Seller:{' '}
                                  {
                                    item.sellerName ||
                                    item.seller_name ||
                                    reviewTransaction?.seller?.name ||
                                    'Seller'
                                  }
                                </small>


                                <div
                                  style={{
                                    marginTop: '10px'
                                  }}
                                >

                                  <span className="review-form-label">
                                    Item Rating
                                  </span>


                                  <div className="review-stars">

                                    {[1, 2, 3, 4, 5].map(
                                      (star) => (

                                        <button
                                          key={star}
                                          type="button"
                                          className="review-star-button"
                                          disabled={
                                            reviewSubmitting
                                          }
                                          onClick={() =>
                                            handleItemRatingChange(
                                              listingId,
                                              star
                                            )
                                          }
                                          aria-label={
                                            `${star} star${star > 1 ? 's' : ''} for item`
                                          }
                                        >

                                          <Star
                                            size={22}
                                            className={
                                              star <=
                                              Number(
                                                draft.rating || 0
                                              )
                                                ? 'review-star active'
                                                : 'review-star'
                                            }
                                          />

                                        </button>

                                      )
                                    )}

                                  </div>


                                  <div
                                    style={{
                                      marginTop: '10px'
                                    }}
                                  >

                                    <label
                                      className="review-form-label"
                                      htmlFor={
                                        `buyer-item-review-comment-${key}`
                                      }
                                    >
                                      Item Comment
                                    </label>


                                    <textarea
                                      id={
                                        `buyer-item-review-comment-${key}`
                                      }
                                      className="review-textarea"
                                      style={{
                                        minHeight: '80px'
                                      }}
                                      value={
                                        draft.comment || ''
                                      }
                                      onChange={(event) =>
                                        handleItemCommentChange(
                                          listingId,
                                          event.target.value
                                        )
                                      }
                                      placeholder="Share your experience with this item..."
                                      maxLength={1000}
                                      disabled={
                                        reviewSubmitting
                                      }
                                    />

                                  </div>

                                </div>

                              </div>


                              <strong
                                style={{
                                  alignSelf: 'flex-start',
                                  marginLeft: 'auto'
                                }}
                              >
                                {
                                  formatCurrency(
                                    item.subtotal
                                  )
                                }
                              </strong>

                            </div>

                          );

                        }

                      )}

                    </div>

                  </div>


                  {reviewError && (

                    <div className="review-error">

                      {reviewError}

                    </div>

                  )}


                  <div className="review-actions">

                    <button
                      type="button"
                      className="review-cancel-button"
                      onClick={
                        closeReviewModal
                      }
                      disabled={
                        reviewSubmitting
                      }
                    >
                      Cancel
                    </button>


                    <button
                      type="submit"
                      className="review-submit-button"
                      disabled={
                        reviewSubmitting
                      }
                    >

                      {reviewSubmitting
                        ? 'Saving Reviews...'
                        : (
                          existingSellerReview ||
                          Object.keys(
                            existingItemReviews
                          ).length > 0
                        )
                          ? 'Update Reviews'
                          : 'Submit Reviews'}

                    </button>

                  </div>

                </form>

              )}

            </div>

          </div>

        </div>

      )}


    </div>

  );

}