import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  FolderOpen,
  Package,
  PauseCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Tag,
  Trash2,
  X,
  XCircle
} from 'lucide-react';

import {
  getAdminMarketplace,
  getAdminMarketplaceStats,
  getAdminMarketplaceCategories,
  getAdminMarketplaceReports,
  updateAdminListingStatus,
  createMarketplaceCategory,
  updateMarketplaceCategory,
  deleteMarketplaceCategory
} from '../../services/api';

import '../../styles/Marketplace.css';


// ============================================================
// HELPERS
// ============================================================

const getResponseArray = (
  response,
  keys = []
) => {

  if (Array.isArray(response)) {
    return response;
  }

  for (const key of keys) {

    if (
      Array.isArray(
        response?.[key]
      )
    ) {

      return response[key];

    }

  }

  if (
    Array.isArray(
      response?.data
    )
  ) {

    return response.data;

  }

  if (
    Array.isArray(
      response?.data?.items
    )
  ) {

    return response.data.items;

  }

  return [];

};


const getListingId = (
  listing
) => {

  return (
    listing?.listing_id ??
    listing?.id ??
    null
  );

};


const getListingTitle = (
  listing
) => {

  return (
    listing?.title ??
    listing?.listing_title ??
    'Untitled Listing'
  );

};


const getCategoryId = (
  category
) => {

  return (
    category?.category_id ??
    category?.id ??
    null
  );

};


const getCategoryName = (
  category
) => {

  return (
    category?.category_name ??
    category?.name ??
    'Unnamed Category'
  );

};


const getSellerName = (
  listing
) => {

  if (
    listing?.seller_name
  ) {

    return listing.seller_name;

  }

  if (
    listing?.seller
  ) {

    if (
      typeof listing.seller === 'string'
    ) {

      return listing.seller;

    }

    return (
      listing.seller?.name ??
      [
        listing.seller?.first_name,
        listing.seller?.last_name
      ]
        .filter(Boolean)
        .join(' ')
    );

  }

  const fullName = [
    listing?.first_name,
    listing?.last_name
  ]
    .filter(Boolean)
    .join(' ');

  return (
    fullName ||
    `Seller #${listing?.seller_id ?? '—'}`
  );

};


const formatPrice = (
  price
) => {

  const number =
    Number(price);

  if (
    Number.isNaN(number)
  ) {

    return '₱0.00';

  }

  return `₱${number.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )}`;

};


const formatDate = (
  date
) => {

  if (!date) {
    return '—';
  }

  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {

    return '—';

  }

  return parsed.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  );

};


const normalizeStatus = (
  status
) => {

  return String(
    status || ''
  )
    .trim()
    .toUpperCase();

};


const displayStatus = (
  status
) => {

  const value =
    normalizeStatus(status);

  const labels = {

    AVAILABLE: 'Active',

    ACTIVE: 'Active',

    HIDDEN: 'Inactive',

    INACTIVE: 'Inactive',

    PENDING: 'Pending',

    RESERVED: 'Reserved',

    SOLD: 'Sold',

    REJECTED: 'Rejected'

  };

  return (
    labels[value] ||
    value ||
    'Unknown'
  );

};


const statusClass = (
  status
) => {

  const value =
    normalizeStatus(status);

  if (
    value === 'AVAILABLE' ||
    value === 'ACTIVE'
  ) {

    return 'active';

  }

  if (
    value === 'HIDDEN' ||
    value === 'INACTIVE'
  ) {

    return 'inactive';

  }

  if (
    value === 'PENDING'
  ) {

    return 'pending';

  }

  if (
    value === 'RESERVED'
  ) {

    return 'reserved';

  }

  if (
    value === 'SOLD'
  ) {

    return 'sold';

  }

  if (
    value === 'REJECTED'
  ) {

    return 'rejected';

  }

  return 'unknown';

};


const normalizeCondition = (
  condition
) => {

  return String(
    condition || ''
  )
    .trim()
    .toUpperCase();

};


const displayCondition = (
  condition
) => {

  const value =
    normalizeCondition(condition);

  const labels = {

    NEW: 'New',

    LIKE_NEW: 'Like New',

    GOOD: 'Good',

    FAIR: 'Fair',

    POOR: 'Poor'

  };

  return (
    labels[value] ||
    value ||
    '—'
  );

};


const getListingSizes = (
  listing
) => {

  const raw =
    listing?.sizes ??
    listing?.size ??
    listing?.available_sizes ??
    listing?.availableSizes ??
    '';

  if (Array.isArray(raw)) {

    return raw
      .map((item) =>
        typeof item === 'object'
          ? (
              item?.size ??
              item?.name ??
              ''
            )
          : item
      )
      .filter(Boolean)
      .join(', ');

  }

  if (
    raw &&
    typeof raw === 'object'
  ) {

    return Object.values(raw)
      .filter(Boolean)
      .join(', ');

  }

  const text =
    String(raw || '').trim();

  if (
    text.startsWith('[') ||
    text.startsWith('{')
  ) {

    try {

      const parsed =
        JSON.parse(text);

      if (Array.isArray(parsed)) {

        return parsed
          .map((item) =>
            typeof item === 'object'
              ? (
                  item?.size ??
                  item?.name ??
                  ''
                )
              : item
          )
          .filter(Boolean)
          .join(', ');

      }

      if (
        parsed &&
        typeof parsed === 'object'
      ) {

        return Object.values(parsed)
          .filter(Boolean)
          .join(', ');

      }

    } catch (error) {

      // Keep the original text when the value is not valid JSON.

    }

  }

  return text;

};


const displayListingSizes = (
  listing
) => {

  const sizes =
    getListingSizes(listing);

  return sizes || '—';

};


// ============================================================
// COMPONENT
// ============================================================

const Marketplace = () => {

  // ==========================================================
  // MAIN STATE
  // ==========================================================

  const [
    activeTab,
    setActiveTab
  ] = useState('listings');


  const [
    listings,
    setListings
  ] = useState([]);


  const [
    categories,
    setCategories
  ] = useState([]);


  const [
    reportedListings,
    setReportedListings
  ] = useState([]);


  const [
    statusPrompt,
    setStatusPrompt
  ] = useState(null);


  const [
    stats,
    setStats
  ] = useState({
    totalListings: 0,
    activeListings: 0,
    pendingListings: 0,
    reportedListings: 0
  });


  const [
    loading,
    setLoading
  ] = useState(true);


  const [
    refreshing,
    setRefreshing
  ] = useState(false);


  const [
    error,
    setError
  ] = useState('');


  const [
    success,
    setSuccess
  ] = useState('');


  // ==========================================================
  // LISTING FILTERS
  // ==========================================================

  const [
    search,
    setSearch
  ] = useState('');


  const [
    categoryFilter,
    setCategoryFilter
  ] = useState('');


  const [
    statusFilter,
    setStatusFilter
  ] = useState('');


  const [
    conditionFilter,
    setConditionFilter
  ] = useState('');


  const [
    page,
    setPage
  ] = useState(1);


  const [
    totalPages,
    setTotalPages
  ] = useState(1);


  const [
    totalListings,
    setTotalListings
  ] = useState(0);


  const [
    sizeSupported,
    setSizeSupported
  ] = useState(false);


  const limit = 8;


  // ==========================================================
  // VIEW LISTING
  // ==========================================================

  const [
    selectedListing,
    setSelectedListing
  ] = useState(null);


  // ==========================================================
  // CATEGORY MANAGEMENT
  // ==========================================================

  const [
    selectedCategory,
    setSelectedCategory
  ] = useState(null);


  const [
    showCategoryModal,
    setShowCategoryModal
  ] = useState(false);


  const [
    categoryModalMode,
    setCategoryModalMode
  ] = useState('add');


  const [
    categoryForm,
    setCategoryForm
  ] = useState({
    category_name: ''
  });


  const [
    savingCategory,
    setSavingCategory
  ] = useState(false);


  // ==========================================================
  // LOAD MARKETPLACE
  // ==========================================================

  const loadMarketplace =
    useCallback(
      async (
        showLoader = true
      ) => {

        try {

          if (
            showLoader
          ) {

            setLoading(true);

          }

          setError('');

          const [
            listingResponse,
            statsResponse,
            categoryResponse,
            reportResponse
          ] =
            await Promise.all([

              getAdminMarketplace({

                page,

                limit,

                search:
                  search.trim(),

                category:
                  categoryFilter,

                status:
                  statusFilter,

                condition:
                  conditionFilter

              }),

              getAdminMarketplaceStats(),

              getAdminMarketplaceCategories(),

              getAdminMarketplaceReports()

            ]);


          // --------------------------------------------------
          // LISTINGS
          // --------------------------------------------------

          const listingData =
            getResponseArray(
              listingResponse,
              [
                'listings',
                'items',
                'results'
              ]
            );


          setListings(
            listingData
          );

          setSizeSupported(
            Boolean(
              listingResponse?.sizeSupported
            )
          );


          // --------------------------------------------------
          // PAGINATION
          // --------------------------------------------------

          const responseTotal =
            Number(
              listingResponse?.total ??
              listingResponse?.totalListings ??
              listingResponse?.pagination?.total ??
              listingResponse?.data?.total ??
              listingData.length
            );


          const responsePages =
            Number(
              listingResponse?.totalPages ??
              listingResponse?.pagination?.totalPages ??
              listingResponse?.data?.totalPages ??
              Math.max(
                1,
                Math.ceil(
                  responseTotal /
                  limit
                )
              )
            );


          setTotalListings(
            Number.isFinite(
              responseTotal
            )
              ? responseTotal
              : listingData.length
          );


          setTotalPages(
            Math.max(
              1,
              responsePages || 1
            )
          );


          // --------------------------------------------------
          // STATS
          // --------------------------------------------------

          const statsData =
            statsResponse?.stats ??
            statsResponse?.data ??
            statsResponse ??
            {};


          setStats({

            totalListings:
              Number(
                statsData?.totalListings ??
                statsData?.total_listings ??
                statsData?.total ??
                0
              ),

            activeListings:
              Number(
                statsData?.activeListings ??
                statsData?.active_listings ??
                statsData?.active ??
                0
              ),

            pendingListings:
              Number(
                statsData?.pendingListings ??
                statsData?.pending_listings ??
                statsData?.pending ??
                0
              ),

            reportedListings:
              Number(
                statsData?.reportedListings ??
                statsData?.reported_listings ??
                statsData?.reported ??
                0
              )

          });


          // --------------------------------------------------
          // CATEGORIES
          // --------------------------------------------------

          setCategories(
            getResponseArray(
              categoryResponse,
              [
                'categories',
                'items',
                'results'
              ]
            )
          );


          setReportedListings(
            getResponseArray(
              reportResponse,
              [
                'reports',
                'reportedListings',
                'items',
                'results'
              ]
            )
          );

        } catch (err) {

          console.error(
            'Marketplace loading error:',
            err
          );

          setError(
            err?.message ||
            'Unable to load marketplace data.'
          );

        } finally {

          setLoading(false);

          setRefreshing(false);

        }

      },
      [
        page,
        search,
        categoryFilter,
        statusFilter,
        conditionFilter
      ]
    );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(
    () => {

      loadMarketplace();

    },
    [
      loadMarketplace
    ]
  );


  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh =
    async () => {

      setRefreshing(true);

      await loadMarketplace(
        false
      );

    };


  // ==========================================================
  // RESET FILTERS
  // ==========================================================

  const resetFilters =
    () => {

      setSearch('');

      setCategoryFilter('');

      setStatusFilter('');

      setConditionFilter('');

      setPage(1);

    };


  // ==========================================================
  // STATUS PROMPT
  // ==========================================================

  const askStatusChange =
    (listing, newStatus) => {

      setStatusPrompt({
        listing,
        newStatus
      });

    };


  const closeStatusPrompt =
    () => {

      setStatusPrompt(null);

    };


  const confirmStatusChange =
    async () => {

      if (!statusPrompt) {
        return;
      }


      const listing =
        statusPrompt.listing;


      const newStatus =
        statusPrompt.newStatus;


      const listingId =
        getListingId(listing);


      if (!listingId) {

        setError(
          'Listing ID was not found.'
        );

        setStatusPrompt(null);

        return;

      }


      try {

        setError('');

        setSuccess('');


        await updateAdminListingStatus(
          listingId,
          newStatus
        );


        const normalized =
          normalizeStatus(
            newStatus
          );


        const actionLabel =
          normalized === 'AVAILABLE' ||
          normalized === 'ACTIVE'
            ? 'approved/restored'
            : normalized === 'REJECTED'
              ? 'rejected'
              : 'suspended';


        setSuccess(
          `Listing "${getListingTitle(listing)}" was ${actionLabel} successfully.`
        );


        setStatusPrompt(null);

        setSelectedListing(null);


        await loadMarketplace(
          false
        );

      } catch (err) {

        console.error(
          'Status update error:',
          err
        );


        setError(
          err?.message ||
          'Unable to update listing status.'
        );


        setStatusPrompt(null);

      }

    };


  // ==========================================================
  // CATEGORY ADD
  // ==========================================================


  const openAddCategory =
    () => {

      setCategoryModalMode(
        'add'
      );

      setSelectedCategory(
        null
      );

      setCategoryForm({
        category_name: ''
      });

      setError('');

      setShowCategoryModal(
        true
      );

    };


  // ==========================================================
  // CATEGORY VIEW
  // ==========================================================

  const openViewCategory =
    (category) => {

      setSelectedCategory(
        category
      );

      setCategoryModalMode(
        'view'
      );

      setCategoryForm({

        category_name:
          getCategoryName(
            category
          )

      });

      setShowCategoryModal(
        true
      );

    };


  // ==========================================================
  // CATEGORY EDIT
  // ==========================================================

  const openEditCategory =
    (category) => {

      setSelectedCategory(
        category
      );

      setCategoryModalMode(
        'edit'
      );

      setCategoryForm({

        category_name:
          getCategoryName(
            category
          )

      });

      setShowCategoryModal(
        true
      );

    };


  // ==========================================================
  // CATEGORY CLOSE
  // ==========================================================

  const closeCategoryModal =
    () => {

      if (
        savingCategory
      ) {

        return;

      }

      setShowCategoryModal(
        false
      );

      setSelectedCategory(
        null
      );

      setCategoryForm({
        category_name: ''
      });

    };


  // ==========================================================
  // CATEGORY SAVE
  // ==========================================================

  const handleSaveCategory =
    async (
      event
    ) => {

      event.preventDefault();


      const categoryName =
        String(
          categoryForm.category_name ||
          ''
        ).trim();


      if (!categoryName) {

        setError(
          'Please enter a category name.'
        );

        return;

      }


      try {

        setSavingCategory(
          true
        );

        setError('');

        setSuccess('');


        if (
          categoryModalMode ===
          'edit'
        ) {

          const categoryId =
            getCategoryId(
              selectedCategory
            );


          if (!categoryId) {

            throw new Error(
              'Category ID was not found.'
            );

          }


          await updateMarketplaceCategory(
            categoryId,
            categoryName
          );


          setSuccess(
            'Category updated successfully.'
          );

        } else {

          await createMarketplaceCategory(
            categoryName
          );


          setSuccess(
            'Category added successfully.'
          );

        }


        closeCategoryModal();


        await loadMarketplace(
          false
        );

      } catch (err) {

        console.error(
          'Category save error:',
          err
        );

        setError(
          err?.message ||
          'Unable to save category.'
        );

      } finally {

        setSavingCategory(
          false
        );

      }

    };


  // ==========================================================
  // CATEGORY DELETE
  // ==========================================================

  const handleDeleteCategory =
    async (
      category
    ) => {

      const categoryId =
        getCategoryId(
          category
        );


      const categoryName =
        getCategoryName(
          category
        );


      if (!categoryId) {

        setError(
          'Category ID was not found.'
        );

        return;

      }


      const confirmed =
        window.confirm(
          `Delete category "${categoryName}"?\n\nThis action cannot be undone.`
        );


      if (!confirmed) {

        return;

      }


      try {

        setError('');

        setSuccess('');


        await deleteMarketplaceCategory(
          categoryId
        );


        if (
          String(
            categoryFilter
          ) ===
          String(categoryId)
        ) {

          setCategoryFilter('');

          setPage(1);

        }


        setSuccess(
          `Category "${categoryName}" was deleted successfully.`
        );


        await loadMarketplace(
          false
        );

      } catch (err) {

        console.error(
          'Delete category error:',
          err
        );

        setError(
          err?.message ||
          'Unable to delete category.'
        );

      }

    };


  // ==========================================================
  // PAGINATION
  // ==========================================================

  const paginationNumbers =
    useMemo(
      () => {

        const pages = [];

        const maxVisible = 5;

        let start =
          Math.max(
            1,
            page - 2
          );

        let end =
          Math.min(
            totalPages,
            start +
            maxVisible -
            1
          );


        if (
          end -
          start +
          1 <
          maxVisible
        ) {

          start =
            Math.max(
              1,
              end -
              maxVisible +
              1
            );

        }


        for (
          let i = start;
          i <= end;
          i++
        ) {

          pages.push(i);

        }


        return pages;

      },
      [
        page,
        totalPages
      ]
    );


  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading
  ) {

    return (

      <div className="marketplace-page">

        <div className="marketplace-loading">

          <div className="marketplace-spinner">

            <RefreshCw
              size={22}
            />

          </div>

          <strong>
            Loading Marketplace
          </strong>

          <span>
            Please wait while marketplace data is being loaded.
          </span>

        </div>

      </div>

    );

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="marketplace-page">

      {/* ======================================================
          ALERTS
          ====================================================== */}

      {error && (

        <div className="marketplace-alert error">

          <ShieldAlert
            size={17}
          />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
            aria-label="Close error"
          >

            <X
              size={15}
            />

          </button>

        </div>

      )}


      {success && (

        <div className="marketplace-alert success">

          <CheckCircle
            size={17}
          />

          <span>
            {success}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccess('')
            }
            aria-label="Close success"
          >

            <X
              size={15}
            />

          </button>

        </div>

      )}


      {/* ======================================================
          STAT CARDS
          ====================================================== */}

      <div className="marketplace-stat-grid">

        <div className="marketplace-stat-card purple">

          <div className="marketplace-stat-icon">

            <Package
              size={24}
            />

          </div>

          <div className="marketplace-stat-content">

            <span>
              Total Listings
            </span>

            <strong>
              {stats.totalListings}
            </strong>

            <small>
              All marketplace listings
            </small>

          </div>

        </div>


        <div className="marketplace-stat-card green">

          <div className="marketplace-stat-icon">

            <CheckCircle
              size={24}
            />

          </div>

          <div className="marketplace-stat-content">

            <span>
              Active Listings
            </span>

            <strong>
              {stats.activeListings}
            </strong>

            <small>
              Currently available
            </small>

          </div>

        </div>


        <div className="marketplace-stat-card orange">

          <div className="marketplace-stat-icon">

            <PauseCircle
              size={24}
            />

          </div>

          <div className="marketplace-stat-content">

            <span>
              Pending Listings
            </span>

            <strong>
              {stats.pendingListings}
            </strong>

            <small>
              Waiting for review
            </small>

          </div>

        </div>


        <div className="marketplace-stat-card red">

          <div className="marketplace-stat-icon">

            <ShieldAlert
              size={24}
            />

          </div>

          <div className="marketplace-stat-content">

            <span>
              Reported Listings
            </span>

            <strong>
              {stats.reportedListings}
            </strong>

            <small>
              Reported marketplace items
            </small>

          </div>

        </div>

      </div>


      {/* ======================================================
          MAIN LAYOUT
          ====================================================== */}

      <div className="marketplace-layout">

        {/* ====================================================
            MAIN CARD
            ==================================================== */}

        <div className="marketplace-main-card">

          {/* ==================================================
              TABS
              ================================================== */}

          <div className="marketplace-tabs">

            <button
              type="button"
              className={
                activeTab === 'listings'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTab(
                  'listings'
                )
              }
            >

              <Package
                size={15}
              />

              Listings

            </button>


            <button
              type="button"
              className={
                activeTab === 'categories'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTab(
                  'categories'
                )
              }
            >

              <FolderOpen
                size={15}
              />

              Categories

            </button>


            <button
              type="button"
              className={
                activeTab === 'reports'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTab(
                  'reports'
                )
              }
            >

              <ShieldAlert
                size={15}
              />

              Reports

            </button>

          </div>


          {/* ==================================================
              LISTINGS TAB
              ================================================== */}

          {activeTab === 'listings' && (

            <>

              {/* TOOLBAR */}

              <div className="marketplace-toolbar">

                <div className="marketplace-search">

                  <Search
                    size={15}
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => {

                      setSearch(
                        event.target.value
                      );

                      setPage(1);

                    }}
                    placeholder="Search listings..."
                  />

                </div>


                <select
                  value={categoryFilter}
                  onChange={(event) => {

                    setCategoryFilter(
                      event.target.value
                    );

                    setPage(1);

                  }}
                >

                  <option value="">
                    All Categories
                  </option>

                  {categories.map(
                    (category) => (

                      <option
                        key={
                          getCategoryId(
                            category
                          )
                        }
                        value={
                          getCategoryId(
                            category
                          )
                        }
                      >

                        {
                          getCategoryName(
                            category
                          )
                        }

                      </option>

                    )
                  )}

                </select>


                <select
                  value={statusFilter}
                  onChange={(event) => {

                    setStatusFilter(
                      event.target.value
                    );

                    setPage(1);

                  }}
                >

                  <option value="">
                    All Status
                  </option>

                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="PENDING">
                    Pending
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>

                  <option value="RESERVED">
                    Reserved
                  </option>

                  <option value="SOLD">
                    Sold
                  </option>

                  <option value="REJECTED">
                    Rejected
                  </option>

                </select>


                <select
                  value={conditionFilter}
                  onChange={(event) => {

                    setConditionFilter(
                      event.target.value
                    );

                    setPage(1);

                  }}
                >

                  <option value="">
                    All Conditions
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


                <button
                  type="button"
                  className="marketplace-reset-button"
                  onClick={
                    resetFilters
                  }
                >

                  <RotateCcw
                    size={14}
                  />

                  Reset

                </button>
              </div>


              {/* REFRESH */}

              <div className="marketplace-table-heading">

                <div>

                  <strong>
                    Marketplace Listings
                  </strong>

                  <span>
                    Review and moderate marketplace listings from the database.
                  </span>

                </div>


                <button
                  type="button"
                  className="marketplace-refresh-button"
                  onClick={
                    handleRefresh
                  }
                  disabled={
                    refreshing
                  }
                >

                  <RefreshCw
                    size={14}
                    className={
                      refreshing
                        ? 'spinning'
                        : ''
                    }
                  />

                  Refresh

                </button>

              </div>


              {/* TABLE */}

              <div className="marketplace-table-wrapper">

                <table className="marketplace-table">

                  <thead>

                    <tr>

                      <th>
                        Image
                      </th>

                      <th>
                        Title
                      </th>

                      <th>
                        Category
                      </th>

                      <th>
                        Seller
                      </th>

                      <th>
                        Price
                      </th>

                      <th>
                        Qty
                      </th>

                      <th>
                        Sizes
                      </th>

                      <th>
                        Condition
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Actions
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {listings.length === 0 ? (

                      <tr>

                        <td
                          colSpan="10"
                          className="marketplace-empty-cell"
                        >

                          <div className="marketplace-empty">

                            <Package
                              size={34}
                            />

                            <strong>
                              No listings found
                            </strong>

                            <span>
                              Try changing your filters or review another listing status.
                            </span>

                          </div>

                        </td>

                      </tr>

                    ) : (

                      listings.map(
                        (listing) => {

                          const listingId =
                            getListingId(
                              listing
                            );


                          const status =
                            normalizeStatus(
                              listing?.status
                            );


                          const image =
                            listing?.image_url ||
                            listing?.image ||
                            listing?.listing_image ||
                            listing?.photo ||
                            '';


                          return (

                            <tr
                              key={
                                listingId
                              }
                            >

                              {/* IMAGE */}

                              <td className="image-column">

                                {image ? (

                                  <img
                                    src={image}
                                    alt={
                                      getListingTitle(
                                        listing
                                      )
                                    }
                                    className="listing-image"
                                  />

                                ) : (

                                  <div className="listing-image-placeholder">

                                    <Package
                                      size={20}
                                    />

                                  </div>

                                )}

                              </td>


                              {/* TITLE */}

                              <td>

                                <div className="listing-title-cell">

                                  <strong
                                    title={
                                      getListingTitle(
                                        listing
                                      )
                                    }
                                  >

                                    {
                                      getListingTitle(
                                        listing
                                      )
                                    }

                                  </strong>

                                  <small>
                                    ID: {
                                      listingId ??
                                      '—'
                                    }
                                  </small>

                                </div>

                              </td>


                              {/* CATEGORY */}

                              <td>

                                <span className="category-badge">

                                  {
                                    listing?.category_name ||
                                    listing?.category ||
                                    '—'
                                  }

                                </span>

                              </td>


                              {/* SELLER */}

                              <td>

                                <div className="seller-cell">

                                  <strong>
                                    {
                                      getSellerName(
                                        listing
                                      )
                                    }
                                  </strong>

                                  <small>
                                    ID: {
                                      listing?.seller_id ??
                                      '—'
                                    }
                                  </small>

                                </div>

                              </td>


                              {/* PRICE */}

                              <td>

                                <strong className="listing-price">

                                  {
                                    formatPrice(
                                      listing?.price
                                    )
                                  }

                                </strong>

                              </td>


                              {/* QUANTITY */}

                              <td>

                                <span className="quantity-value">

                                  {
                                    listing?.quantity ??
                                    0
                                  }

                                </span>

                              </td>


                              {/* SIZES */}

                              <td>

                                <span className="sizes-badge">

                                  {
                                    displayListingSizes(
                                      listing
                                    )
                                  }

                                </span>

                              </td>


                              {/* CONDITION */}

                              <td>

                                <span className="condition-badge">

                                  {
                                    displayCondition(
                                      listing?.condition
                                    )
                                  }

                                </span>

                              </td>


                              {/* STATUS */}

                              <td>

                                <span
                                  className={
                                    `listing-status ${
                                      statusClass(
                                        status
                                      )
                                    }`
                                  }
                                >

                                  <span className="status-dot" />

                                  {
                                    displayStatus(
                                      status
                                    )
                                  }

                                </span>

                              </td>


                              {/* ACTIONS */}

                              <td>

                                <div className="listing-actions">

                                  <button
                                    type="button"
                                    className="listing-action view"
                                    title="View Listing"
                                    onClick={() =>
                                      setSelectedListing(
                                        listing
                                      )
                                    }
                                  >

                                    <Eye
                                      size={14}
                                    />

                                    <span>
                                      View
                                    </span>

                                  </button>


                                  {status === 'PENDING' && (

                                    <>

                                      <button
                                        type="button"
                                        className="listing-action activate"
                                        title="Approve Listing"
                                        onClick={() =>
                                          askStatusChange(
                                            listing,
                                            'ACTIVE'
                                          )
                                        }
                                      >

                                        <CheckCircle
                                          size={14}
                                        />

                                        <span>
                                          Approve
                                        </span>

                                      </button>


                                      <button
                                        type="button"
                                        className="listing-action reject"
                                        title="Reject Listing"
                                        onClick={() =>
                                          askStatusChange(
                                            listing,
                                            'REJECTED'
                                          )
                                        }
                                      >

                                        <XCircle
                                          size={14}
                                        />

                                        <span>
                                          Reject
                                        </span>

                                      </button>

                                    </>

                                  )}


                                  {(
                                    status === 'AVAILABLE' ||
                                    status === 'ACTIVE'
                                  ) && (

                                    <button
                                      type="button"
                                      className="listing-action suspend"
                                      title="Suspend Listing"
                                      onClick={() =>
                                        askStatusChange(
                                          listing,
                                          'INACTIVE'
                                        )
                                      }
                                    >

                                      <PauseCircle
                                        size={14}
                                      />

                                      <span>
                                        Suspend
                                      </span>

                                    </button>

                                  )}


                                  {status === 'INACTIVE' && (

                                    <button
                                      type="button"
                                      className="listing-action restore"
                                      title="Restore Listing"
                                      onClick={() =>
                                        askStatusChange(
                                          listing,
                                          'ACTIVE'
                                        )
                                      }
                                    >

                                      <RefreshCw
                                        size={14}
                                      />

                                      <span>
                                        Restore
                                      </span>

                                    </button>

                                  )}

                                </div>

                              </td>

                            </tr>

                          );

                        }
                      )

                    )}

                  </tbody>

                </table>

              </div>


              {/* FOOTER */}

              <div className="marketplace-table-footer">

                <span>

                  Showing {
                    listings.length
                  } of {
                    totalListings
                  } listings

                </span>


                <div className="marketplace-pagination">

                  <button
                    type="button"
                    disabled={
                      page <= 1
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1
                          )
                      )
                    }
                  >

                    <ChevronLeft
                      size={15}
                    />

                  </button>


                  {paginationNumbers.map(
                    (number) => (

                      <button
                        type="button"
                        key={number}
                        className={
                          page === number
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setPage(
                            number
                          )
                        }
                      >

                        {number}

                      </button>

                    )
                  )}


                  <button
                    type="button"
                    disabled={
                      page >=
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.min(
                            totalPages,
                            current + 1
                          )
                      )
                    }
                  >

                    <ChevronRight
                      size={15}
                    />

                  </button>

                </div>

              </div>

            </>

          )}


          {/* ==================================================
              CATEGORIES TAB
              ================================================== */}

          {activeTab === 'categories' && (

            <div className="marketplace-category-tab">

              <div className="category-tab-heading">

                <div>

                  <h2>
                    Marketplace Categories
                  </h2>

                  <p>
                    Manage the categories used by marketplace listings.
                  </p>

                </div>


                <button
                  type="button"
                  className="marketplace-add-button"
                  onClick={
                    openAddCategory
                  }
                >

                  <Plus
                    size={15}
                  />

                  Add Category

                </button>

              </div>


              {categories.length === 0 ? (

                <div className="category-empty">

                  <FolderOpen
                    size={32}
                  />

                  <strong>
                    No categories found
                  </strong>

                  <span>
                    Add a category to organize marketplace listings.
                  </span>

                </div>

              ) : (

                <div className="category-table-wrapper">

                  <table className="category-table">

                    <thead>

                      <tr>

                        <th>
                          ID
                        </th>

                        <th>
                          Category Name
                        </th>

                        <th>
                          Actions
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {categories.map(
                        (category) => {

                          const categoryId =
                            getCategoryId(
                              category
                            );


                          const categoryName =
                            getCategoryName(
                              category
                            );


                          return (

                            <tr
                              key={
                                categoryId ??
                                categoryName
                              }
                            >

                              <td>
                                {categoryId ?? '—'}
                              </td>

                              <td>

                                <div className="category-name-cell">

                                  <div className="category-small-icon">

                                    <Tag
                                      size={15}
                                    />

                                  </div>

                                  <strong>
                                    {categoryName}
                                  </strong>

                                </div>

                              </td>

                              <td>

                                <div className="listing-actions">

                                  <button
                                    type="button"
                                    className="listing-action view"
                                    title="View Category"
                                    onClick={() =>
                                      openViewCategory(
                                        category
                                      )
                                    }
                                  >

                                    <Eye
                                      size={14}
                                    />

                                    <span>
                                      View
                                    </span>

                                  </button>


                                  <button
                                    type="button"
                                    className="listing-action edit"
                                    title="Edit Category"
                                    onClick={() =>
                                      openEditCategory(
                                        category
                                      )
                                    }
                                  >

                                    <Edit3
                                      size={14}
                                    />

                                    <span>
                                      Edit
                                    </span>

                                  </button>


                                  <button
                                    type="button"
                                    className="listing-action delete"
                                    title="Delete Category"
                                    onClick={() =>
                                      handleDeleteCategory(
                                        category
                                      )
                                    }
                                  >

                                    <Trash2
                                      size={14}
                                    />

                                    <span>
                                      Delete
                                    </span>

                                  </button>

                                </div>

                              </td>

                            </tr>

                          );

                        }
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          )}

          {/* ==================================================
              REPORTS TAB
              ================================================== */}

          {activeTab === 'reports' && (

            <div className="marketplace-report-tab">

              <div className="report-tab-heading">

                <div>

                  <h2>
                    Reported Listings
                  </h2>

                  <p>
                    Review marketplace listings that have received user reports.
                  </p>

                </div>

                <span className="report-count-badge">
                  {reportedListings.length} reported
                </span>

              </div>


              {reportedListings.length === 0 ? (

                <div className="category-empty">

                  <CheckCircle
                    size={32}
                  />

                  <strong>
                    No reported listings
                  </strong>

                  <span>
                    There are currently no marketplace listings with reports.
                  </span>

                </div>

              ) : (

                <div className="category-table-wrapper">

                  <table className="category-table report-table">

                    <thead>

                      <tr>

                        <th>
                          Listing
                        </th>

                        <th>
                          Seller
                        </th>

                        <th>
                          Category
                        </th>

                        <th>
                          Reports
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Actions
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {reportedListings.map(
                        (report) => {

                          const reportStatus =
                            normalizeStatus(
                              report?.status
                            );

                          return (

                            <tr
                              key={
                                getListingId(report) ??
                                `${report?.listing_id}-${report?.report_count}`
                              }
                            >

                              <td>

                                <div className="listing-title-cell">

                                  <strong>
                                    {
                                      getListingTitle(
                                        report
                                      )
                                    }
                                  </strong>

                                  <small>
                                    ID: {
                                      getListingId(report) ??
                                      '—'
                                    }
                                  </small>

                                </div>

                              </td>


                              <td>

                                <div className="seller-cell">

                                  <strong>
                                    {
                                      getSellerName(
                                        report
                                      )
                                    }
                                  </strong>

                                  <small>
                                    ID: {
                                      report?.seller_id ??
                                      '—'
                                    }
                                  </small>

                                </div>

                              </td>


                              <td>

                                <span className="category-badge">
                                  {
                                    report?.category_name ||
                                    '—'
                                  }
                                </span>

                              </td>


                              <td>

                                <span className="report-count-number">
                                  {
                                    Number(
                                      report?.report_count ??
                                      0
                                    )
                                  }
                                </span>

                              </td>


                              <td>

                                <span
                                  className={
                                    `listing-status ${
                                      statusClass(
                                        reportStatus
                                      )
                                    }`
                                  }
                                >

                                  <span className="status-dot" />

                                  {
                                    displayStatus(
                                      reportStatus
                                    )
                                  }

                                </span>

                              </td>


                              <td>

                                <div className="listing-actions">

                                  <button
                                    type="button"
                                    className="listing-action view"
                                    onClick={() =>
                                      setSelectedListing(
                                        report
                                      )
                                    }
                                  >

                                    <Eye
                                      size={14}
                                    />

                                    <span>
                                      View
                                    </span>

                                  </button>


                                  {(
                                    reportStatus === 'AVAILABLE' ||
                                    reportStatus === 'ACTIVE'
                                  ) && (

                                    <button
                                      type="button"
                                      className="listing-action suspend"
                                      onClick={() =>
                                        askStatusChange(
                                          report,
                                          'INACTIVE'
                                        )
                                      }
                                    >

                                      <PauseCircle
                                        size={14}
                                      />

                                      <span>
                                        Suspend
                                      </span>

                                    </button>

                                  )}


                                  {reportStatus === 'INACTIVE' && (

                                    <button
                                      type="button"
                                      className="listing-action restore"
                                      onClick={() =>
                                        askStatusChange(
                                          report,
                                          'ACTIVE'
                                        )
                                      }
                                    >

                                      <RefreshCw
                                        size={14}
                                      />

                                      <span>
                                        Restore
                                      </span>

                                    </button>

                                  )}

                                </div>

                              </td>

                            </tr>

                          );

                        }
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          )}


        </div>


      </div>


      {/* ======================================================
          VIEW LISTING MODAL
          ====================================================== */}

      {selectedListing && (

          <div
            className="marketplace-modal-backdrop"
            onMouseDown={(event) => {

              if (
                event.target ===
                event.currentTarget
              ) {

                setSelectedListing(
                  null
                );

              }

            }}
          >

            <div className="marketplace-modal">

              <div className="marketplace-modal-header">

                <div>

                  <span>
                    MARKETPLACE LISTING
                  </span>

                  <h2>
                    Listing Details
                  </h2>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setSelectedListing(
                      null
                    )
                  }
                >

                  <X
                    size={16}
                  />

                </button>

              </div>


              <div className="marketplace-modal-body">

                <div className="modal-image-section">

                  {(
                    selectedListing?.image_url ||
                    selectedListing?.image ||
                    selectedListing?.listing_image ||
                    selectedListing?.photo
                  ) ? (

                    <img
                      src={
                        selectedListing?.image_url ||
                        selectedListing?.image ||
                        selectedListing?.listing_image ||
                        selectedListing?.photo
                      }
                      alt={
                        getListingTitle(
                          selectedListing
                        )
                      }
                      className="modal-listing-image"
                    />

                  ) : (

                    <div className="modal-listing-image-placeholder">

                      <Package
                        size={42}
                      />

                      <span>
                        No Image
                      </span>

                    </div>

                  )}

                </div>


                <div className="modal-listing-details">

                  <div>

                    <span>
                      Listing ID
                    </span>

                    <strong>
                      {
                        getListingId(
                          selectedListing
                        ) ?? '—'
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Title
                    </span>

                    <strong>
                      {
                        getListingTitle(
                          selectedListing
                        )
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Category
                    </span>

                    <strong>
                      {
                        selectedListing?.category_name ||
                        selectedListing?.category ||
                        '—'
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Seller
                    </span>

                    <strong>
                      {
                        getSellerName(
                          selectedListing
                        )
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Price
                    </span>

                    <strong>
                      {
                        formatPrice(
                          selectedListing?.price
                        )
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Quantity
                    </span>

                    <strong>
                      {
                        selectedListing?.quantity ??
                        '—'
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Sizes
                    </span>

                    <strong>
                      {
                        displayListingSizes(
                          selectedListing
                        )
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Condition
                    </span>

                    <strong>
                      {
                        displayCondition(
                          selectedListing?.condition
                        )
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Location
                    </span>

                    <strong>
                      {
                        selectedListing?.location ||
                        '—'
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Created
                    </span>

                    <strong>
                      {
                        formatDate(
                          selectedListing?.created_at
                        )
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Status
                    </span>

                    <strong
                      className={
                        `listing-status ${
                          statusClass(
                            selectedListing?.status
                          )
                        }`
                      }
                    >

                      <span className="status-dot" />

                      {
                        displayStatus(
                          selectedListing?.status
                        )
                      }

                    </strong>

                  </div>


                  <div className="modal-description">

                    <span>
                      Description
                    </span>

                    <p>
                      {
                        selectedListing?.description ||
                        'No description provided.'
                      }
                    </p>

                  </div>

                </div>

              </div>


              <div className="marketplace-modal-footer">

                <div className="modal-current-status">

                  <span>
                    Current Status
                  </span>

                  <span
                    className={
                      `listing-status ${
                        statusClass(
                          selectedListing?.status
                        )
                      }`
                    }
                  >

                    <span className="status-dot" />

                    {
                      displayStatus(
                        selectedListing?.status
                      )
                    }

                  </span>

                </div>


                <div className="modal-status-actions">

                  {normalizeStatus(
                    selectedListing?.status
                  ) === 'PENDING' && (

                    <>

                      <button
                        type="button"
                        className="modal-action activate"
                        onClick={() =>
                          askStatusChange(
                            selectedListing,
                            'ACTIVE'
                          )
                        }
                      >

                        <CheckCircle
                          size={14}
                        />

                        Approve

                      </button>


                      <button
                        type="button"
                        className="modal-action reject"
                        onClick={() =>
                          askStatusChange(
                            selectedListing,
                            'REJECTED'
                          )
                        }
                      >

                        <XCircle
                          size={14}
                        />

                        Reject

                      </button>

                    </>

                  )}


                  {(
                    normalizeStatus(
                      selectedListing?.status
                    ) === 'AVAILABLE' ||
                    normalizeStatus(
                      selectedListing?.status
                    ) === 'ACTIVE'
                  ) && (

                    <button
                      type="button"
                      className="modal-action suspend"
                      onClick={() =>
                        askStatusChange(
                          selectedListing,
                          'INACTIVE'
                        )
                      }
                    >

                      <PauseCircle
                        size={14}
                      />

                      Suspend

                    </button>

                  )}


                  {normalizeStatus(
                    selectedListing?.status
                  ) === 'INACTIVE' && (

                    <button
                      type="button"
                      className="modal-action restore"
                      onClick={() =>
                        askStatusChange(
                          selectedListing,
                          'ACTIVE'
                        )
                      }
                    >

                      <RefreshCw
                        size={14}
                      />

                      Restore

                    </button>

                  )}

                </div>

              </div>

            </div>

          </div>

        )}


      {/* ======================================================
          CATEGORY MODAL
          ====================================================== */}

      {showCategoryModal && (

        <div
          className="marketplace-modal-backdrop"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget &&
              !savingCategory
            ) {

              closeCategoryModal();

            }

          }}
        >

          <div className="marketplace-modal category-modal">

            <div className="marketplace-modal-header">

              <div>

                <span>
                  MARKETPLACE CATEGORIES
                </span>

                <h2>

                  {
                    categoryModalMode ===
                    'add'
                      ? 'Add Category'
                      : categoryModalMode ===
                        'edit'
                        ? 'Edit Category'
                        : 'View Category'
                  }

                </h2>

              </div>


              <button
                type="button"
                disabled={
                  savingCategory
                }
                onClick={
                  closeCategoryModal
                }
              >

                <X
                  size={16}
                />

              </button>

            </div>


            {categoryModalMode ===
            'view' ? (

              <div className="add-listing-form">

                <label>

                  Category ID

                  <input
                    type="text"
                    value={
                      getCategoryId(
                        selectedCategory
                      ) ?? ''
                    }
                    disabled
                    readOnly
                  />

                </label>


                <label>

                  Category Name

                  <input
                    type="text"
                    value={
                      categoryForm.category_name
                    }
                    disabled
                    readOnly
                  />

                </label>


                <div className="marketplace-modal-footer form-footer">

                  <button
                    type="button"
                    className="modal-cancel"
                    onClick={
                      closeCategoryModal
                    }
                  >

                    Close

                  </button>


                  <button
                    type="button"
                    className="modal-submit"
                    onClick={() =>
                      setCategoryModalMode(
                        'edit'
                      )
                    }
                  >

                    <Edit3
                      size={14}
                    />

                    Edit Category

                  </button>

                </div>

              </div>

            ) : (

              <form
                className="add-listing-form"
                onSubmit={
                  handleSaveCategory
                }
              >

                <label>

                  Category Name

                  <input
                    type="text"
                    value={
                      categoryForm.category_name
                    }
                    onChange={(event) =>
                      setCategoryForm(
                        {
                          category_name:
                            event.target.value
                        }
                      )
                    }
                    placeholder="Enter category name"
                    autoFocus
                    required
                  />

                </label>


                <div className="marketplace-modal-footer form-footer">

                  <button
                    type="button"
                    className="modal-cancel"
                    disabled={
                      savingCategory
                    }
                    onClick={
                      closeCategoryModal
                    }
                  >

                    Cancel

                  </button>


                  <button
                    type="submit"
                    className="modal-submit"
                    disabled={
                      savingCategory
                    }
                  >

                    {
                      savingCategory
                        ? 'Saving...'
                        : categoryModalMode ===
                          'edit'
                          ? 'Save Changes'
                          : 'Add Category'
                    }

                  </button>

                </div>

              </form>

            )}

          </div>

        </div>

      )}

      {/* ======================================================
          STATUS CONFIRMATION PROMPT
          ====================================================== */}

      {statusPrompt && (

        <div
          className="marketplace-modal-backdrop"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeStatusPrompt();

            }

          }}
        >

          <div className="marketplace-modal status-confirm-modal">

            <div className="marketplace-modal-header">

              <div>

                <span>
                  MARKETPLACE MODERATION
                </span>

                <h2>
                  Confirm Action
                </h2>

              </div>


              <button
                type="button"
                onClick={
                  closeStatusPrompt
                }
              >

                <X
                  size={16}
                />

              </button>

            </div>


            <div className="status-confirm-body">

              <div className="status-confirm-icon">

                {normalizeStatus(
                  statusPrompt?.newStatus
                ) === 'REJECTED' ? (

                  <XCircle
                    size={28}
                  />

                ) : normalizeStatus(
                  statusPrompt?.newStatus
                ) === 'INACTIVE' ? (

                  <PauseCircle
                    size={28}
                  />

                ) : (

                  <CheckCircle
                    size={28}
                  />

                )}

              </div>


              <h3>

                {normalizeStatus(
                  statusPrompt?.newStatus
                ) === 'REJECTED'
                  ? 'Reject this listing?'
                  : normalizeStatus(
                      statusPrompt?.newStatus
                    ) === 'INACTIVE'
                    ? 'Suspend this listing?'
                    : 'Approve or restore this listing?'}

              </h3>


              <p>

                <strong>
                  {getListingTitle(
                    statusPrompt?.listing
                  )}
                </strong>

                <br />

                {normalizeStatus(
                  statusPrompt?.newStatus
                ) === 'REJECTED'
                  ? 'The listing will remain unavailable in the marketplace.'
                  : normalizeStatus(
                      statusPrompt?.newStatus
                    ) === 'INACTIVE'
                    ? 'The listing will be hidden from normal marketplace activity until restored.'
                    : 'The listing will be available for marketplace users again.'}

              </p>

            </div>


            <div className="marketplace-modal-footer">

              <button
                type="button"
                className="modal-cancel"
                onClick={
                  closeStatusPrompt
                }
              >

                Cancel

              </button>


              <button
                type="button"
                className={
                  `modal-submit ${
                    normalizeStatus(
                      statusPrompt?.newStatus
                    ) === 'REJECTED'
                      ? 'danger-submit'
                      : normalizeStatus(
                          statusPrompt?.newStatus
                        ) === 'INACTIVE'
                        ? 'warning-submit'
                        : ''
                  }`
                }
                onClick={
                  confirmStatusChange
                }
              >

                {normalizeStatus(
                  statusPrompt?.newStatus
                ) === 'REJECTED'
                  ? 'Reject Listing'
                  : normalizeStatus(
                      statusPrompt?.newStatus
                    ) === 'INACTIVE'
                    ? 'Suspend Listing'
                    : 'Confirm'}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};


export default Marketplace;