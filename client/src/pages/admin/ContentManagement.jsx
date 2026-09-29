import React, {
  useEffect,
  useState
} from 'react';

import {
  Megaphone,
  FileText,
  Image,
  Files,
  Plus,
  Search,
  Eye,
  Pencil,
  Archive,
  Send,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  FilePlus2,
  Upload,
  RefreshCw
} from 'lucide-react';

import {
  getAdminContentSummary,
  getAdminContentItems,
  getAdminContentItem,
  createAdminContent,
  updateAdminContent,
  updateAdminContentStatus,
  deleteAdminContent,
  getAdminContentRecent
} from '../../services/api';

import '../../styles/ContentManagement.css';


const ContentManagement = () => {

  /*
  ============================================================
  STATE
  ============================================================
  */

  const [summary, setSummary] =
    useState({
      total_announcements: 0,
      total_pages: 0,
      total_content_items: 0,
      published: 0,
      drafts: 0,
      archived: 0
    });


  const [items, setItems] =
    useState([]);

  const [recentActivity, setRecentActivity] =
    useState([]);


  const [activeTab, setActiveTab] =
    useState('ANNOUNCEMENT');


  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('ALL');


  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 8,
      total: 0,
      totalPages: 1
    });


  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');


  /*
  ============================================================
  MODALS
  ============================================================
  */

  const [viewItem, setViewItem] =
    useState(null);

  const [editItem, setEditItem] =
    useState(null);

  const [showForm, setShowForm] =
    useState(false);

  const [formMode, setFormMode] =
    useState('create');


  const [form, setForm] =
    useState({
      title: '',
      contentType: 'ANNOUNCEMENT',
      content: '',
      imageUrl: '',
      status: 'DRAFT'
    });


  const [saving, setSaving] =
    useState(false);


  /*
  ============================================================
  LOAD SUMMARY
  ============================================================
  */

  const loadSummary = async () => {

    try {

      const response =
        await getAdminContentSummary();

      if (response?.data) {
        setSummary(response.data);
      }

    } catch (err) {

      console.error(
        'Content summary:',
        err
      );

      setError(
        err.message ||
        'Unable to load summary.'
      );
    }
  };


  /*
  ============================================================
  LOAD CONTENT
  ============================================================
  */

  const loadItems = async () => {

    setLoading(true);
    setError('');

    try {

      const response =
        await getAdminContentItems({
          type: activeTab,
          status: statusFilter,
          search,
          page,
          limit: 8
        });


      setItems(
        response?.data || []
      );


      if (response?.pagination) {

        setPagination(
          response.pagination
        );
      }

    } catch (err) {

      console.error(
        'Content items:',
        err
      );

      setError(
        err.message ||
        'Unable to load content.'
      );

    } finally {

      setLoading(false);
    }
  };


  /*
  ============================================================
  LOAD RECENT ACTIVITY
  ============================================================
  */

  const loadRecentActivity = async () => {

    try {

      const response =
        await getAdminContentRecent();

      setRecentActivity(
        response?.data || []
      );

    } catch (err) {

      console.error(
        'Recent content activity:',
        err
      );
    }
  };


  /*
  ============================================================
  INITIAL LOAD
  ============================================================
  */

  useEffect(() => {

    loadSummary();
    loadRecentActivity();

  }, []);


  /*
  ============================================================
  RELOAD CONTENT WHEN FILTER CHANGES
  ============================================================
  */

  useEffect(() => {

    loadItems();

  }, [
    activeTab,
    statusFilter,
    search,
    page
  ]);


  /*
  ============================================================
  TAB CHANGE
  ============================================================
  */

  const handleTabChange = (tab) => {

    setActiveTab(tab);
    setPage(1);
  };


  /*
  ============================================================
  FORMAT DATE
  ============================================================
  */

  const formatDate = (date) => {

    if (!date) {
      return '—';
    }

    return new Intl.DateTimeFormat(
      'en-PH',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(
      new Date(date)
    );
  };


  /*
  ============================================================
  TYPE LABEL
  ============================================================
  */

  const getTypeLabel = (type) => {

    const labels = {
      ANNOUNCEMENT: 'Announcement',
      PAGE: 'Page',
      BANNER: 'Banner',
      FAQ: 'FAQ',
      POLICY: 'Policy',
      NEWS: 'News'
    };

    return (
      labels[type] ||
      type ||
      'Content'
    );
  };


  /*
  ============================================================
  TYPE ICON
  ============================================================
  */

  const getTypeIcon = (type) => {

    if (
      type === 'ANNOUNCEMENT'
    ) {
      return <Megaphone size={17} />;
    }

    if (
      type === 'PAGE'
    ) {
      return <FileText size={17} />;
    }

    if (
      type === 'BANNER'
    ) {
      return <Image size={17} />;
    }

    return <Files size={17} />;
  };


  /*
  ============================================================
  OPEN CREATE FORM
  ============================================================
  */

  const openCreateForm = (
    contentType = 'ANNOUNCEMENT'
  ) => {

    setFormMode('create');

    setEditItem(null);

    setForm({
      title: '',
      contentType,
      content: '',
      imageUrl: '',
      status: 'DRAFT'
    });

    setShowForm(true);
  };


  /*
  ============================================================
  OPEN EDIT FORM
  ============================================================
  */

  const openEditForm = async (item) => {

    try {

      const response =
        await getAdminContentItem(
          item.content_id
        );


      const data =
        response?.data ||
        item;


      setEditItem(data);

      setFormMode('edit');

      setForm({
        title:
          data.title || '',

        contentType:
          data.content_type ||
          'PAGE',

        content:
          data.content || '',

        imageUrl:
          data.image_url || '',

        status:
          data.status ||
          'DRAFT'
      });

      setShowForm(true);

    } catch (err) {

      alert(
        err.message ||
        'Unable to open content.'
      );
    }
  };


  /*
  ============================================================
  SAVE FORM
  ============================================================
  */

  const handleSave = async (event) => {

    event.preventDefault();

    setSaving(true);

    try {

      if (formMode === 'create') {

        await createAdminContent({
          title:
            form.title.trim(),

          contentType:
            form.contentType,

          content:
            form.content,

          imageUrl:
            form.imageUrl,

          status:
            form.status
        });

      } else {

        await updateAdminContent(
          editItem.content_id,
          {
            title:
              form.title.trim(),

            contentType:
              form.contentType,

            content:
              form.content,

            imageUrl:
              form.imageUrl,

            status:
              form.status
          }
        );
      }


      setShowForm(false);

      await Promise.all([
        loadSummary(),
        loadRecentActivity(),
        loadItems()
      ]);

    } catch (err) {

      alert(
        err.message ||
        'Unable to save content.'
      );

    } finally {

      setSaving(false);
    }
  };


  /*
  ============================================================
  STATUS ACTION
  ============================================================
  */

  const handleStatusChange = async (
    item,
    nextStatus
  ) => {

    let message =
      `Change "${item.title}" to ${nextStatus}?`;

    if (
      !window.confirm(message)
    ) {
      return;
    }


    try {

      await updateAdminContentStatus(
        item.content_id,
        nextStatus
      );


      await Promise.all([
        loadSummary(),
        loadRecentActivity(),
        loadItems()
      ]);

    } catch (err) {

      alert(
        err.message ||
        'Unable to update status.'
      );
    }
  };


  /*
  ============================================================
  DELETE
  ============================================================
  */

  const handleDelete = async (item) => {

    const confirmed =
      window.confirm(
        `Delete "${item.title}" permanently?`
      );


    if (!confirmed) {
      return;
    }


    try {

      await deleteAdminContent(
        item.content_id
      );


      if (
        items.length === 1 &&
        page > 1
      ) {

        setPage(
          page - 1
        );

      } else {

        await loadItems();
      }


      await Promise.all([
        loadSummary(),
        loadRecentActivity()
      ]);

    } catch (err) {

      alert(
        err.message ||
        'Unable to delete content.'
      );
    }
  };


  /*
  ============================================================
  REFRESH
  ============================================================
  */

  const refreshAll = async () => {

    await Promise.all([
      loadSummary(),
      loadRecentActivity(),
      loadItems()
    ]);
  };


  /*
  ============================================================
  RENDER
  ============================================================
  */

  return (
    <div className="content-management-page">

      {/* ======================================================
          KPI CARDS
      ====================================================== */}

      <section className="content-kpi-grid">

        <div className="content-kpi-card announcements">

          <div className="content-kpi-icon">
            <Megaphone size={23} />
          </div>

          <div className="content-kpi-info">

            <span>
              Total Announcements
            </span>

            <strong>
              {summary.total_announcements}
            </strong>

            <small>
              Database records
            </small>

          </div>

        </div>


        <div className="content-kpi-card pages">

          <div className="content-kpi-icon">
            <FileText size={23} />
          </div>

          <div className="content-kpi-info">

            <span>
              Total Pages
            </span>

            <strong>
              {summary.total_pages}
            </strong>

            <small>
              Database records
            </small>

          </div>

        </div>


        <div className="content-kpi-card items">

          <div className="content-kpi-icon">
            <Image size={23} />
          </div>

          <div className="content-kpi-info">

            <span>
              Total Content Items
            </span>

            <strong>
              {summary.total_content_items}
            </strong>

            <small>
              All content types
            </small>

          </div>

        </div>


        <div className="content-kpi-card published">

          <div className="content-kpi-icon">
            <CheckCircle2 size={23} />
          </div>

          <div className="content-kpi-info">

            <span>
              Published
            </span>

            <strong>
              {summary.published}
            </strong>

            <small>
              Currently published
            </small>

          </div>

        </div>

      </section>


      {/* ======================================================
          MAIN AREA
      ====================================================== */}

      <section className="content-main-layout">

        {/* ====================================================
            LEFT CONTENT
        ==================================================== */}

        <div className="content-main-panel">

          {/* TABS */}

          <div className="content-tabs">

            <button
              type="button"
              className={
                activeTab === 'ANNOUNCEMENT'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                handleTabChange(
                  'ANNOUNCEMENT'
                )
              }
            >
              <Megaphone size={15} />
              Announcements
            </button>


            <button
              type="button"
              className={
                activeTab === 'PAGE'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                handleTabChange(
                  'PAGE'
                )
              }
            >
              <FileText size={15} />
              Pages
            </button>


            <button
              type="button"
              className={
                activeTab === 'ALL'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                handleTabChange(
                  'ALL'
                )
              }
            >
              <Files size={15} />
              Content Library
            </button>


            <button
              type="button"
              className={
                activeTab === 'BANNER'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                handleTabChange(
                  'BANNER'
                )
              }
            >
              <Image size={15} />
              Banners
            </button>

          </div>


          {/* CONTENT HEADER */}

          <div className="content-panel-header">

            <div>

              <h2>
                {activeTab === 'ANNOUNCEMENT'
                  ? 'Announcements'
                  : activeTab === 'PAGE'
                    ? 'Pages'
                    : activeTab === 'BANNER'
                      ? 'Banners'
                      : 'Content Library'}
              </h2>

              <p>
                Manage platform content and important updates.
              </p>

            </div>


            <button
              type="button"
              className="content-primary-button"
              onClick={() =>
                openCreateForm(
                  activeTab === 'ALL'
                    ? 'ANNOUNCEMENT'
                    : activeTab
                )
              }
            >
              <Plus size={16} />
              New Content
            </button>

          </div>


          {/* FILTERS */}

          <div className="content-filters">

            <div className="content-search">

              <Search size={17} />

              <input
                type="text"
                value={search}
                placeholder={
                  activeTab === 'ANNOUNCEMENT'
                    ? 'Search announcements...'
                    : 'Search content...'
                }
                onChange={(event) => {

                  setSearch(
                    event.target.value
                  );

                  setPage(1);
                }}
              />

            </div>


            <select
              value={statusFilter}
              onChange={(event) => {

                setStatusFilter(
                  event.target.value
                );

                setPage(1);
              }}
            >
              <option value="ALL">
                All Status
              </option>

              <option value="PUBLISHED">
                Published
              </option>

              <option value="DRAFT">
                Draft
              </option>

              <option value="ARCHIVED">
                Archived
              </option>

            </select>


            <button
              type="button"
              className="content-refresh-button"
              onClick={refreshAll}
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>

          </div>


          {/* ERROR */}

          {error && (
            <div className="content-error">
              {error}
            </div>
          )}


          {/* TABLE */}

          <div className="content-table-wrapper">

            <table className="content-table">

              <thead>

                <tr>

                  <th>
                    Title
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Published Date
                  </th>

                  <th>
                    Author
                  </th>

                  <th className="content-actions-heading">
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="content-empty"
                    >
                      <RefreshCw
                        size={20}
                        className="content-spin"
                      />

                      Loading content...

                    </td>

                  </tr>

                ) : items.length === 0 ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="content-empty"
                    >
                      <Files size={30} />

                      <strong>
                        No content records found
                      </strong>

                      <span>
                        There are no database records matching the current filters.
                      </span>

                    </td>

                  </tr>

                ) : (

                  items.map((item) => (

                    <tr
                      key={item.content_id}
                    >

                      <td>

                        <div className="content-title-cell">

                          <div className="content-row-icon">
                            {getTypeIcon(
                              item.content_type
                            )}
                          </div>

                          <div>

                            <strong>
                              {item.title}
                            </strong>

                            <small>
                              {item.slug}
                            </small>

                          </div>

                        </div>

                      </td>


                      <td>

                        <span
                          className={`content-type-badge type-${String(
                            item.content_type
                          ).toLowerCase()}`}
                        >
                          {getTypeLabel(
                            item.content_type
                          )}
                        </span>

                      </td>


                      <td>

                        <span
                          className={`content-status-badge status-${String(
                            item.status
                          ).toLowerCase()}`}
                        >
                          {item.status}
                        </span>

                      </td>


                      <td>

                        {formatDate(
                          item.published_at
                        )}

                      </td>


                      <td>

                        <div className="content-author">

                          <div className="content-author-avatar">

                            {item.author_name
                              ?.charAt(0)
                              ?.toUpperCase() || 'S'}

                          </div>

                          <span>
                            {item.author_name ||
                              'System'}
                          </span>

                        </div>

                      </td>


                      {/* ACTION ICONS */}

                      <td>

                        <div className="content-action-buttons">

                          {/* VIEW */}

                          <button
                            type="button"
                            className="content-icon-button view"
                            title="View"
                            onClick={() =>
                              setViewItem(item)
                            }
                          >
                            <Eye size={15} />
                          </button>


                          {/* EDIT */}

                          <button
                            type="button"
                            className="content-icon-button edit"
                            title="Edit"
                            onClick={() =>
                              openEditForm(item)
                            }
                          >
                            <Pencil size={15} />
                          </button>


                          {/* PUBLISH */}

                          {item.status !==
                            'PUBLISHED' && (

                            <button
                              type="button"
                              className="content-icon-button publish"
                              title="Publish"
                              onClick={() =>
                                handleStatusChange(
                                  item,
                                  'PUBLISHED'
                                )
                              }
                            >
                              <Send size={15} />
                            </button>

                          )}


                          {/* ARCHIVE */}

                          {item.status ===
                            'PUBLISHED' && (

                            <button
                              type="button"
                              className="content-icon-button archive"
                              title="Archive"
                              onClick={() =>
                                handleStatusChange(
                                  item,
                                  'ARCHIVED'
                                )
                              }
                            >
                              <Archive size={15} />
                            </button>

                          )}


                          {/* DELETE */}

                          <button
                            type="button"
                            className="content-icon-button delete"
                            title="Delete"
                            onClick={() =>
                              handleDelete(item)
                            }
                          >
                            <Trash2 size={15} />
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>


          {/* PAGINATION */}

          {!loading &&
            items.length > 0 && (

              <div className="content-pagination">

                <span>
                  Showing {items.length} of{' '}
                  {pagination.total} records
                </span>


                <div>

                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage(
                        page - 1
                      )
                    }
                  >
                    <ChevronLeft size={15} />
                  </button>


                  <span className="content-page-number">
                    {pagination.page}
                  </span>


                  <button
                    type="button"
                    disabled={
                      page >=
                      pagination.totalPages
                    }
                    onClick={() =>
                      setPage(
                        page + 1
                      )
                    }
                  >
                    <ChevronRight size={15} />
                  </button>

                </div>

              </div>

            )}

        </div>


        {/* ====================================================
            RIGHT SIDE
        ==================================================== */}

        <aside className="content-right-column">

          {/* QUICK ACTIONS */}

          <div className="content-side-card">

            <div className="content-side-title">
              <h3>
                Quick Actions
              </h3>
            </div>


            <button
              type="button"
              className="content-quick-action"
              onClick={() =>
                openCreateForm(
                  'ANNOUNCEMENT'
                )
              }
            >
              <span className="quick-icon purple">
                <Megaphone size={17} />
              </span>

              <span>
                <strong>
                  Create Announcement
                </strong>

                <small>
                  Add a new platform announcement
                </small>
              </span>

              <ChevronRight size={16} />

            </button>


            <button
              type="button"
              className="content-quick-action"
              onClick={() =>
                openCreateForm(
                  'PAGE'
                )
              }
            >
              <span className="quick-icon blue">
                <FilePlus2 size={17} />
              </span>

              <span>
                <strong>
                  Add New Page
                </strong>

                <small>
                  Create a new static page
                </small>
              </span>

              <ChevronRight size={16} />

            </button>


            <button
              type="button"
              className="content-quick-action"
              onClick={() =>
                openCreateForm(
                  'BANNER'
                )
              }
            >
              <span className="quick-icon green">
                <Upload size={17} />
              </span>

              <span>
                <strong>
                  Add Banner
                </strong>

                <small>
                  Add homepage banner content
                </small>
              </span>

              <ChevronRight size={16} />

            </button>


            <button
              type="button"
              className="content-quick-action"
              onClick={() =>
                handleTabChange(
                  'BANNER'
                )
              }
            >
              <span className="quick-icon orange">
                <Image size={17} />
              </span>

              <span>
                <strong>
                  Manage Banners
                </strong>

                <small>
                  View banner records
                </small>
              </span>

              <ChevronRight size={16} />

            </button>

          </div>


          {/* RECENT ACTIVITY */}

          <div className="content-side-card">

            <div className="content-side-title">

              <h3>
                Recent Activity
              </h3>

              <button
                type="button"
                onClick={loadRecentActivity}
              >
                Refresh
              </button>

            </div>


            {recentActivity.length === 0 ? (

              <div className="content-side-empty">

                <Clock size={22} />

                <span>
                  No content activity yet.
                </span>

              </div>

            ) : (

              <div className="content-activity-list">

                {recentActivity.map(
                  (activity) => (

                    <div
                      className="content-activity-item"
                      key={
                        activity.content_id
                      }
                    >

                      <div className="activity-icon">
                        {getTypeIcon(
                          activity.content_type
                        )}
                      </div>

                      <div>

                        <strong>
                          {activity.activity_title}
                        </strong>

                        <span>
                          {activity.title}
                        </span>

                        <small>
                          {formatDate(
                            activity.updated_at
                          )}
                        </small>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </aside>

      </section>


      {/* ======================================================
          VIEW MODAL
      ====================================================== */}

      {viewItem && (

        <div
          className="content-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              setViewItem(null);
            }

          }}
        >

          <div className="content-modal">

            <div className="content-modal-header">

              <div>

                <span>
                  {getTypeLabel(
                    viewItem.content_type
                  )}
                </span>

                <h2>
                  {viewItem.title}
                </h2>

              </div>


              <button
                type="button"
                onClick={() =>
                  setViewItem(null)
                }
              >
                <X size={19} />
              </button>

            </div>


            <div className="content-modal-body">

              <div className="view-meta-grid">

                <div>
                  <label>
                    Status
                  </label>

                  <strong>
                    {viewItem.status}
                  </strong>
                </div>


                <div>
                  <label>
                    Author
                  </label>

                  <strong>
                    {viewItem.author_name ||
                      'System'}
                  </strong>
                </div>


                <div>
                  <label>
                    Created
                  </label>

                  <strong>
                    {formatDate(
                      viewItem.created_at
                    )}
                  </strong>
                </div>


                <div>
                  <label>
                    Published
                  </label>

                  <strong>
                    {formatDate(
                      viewItem.published_at
                    )}
                  </strong>
                </div>

              </div>


              {viewItem.image_url && (

                <div className="view-image">

                  <img
                    src={
                      viewItem.image_url
                    }
                    alt={
                      viewItem.title
                    }
                  />

                </div>

              )}


              <div className="view-content">

                <label>
                  Content
                </label>

                <div>
                  {viewItem.content ||
                    'No content has been entered for this record.'}
                </div>

              </div>

            </div>


            <div className="content-modal-footer">

              <button
                type="button"
                className="modal-secondary-button"
                onClick={() =>
                  setViewItem(null)
                }
              >
                Close
              </button>


              <button
                type="button"
                className="modal-primary-button"
                onClick={() => {

                  setViewItem(null);

                  openEditForm(
                    viewItem
                  );

                }}
              >
                <Pencil size={15} />
                Edit Content
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          CREATE / EDIT MODAL
      ====================================================== */}

      {showForm && (

        <div
          className="content-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget &&
              !saving
            ) {
              setShowForm(false);
            }

          }}
        >

          <form
            className="content-modal content-form-modal"
            onSubmit={handleSave}
          >

            <div className="content-modal-header">

              <div>

                <span>
                  {formMode === 'create'
                    ? 'Create Content'
                    : 'Edit Content'}
                </span>

                <h2>
                  {formMode === 'create'
                    ? 'New Content'
                    : 'Update Content'}
                </h2>

              </div>


              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setShowForm(false)
                }
              >
                <X size={19} />
              </button>

            </div>


            <div className="content-form-body">

              <label>
                Title

                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title:
                        event.target.value
                    })
                  }
                  placeholder="Enter content title"
                  required
                />

              </label>


              <div className="form-two-columns">

                <label>
                  Content Type

                  <select
                    value={
                      form.contentType
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        contentType:
                          event.target.value
                      })
                    }
                  >

                    <option value="ANNOUNCEMENT">
                      Announcement
                    </option>

                    <option value="PAGE">
                      Page
                    </option>

                    <option value="BANNER">
                      Banner
                    </option>

                    <option value="FAQ">
                      FAQ
                    </option>

                    <option value="POLICY">
                      Policy
                    </option>

                    <option value="NEWS">
                      News
                    </option>

                  </select>

                </label>


                <label>
                  Status

                  <select
                    value={
                      form.status
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status:
                          event.target.value
                      })
                    }
                  >

                    <option value="DRAFT">
                      Draft
                    </option>

                    <option value="PUBLISHED">
                      Published
                    </option>

                    <option value="ARCHIVED">
                      Archived
                    </option>

                  </select>

                </label>

              </div>


              <label>
                Image URL
                <span className="optional">
                  Optional
                </span>

                <input
                  type="url"
                  value={
                    form.imageUrl
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      imageUrl:
                        event.target.value
                    })
                  }
                  placeholder="https://..."
                />

              </label>


              <label>
                Content

                <textarea
                  rows="8"
                  value={
                    form.content
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      content:
                        event.target.value
                    })
                  }
                  placeholder="Write the content here..."
                />

              </label>

            </div>


            <div className="content-modal-footer">

              <button
                type="button"
                className="modal-secondary-button"
                disabled={saving}
                onClick={() =>
                  setShowForm(false)
                }
              >
                Cancel
              </button>


              <button
                type="submit"
                className="modal-primary-button"
                disabled={
                  saving ||
                  !form.title.trim()
                }
              >
                {saving ? (
                  <>
                    <RefreshCw
                      size={15}
                      className="content-spin"
                    />

                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />

                    Save Content
                  </>
                )}
              </button>

            </div>

          </form>

        </div>

      )}

    </div>
  );
};


export default ContentManagement;