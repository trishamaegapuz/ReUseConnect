import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  UserRound,
  LockKeyhole,
  Settings,
  CreditCard,
  ShieldCheck,
  Pencil,
  Camera,
  Trash2,
  CalendarDays,
  Mail,
  Phone,
  MapPin,
  UsersRound,
  Clock3,
  Heart,
  ShoppingBag,
  MessageSquare,
  CheckCircle2,
  Eye,
  X,
  Save,
  KeyRound,
  AlertCircle,
  Leaf,
  UserCircle2
} from 'lucide-react';

import {
  getBuyerProfile,
  updateBuyerProfile,
  updateBuyerProfilePhoto,
  removeBuyerProfilePhoto,
  changeBuyerPassword,
  getBuyerAccountActivity
} from '../../services/buyer/buyerAccountApi';

import '../../styles/buyer/BuyerAccount.css';

/* ============================================================
   HELPERS
============================================================ */

const getFullName = (profile) => {
  const first =
    profile?.first_name || '';

  const last =
    profile?.last_name || '';

  const name =
    `${first} ${last}`.trim();

  return name || 'Buyer';
};

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

const formatDateTime = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }
  );
};

const getLocation = (profile) => {
  return [
    profile?.city,
    profile?.province
  ]
    .filter(Boolean)
    .join(', ') || 'Not provided';
};

const normalizeStatus = (value) => {
  const status =
    String(value || '')
      .trim()
      .toLowerCase();

  if (
    [
      'active',
      'verified',
      'approved'
    ].includes(status)
  ) {
    return 'Verified';
  }

  if (
    [
      'inactive',
      'suspended',
      'blocked',
      'disabled'
    ].includes(status)
  ) {
    return 'Inactive';
  }

  return value || 'Active';
};


/* ============================================================
   ACTIVITY ICON
============================================================ */

const ActivityIcon = ({
  type
}) => {
  if (type === 'order') {
    return <ShoppingBag size={15} />;
  }

  if (type === 'favorite') {
    return <Heart size={15} />;
  }

  if (type === 'community') {
    return <MessageSquare size={15} />;
  }

  return <Clock3 size={15} />;
};


/* ============================================================
   MAIN COMPONENT
============================================================ */

const BuyerAccount = () => {
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] =
    useState('personal');

  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  const [showActivityModal, setShowActivityModal] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [activity, setActivity] =
    useState([]);

  const [activityLoading, setActivityLoading] =
    useState(false);

  const [editForm, setEditForm] =
    useState({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      postal_code: ''
    });

  const [passwordForm, setPasswordForm] =
    useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });


  /* ==========================================================
     LOAD PROFILE
  ========================================================== */

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const response =
        await getBuyerProfile();

      setProfile(
        response?.profile || null
      );

    } catch (err) {
      setError(
        err.message ||
        'Failed to load your account.'
      );
    } finally {
      setLoading(false);
    }
  };


  /* ==========================================================
     LOAD ACTIVITY
  ========================================================== */

  const loadActivity = async () => {
    try {
      setActivityLoading(true);

      const response =
        await getBuyerAccountActivity({
          page: 1,
          limit: 10
        });

      setActivity(
        response?.items ||
        response?.data ||
        []
      );

    } catch (err) {
      console.error(
        'Account activity:',
        err
      );
    } finally {
      setActivityLoading(false);
    }
  };


  useEffect(() => {
    loadProfile();
    loadActivity();
  }, []);


  /* ==========================================================
     FORM INITIALIZER
  ========================================================== */

  const openEditModal = () => {
    if (!profile) return;

    setEditForm({
      first_name:
        profile.first_name || '',
      last_name:
        profile.last_name || '',
      email:
        profile.email || '',
      phone:
        profile.phone || '',
      address:
        profile.address || '',
      city:
        profile.city || '',
      province:
        profile.province || '',
      postal_code:
        profile.postal_code || ''
    });

    setError('');
    setSuccess('');

    setShowEditModal(true);
  };


  /* ==========================================================
     SAVE PROFILE
  ========================================================== */

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response =
        await updateBuyerProfile(
          editForm
        );

      setProfile(
        response?.profile || profile
      );

      setShowEditModal(false);

      setSuccess(
        'Your personal information has been updated successfully.'
      );

    } catch (err) {
      setError(
        err.message ||
        'Failed to update profile.'
      );
    } finally {
      setSaving(false);
    }
  };


  /* ==========================================================
     PHOTO SELECT
  ========================================================== */

  const handlePhotoSelect = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      ![
        'image/jpeg',
        'image/png'
      ].includes(file.type)
    ) {
      setError(
        'Please select a JPG or PNG image.'
      );

      event.target.value = '';
      return;
    }

    if (
      file.size > 2 * 1024 * 1024
    ) {
      setError(
        'Profile photo must not exceed 2MB.'
      );

      event.target.value = '';
      return;
    }

    const reader =
      new FileReader();

    reader.onload = async () => {
      try {
        setUploadingPhoto(true);
        setError('');
        setSuccess('');

        const response =
          await updateBuyerProfilePhoto(
            reader.result
          );

        setProfile(
          response?.profile ||
          profile
        );

        setSuccess(
          'Profile photo updated successfully.'
        );

      } catch (err) {
        setError(
          err.message ||
          'Failed to update profile photo.'
        );
      } finally {
        setUploadingPhoto(false);
      }
    };

    reader.onerror = () => {
      setError(
        'Failed to read the selected image.'
      );
    };

    reader.readAsDataURL(file);

    event.target.value = '';
  };


  /* ==========================================================
     REMOVE PHOTO
  ========================================================== */

  const handleRemovePhoto = async () => {
    try {
      setUploadingPhoto(true);
      setError('');
      setSuccess('');

      const API_BASE_URL =
        import.meta.env.VITE_API_URL ||
        'http://localhost:5000';

      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('accessToken') ||
        '';

      let userId = '';

      const possibleKeys = [
        'user',
        'currentUser',
        'authUser'
      ];

      for (const key of possibleKeys) {
        const raw =
          localStorage.getItem(key);

        if (!raw) continue;

        try {
          const parsed =
            JSON.parse(raw);

          userId =
            parsed?.user_id ??
            parsed?.userId ??
            parsed?.id ??
            '';

          if (userId) break;
        } catch {
          // ignore
        }
      }

      const response =
        await fetch(
          `${API_BASE_URL}/api/buyer/account/profile/photo`,
          {
            method: 'DELETE',
            headers: {
              ...(token
                ? {
                    Authorization:
                      `Bearer ${token}`
                  }
                : {}),
              ...(userId
                ? {
                    'x-user-id':
                      String(userId)
                  }
                : {})
            }
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
          'Failed to remove photo.'
        );
      }

      setProfile(
        data?.profile ||
        profile
      );

      setSuccess(
        'Profile photo removed successfully.'
      );

    } catch (err) {
      setError(
        err.message ||
        'Failed to remove profile photo.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };


  /* ==========================================================
     CHANGE PASSWORD
  ========================================================== */

  const handlePasswordChange = async (
    event
  ) => {
    event.preventDefault();

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setError(
        'New password and confirmation password do not match.'
      );

      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await changeBuyerPassword({
        currentPassword:
          passwordForm.currentPassword,
        newPassword:
          passwordForm.newPassword
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setShowPasswordModal(false);

      setSuccess(
        'Password changed successfully.'
      );

    } catch (err) {
      setError(
        err.message ||
        'Failed to change password.'
      );
    } finally {
      setSaving(false);
    }
  };


  /* ==========================================================
     TAB CHANGE
  ========================================================== */

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };


  /* ==========================================================
     COMPUTED
  ========================================================== */

  const fullName =
    useMemo(
      () => getFullName(profile),
      [profile]
    );

  const memberSince =
    formatDate(
      profile?.created_at
    );

  const accountStatus =
    normalizeStatus(
      profile?.status
    );

  const profileInitial =
    fullName
      .charAt(0)
      .toUpperCase();


  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="buyer-account">
        <div className="account-loading">
          <div className="account-loading-spinner" />
          <span>
            Loading account information...
          </span>
        </div>
      </div>
    );
  }


  /* ==========================================================
     NO PROFILE
  ========================================================== */

  if (!profile) {
    return (
      <div className="buyer-account">
        <div className="account-error-state">
          <AlertCircle size={36} />

          <h3>
            Unable to load your account
          </h3>

          <p>
            {error ||
              'Buyer account information was not found.'}
          </p>

          <button
            type="button"
            onClick={loadProfile}
            className="account-primary-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="buyer-account">
      {/* ======================================================
          GLOBAL MESSAGE
      ====================================================== */}

      {(error || success) && (
        <div
          className={
            error
              ? 'account-message error'
              : 'account-message success'
          }
        >
          {error ? (
            <AlertCircle size={17} />
          ) : (
            <CheckCircle2 size={17} />
          )}

          <span>
            {error || success}
          </span>

          <button
            type="button"
            onClick={() => {
              setError('');
              setSuccess('');
            }}
            aria-label="Close message"
          >
            <X size={16} />
          </button>
        </div>
      )}


      {/* ======================================================
          TABS
      ====================================================== */}

      <div className="account-tabs">

        <button
          type="button"
          className={
            activeTab === 'personal'
              ? 'account-tab active'
              : 'account-tab'
          }
          onClick={() =>
            handleTabChange('personal')
          }
        >
          <UserRound size={18} />
          <span>
            Personal Information
          </span>
        </button>


        <button
          type="button"
          className={
            activeTab === 'security'
              ? 'account-tab active'
              : 'account-tab'
          }
          onClick={() =>
            handleTabChange('security')
          }
        >
          <LockKeyhole size={18} />
          <span>
            Security
          </span>
        </button>


        <button
          type="button"
          className={
            activeTab === 'preferences'
              ? 'account-tab active'
              : 'account-tab'
          }
          onClick={() =>
            handleTabChange('preferences')
          }
        >
          <Settings size={18} />
          <span>
            Preferences
          </span>
        </button>


        <button
          type="button"
          className={
            activeTab === 'payment'
              ? 'account-tab active'
              : 'account-tab'
          }
          onClick={() =>
            handleTabChange('payment')
          }
        >
          <CreditCard size={18} />
          <span>
            Payment Methods
          </span>
        </button>


        <button
          type="button"
          className={
            activeTab === 'privacy'
              ? 'account-tab active'
              : 'account-tab'
          }
          onClick={() =>
            handleTabChange('privacy')
          }
        >
          <ShieldCheck size={18} />
          <span>
            Privacy
          </span>
        </button>

      </div>


      {/* ======================================================
          PERSONAL INFORMATION
      ====================================================== */}

      {activeTab === 'personal' && (
        <>

          {/* --------------------------------------------------
              PROFILE SUMMARY
          -------------------------------------------------- */}

          <section className="account-profile-banner">

            <div className="account-profile-summary">

              <div className="account-avatar large">

                {profile.profile_image ? (
                  <img
                    src={profile.profile_image}
                    alt={fullName}
                  />
                ) : (
                  <span>
                    {profileInitial}
                  </span>
                )}

                <button
                  type="button"
                  className="account-avatar-camera"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  aria-label="Change profile photo"
                >
                  <Camera size={14} />
                </button>

              </div>


              <div className="account-profile-text">

                <h2>
                  {fullName}
                </h2>

                <p>
                  {profile.email ||
                    'No email provided'}
                </p>

                <span className="account-role-badge">
                  <UserRound size={12} />
                  Buyer
                </span>

                <div className="account-green-message">
                  <Leaf size={15} />
                  <span>
                    Together for a cleaner, greener future.
                  </span>
                </div>

              </div>

            </div>


            <div className="account-banner-art">
              <div className="account-banner-copy">
                <strong>
                  Reuse today,
                </strong>

                <span>
                  for a greener
                </span>

                <strong>
                  tomorrow
                </strong>

                <Leaf size={18} />
              </div>

              <div className="account-banner-globe">
                🌍
              </div>
            </div>

          </section>


          {/* --------------------------------------------------
              MAIN INFORMATION GRID
          -------------------------------------------------- */}

          <div className="account-content-grid">

            {/* =================================================
                PERSONAL INFORMATION CARD
            ================================================= */}

            <section className="account-card personal-card">

              <div className="account-card-header">

                <div className="account-card-title">
                  <UserRound size={20} />

                  <h3>
                    Personal Information
                  </h3>
                </div>


                <button
                  type="button"
                  className="icon-text-button"
                  onClick={openEditModal}
                  title="Edit personal information"
                >
                  <Pencil size={15} />
                  <span>
                    Edit
                  </span>
                </button>

              </div>


              <div className="personal-info-grid">

                <div className="personal-info-item">
                  <div className="info-icon">
                    <UsersRound size={17} />
                  </div>

                  <div>
                    <label>
                      Full Name
                    </label>

                    <strong>
                      {fullName}
                    </strong>
                  </div>
                </div>


                <div className="personal-info-item">
                  <div className="info-icon">
                    <CalendarDays size={17} />
                  </div>

                  <div>
                    <label>
                      Date of Birth
                    </label>

                    <strong className="not-available">
                      Not available
                    </strong>
                  </div>
                </div>


                <div className="personal-info-item">
                  <div className="info-icon">
                    <Mail size={17} />
                  </div>

                  <div>
                    <label>
                      Email Address
                    </label>

                    <strong>
                      {profile.email ||
                        'Not provided'}
                    </strong>
                  </div>
                </div>


                <div className="personal-info-item">
                  <div className="info-icon">
                    <UserCircle2 size={17} />
                  </div>

                  <div>
                    <label>
                      Gender
                    </label>

                    <strong className="not-available">
                      Not available
                    </strong>
                  </div>
                </div>


                <div className="personal-info-item">
                  <div className="info-icon">
                    <Phone size={17} />
                  </div>

                  <div>
                    <label>
                      Phone Number
                    </label>

                    <strong>
                      {profile.phone ||
                        'Not provided'}
                    </strong>
                  </div>
                </div>


                <div className="personal-info-item">
                  <div className="info-icon">
                    <MapPin size={17} />
                  </div>

                  <div>
                    <label>
                      Location
                    </label>

                    <strong>
                      {getLocation(profile)}
                    </strong>
                  </div>
                </div>

              </div>


              {/* ----------------------------------------------
                  ACCOUNT MINI STATS
              ---------------------------------------------- */}

              <div className="account-mini-stats">

                <div className="account-mini-stat">

                  <div className="mini-stat-icon">
                    <ShieldCheck size={17} />
                  </div>

                  <div>
                    <label>
                      Account Status
                    </label>

                    <strong
                      className={
                        accountStatus === 'Inactive'
                          ? 'status-danger'
                          : 'status-success'
                      }
                    >
                      <CheckCircle2 size={13} />
                      {accountStatus}
                    </strong>

                    <small>
                      Current status from your account.
                    </small>
                  </div>

                </div>


                <div className="account-mini-stat">

                  <div className="mini-stat-icon">
                    <CalendarDays size={17} />
                  </div>

                  <div>
                    <label>
                      Member Since
                    </label>

                    <strong>
                      {memberSince}
                    </strong>

                    <small>
                      Your account creation date.
                    </small>
                  </div>

                </div>


                <div className="account-mini-stat">

                  <div className="mini-stat-icon">
                    <UsersRound size={17} />
                  </div>

                  <div>
                    <label>
                      Account Type
                    </label>

                    <strong>
                      Buyer
                    </strong>

                    <small>
                      Access to buyer marketplace features.
                    </small>
                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                PROFILE PHOTO
            ================================================= */}

            <section className="account-card photo-card">

              <div className="account-card-header">
                <div className="account-card-title">
                  <Camera size={20} />

                  <h3>
                    Profile Picture
                  </h3>
                </div>
              </div>


              <div className="profile-photo-preview">

                <div className="account-avatar profile">

                  {profile.profile_image ? (
                    <img
                      src={profile.profile_image}
                      alt={fullName}
                    />
                  ) : (
                    <span>
                      {profileInitial}
                    </span>
                  )}

                  <div className="photo-camera-badge">
                    <Camera size={14} />
                  </div>

                </div>

                <p>
                  JPG, PNG (max 2MB)
                </p>

              </div>


              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handlePhotoSelect}
                hidden
              />


              <button
                type="button"
                className="photo-action primary"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={uploadingPhoto}
              >
                <Camera size={16} />

                {uploadingPhoto
                  ? 'Updating...'
                  : 'Change Photo'}
              </button>


              <button
                type="button"
                className="photo-action secondary"
                onClick={handleRemovePhoto}
                disabled={
                  uploadingPhoto ||
                  !profile.profile_image
                }
              >
                <Trash2 size={16} />
                Remove Photo
              </button>

            </section>

          </div>


          {/* =================================================
              RECENT ACTIVITY
          ================================================= */}

          <section className="account-card activity-card">

            <div className="account-card-header">

              <div className="account-card-title">
                <Clock3 size={20} />

                <h3>
                  Recent Activity
                </h3>
              </div>


              <button
                type="button"
                className="activity-view-button"
                onClick={() =>
                  setShowActivityModal(true)
                }
              >
                View All
                <Eye size={15} />
              </button>

            </div>


            {activityLoading ? (
              <div className="activity-loading">
                Loading activity...
              </div>
            ) : activity.length === 0 ? (
              <div className="activity-empty">
                <Clock3 size={24} />

                <span>
                  No recent account activity yet.
                </span>
              </div>
            ) : (
              <div className="activity-table-wrap">

                <table className="activity-table">

                  <thead>
                    <tr>
                      <th>
                        Date
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
                    {activity
                      .slice(0, 4)
                      .map(
                        (item, index) => (
                          <tr
                            key={`${item.activity_date}-${index}`}
                          >

                            <td>
                              {formatDateTime(
                                item.activity_date
                              )}
                            </td>

                            <td>
                              <div className="activity-name">

                                <span className="activity-icon">
                                  <ActivityIcon
                                    type={
                                      item.activity_type
                                    }
                                  />
                                </span>

                                <span>
                                  {item.activity_name}
                                </span>

                              </div>
                            </td>

                            <td>
                              {item.details || '—'}
                            </td>

                            <td>
                              <span className="activity-status">
                                {item.status || 'Recorded'}
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

        </>
      )}


      {/* ======================================================
          SECURITY
      ====================================================== */}

      {activeTab === 'security' && (
        <section className="account-card tab-content-card">

          <div className="account-card-header">

            <div className="account-card-title">
              <LockKeyhole size={20} />

              <h3>
                Account Security
              </h3>
            </div>

          </div>


          <div className="security-content">

            <div className="security-item">

              <div className="security-item-icon">
                <KeyRound size={20} />
              </div>

              <div className="security-item-text">
                <h4>
                  Password
                </h4>

                <p>
                  Keep your account secure by changing
                  your password regularly.
                </p>
              </div>

              <button
                type="button"
                className="icon-text-button"
                onClick={() => {
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });

                  setShowPasswordModal(true);
                }}
              >
                <Pencil size={15} />
                Change Password
              </button>

            </div>


            <div className="security-info-box">
              <ShieldCheck size={20} />

              <div>
                <strong>
                  Password security
                </strong>

                <p>
                  Use at least 8 characters and avoid
                  reusing your password on other services.
                </p>
              </div>
            </div>

          </div>

        </section>
      )}


      {/* ======================================================
          PREFERENCES
      ====================================================== */}

      {activeTab === 'preferences' && (
        <section className="account-card tab-content-card">

          <div className="account-card-header">
            <div className="account-card-title">
              <Settings size={20} />

              <h3>
                Preferences
              </h3>
            </div>
          </div>

          <div className="unsupported-tab">

            <Settings size={34} />

            <h3>
              Preference settings
            </h3>

            <p>
              The current database schema does not contain
              buyer-specific preference fields. No fake settings
              are being displayed or saved here.
            </p>

          </div>

        </section>
      )}


      {/* ======================================================
          PAYMENT
      ====================================================== */}

      {activeTab === 'payment' && (
        <section className="account-card tab-content-card">

          <div className="account-card-header">
            <div className="account-card-title">
              <CreditCard size={20} />

              <h3>
                Payment Methods
              </h3>
            </div>
          </div>

          <div className="unsupported-tab">

            <CreditCard size={34} />

            <h3>
              Payment methods
            </h3>

            <p>
              The supplied database schema contains payment
              transaction records but does not define a
              dedicated buyer payment-method table. No
              unverified payment methods are being fabricated.
            </p>

          </div>

        </section>
      )}


      {/* ======================================================
          PRIVACY
      ====================================================== */}

      {activeTab === 'privacy' && (
        <section className="account-card tab-content-card">

          <div className="account-card-header">
            <div className="account-card-title">
              <ShieldCheck size={20} />

              <h3>
                Privacy
              </h3>
            </div>
          </div>

          <div className="unsupported-tab">

            <ShieldCheck size={34} />

            <h3>
              Privacy information
            </h3>

            <p>
              Your profile information is loaded directly
              from your buyer account. Dedicated privacy
              preference fields are not present in the
              current database schema.
            </p>

          </div>

        </section>
      )}


      {/* ======================================================
          EDIT PROFILE MODAL
      ====================================================== */}

      {showEditModal && (
        <div
          className="account-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowEditModal(false);
            }
          }}
        >

          <div className="account-modal">

            <div className="account-modal-header">

              <div>
                <span className="modal-eyebrow">
                  Account
                </span>

                <h3>
                  Edit Personal Information
                </h3>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setShowEditModal(false)
                }
              >
                <X size={18} />
              </button>

            </div>


            <form
              onSubmit={handleSaveProfile}
              className="account-form"
            >

              <div className="form-two-columns">

                <label>
                  <span>
                    First Name
                  </span>

                  <input
                    type="text"
                    value={
                      editForm.first_name
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        first_name:
                          event.target.value
                      })
                    }
                    required
                  />
                </label>


                <label>
                  <span>
                    Last Name
                  </span>

                  <input
                    type="text"
                    value={
                      editForm.last_name
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        last_name:
                          event.target.value
                      })
                    }
                    required
                  />
                </label>


                <label>
                  <span>
                    Email Address
                  </span>

                  <input
                    type="email"
                    value={
                      editForm.email
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        email:
                          event.target.value
                      })
                    }
                    required
                  />
                </label>


                <label>
                  <span>
                    Phone Number
                  </span>

                  <input
                    type="tel"
                    value={
                      editForm.phone
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        phone:
                          event.target.value
                      })
                    }
                  />
                </label>


                <label className="form-full">
                  <span>
                    Address
                  </span>

                  <input
                    type="text"
                    value={
                      editForm.address
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        address:
                          event.target.value
                      })
                    }
                  />
                </label>


                <label>
                  <span>
                    City
                  </span>

                  <input
                    type="text"
                    value={
                      editForm.city
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        city:
                          event.target.value
                      })
                    }
                  />
                </label>


                <label>
                  <span>
                    Province
                  </span>

                  <input
                    type="text"
                    value={
                      editForm.province
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        province:
                          event.target.value
                      })
                    }
                  />
                </label>


                <label>
                  <span>
                    Postal Code
                  </span>

                  <input
                    type="text"
                    value={
                      editForm.postal_code
                    }
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        postal_code:
                          event.target.value
                      })
                    }
                  />
                </label>

              </div>


              <div className="account-modal-actions">

                <button
                  type="button"
                  className="modal-secondary-button"
                  onClick={() =>
                    setShowEditModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="modal-primary-button"
                  disabled={saving}
                >
                  <Save size={16} />

                  {saving
                    ? 'Saving...'
                    : 'Save Changes'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* ======================================================
          PASSWORD MODAL
      ====================================================== */}

      {showPasswordModal && (
        <div
          className="account-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowPasswordModal(false);
            }
          }}
        >

          <div className="account-modal small">

            <div className="account-modal-header">

              <div>
                <span className="modal-eyebrow">
                  Security
                </span>

                <h3>
                  Change Password
                </h3>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setShowPasswordModal(false)
                }
              >
                <X size={18} />
              </button>

            </div>


            <form
              onSubmit={handlePasswordChange}
              className="account-form"
            >

              <label>
                <span>
                  Current Password
                </span>

                <input
                  type="password"
                  value={
                    passwordForm.currentPassword
                  }
                  onChange={(event) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword:
                        event.target.value
                    })
                  }
                  required
                />
              </label>


              <label>
                <span>
                  New Password
                </span>

                <input
                  type="password"
                  minLength={8}
                  value={
                    passwordForm.newPassword
                  }
                  onChange={(event) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword:
                        event.target.value
                    })
                  }
                  required
                />
              </label>


              <label>
                <span>
                  Confirm New Password
                </span>

                <input
                  type="password"
                  minLength={8}
                  value={
                    passwordForm.confirmPassword
                  }
                  onChange={(event) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword:
                        event.target.value
                    })
                  }
                  required
                />
              </label>


              <div className="account-modal-actions">

                <button
                  type="button"
                  className="modal-secondary-button"
                  onClick={() =>
                    setShowPasswordModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="modal-primary-button"
                  disabled={saving}
                >
                  <KeyRound size={16} />

                  {saving
                    ? 'Updating...'
                    : 'Update Password'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* ======================================================
          ACTIVITY MODAL
      ====================================================== */}

      {showActivityModal && (
        <div
          className="account-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowActivityModal(false);
            }
          }}
        >

          <div className="account-modal activity-modal">

            <div className="account-modal-header">

              <div>
                <span className="modal-eyebrow">
                  Account
                </span>

                <h3>
                  Recent Activity
                </h3>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setShowActivityModal(false)
                }
              >
                <X size={18} />
              </button>

            </div>


            <div className="full-activity-list">

              {activity.length === 0 ? (
                <div className="activity-empty">
                  No activity found.
                </div>
              ) : (
                activity.map(
                  (item, index) => (
                    <div
                      className="full-activity-row"
                      key={`${item.activity_date}-${index}`}
                    >

                      <div className="full-activity-icon">
                        <ActivityIcon
                          type={
                            item.activity_type
                          }
                        />
                      </div>

                      <div className="full-activity-main">

                        <strong>
                          {item.activity_name}
                        </strong>

                        <span>
                          {item.details || '—'}
                        </span>

                      </div>

                      <div className="full-activity-date">
                        {formatDateTime(
                          item.activity_date
                        )}
                      </div>

                      <span className="activity-status">
                        {item.status ||
                          'Recorded'}
                      </span>

                    </div>
                  )
                )
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default BuyerAccount;