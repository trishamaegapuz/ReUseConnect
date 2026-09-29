import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  Flag,
  Headphones,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldBan,
  Users,
  X,
  XCircle,
  Settings,
  UserRound
} from 'lucide-react';

import {
  getCommunitySupportStats,
  getCommunityPosts,
  getSupportTickets,
  getCommunityReports,
  getRecentSupportTickets,
  getCommunityBannedUsers,
  getSupportSettings,
  saveSupportSettings,
  createCommunityPost,
  updateCommunityPostStatus,
  updateSupportTicketStatus,
  updateCommunityReportStatus
} from '../../services/api';

import '../../styles/CommunitySupport.css';


// ============================================================
// HELPERS
// ============================================================

const formatDate = (
  value
) => {

  if (!value) {
    return '—';
  }

  return new Date(
    value
  ).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  );

};


const formatTime = (
  value
) => {

  if (!value) {
    return '';
  }

  return new Date(
    value
  ).toLocaleTimeString(
    'en-US',
    {
      hour: '2-digit',
      minute: '2-digit'
    }
  );

};


const initials = (
  name = ''
) => {

  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!parts.length) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map(
      item =>
        item
          .charAt(0)
          .toUpperCase()
    )
    .join('');

};


const statusLabel = (
  status
) => {

  return String(
    status || ''
  )
    .replaceAll(
      '_',
      ' '
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      letter =>
        letter.toUpperCase()
    );

};


// ============================================================
// MAIN COMPONENT
// ============================================================

const CommunitySupport = () => {

  const [
    activeTab,
    setActiveTab
  ] = useState(
    'community'
  );


  const [
    stats,
    setStats
  ] = useState({
    total_posts: 0,
    total_tickets: 0,
    total_reports: 0,
    resolved_issues: 0,
    pending_tickets: 0,
    pending_reports: 0
  });


  const [
    posts,
    setPosts
  ] = useState([]);


  const [
    tickets,
    setTickets
  ] = useState([]);


  const [
    reports,
    setReports
  ] = useState([]);


  const [
    recentTickets,
    setRecentTickets
  ] = useState([]);


  const [
    loading,
    setLoading
  ] = useState(true);


  const [
    error,
    setError
  ] = useState('');


  const [
    success,
    setSuccess
  ] = useState('');


  const [
    search,
    setSearch
  ] = useState('');


  const [
    statusFilter,
    setStatusFilter
  ] = useState('');


  const [
    categoryFilter,
    setCategoryFilter
  ] = useState('');


  const [
    page,
    setPage
  ] = useState(1);


  const [
    pagination,
    setPagination
  ] = useState({
    page: 1,
    total: 0,
    totalPages: 1
  });


  const [
    selectedItem,
    setSelectedItem
  ] = useState(null);


  const [
    selectedType,
    setSelectedType
  ] = useState(null);


  const [
    modal,
    setModal
  ] = useState(null);


  const [
    saving,
    setSaving
  ] = useState(false);


  const [
    bannedUsers,
    setBannedUsers
  ] = useState([]);


  const [
    supportSettings,
    setSupportSettings
  ] = useState({
    support_email: '',
    support_hours: '',
    auto_response_enabled: false
  });


  const [
    postForm,
    setPostForm
  ] = useState({
    title: '',
    body: '',
    category: 'General'
  });


  // ==========================================================
  // LOAD STATS
  // ==========================================================

  const loadStats = async () => {

    const response =
      await getCommunitySupportStats();

    setStats(
      response.data || {}
    );

  };


  // ==========================================================
  // LOAD MAIN TABLE
  // ==========================================================

  const loadMainData = async (
    requestedPage = page
  ) => {

    if (
      activeTab === 'community'
    ) {

      const response =
        await getCommunityPosts({
          search,
          category:
            categoryFilter,
          status:
            statusFilter,
          page:
            requestedPage,
          limit: 8
        });

      setPosts(
        response.data || []
      );

      setPagination(
        response.pagination || {
          page:
            requestedPage,
          total: 0,
          totalPages: 1
        }
      );

      return;
    }


    if (
      activeTab === 'tickets'
    ) {

      const response =
        await getSupportTickets({
          search,
          status:
            statusFilter,
          page:
            requestedPage,
          limit: 8
        });

      setTickets(
        response.data || []
      );

      setPagination(
        response.pagination || {
          page:
            requestedPage,
          total: 0,
          totalPages: 1
        }
      );

      return;
    }


    const response =
      await getCommunityReports({
        search,
        status:
          statusFilter,
        page:
          requestedPage,
        limit: 8
      });

    setReports(
      response.data || []
    );

    setPagination(
      response.pagination || {
        page:
          requestedPage,
        total: 0,
        totalPages: 1
      }
    );

  };


  // ==========================================================
  // LOAD RECENT TICKETS
  // ==========================================================

  const loadRecentTickets =
    async () => {

      const response =
        await getRecentSupportTickets();

      setRecentTickets(
        response.data || []
      );

    };


  // ==========================================================
  // INITIAL / TAB LOAD
  // ==========================================================

  const loadPage =
    async (
      requestedPage = 1
    ) => {

      try {

        setLoading(true);

        setError('');

        await Promise.all([
          loadStats(),
          loadMainData(
            requestedPage
          ),
          loadRecentTickets()
        ]);

      } catch (err) {

        console.error(err);

        setError(
          err.message ||
          'Unable to load Community & Support.'
        );

      } finally {

        setLoading(false);

      }

    };


  useEffect(() => {

    setPage(1);

    loadPage(1);

  }, [
    activeTab,
    statusFilter,
    categoryFilter
  ]);


  // ==========================================================
  // SEARCH
  // ==========================================================

  useEffect(() => {

    const timer =
      setTimeout(() => {

        setPage(1);

        loadMainData(1)
          .catch(err => {

            console.error(err);

            setError(
              err.message ||
              'Unable to search.'
            );

          });

      }, 350);


    return () =>
      clearTimeout(timer);

  }, [search]);


  // ==========================================================
  // TAB RESET
  // ==========================================================

  const changeTab = (
    tab
  ) => {

    setActiveTab(tab);

    setSearch('');

    setStatusFilter('');

    setCategoryFilter('');

    setPage(1);

  };


  // ==========================================================
  // REFRESH
  // ==========================================================

  const refresh = async () => {

    setSuccess('');

    await loadPage(page);

  };


  // ==========================================================
  // OPEN DETAILS
  // ==========================================================

  const openDetails = (
    type,
    item
  ) => {

    setSelectedType(type);

    setSelectedItem(item);

  };


  // ==========================================================
  // CLOSE DETAILS
  // ==========================================================

  const closeDetails = () => {

    setSelectedType(null);

    setSelectedItem(null);

  };


  // ==========================================================
  // UPDATE STATUS
  // ==========================================================

  const changeStatus = async (
    type,
    id,
    status
  ) => {

    try {

      setSaving(true);

      setError('');

      setSuccess('');


      if (
        type === 'post'
      ) {

        await updateCommunityPostStatus(
          id,
          status
        );

      } else if (
        type === 'ticket'
      ) {

        await updateSupportTicketStatus(
          id,
          status
        );

      } else {

        await updateCommunityReportStatus(
          id,
          status
        );

      }


      setSuccess(
        'Status updated successfully.'
      );


      closeDetails();

      await loadPage(page);

    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        'Unable to update status.'
      );

    } finally {

      setSaving(false);

    }

  };


  // ==========================================================
  // CREATE POST
  // ==========================================================

  const submitPost = async (
    event
  ) => {

    event.preventDefault();


    if (
      !postForm.title.trim() ||
      !postForm.body.trim()
    ) {

      setError(
        'Title and post content are required.'
      );

      return;

    }


    try {

      setSaving(true);

      setError('');

      setSuccess('');


      await createCommunityPost(
        postForm
      );


      setPostForm({
        title: '',
        body: '',
        category: 'General'
      });


      setModal(null);


      setSuccess(
        'Community post created successfully.'
      );


      await loadPage(1);

    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        'Unable to create post.'
      );

    } finally {

      setSaving(false);

    }

  };


  // ==========================================================
  // BANNED USERS
  // ==========================================================

  const openBannedUsers =
    async () => {

      try {

        setModal(
          'banned-users'
        );

        const response =
          await getCommunityBannedUsers();

        setBannedUsers(
          response.data || []
        );

      } catch (err) {

        setError(
          err.message ||
          'Unable to load suspended users.'
        );

      }

    };


  // ==========================================================
  // SUPPORT SETTINGS
  // ==========================================================

  const openSupportSettings =
    async () => {

      try {

        setModal(
          'settings'
        );

        const response =
          await getSupportSettings();


        if (
          response.data
        ) {

          setSupportSettings({
            support_email:
              response.data.support_email ||
              '',

            support_hours:
              response.data.support_hours ||
              '',

            auto_response_enabled:
              Boolean(
                response.data.auto_response_enabled
              )
          });

        } else {

          setSupportSettings({
            support_email: '',
            support_hours: '',
            auto_response_enabled: false
          });

        }

      } catch (err) {

        setError(
          err.message ||
          'Unable to load support settings.'
        );

      }

    };


  const submitSupportSettings =
    async (
      event
    ) => {

      event.preventDefault();


      try {

        setSaving(true);

        setError('');

        setSuccess('');


        await saveSupportSettings(
          supportSettings
        );


        setSuccess(
          'Support settings saved successfully.'
        );


        setModal(null);

      } catch (err) {

        setError(
          err.message ||
          'Unable to save support settings.'
        );

      } finally {

        setSaving(false);

      }

    };


  // ==========================================================
  // CATEGORY OPTIONS
  // ==========================================================

  const categories =
    useMemo(
      () => [
        'General',
        'Help & Support',
        'Marketplace',
        'Report',
        'Suggestions',
        'Buy & Sell'
      ],
      []
    );


  // ==========================================================
  // STATUS OPTIONS
  // ==========================================================

  const statusOptions = {

    community: [
      'ACTIVE',
      'PENDING',
      'UNDER_REVIEW',
      'RESOLVED',
      'HIDDEN'
    ],

    tickets: [
      'PENDING',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED'
    ],

    reports: [
      'PENDING',
      'UNDER_REVIEW',
      'RESOLVED',
      'DISMISSED'
    ]

  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="community-support-page">

      {/* ====================================================
          ALERT
          ==================================================== */}

      {error && (

        <div className="cs-alert error">

          <AlertCircle
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
          >
            <X size={15} />
          </button>

        </div>

      )}


      {success && (

        <div className="cs-alert success">

          <CheckCircle2
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
          >
            <X size={15} />
          </button>

        </div>

      )}


      {/* ====================================================
          KPI CARDS
          ==================================================== */}

      <section className="cs-kpi-grid">

        <div className="cs-kpi-card purple">

          <div className="cs-kpi-icon">
            <MessageCircle
              size={24}
            />
          </div>

          <div>

            <span>
              Total Community Posts
            </span>

            <strong>
              {stats.total_posts || 0}
            </strong>

          </div>

        </div>


        <div className="cs-kpi-card green">

          <div className="cs-kpi-icon">
            <Headphones
              size={24}
            />
          </div>

          <div>

            <span>
              Support Tickets
            </span>

            <strong>
              {stats.total_tickets || 0}
            </strong>

          </div>

        </div>


        <div className="cs-kpi-card orange">

          <div className="cs-kpi-icon">
            <Flag
              size={24}
            />
          </div>

          <div>

            <span>
              Reports
            </span>

            <strong>
              {stats.total_reports || 0}
            </strong>

          </div>

        </div>


        <div className="cs-kpi-card blue">

          <div className="cs-kpi-icon">
            <Shield
              size={24}
            />
          </div>

          <div>

            <span>
              Resolved Issues
            </span>

            <strong>
              {stats.resolved_issues || 0}
            </strong>

          </div>

        </div>

      </section>


      {/* ====================================================
          MAIN GRID
          ==================================================== */}

      <section className="cs-main-grid">

        {/* ==================================================
            LEFT
            ================================================== */}

        <div className="cs-main-card">

          {/* ================================================
              TABS
              ================================================ */}

          <div className="cs-tabs">

            <button
              type="button"
              className={
                activeTab === 'community'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                changeTab(
                  'community'
                )
              }
            >
              <Users size={16} />
              Community
            </button>


            <button
              type="button"
              className={
                activeTab === 'tickets'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                changeTab(
                  'tickets'
                )
              }
            >
              <Headphones size={16} />
              Support Tickets

              {stats.pending_tickets >
                0 && (
                <span className="cs-tab-count">
                  {stats.pending_tickets}
                </span>
              )}

            </button>


            <button
              type="button"
              className={
                activeTab === 'reports'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                changeTab(
                  'reports'
                )
              }
            >
              <Flag size={16} />
              Reports

              {stats.pending_reports >
                0 && (
                <span className="cs-tab-count">
                  {stats.pending_reports}
                </span>
              )}

            </button>

          </div>


          {/* ================================================
              SECTION HEADER
              ================================================ */}

          <div className="cs-section-heading">

            <div>

              <h2>

                {activeTab ===
                'community'
                  ? 'Recent Community Posts'
                  : activeTab ===
                    'tickets'
                  ? 'Support Tickets'
                  : 'Community Reports'}

              </h2>

              <p>

                {activeTab ===
                'community'
                  ? 'Review community activity and posts.'
                  : activeTab ===
                    'tickets'
                  ? 'Manage and resolve support requests.'
                  : 'Review reported community content.'}

              </p>

            </div>


            <div className="cs-heading-actions">

              <button
                type="button"
                className="cs-refresh-button"
                onClick={refresh}
                title="Refresh"
              >
                <RefreshCw
                  size={15}
                />
              </button>


              {activeTab ===
                'community' && (

                <button
                  type="button"
                  className="cs-primary-button"
                  onClick={() =>
                    setModal(
                      'new-post'
                    )
                  }
                >
                  <Plus size={16} />
                  New Post
                </button>

              )}

            </div>

          </div>


          {/* ================================================
              FILTERS
              ================================================ */}

          <div className="cs-filter-row">

            <div className="cs-search">

              <Search size={16} />

              <input
                value={search}
                onChange={event =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder={
                  activeTab ===
                  'community'
                    ? 'Search posts, users, or topics...'
                    : activeTab ===
                      'tickets'
                    ? 'Search tickets, users, or subjects...'
                    : 'Search reports, users, or reasons...'
                }
              />

            </div>


            {activeTab ===
              'community' && (

              <select
                value={
                  categoryFilter
                }
                onChange={event =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All Categories
                </option>

                {categories.map(
                  category => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}

              </select>

            )}


            <select
              value={statusFilter}
              onChange={event =>
                setStatusFilter(
                  event.target.value
                )
              }
            >

              <option value="">
                All Status
              </option>

              {statusOptions[
                activeTab
              ].map(
                status => (
                  <option
                    key={status}
                    value={status}
                  >
                    {statusLabel(
                      status
                    )}
                  </option>
                )
              )}

            </select>

          </div>


          {/* ================================================
              TABLE
              ================================================ */}

          <div className="cs-table-wrapper">

            {loading ? (

              <div className="cs-loading">

                <RefreshCw
                  size={25}
                  className="cs-spinner"
                />

                <span>
                  Loading data...
                </span>

              </div>

            ) : activeTab ===
              'community' ? (

              <CommunityTable
                posts={posts}
                onView={item =>
                  openDetails(
                    'post',
                    item
                  )
                }
                onStatus={
                  changeStatus
                }
              />

            ) : activeTab ===
              'tickets' ? (

              <TicketTable
                tickets={tickets}
                onView={item =>
                  openDetails(
                    'ticket',
                    item
                  )
                }
                onStatus={
                  changeStatus
                }
              />

            ) : (

              <ReportTable
                reports={reports}
                onView={item =>
                  openDetails(
                    'report',
                    item
                  )
                }
                onStatus={
                  changeStatus
                }
              />

            )}

          </div>


          {/* ================================================
              PAGINATION
              ================================================ */}

          <div className="cs-pagination">

            <span>
              Showing{' '}
              {pagination.total ===
              0
                ? 0
                : (
                    (
                      pagination.page -
                      1
                    ) * 8
                  ) + 1}
              {' '}to{' '}
              {Math.min(
                pagination.page *
                  8,
                pagination.total
              )}
              {' '}of{' '}
              {pagination.total}
              {' '}records
            </span>


            <div>

              <button
                type="button"
                disabled={
                  pagination.page <=
                  1
                }
                onClick={() => {

                  const nextPage =
                    pagination.page -
                    1;

                  setPage(
                    nextPage
                  );

                  loadMainData(
                    nextPage
                  );

                }}
              >
                ‹
              </button>


              {Array.from(
                {
                  length:
                    Math.min(
                      pagination.totalPages ||
                        1,
                      5
                    )
                },
                (_, index) => {

                  const pageNumber =
                    index + 1;

                  return (
                    <button
                      type="button"
                      key={
                        pageNumber
                      }
                      className={
                        pageNumber ===
                        pagination.page
                          ? 'active'
                          : ''
                      }
                      onClick={() => {

                        setPage(
                          pageNumber
                        );

                        loadMainData(
                          pageNumber
                        );

                      }}
                    >
                      {
                        pageNumber
                      }
                    </button>
                  );

                }
              )}


              <button
                type="button"
                disabled={
                  pagination.page >=
                  pagination.totalPages
                }
                onClick={() => {

                  const nextPage =
                    pagination.page +
                    1;

                  setPage(
                    nextPage
                  );

                  loadMainData(
                    nextPage
                  );

                }}
              >
                ›
              </button>

            </div>

          </div>

        </div>


        {/* ==================================================
            RIGHT COLUMN
            ================================================== */}

        <aside className="cs-side-column">

          {/* ================================================
              RECENT TICKETS
              ================================================ */}

          <div className="cs-side-card">

            <div className="cs-side-heading">

              <h3>
                Recent Support Tickets
              </h3>

              <button
                type="button"
                onClick={() =>
                  changeTab(
                    'tickets'
                  )
                }
              >
                View All →
              </button>

            </div>


            <div className="cs-ticket-list">

              {recentTickets.length ===
              0 ? (

                <div className="cs-side-empty">
                  No support tickets yet.
                </div>

              ) : (

                recentTickets.map(
                  ticket => (

                    <div
                      className="cs-ticket-item"
                      key={
                        ticket.ticket_id
                      }
                    >

                      <div
                        className={
                          `cs-ticket-icon ${
                            ticket.status
                              .toLowerCase()
                          }`
                        }
                      >
                        <Headphones
                          size={15}
                        />
                      </div>


                      <div className="cs-ticket-info">

                        <strong>
                          #
                          {ticket.ticket_id}
                        </strong>

                        <span>
                          {ticket.subject}
                        </span>

                        <small>
                          User:{' '}
                          {ticket.user_name}
                          {' • '}
                          {formatDate(
                            ticket.created_at
                          )}
                        </small>

                      </div>


                      <span
                        className={
                          `cs-mini-status ${
                            ticket.status
                              .toLowerCase()
                          }`
                        }
                      >
                        {statusLabel(
                          ticket.status
                        )}
                      </span>

                    </div>

                  )
                )

              )}

            </div>

          </div>


          {/* ================================================
              QUICK ACTIONS
              ================================================ */}

          <div className="cs-side-card">

            <div className="cs-side-heading">

              <h3>
                Quick Actions
              </h3>

            </div>


            <div className="cs-quick-grid">

              <button
                type="button"
                onClick={() =>
                  changeTab(
                    'reports'
                  )
                }
              >
                <div className="purple">
                  <Flag size={17} />
                </div>

                <strong>
                  View Reports
                </strong>

                <span>
                  Review community
                  reports
                </span>

              </button>


              <button
                type="button"
                onClick={
                  openBannedUsers
                }
              >
                <div className="green">
                  <ShieldBan
                    size={17}
                  />
                </div>

                <strong>
                  Manage Banned Users
                </strong>

                <span>
                  View suspended
                  accounts
                </span>

              </button>


              <button
                type="button"
                onClick={() =>
                  changeTab(
                    'reports'
                  )
                }
              >
                <div className="orange">
                  <AlertCircle
                    size={17}
                  />
                </div>

                <strong>
                  Review Reported Content
                </strong>

                <span>
                  Inspect flagged
                  content
                </span>

              </button>


              <button
                type="button"
                onClick={
                  openSupportSettings
                }
              >
                <div className="blue">
                  <Settings
                    size={17}
                  />
                </div>

                <strong>
                  Support Settings
                </strong>

                <span>
                  Configure support
                  preferences
                </span>

              </button>

            </div>

          </div>


          {/* ================================================
              SAFE COMMUNITY MESSAGE
              ================================================ */}

          <div className="cs-safety-card">

            <div>
              <Shield
                size={20}
              />
            </div>

            <p>
              Community support tools
              help administrators keep
              ReUse Connect safe and
              trustworthy.
            </p>

          </div>

        </aside>

      </section>


      {/* ====================================================
          DETAIL MODAL
          ==================================================== */}

      {selectedItem && (

        <DetailsModal
          type={
            selectedType
          }
          item={
            selectedItem
          }
          saving={
            saving
          }
          onClose={
            closeDetails
          }
          onStatus={
            changeStatus
          }
        />

      )}


      {/* ====================================================
          NEW POST MODAL
          ==================================================== */}

      {modal ===
        'new-post' && (

        <div className="cs-modal-backdrop">

          <div className="cs-modal">

            <div className="cs-modal-header">

              <div>

                <h2>
                  Create Community Post
                </h2>

                <p>
                  Create a post using
                  your administrator
                  account.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setModal(null)
                }
              >
                <X size={18} />
              </button>

            </div>


            <form
              onSubmit={
                submitPost
              }
            >

              <label>

                Title

                <input
                  value={
                    postForm.title
                  }
                  onChange={event =>
                    setPostForm(
                      previous => ({
                        ...previous,
                        title:
                          event.target.value
                      })
                    )
                  }
                  placeholder="Enter post title"
                />

              </label>


              <label>

                Category

                <select
                  value={
                    postForm.category
                  }
                  onChange={event =>
                    setPostForm(
                      previous => ({
                        ...previous,
                        category:
                          event.target.value
                      })
                    )
                  }
                >

                  {categories.map(
                    category => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    )
                  )}

                </select>

              </label>


              <label>

                Post Content

                <textarea
                  value={
                    postForm.body
                  }
                  onChange={event =>
                    setPostForm(
                      previous => ({
                        ...previous,
                        body:
                          event.target.value
                      })
                    )
                  }
                  placeholder="Write the community post..."
                  rows={6}
                />

              </label>


              <div className="cs-modal-actions">

                <button
                  type="button"
                  onClick={() =>
                    setModal(null)
                  }
                  className="secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="primary"
                >
                  {saving
                    ? 'Saving...'
                    : 'Publish Post'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* ====================================================
          BANNED USERS MODAL
          ==================================================== */}

      {modal ===
        'banned-users' && (

        <div className="cs-modal-backdrop">

          <div className="cs-modal medium">

            <div className="cs-modal-header">

              <div>

                <h2>
                  Suspended Users
                </h2>

                <p>
                  Accounts currently
                  marked as SUSPENDED.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setModal(null)
                }
              >
                <X size={18} />
              </button>

            </div>


            <div className="cs-banned-list">

              {bannedUsers.length ===
              0 ? (

                <div className="cs-empty-modal">

                  <ShieldBan
                    size={28}
                  />

                  <strong>
                    No suspended users
                  </strong>

                  <span>
                    There are no users
                    currently marked as
                    suspended in the
                    database.
                  </span>

                </div>

              ) : (

                bannedUsers.map(
                  user => (

                    <div
                      className="cs-banned-user"
                      key={
                        user.user_id
                      }
                    >

                      <div className="cs-avatar">
                        {
                          initials(
                            user.full_name
                          )
                        }
                      </div>

                      <div>

                        <strong>
                          {user.full_name}
                        </strong>

                        <span>
                          {user.email}
                        </span>

                      </div>

                      <small>
                        {user.role}
                      </small>

                    </div>

                  )
                )

              )}

            </div>

          </div>

        </div>

      )}


      {/* ====================================================
          SUPPORT SETTINGS MODAL
          ==================================================== */}

      {modal ===
        'settings' && (

        <div className="cs-modal-backdrop">

          <div className="cs-modal">

            <div className="cs-modal-header">

              <div>

                <h2>
                  Support Settings
                </h2>

                <p>
                  Settings are stored in
                  PostgreSQL.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setModal(null)
                }
              >
                <X size={18} />
              </button>

            </div>


            <form
              onSubmit={
                submitSupportSettings
              }
            >

              <label>

                Support Email

                <input
                  type="email"
                  value={
                    supportSettings.support_email
                  }
                  onChange={event =>
                    setSupportSettings(
                      previous => ({
                        ...previous,
                        support_email:
                          event.target.value
                      })
                    )
                  }
                  placeholder="support@example.com"
                />

              </label>


              <label>

                Support Hours

                <input
                  value={
                    supportSettings.support_hours
                  }
                  onChange={event =>
                    setSupportSettings(
                      previous => ({
                        ...previous,
                        support_hours:
                          event.target.value
                      })
                    )
                  }
                  placeholder="Monday - Friday, 8:00 AM - 5:00 PM"
                />

              </label>


              <label className="cs-checkbox-label">

                <input
                  type="checkbox"
                  checked={
                    supportSettings.auto_response_enabled
                  }
                  onChange={event =>
                    setSupportSettings(
                      previous => ({
                        ...previous,
                        auto_response_enabled:
                          event.target.checked
                      })
                    )
                  }
                />

                Enable automatic response

              </label>


              <div className="cs-modal-actions">

                <button
                  type="button"
                  onClick={() =>
                    setModal(null)
                  }
                  className="secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="primary"
                >
                  {saving
                    ? 'Saving...'
                    : 'Save Settings'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );

};


// ============================================================
// COMMUNITY TABLE
// ============================================================

const CommunityTable = ({
  posts,
  onView,
  onStatus
}) => {

  if (!posts.length) {

    return (
      <EmptyState
        icon={
          <MessageCircle
            size={28}
          />
        }
        title="No community posts"
        text="There are no community posts matching the current filters."
      />
    );

  }


  return (

    <table className="cs-table">

      <thead>

        <tr>

          <th>#</th>
          <th>User</th>
          <th>Post</th>
          <th>Category</th>
          <th>Likes</th>
          <th>Replies</th>
          <th>Status</th>
          <th>Date</th>
          <th>Actions</th>

        </tr>

      </thead>


      <tbody>

        {posts.map(
          (post, index) => (

            <tr
              key={
                post.post_id
              }
            >

              <td>
                {index + 1}
              </td>


              <td>

                <div className="cs-user-cell">

                  <div className="cs-avatar">
                    {
                      initials(
                        post.user_name
                      )
                    }
                  </div>

                  <div>

                    <strong>
                      {post.user_name}
                    </strong>

                    <small>
                      #{post.user_id}
                    </small>

                  </div>

                </div>

              </td>


              <td>

                <div className="cs-post-cell">

                  <strong>
                    {post.title}
                  </strong>

                  <span>
                    {post.body}
                  </span>

                </div>

              </td>


              <td>

                <span className="cs-category">
                  {post.category}
                </span>

              </td>


              <td>
                {post.likes || 0}
              </td>


              <td>
                {post.replies || 0}
              </td>


              <td>

                <span
                  className={
                    `cs-status ${
                      post.status
                        .toLowerCase()
                    }`
                  }
                >
                  {statusLabel(
                    post.status
                  )}
                </span>

              </td>


              <td>

                <div className="cs-date-cell">

                  {formatDate(
                    post.created_at
                  )}

                  <small>
                    {formatTime(
                      post.created_at
                    )}
                  </small>

                </div>

              </td>


              <td>

                <div className="cs-actions">

                  <button
                    type="button"
                    title="View post"
                    onClick={() =>
                      onView(post)
                    }
                  >
                    <Eye size={15} />
                  </button>


                  {post.status !==
                    'ACTIVE' && (

                    <button
                      type="button"
                      title="Activate post"
                      onClick={() =>
                        onStatus(
                          'post',
                          post.post_id,
                          'ACTIVE'
                        )
                      }
                    >
                      <CheckCircle2
                        size={15}
                      />
                    </button>

                  )}


                  {post.status ===
                    'ACTIVE' && (

                    <button
                      type="button"
                      title="Put under review"
                      onClick={() =>
                        onStatus(
                          'post',
                          post.post_id,
                          'UNDER_REVIEW'
                        )
                      }
                    >
                      <Clock3
                        size={15}
                      />
                    </button>

                  )}


                  {post.status !==
                    'HIDDEN' && (

                    <button
                      type="button"
                      title="Hide post"
                      onClick={() =>
                        onStatus(
                          'post',
                          post.post_id,
                          'HIDDEN'
                        )
                      }
                    >
                      <XCircle
                        size={15}
                      />
                    </button>

                  )}

                </div>

              </td>

            </tr>

          )
        )}

      </tbody>

    </table>

  );

};


// ============================================================
// TICKET TABLE
// ============================================================

const TicketTable = ({
  tickets,
  onView,
  onStatus
}) => {

  if (!tickets.length) {

    return (
      <EmptyState
        icon={
          <Headphones
            size={28}
          />
        }
        title="No support tickets"
        text="There are no support tickets matching the current filters."
      />
    );

  }


  return (

    <table className="cs-table">

      <thead>

        <tr>

          <th>#</th>
          <th>Ticket</th>
          <th>User</th>
          <th>Category</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Date</th>
          <th>Actions</th>

        </tr>

      </thead>


      <tbody>

        {tickets.map(
          (ticket, index) => (

            <tr
              key={
                ticket.ticket_id
              }
            >

              <td>
                {index + 1}
              </td>


              <td>

                <div className="cs-ticket-table-cell">

                  <strong>
                    #
                    {ticket.ticket_id}
                  </strong>

                  <span>
                    {ticket.subject}
                  </span>

                </div>

              </td>


              <td>

                <div className="cs-user-cell">

                  <div className="cs-avatar">
                    {
                      initials(
                        ticket.user_name
                      )
                    }
                  </div>

                  <div>

                    <strong>
                      {ticket.user_name}
                    </strong>

                    <small>
                      {ticket.email}
                    </small>

                  </div>

                </div>

              </td>


              <td>
                <span className="cs-category">
                  {ticket.category}
                </span>
              </td>


              <td>

                <span
                  className={
                    `cs-priority ${
                      ticket.priority
                        .toLowerCase()
                    }`
                  }
                >
                  {statusLabel(
                    ticket.priority
                  )}
                </span>

              </td>


              <td>

                <span
                  className={
                    `cs-status ${
                      ticket.status
                        .toLowerCase()
                    }`
                  }
                >
                  {statusLabel(
                    ticket.status
                  )}
                </span>

              </td>


              <td>
                {formatDate(
                  ticket.created_at
                )}
              </td>


              <td>

                <div className="cs-actions">

                  <button
                    type="button"
                    title="View ticket"
                    onClick={() =>
                      onView(
                        ticket
                      )
                    }
                  >
                    <Eye size={15} />
                  </button>


                  {ticket.status !==
                    'IN_PROGRESS' && (
                    <button
                      type="button"
                      title="Set in progress"
                      onClick={() =>
                        onStatus(
                          'ticket',
                          ticket.ticket_id,
                          'IN_PROGRESS'
                        )
                      }
                    >
                      <Clock3
                        size={15}
                      />
                    </button>
                  )}


                  {ticket.status !==
                    'RESOLVED' && (
                    <button
                      type="button"
                      title="Resolve ticket"
                      onClick={() =>
                        onStatus(
                          'ticket',
                          ticket.ticket_id,
                          'RESOLVED'
                        )
                      }
                    >
                      <CheckCircle2
                        size={15}
                      />
                    </button>
                  )}


                  {ticket.status !==
                    'CLOSED' && (
                    <button
                      type="button"
                      title="Close ticket"
                      onClick={() =>
                        onStatus(
                          'ticket',
                          ticket.ticket_id,
                          'CLOSED'
                        )
                      }
                    >
                      <XCircle
                        size={15}
                      />
                    </button>
                  )}

                </div>

              </td>

            </tr>

          )
        )}

      </tbody>

    </table>

  );

};


// ============================================================
// REPORT TABLE
// ============================================================

const ReportTable = ({
  reports,
  onView,
  onStatus
}) => {

  if (!reports.length) {

    return (
      <EmptyState
        icon={
          <Flag
            size={28}
          />
        }
        title="No reports"
        text="There are no community reports matching the current filters."
      />
    );

  }


  return (

    <table className="cs-table">

      <thead>

        <tr>

          <th>#</th>
          <th>Reporter</th>
          <th>Reported Content</th>
          <th>Reason</th>
          <th>Status</th>
          <th>Date</th>
          <th>Actions</th>

        </tr>

      </thead>


      <tbody>

        {reports.map(
          (report, index) => (

            <tr
              key={
                report.report_id
              }
            >

              <td>
                {index + 1}
              </td>


              <td>

                <div className="cs-user-cell">

                  <div className="cs-avatar">
                    {
                      initials(
                        report.reporter_name
                      )
                    }
                  </div>

                  <div>

                    <strong>
                      {
                        report.reporter_name
                      }
                    </strong>

                    <small>
                      {report.email}
                    </small>

                  </div>

                </div>

              </td>


              <td>

                <div className="cs-post-cell">

                  <strong>
                    {report.post_title ||
                      report.ticket_subject ||
                      'Reported item'}
                  </strong>

                  <span>
                    {report.post_id
                      ? `Post #${report.post_id}`
                      : `Ticket #${report.ticket_id}`}
                  </span>

                </div>

              </td>


              <td>
                {report.reason}
              </td>


              <td>

                <span
                  className={
                    `cs-status ${
                      report.status
                        .toLowerCase()
                    }`
                  }
                >
                  {statusLabel(
                    report.status
                  )}
                </span>

              </td>


              <td>
                {formatDate(
                  report.created_at
                )}
              </td>


              <td>

                <div className="cs-actions">

                  <button
                    type="button"
                    title="View report"
                    onClick={() =>
                      onView(
                        report
                      )
                    }
                  >
                    <Eye size={15} />
                  </button>


                  {report.status !==
                    'UNDER_REVIEW' && (

                    <button
                      type="button"
                      title="Review report"
                      onClick={() =>
                        onStatus(
                          'report',
                          report.report_id,
                          'UNDER_REVIEW'
                        )
                      }
                    >
                      <Clock3
                        size={15}
                      />
                    </button>

                  )}


                  {report.status !==
                    'RESOLVED' && (

                    <button
                      type="button"
                      title="Resolve report"
                      onClick={() =>
                        onStatus(
                          'report',
                          report.report_id,
                          'RESOLVED'
                        )
                      }
                    >
                      <CheckCircle2
                        size={15}
                      />
                    </button>

                  )}


                  {report.status !==
                    'DISMISSED' && (

                    <button
                      type="button"
                      title="Dismiss report"
                      onClick={() =>
                        onStatus(
                          'report',
                          report.report_id,
                          'DISMISSED'
                        )
                      }
                    >
                      <XCircle
                        size={15}
                      />
                    </button>

                  )}

                </div>

              </td>

            </tr>

          )
        )}

      </tbody>

    </table>

  );

};


// ============================================================
// EMPTY STATE
// ============================================================

const EmptyState = ({
  icon,
  title,
  text
}) => {

  return (

    <div className="cs-empty-state">

      <div>
        {icon}
      </div>

      <strong>
        {title}
      </strong>

      <span>
        {text}
      </span>

    </div>

  );

};


// ============================================================
// DETAILS MODAL
// ============================================================

const DetailsModal = ({
  type,
  item,
  saving,
  onClose,
  onStatus
}) => {

  const title =
    type === 'post'
      ? 'Community Post'
      : type === 'ticket'
      ? 'Support Ticket'
      : 'Community Report';


  return (

    <div className="cs-modal-backdrop">

      <div className="cs-modal detail">

        <div className="cs-modal-header">

          <div>

            <h2>
              {title}
            </h2>

            <p>
              Database record details
            </p>

          </div>

          <button
            type="button"
            onClick={
              onClose
            }
          >
            <X size={18} />
          </button>

        </div>


        <div className="cs-detail-content">

          {type === 'post' && (

            <>

              <div className="cs-detail-user">

                <div className="cs-avatar large">
                  {
                    initials(
                      item.user_name
                    )
                  }
                </div>

                <div>

                  <strong>
                    {item.user_name}
                  </strong>

                  <span>
                    {item.email}
                  </span>

                </div>

              </div>


              <div className="cs-detail-field">

                <label>
                  Title
                </label>

                <strong>
                  {item.title}
                </strong>

              </div>


              <div className="cs-detail-field">

                <label>
                  Category
                </label>

                <span>
                  {item.category}
                </span>

              </div>


              <div className="cs-detail-field">

                <label>
                  Content
                </label>

                <p>
                  {item.body}
                </p>

              </div>

            </>

          )}


          {type === 'ticket' && (

            <>

              <div className="cs-detail-field">

                <label>
                  Ticket
                </label>

                <strong>
                  #{item.ticket_id}
                </strong>

              </div>


              <div className="cs-detail-field">

                <label>
                  Subject
                </label>

                <strong>
                  {item.subject}
                </strong>

              </div>


              <div className="cs-detail-field">

                <label>
                  User
                </label>

                <span>
                  {item.user_name}
                  {' — '}
                  {item.email}
                </span>

              </div>


              <div className="cs-detail-field">

                <label>
                  Description
                </label>

                <p>
                  {item.description}
                </p>

              </div>


              <div className="cs-detail-meta-row">

                <span>
                  Category: {item.category}
                </span>

                <span>
                  Priority: {
                    statusLabel(
                      item.priority
                    )
                  }
                </span>

              </div>

            </>

          )}


          {type === 'report' && (

            <>

              <div className="cs-detail-field">

                <label>
                  Report
                </label>

                <strong>
                  #{item.report_id}
                </strong>

              </div>


              <div className="cs-detail-field">

                <label>
                  Reporter
                </label>

                <span>
                  {item.reporter_name}
                  {' — '}
                  {item.email}
                </span>

              </div>


              <div className="cs-detail-field">

                <label>
                  Reported Content
                </label>

                <strong>
                  {item.post_title ||
                    item.ticket_subject ||
                    'Reported item'}
                </strong>

              </div>


              <div className="cs-detail-field">

                <label>
                  Reason
                </label>

                <strong>
                  {item.reason}
                </strong>

              </div>


              <div className="cs-detail-field">

                <label>
                  Description
                </label>

                <p>
                  {item.description ||
                    'No additional description provided.'}
                </p>

              </div>

            </>

          )}

        </div>


        {/* ==================================================
            MODAL ACTIONS
            ================================================== */}

        <div className="cs-detail-actions">

          {type === 'post' && (

            <>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  onStatus(
                    'post',
                    item.post_id,
                    'ACTIVE'
                  )
                }
              >
                <CheckCircle2
                  size={15}
                />
                Activate
              </button>


              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  onStatus(
                    'post',
                    item.post_id,
                    'UNDER_REVIEW'
                  )
                }
              >
                <Clock3
                  size={15}
                />
                Review
              </button>


              <button
                type="button"
                className="danger"
                disabled={saving}
                onClick={() =>
                  onStatus(
                    'post',
                    item.post_id,
                    'HIDDEN'
                  )
                }
              >
                <XCircle
                  size={15}
                />
                Hide
              </button>

            </>

          )}


          {type === 'ticket' && (

            <>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  onStatus(
                    'ticket',
                    item.ticket_id,
                    'IN_PROGRESS'
                  )
                }
              >
                <Clock3
                  size={15}
                />
                In Progress
              </button>


              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  onStatus(
                    'ticket',
                    item.ticket_id,
                    'RESOLVED'
                  )
                }
              >
                <CheckCircle2
                  size={15}
                />
                Resolve
              </button>


              <button
                type="button"
                className="danger"
                disabled={saving}
                onClick={() =>
                  onStatus(
                    'ticket',
                    item.ticket_id,
                    'CLOSED'
                  )
                }
              >
                <XCircle
                  size={15}
                />
                Close
              </button>

            </>

          )}


          {type === 'report' && (

            <>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  onStatus(
                    'report',
                    item.report_id,
                    'UNDER_REVIEW'
                  )
                }
              >
                <Clock3
                  size={15}
                />
                Review
              </button>


              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  onStatus(
                    'report',
                    item.report_id,
                    'RESOLVED'
                  )
                }
              >
                <CheckCircle2
                  size={15}
                />
                Resolve
              </button>


              <button
                type="button"
                className="danger"
                disabled={saving}
                onClick={() =>
                  onStatus(
                    'report',
                    item.report_id,
                    'DISMISSED'
                  )
                }
              >
                <XCircle
                  size={15}
                />
                Dismiss
              </button>

            </>

          )}

        </div>

      </div>

    </div>

  );

};


export default CommunitySupport;