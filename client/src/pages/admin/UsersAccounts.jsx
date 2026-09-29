import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  Users,
  ShoppingCart,
  Store,
  ShieldCheck,
  Search,
  Plus,
  Download,
  RotateCcw,
  Eye,
  UserCheck,
  UserX,
  Clock,
  UserRound,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import {
  getAdminUsers,
  getAdminUserStats,
  getRecentAdminUsers,
  createAdminUser,
  getAdminUser,
  updateAdminUserStatus,
  downloadAdminUsersCsv
} from '../../services/api';

import '../../styles/UsersAccounts.css';


const UsersAccounts = () => {

  // ==========================================================
  // STATE
  // ==========================================================

  const [users, setUsers] =
    useState([]);

  const [recentUsers, setRecentUsers] =
    useState([]);

  const [stats, setStats] =
    useState({
      totalUsers: 0,
      buyers: 0,
      sellers: 0,
      admins: 0,
      activeUsers: 0,
      pendingUsers: 0,
      inactiveUsers: 0,
      suspendedUsers: 0
    });

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [activeTab, setActiveTab] =
    useState('ALL');

  const [search, setSearch] =
    useState('');

  const [roleFilter, setRoleFilter] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('');

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 8,
      total: 0,
      totalPages: 1
    });

  const [selectedUsers, setSelectedUsers] =
    useState([]);

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [showUserModal, setShowUserModal] =
    useState(false);

  const [statusPrompt, setStatusPrompt] =
    useState(null);

  const [showAddUser, setShowAddUser] =
    useState(false);

  const [newUser, setNewUser] =
    useState({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'BUYER',
      phone: '',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      status: 'ACTIVE'
    });


  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadData = async () => {

    try {

      setLoading(true);
      setError('');

      const selectedRole =
        activeTab === 'ALL'
          ? roleFilter
          : activeTab;


      const [
        usersResponse,
        statsResponse,
        recentResponse
      ] = await Promise.all([
        getAdminUsers({
          page,
          limit: 8,
          search,
          role: selectedRole,
          status: statusFilter
        }),

        getAdminUserStats(),

        getRecentAdminUsers()
      ]);


      const usersData =
        usersResponse?.data || {};


      const statsData =
        statsResponse?.data || {};


      setUsers(
        Array.isArray(usersData.users)
          ? usersData.users
          : []
      );


      setPagination(
        usersData.pagination || {
          page: 1,
          limit: 8,
          total: 0,
          totalPages: 1
        }
      );


      setStats({
        totalUsers:
          Number(statsData.totalUsers || 0),

        buyers:
          Number(statsData.buyers || 0),

        sellers:
          Number(statsData.sellers || 0),

        admins:
          Number(statsData.admins || 0),

        activeUsers:
          Number(statsData.activeUsers || 0),

        pendingUsers:
          Number(statsData.pendingUsers || 0),

        inactiveUsers:
          Number(statsData.inactiveUsers || 0),

        suspendedUsers:
          Number(statsData.suspendedUsers || 0)
      });


      setRecentUsers(
        Array.isArray(recentResponse?.data)
          ? recentResponse.data
          : []
      );


    } catch (err) {

      console.error(
        'USERS ACCOUNTS ERROR:',
        err
      );

      setError(
        err?.message ||
        'Unable to load users.'
      );

    } finally {

      setLoading(false);

    }
  };


  // ==========================================================
  // LOAD WHEN FILTERS CHANGE
  // ==========================================================

  useEffect(() => {

    loadData();

  }, [
    page,
    search,
    roleFilter,
    statusFilter,
    activeTab
  ]);


  // ==========================================================
  // RESET FILTERS
  // ==========================================================

  const resetFilters = () => {

    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setActiveTab('ALL');
    setPage(1);

  };


  // ==========================================================
  // TAB
  // ==========================================================

  const changeTab = (tab) => {

    setActiveTab(tab);
    setRoleFilter('');
    setPage(1);

  };


  // ==========================================================
  // CHECKBOX
  // ==========================================================

  const toggleUser = (userId) => {

    setSelectedUsers((current) => {

      if (current.includes(userId)) {

        return current.filter(
          (id) => id !== userId
        );

      }

      return [
        ...current,
        userId
      ];

    });

  };


  const allCurrentSelected =
    users.length > 0 &&
    users.every(
      (user) =>
        selectedUsers.includes(
          user.user_id
        )
    );


  const toggleAllCurrent = () => {

    if (allCurrentSelected) {

      setSelectedUsers(
        (current) =>
          current.filter(
            (id) =>
              !users.some(
                (user) =>
                  user.user_id === id
              )
          )
      );

      return;
    }


    setSelectedUsers(
      (current) => [
        ...new Set([
          ...current,
          ...users.map(
            (user) =>
              user.user_id
          )
        ])
      ]
    );

  };


  // ==========================================================
  // VIEW USER
  // ==========================================================

  const handleViewUser = async (userId) => {

    try {

      setActionLoading(true);
      setError('');

      const response =
        await getAdminUser(userId);

      setSelectedUser(
        response?.data || null
      );

      setShowUserModal(true);

    } catch (err) {

      console.error(
        'VIEW USER ERROR:',
        err
      );

      setError(
        err?.message ||
        'Unable to load user details.'
      );

    } finally {

      setActionLoading(false);

    }

  };


  // ==========================================================
  // STYLED STATUS CONFIRMATION
  // ==========================================================

  const getStatusAction = (status) => {

    const actions = {
      ACTIVE: {
        title: 'Activate User',
        confirmText: 'Activate User',
        className: 'activate',
        description:
          'This will allow the user to access the account again.',
        successText:
          'User activated successfully.'
      },

      INACTIVE: {
        title: 'Deactivate User',
        confirmText: 'Deactivate User',
        className: 'deactivate',
        description:
          'This will make the user inactive and prevent normal account access.',
        successText:
          'User deactivated successfully.'
      },

      SUSPENDED: {
        title: 'Suspend User',
        confirmText: 'Suspend User',
        className: 'suspend',
        description:
          'This will suspend the account until an administrator activates it again.',
        successText:
          'User suspended successfully.'
      }
    };

    return actions[status] || actions.INACTIVE;
  };


  const askStatusChange = (user, status) => {

    setError('');
    setSuccess('');

    setStatusPrompt({
      user,
      status,
      ...getStatusAction(status)
    });

  };


  const closeStatusPrompt = () => {

    if (!actionLoading) {
      setStatusPrompt(null);
    }

  };


  const confirmStatusChange = async () => {

    if (!statusPrompt?.user) {
      return;
    }

    try {

      setActionLoading(true);
      setError('');
      setSuccess('');

      await updateAdminUserStatus(
        statusPrompt.user.user_id,
        statusPrompt.status
      );

      setSuccess(
        statusPrompt.successText
      );

      setStatusPrompt(null);

      await loadData();

    } catch (err) {

      console.error(
        'STATUS UPDATE ERROR:',
        err
      );

      setError(
        err?.message ||
        'Unable to update user status.'
      );

    } finally {

      setActionLoading(false);

    }

  };


  // ==========================================================
  // BULK STATUS
  // ==========================================================

  const handleBulkStatus =
    async (status) => {

      if (
        selectedUsers.length === 0
      ) {

        setError(
          'Please select at least one user.'
        );

        return;
      }


      try {

        setActionLoading(true);
        setError('');
        setSuccess('');


        for (
          const userId
          of selectedUsers
        ) {

          await updateAdminUserStatus(
            userId,
            status
          );

        }


        setSelectedUsers([]);

        setSuccess(
          'Selected users updated successfully.'
        );


        await loadData();

      } catch (err) {

        console.error(
          'BULK STATUS ERROR:',
          err
        );

        setError(
          err?.message ||
          'Unable to update selected users.'
        );

      } finally {

        setActionLoading(false);

      }

    };


  // ==========================================================
  // ADD USER
  // ==========================================================

  const handleNewUserChange =
    (event) => {

      const {
        name,
        value
      } = event.target;


      setNewUser(
        (current) => ({
          ...current,
          [name]: value
        })
      );

    };


  const handleCreateUser =
    async (event) => {

      event.preventDefault();


      try {

        setActionLoading(true);
        setError('');
        setSuccess('');


        await createAdminUser(
          newUser
        );


        setShowAddUser(false);


        setNewUser({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          role: 'BUYER',
          phone: '',
          address: '',
          city: '',
          province: '',
          postal_code: '',
          status: 'ACTIVE'
        });


        setSuccess(
          'User created successfully.'
        );


        setPage(1);

        await loadData();

      } catch (err) {

        console.error(
          'CREATE USER ERROR:',
          err
        );

        setError(
          err?.message ||
          'Unable to create user.'
        );

      } finally {

        setActionLoading(false);

      }

    };


  // ==========================================================
  // EXPORT
  // ==========================================================

  const handleExport = async () => {

    try {

      setActionLoading(true);
      setError('');
      setSuccess('');


      await downloadAdminUsersCsv();


      setSuccess(
        'Users exported successfully.'
      );

    } catch (err) {

      setError(
        err?.message ||
        'Unable to export users.'
      );

    } finally {

      setActionLoading(false);

    }

  };


  // ==========================================================
  // STATUS HELPERS
  // ==========================================================

  const getVerification =
    (status) => {

      if (status === 'ACTIVE') {
        return 'Verified';
      }

      if (status === 'PENDING') {
        return 'Pending';
      }

      return 'Not Verified';

    };


  const getInitials =
    (user) => {

      const first =
        user.first_name
          ?.charAt(0)
          ?.toUpperCase() || '';

      const last =
        user.last_name
          ?.charAt(0)
          ?.toUpperCase() || '';

      return (
        `${first}${last}` ||
        'U'
      );

    };


  const formatDate =
    (value) => {

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


  const roleLabel =
    (role) => {

      if (role === 'BUYER') {
        return 'Buyer';
      }

      if (role === 'SELLER') {
        return 'Seller';
      }

      return 'Admin';

    };


  // ==========================================================
  // USER STATUS DONUT
  // ==========================================================

  const statusTotal =
    stats.activeUsers +
    stats.pendingUsers +
    stats.inactiveUsers +
    stats.suspendedUsers;


  const donutStyle =
    useMemo(() => {

      if (statusTotal === 0) {

        return {
          background:
            '#eeeeF5'
        };

      }


      const active =
        (
          stats.activeUsers /
          statusTotal
        ) * 100;


      const pending =
        (
          stats.pendingUsers /
          statusTotal
        ) * 100;


      const inactive =
        (
          stats.inactiveUsers /
          statusTotal
        ) * 100;


      const first =
        active;

      const second =
        first + pending;

      const third =
        second + inactive;


      return {
        background: `
          conic-gradient(
            #25ad88 0% ${first}%,
            #f4a62a ${first}% ${second}%,
            #e84263 ${second}% ${third}%,
            #8e8ba7 ${third}% 100%
          )
        `
      };

    }, [
      stats.activeUsers,
      stats.pendingUsers,
      stats.inactiveUsers,
      stats.suspendedUsers,
      statusTotal
    ]);


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <div className="users-page-loading">

        <div className="users-spinner"></div>

        <span>
          Loading users...
        </span>

      </div>
    );

  }


  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="users-accounts-page">

      {/* ======================================================
          ALERTS
      ====================================================== */}

      {error && (
        <div className="users-alert error">

          <AlertCircle size={16} />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
          >
            <X size={14} />
          </button>

        </div>
      )}


      {success && (
        <div className="users-alert success">

          <CheckCircle2 size={16} />

          <span>
            {success}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccess('')
            }
          >
            <X size={14} />
          </button>

        </div>
      )}


      {/* ======================================================
          KPI CARDS
      ====================================================== */}

      <section className="users-kpi-grid">

        <div className="users-kpi-card purple">

          <div className="users-kpi-icon">
            <Users size={22} />
          </div>

          <div>
            <span>Total Users</span>

            <strong>
              {stats.totalUsers.toLocaleString()}
            </strong>
          </div>

        </div>


        <div className="users-kpi-card blue">

          <div className="users-kpi-icon">
            <ShoppingCart size={22} />
          </div>

          <div>
            <span>Buyers</span>

            <strong>
              {stats.buyers.toLocaleString()}
            </strong>
          </div>

        </div>


        <div className="users-kpi-card green">

          <div className="users-kpi-icon">
            <Store size={22} />
          </div>

          <div>
            <span>Sellers</span>

            <strong>
              {stats.sellers.toLocaleString()}
            </strong>
          </div>

        </div>


        <div className="users-kpi-card orange">

          <div className="users-kpi-icon">
            <ShieldCheck size={22} />
          </div>

          <div>
            <span>Admins</span>

            <strong>
              {stats.admins.toLocaleString()}
            </strong>
          </div>

        </div>

      </section>


      {/* ======================================================
          MAIN AREA
      ====================================================== */}

      <div className="users-content-grid">

        {/* ====================================================
            USERS TABLE AREA
            ==================================================== */}

        <section className="users-main-card">

          {/* TABS */}

          <div className="users-tabs-row">

            <div className="users-tabs">

              <button
                type="button"
                className={
                  activeTab === 'ALL'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  changeTab('ALL')
                }
              >
                <Users size={15} />
                All Users
              </button>


              <button
                type="button"
                className={
                  activeTab === 'BUYER'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  changeTab('BUYER')
                }
              >
                <ShoppingCart size={15} />
                Buyers
              </button>


              <button
                type="button"
                className={
                  activeTab === 'SELLER'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  changeTab('SELLER')
                }
              >
                <Store size={15} />
                Sellers
              </button>


              <button
                type="button"
                className={
                  activeTab === 'ADMIN'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  changeTab('ADMIN')
                }
              >
                <ShieldCheck size={15} />
                Admins
              </button>

            </div>


            <button
              type="button"
              className="add-user-button"
              onClick={() =>
                setShowAddUser(true)
              }
            >
              <Plus size={15} />
              Add User
            </button>

          </div>


          {/* FILTERS */}

          <div className="users-filter-row">

            <div className="users-search">

              <Search size={16} />

              <input
                type="text"
                value={search}
                placeholder="Search by name, email, or user ID..."
                onChange={(event) => {

                  setSearch(
                    event.target.value
                  );

                  setPage(1);

                }}
              />

            </div>


            <select
              value={roleFilter}
              onChange={(event) => {

                setRoleFilter(
                  event.target.value
                );

                setActiveTab('ALL');

                setPage(1);

              }}
            >

              <option value="">
                All Roles
              </option>

              <option value="BUYER">
                Buyers
              </option>

              <option value="SELLER">
                Sellers
              </option>

              <option value="ADMIN">
                Admins
              </option>

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

              <option value="SUSPENDED">
                Suspended
              </option>

            </select>


            <button
              type="button"
              className="reset-button"
              onClick={resetFilters}
            >
              <RotateCcw size={14} />
              Reset
            </button>

          </div>


          {/* TABLE */}

          <div className="users-table-wrapper">

            <table className="users-table">

              <thead>

                <tr>

                  <th className="check-column">

                    <input
                      type="checkbox"
                      checked={
                        allCurrentSelected
                      }
                      onChange={
                        toggleAllCurrent
                      }
                    />

                  </th>

                  <th>User</th>

                  <th>Role</th>

                  <th>Email</th>

                  <th>Status</th>

                  <th>Verification</th>

                  <th>Joined Date</th>

                  <th>Actions</th>

                </tr>

              </thead>


              <tbody>

                {users.length === 0 ? (

                  <tr>

                    <td
                      colSpan="8"
                      className="users-empty"
                    >

                      <UserRound size={32} />

                      <strong>
                        No users found
                      </strong>

                      <span>
                        There are no users matching
                        the current filters.
                      </span>

                    </td>

                  </tr>

                ) : (

                  users.map((user) => (

                    <tr
                      key={user.user_id}
                    >

                      {/* CHECK */}

                      <td className="check-column">

                        <input
                          type="checkbox"
                          checked={
                            selectedUsers.includes(
                              user.user_id
                            )
                          }
                          onChange={() =>
                            toggleUser(
                              user.user_id
                            )
                          }
                        />

                      </td>


                      {/* USER */}

                      <td>

                        <div className="user-cell">

                          {user.profile_image ? (

                            <img
                              src={
                                user.profile_image
                              }
                              alt=""
                              className="user-avatar"
                            />

                          ) : (

                            <div className="user-avatar initials">
                              {getInitials(
                                user
                              )}
                            </div>

                          )}


                          <div className="user-cell-info">

                            <strong>
                              {user.first_name}{' '}
                              {user.last_name}
                            </strong>

                            <small>
                              #USR-
                              {String(
                                user.user_id
                              ).padStart(
                                4,
                                '0'
                              )}
                            </small>

                          </div>

                        </div>

                      </td>


                      {/* ROLE */}

                      <td>

                        <span
                          className={
                            `role-badge role-${String(
                              user.role
                            ).toLowerCase()}`
                          }
                        >
                          {roleLabel(
                            user.role
                          )}
                        </span>

                      </td>


                      {/* EMAIL */}

                      <td className="email-cell">
                        {user.email}
                      </td>


                      {/* STATUS */}

                      <td>

                        <span
                          className={
                            `status-badge status-${String(
                              user.status
                            ).toLowerCase()}`
                          }
                        >
                          <span className="status-dot"></span>

                          {user.status
                            .charAt(0)
                            .toUpperCase() +
                            user.status
                              .slice(1)
                              .toLowerCase()}
                        </span>

                      </td>


                      {/* VERIFICATION */}

                      <td>

                        <span
                          className={
                            `verification-badge ${
                              user.status ===
                              'ACTIVE'
                                ? 'verified'
                                : user.status ===
                                  'PENDING'
                                ? 'pending'
                                : 'not-verified'
                            }`
                          }
                        >

                          {user.status ===
                          'ACTIVE' ? (
                            <CheckCircle2
                              size={12}
                            />
                          ) : user.status ===
                            'PENDING' ? (
                            <Clock
                              size={12}
                            />
                          ) : (
                            <UserX
                              size={12}
                            />
                          )}

                          {getVerification(
                            user.status
                          )}

                        </span>

                      </td>


                      {/* DATE */}

                      <td className="date-cell">
                        {formatDate(
                          user.created_at
                        )}
                      </td>


                      {/* VISIBLE ACTION BUTTONS */}

                      <td className="actions-cell">

                        <div className="user-action-buttons">

                          <button
                            type="button"
                            className="table-action view"
                            title="View user"
                            disabled={actionLoading}
                            onClick={() =>
                              handleViewUser(
                                user.user_id
                              )
                            }
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>


                          {user.status !== 'ACTIVE' && (

                            <button
                              type="button"
                              className="table-action activate"
                              title="Activate user"
                              disabled={actionLoading}
                              onClick={() =>
                                askStatusChange(
                                  user,
                                  'ACTIVE'
                                )
                              }
                            >
                              <UserCheck size={13} />
                              <span>Activate</span>
                            </button>

                          )}


                          {user.status === 'ACTIVE' && (

                            <button
                              type="button"
                              className="table-action deactivate"
                              title="Deactivate user"
                              disabled={actionLoading}
                              onClick={() =>
                                askStatusChange(
                                  user,
                                  'INACTIVE'
                                )
                              }
                            >
                              <UserX size={13} />
                              <span>Deactivate</span>
                            </button>

                          )}


                          {user.status !== 'SUSPENDED' && (

                            <button
                              type="button"
                              className="table-action suspend"
                              title="Suspend user"
                              disabled={actionLoading}
                              onClick={() =>
                                askStatusChange(
                                  user,
                                  'SUSPENDED'
                                )
                              }
                            >
                              <AlertCircle size={13} />
                              <span>Suspend</span>
                            </button>

                          )}

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>


          {/* TABLE FOOTER */}

          <div className="users-table-footer">

            <span>
              Showing{' '}
              {users.length === 0
                ? 0
                : (
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
              {pagination.total.toLocaleString()}{' '}
              users
            </span>


            <div className="pagination">

              <button
                type="button"
                disabled={
                  pagination.page <= 1
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        current - 1,
                        1
                      )
                  )
                }
              >
                <ChevronLeft
                  size={15}
                />
              </button>


              {Array.from(
                {
                  length:
                    Math.min(
                      pagination.totalPages,
                      5
                    )
                },
                (_, index) =>
                  index + 1
              ).map(
                (number) => (

                  <button
                    type="button"
                    key={number}
                    className={
                      pagination.page ===
                      number
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
                  pagination.page >=
                  pagination.totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        current + 1,
                        pagination.totalPages
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

        </section>


        {/* ====================================================
            RIGHT CONTENT
            NOT A SIDEBAR NAVIGATION
            ==================================================== */}

        <aside className="users-info-column">

          {/* QUICK ACTIONS */}

          <section className="users-side-card">

            <h3>
              Quick Actions
            </h3>


            <button
              type="button"
              className="quick-action primary"
              onClick={() =>
                setShowAddUser(true)
              }
            >
              <UserRound size={15} />
              Add New User
            </button>


            <button
              type="button"
              className="quick-action"
              disabled={
                selectedUsers.length === 0 ||
                actionLoading
              }
              onClick={() =>
                handleBulkStatus(
                  'ACTIVE'
                )
              }
            >
              <UserCheck size={15} />
              Bulk Activate
            </button>


            <button
              type="button"
              className="quick-action"
              onClick={handleExport}
              disabled={
                actionLoading
              }
            >
              <Download size={15} />
              Export Users
            </button>

          </section>


          {/* USER STATUS */}

          <section className="users-side-card">

            <h3>
              User Status
            </h3>


            <div className="status-chart-area">

              <div
                className="status-donut"
                style={donutStyle}
              >

                <div className="status-donut-hole">

                  <strong>
                    {stats.totalUsers.toLocaleString()}
                  </strong>

                  <span>
                    Total Users
                  </span>

                </div>

              </div>


              <div className="status-legend">

                <div>
                  <span className="legend-color active"></span>

                  <span>
                    Active
                  </span>

                  <strong>
                    {stats.activeUsers.toLocaleString()}
                  </strong>

                  <small>
                    {statusTotal
                      ? (
                          (
                            stats.activeUsers /
                            statusTotal
                          ) *
                          100
                        ).toFixed(1)
                      : '0.0'}%
                  </small>

                </div>


                <div>
                  <span className="legend-color pending"></span>

                  <span>
                    Pending
                  </span>

                  <strong>
                    {stats.pendingUsers.toLocaleString()}
                  </strong>

                  <small>
                    {statusTotal
                      ? (
                          (
                            stats.pendingUsers /
                            statusTotal
                          ) *
                          100
                        ).toFixed(1)
                      : '0.0'}%
                  </small>

                </div>


                <div>
                  <span className="legend-color inactive"></span>

                  <span>
                    Inactive
                  </span>

                  <strong>
                    {stats.inactiveUsers.toLocaleString()}
                  </strong>

                  <small>
                    {statusTotal
                      ? (
                          (
                            stats.inactiveUsers /
                            statusTotal
                          ) *
                          100
                        ).toFixed(1)
                      : '0.0'}%
                  </small>

                </div>

              </div>

            </div>

          </section>


          {/* RECENT USERS */}

          <section className="users-side-card recent-users-card">

            <div className="side-card-heading">

              <h3>
                Recent Users
              </h3>

              <span>
                Latest
              </span>

            </div>


            {recentUsers.length === 0 ? (

              <div className="recent-empty">
                No users yet.
              </div>

            ) : (

              <div className="recent-user-list">

                {recentUsers.map(
                  (user) => (

                    <div
                      className="recent-user"
                      key={
                        user.user_id
                      }
                    >

                      <div className="recent-avatar">
                        {getInitials(
                          user
                        )}
                      </div>


                      <div className="recent-user-info">

                        <strong>
                          {user.first_name}{' '}
                          {user.last_name}
                        </strong>

                        <small>
                          Joined{' '}
                          {formatDate(
                            user.created_at
                          )}
                        </small>

                      </div>


                      <span
                        className={
                          `recent-status ${
                            String(
                              user.status
                            ).toLowerCase()
                          }`
                        }
                      >
                        {String(
                          user.status
                        )
                          .charAt(0)
                          .toUpperCase() +
                          String(
                            user.status
                          )
                            .slice(1)
                            .toLowerCase()}
                      </span>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

        </aside>

      </div>


      {/* ======================================================
          VIEW USER MODAL
      ====================================================== */}

      {showUserModal && selectedUser && (

        <div className="user-modal-backdrop">

          <div className="user-view-modal">

            <div className="user-modal-header">

              <div>
                <h2>User Details</h2>
                <p>
                  Complete account information for this user.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                aria-label="Close user details"
              >
                <X size={18} />
              </button>

            </div>

            <div className="user-details-body">

              <div className="user-details-profile">

                {selectedUser.profile_image ? (
                  <img
                    src={selectedUser.profile_image}
                    alt=""
                    className="user-details-avatar"
                  />
                ) : (
                  <div className="user-details-avatar initials">
                    {getInitials(selectedUser)}
                  </div>
                )}

                <div>
                  <strong>
                    {selectedUser.first_name}{' '}
                    {selectedUser.last_name}
                  </strong>

                  <span>
                    #USR-
                    {String(selectedUser.user_id).padStart(4, '0')}
                  </span>
                </div>

              </div>

              <div className="user-details-status-row">

                <span
                  className={
                    `role-badge role-${String(
                      selectedUser.role
                    ).toLowerCase()}`
                  }
                >
                  {roleLabel(selectedUser.role)}
                </span>

                <span
                  className={
                    `status-badge status-${String(
                      selectedUser.status
                    ).toLowerCase()}`
                  }
                >
                  <span className="status-dot"></span>
                  {String(selectedUser.status)
                    .charAt(0)
                    .toUpperCase() +
                    String(selectedUser.status)
                      .slice(1)
                      .toLowerCase()}
                </span>

              </div>

              <div className="user-details-grid">

                <div>
                  <span>Email</span>
                  <strong>{selectedUser.email || '—'}</strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>{selectedUser.phone || '—'}</strong>
                </div>

                <div>
                  <span>Address</span>
                  <strong>{selectedUser.address || '—'}</strong>
                </div>

                <div>
                  <span>City</span>
                  <strong>{selectedUser.city || '—'}</strong>
                </div>

                <div>
                  <span>Province</span>
                  <strong>{selectedUser.province || '—'}</strong>
                </div>

                <div>
                  <span>Postal Code</span>
                  <strong>{selectedUser.postal_code || '—'}</strong>
                </div>

                <div>
                  <span>Joined Date</span>
                  <strong>{formatDate(selectedUser.created_at)}</strong>
                </div>

                <div>
                  <span>Last Updated</span>
                  <strong>{formatDate(selectedUser.updated_at)}</strong>
                </div>

              </div>

              <div className="user-view-actions">

                {selectedUser.status !== 'ACTIVE' && (
                  <button
                    type="button"
                    className="table-action activate"
                    onClick={() => {
                      setShowUserModal(false);
                      askStatusChange(selectedUser, 'ACTIVE');
                    }}
                  >
                    <UserCheck size={14} />
                    Activate
                  </button>
                )}

                {selectedUser.status === 'ACTIVE' && (
                  <button
                    type="button"
                    className="table-action deactivate"
                    onClick={() => {
                      setShowUserModal(false);
                      askStatusChange(selectedUser, 'INACTIVE');
                    }}
                  >
                    <UserX size={14} />
                    Deactivate
                  </button>
                )}

                {selectedUser.status !== 'SUSPENDED' && (
                  <button
                    type="button"
                    className="table-action suspend"
                    onClick={() => {
                      setShowUserModal(false);
                      askStatusChange(selectedUser, 'SUSPENDED');
                    }}
                  >
                    <AlertCircle size={14} />
                    Suspend
                  </button>
                )}

              </div>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          STYLED STATUS CONFIRMATION PROMPT
      ====================================================== */}

      {statusPrompt && (

        <div className="user-modal-backdrop prompt-backdrop">

          <div className="status-confirm-modal">

            <div
              className={
                `status-confirm-icon ${statusPrompt.className}`
              }
            >
              {statusPrompt.status === 'ACTIVE' && (
                <UserCheck size={24} />
              )}

              {statusPrompt.status === 'INACTIVE' && (
                <UserX size={24} />
              )}

              {statusPrompt.status === 'SUSPENDED' && (
                <AlertCircle size={24} />
              )}
            </div>

            <h2>{statusPrompt.title}</h2>

            <p>
              Are you sure you want to{' '}
              <strong>
                {statusPrompt.status === 'ACTIVE'
                  ? 'activate'
                  : statusPrompt.status === 'SUSPENDED'
                  ? 'suspend'
                  : 'deactivate'}
              </strong>{' '}
              <strong>
                {statusPrompt.user.first_name}{' '}
                {statusPrompt.user.last_name}
              </strong>
              ?
            </p>

            <span className="status-confirm-description">
              {statusPrompt.description}
            </span>

            <div className="status-confirm-user">

              <div className="recent-avatar">
                {getInitials(statusPrompt.user)}
              </div>

              <div>
                <strong>
                  {statusPrompt.user.first_name}{' '}
                  {statusPrompt.user.last_name}
                </strong>

                <span>
                  {statusPrompt.user.email}
                </span>
              </div>

            </div>

            <div className="status-confirm-actions">

              <button
                type="button"
                className="modal-cancel"
                onClick={closeStatusPrompt}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  `status-confirm-button ${statusPrompt.className}`
                }
                onClick={confirmStatusChange}
                disabled={actionLoading}
              >
                {actionLoading
                  ? 'Updating...'
                  : statusPrompt.confirmText}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          ADD USER MODAL
      ====================================================== */}

      {showAddUser && (

        <div className="user-modal-backdrop">

          <div className="user-modal">

            <div className="user-modal-header">

              <div>
                <h2>
                  Add New User
                </h2>

                <p>
                  Create a user account directly
                  from the admin panel.
                </p>
              </div>


              <button
                type="button"
                onClick={() =>
                  setShowAddUser(false)
                }
              >
                <X size={18} />
              </button>

            </div>


            <form
              onSubmit={
                handleCreateUser
              }
            >

              <div className="modal-form-grid">

                <label>
                  First Name

                  <input
                    name="first_name"
                    value={
                      newUser.first_name
                    }
                    onChange={
                      handleNewUserChange
                    }
                    required
                  />
                </label>


                <label>
                  Last Name

                  <input
                    name="last_name"
                    value={
                      newUser.last_name
                    }
                    onChange={
                      handleNewUserChange
                    }
                    required
                  />
                </label>


                <label>
                  Email

                  <input
                    type="email"
                    name="email"
                    value={
                      newUser.email
                    }
                    onChange={
                      handleNewUserChange
                    }
                    required
                  />
                </label>


                <label>
                  Password

                  <input
                    type="password"
                    name="password"
                    value={
                      newUser.password
                    }
                    onChange={
                      handleNewUserChange
                    }
                    minLength="6"
                    required
                  />
                </label>


                <label>
                  Role

                  <select
                    name="role"
                    value={
                      newUser.role
                    }
                    onChange={
                      handleNewUserChange
                    }
                  >
                    <option value="BUYER">
                      Buyer
                    </option>

                    <option value="SELLER">
                      Seller
                    </option>

                    <option value="ADMIN">
                      Admin
                    </option>
                  </select>

                </label>


                <label>
                  Status

                  <select
                    name="status"
                    value={
                      newUser.status
                    }
                    onChange={
                      handleNewUserChange
                    }
                  >
                    <option value="ACTIVE">
                      Active
                    </option>

                    <option value="PENDING">
                      Pending
                    </option>

                    <option value="INACTIVE">
                      Inactive
                    </option>

                    <option value="SUSPENDED">
                      Suspended
                    </option>
                  </select>

                </label>


                <label>
                  Phone

                  <input
                    name="phone"
                    value={
                      newUser.phone
                    }
                    onChange={
                      handleNewUserChange
                    }
                  />
                </label>


                <label>
                  City

                  <input
                    name="city"
                    value={
                      newUser.city
                    }
                    onChange={
                      handleNewUserChange
                    }
                  />
                </label>

              </div>


              <label className="modal-full-field">
                Address

                <input
                  name="address"
                  value={
                    newUser.address
                  }
                  onChange={
                    handleNewUserChange
                  }
                />
              </label>


              <div className="modal-form-grid">

                <label>
                  Province

                  <input
                    name="province"
                    value={
                      newUser.province
                    }
                    onChange={
                      handleNewUserChange
                    }
                  />
                </label>


                <label>
                  Postal Code

                  <input
                    name="postal_code"
                    value={
                      newUser.postal_code
                    }
                    onChange={
                      handleNewUserChange
                    }
                  />
                </label>

              </div>


              <div className="user-modal-actions">

                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() =>
                    setShowAddUser(false)
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="modal-submit"
                  disabled={
                    actionLoading
                  }
                >
                  {actionLoading
                    ? 'Creating...'
                    : 'Create User'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};


export default UsersAccounts;