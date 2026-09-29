import React, {
  useEffect,
  useState
} from 'react';

import {
  Bell,
  Check,
  ChevronRight,
  Globe,
  KeyRound,
  Lock,
  MapPin,
  Moon,
  Save,
  Settings,
  Shield,
  Tag,
  User,
  X
} from 'lucide-react';

import {
  changeSellerPassword,
  getSellerAccount,
  getSellerLoginActivity,
  updateSellerPreferences,
  updateSellerProfile
} from '../../services/seller/sellerAccountService';

import '../../styles/seller/SellerAccount.css';


// ============================================================
// HELPERS
// ============================================================

const getInitials = (
  firstName = '',
  lastName = ''
) => {

  const first =
    String(firstName)
      .trim()
      .charAt(0);

  const last =
    String(lastName)
      .trim()
      .charAt(0);

  return (
    `${first}${last}` ||
    'U'
  ).toUpperCase();

};


const getProfileImage = (
  image
) => {

  if (!image) {
    return '';
  }

  return String(image);

};


// ============================================================
// COMPONENT
// ============================================================

export default function SellerAccount() {

  const [
    activeTab,
    setActiveTab
  ] = useState('personal');


  const [
    loading,
    setLoading
  ] = useState(true);


  const [
    saving,
    setSaving
  ] = useState(false);


  const [
    error,
    setError
  ] = useState('');


  const [
    success,
    setSuccess
  ] = useState('');


  const [
    account,
    setAccount
  ] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    profile_image: ''
  });


  const [
    preferences,
    setPreferences
  ] = useState({
    notifications_enabled: true,
    two_factor_enabled: false,
    dark_mode: false,
    language: 'English',
    display_settings: 'Standard'
  });


  const [
    passwordModal,
    setPasswordModal
  ] = useState(false);


  const [
    loginModal,
    setLoginModal
  ] = useState(false);


  const [
    notificationModal,
    setNotificationModal
  ] = useState(false);


  const [
    languageModal,
    setLanguageModal
  ] = useState(false);


  const [
    displayModal,
    setDisplayModal
  ] = useState(false);


  const [
    photoLoading,
    setPhotoLoading
  ] = useState(false);


  const [
    passwordForm,
    setPasswordForm
  ] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });


  const [
    loginActivities,
    setLoginActivities
  ] = useState([]);


  // ==========================================================
  // LOAD ACCOUNT
  // ==========================================================

  const loadAccount = async () => {

    try {

      setLoading(true);
      setError('');

      const response =
        await getSellerAccount();

      setAccount(
        response?.account || {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          location: '',
          bio: '',
          profile_image: ''
        }
      );


      setPreferences(
        response?.preferences || {
          notifications_enabled: true,
          two_factor_enabled: false,
          dark_mode: false,
          language: 'English',
          display_settings: 'Standard'
        }
      );

    } catch (err) {

      setError(
        err?.message ||
        'Unable to load your account.'
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadAccount();

  }, []);


  // ==========================================================
  // FORM CHANGE
  // ==========================================================

  const handleAccountChange = (
    field,
    value
  ) => {

    setAccount(
      previous => ({
        ...previous,
        [field]: value
      })
    );

  };


  // ==========================================================
  // SAVE PROFILE
  // ==========================================================

  const handleSaveProfile =
    async () => {

      try {

        setSaving(true);
        setError('');
        setSuccess('');

        await updateSellerProfile({
          firstName:
            account.first_name,

          lastName:
            account.last_name,

          email:
            account.email,

          phone:
            account.phone,

          location:
            account.location,

          bio:
            account.bio,

          profileImage:
            account.profile_image
        });


        setSuccess(
          'Your profile has been saved successfully.'
        );

        await loadAccount();

      } catch (err) {

        setError(
          err?.message ||
          'Unable to save your profile.'
        );

      } finally {

        setSaving(false);

      }

    };


  // ==========================================================
  // PROFILE PHOTO
  // ==========================================================

  const handlePhotoChange =
    (event) => {

      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }


      if (
        ![
          'image/jpeg',
          'image/png',
          'image/webp'
        ].includes(file.type)
      ) {

        setError(
          'Please select a JPG, PNG, or WEBP image.'
        );

        return;
      }


      if (
        file.size >
        2 * 1024 * 1024
      ) {

        setError(
          'Profile photo must be 2MB or smaller.'
        );

        return;
      }


      setPhotoLoading(true);
      setError('');


      const reader =
        new FileReader();


      reader.onload = () => {

        setAccount(
          previous => ({
            ...previous,
            profile_image:
              reader.result
          })
        );

        setPhotoLoading(false);

      };


      reader.onerror = () => {

        setError(
          'Unable to read the selected image.'
        );

        setPhotoLoading(false);

      };


      reader.readAsDataURL(file);

    };


  // ==========================================================
  // CHANGE PASSWORD
  // ==========================================================

  const handleChangePassword =
    async () => {

      if (
        !passwordForm.currentPassword ||
        !passwordForm.newPassword
      ) {

        setError(
          'Please complete all password fields.'
        );

        return;
      }


      if (
        passwordForm.newPassword.length < 8
      ) {

        setError(
          'New password must be at least 8 characters.'
        );

        return;
      }


      if (
        passwordForm.newPassword !==
        passwordForm.confirmPassword
      ) {

        setError(
          'New passwords do not match.'
        );

        return;
      }


      try {

        setSaving(true);
        setError('');

        await changeSellerPassword({
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


        setPasswordModal(false);

        setSuccess(
          'Your password has been changed successfully.'
        );

      } catch (err) {

        setError(
          err?.message ||
          'Unable to change your password.'
        );

      } finally {

        setSaving(false);

      }

    };


  // ==========================================================
  // UPDATE PREFERENCES
  // ==========================================================

  const savePreferences =
    async (changes) => {

      try {

        setSaving(true);
        setError('');
        setSuccess('');

        const nextPreferences = {
          ...preferences,
          ...changes
        };


        await updateSellerPreferences({
          notificationsEnabled:
            nextPreferences.notifications_enabled,

          twoFactorEnabled:
            nextPreferences.two_factor_enabled,

          darkMode:
            nextPreferences.dark_mode,

          language:
            nextPreferences.language,

          displaySettings:
            nextPreferences.display_settings
        });


        setPreferences(
          nextPreferences
        );


        setSuccess(
          'Your preferences have been updated.'
        );

      } catch (err) {

        setError(
          err?.message ||
          'Unable to update your preferences.'
        );

      } finally {

        setSaving(false);

      }

    };


  // ==========================================================
  // LOGIN ACTIVITY
  // ==========================================================

  const openLoginActivity =
    async () => {

      try {

        setError('');

        const response =
          await getSellerLoginActivity();

        setLoginActivities(
          response?.activities || []
        );

        setLoginModal(true);

      } catch (err) {

        setLoginActivities([]);

        setLoginModal(true);

      }

    };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <main className="seller-account">

        <div className="account-loading">
          Loading your account...
        </div>

      </main>
    );

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="seller-account">

      <div className="seller-account-content">


        {/* ====================================================
            ALERTS
        ==================================================== */}

        {error && (
          <div className="account-alert error">

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError('')
              }
            >
              <X size={17} />
            </button>

          </div>
        )}


        {success && (
          <div className="account-alert success">

            <Check size={17} />

            <span>
              {success}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccess('')
              }
            >
              <X size={17} />
            </button>

          </div>
        )}


        {/* ====================================================
            TABS
        ==================================================== */}

        <div className="account-tabs">

          <button
            type="button"
            className={
              activeTab === 'personal'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('personal')
            }
          >
            <User size={19} />

            <span>
              Personal Information
            </span>

          </button>


          <button
            type="button"
            className={
              activeTab === 'security'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('security')
            }
          >
            <Shield size={19} />

            <span>
              Security
            </span>

          </button>


          <button
            type="button"
            className={
              activeTab === 'preferences'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('preferences')
            }
          >
            <Settings size={19} />

            <span>
              Preferences
            </span>

          </button>

        </div>


        {/* ====================================================
            PERSONAL INFORMATION
        ==================================================== */}

        {activeTab === 'personal' && (

          <section className="account-main-grid">

            <article className="account-card personal-card">

              <div className="account-card-heading">

                <div className="account-heading-icon purple">
                  <User size={24} />
                </div>

                <div>

                  <h2>
                    Personal Information
                  </h2>

                  <p>
                    Update your profile details and contact information.
                  </p>

                </div>

              </div>


              <div className="personal-form-layout">


                {/* PROFILE PHOTO */}

                <div className="profile-photo-section">

                  <div className="profile-photo">

                    {getProfileImage(
                      account.profile_image
                    ) ? (

                      <img
                        src={account.profile_image}
                        alt="Seller profile"
                      />

                    ) : (

                      <span>
                        {getInitials(
                          account.first_name,
                          account.last_name
                        )}
                      </span>

                    )}

                  </div>


                  <label
                    className="change-photo-button"
                  >

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handlePhotoChange
                      }
                      hidden
                    />

                    {photoLoading
                      ? 'Loading...'
                      : 'Change Photo'}

                  </label>

                </div>


                {/* FORM */}

                <div className="profile-fields">


                  <label>
                    Full Name

                    <input
                      type="text"
                      value={
                        `${account.first_name || ''} ${account.last_name || ''}`.trim()
                      }
                      onChange={(event) => {

                        const value =
                          event.target.value;

                        const parts =
                          value
                            .trim()
                            .split(/\s+/);

                        const firstName =
                          parts.shift() || '';

                        const lastName =
                          parts.join(' ');

                        setAccount(
                          previous => ({
                            ...previous,
                            first_name:
                              firstName,
                            last_name:
                              lastName
                          })
                        );

                      }}
                    />

                  </label>


                  <label>
                    Email Address

                    <input
                      type="email"
                      value={
                        account.email || ''
                      }
                      onChange={(event) =>
                        handleAccountChange(
                          'email',
                          event.target.value
                        )
                      }
                    />

                  </label>


                  <label>
                    Phone Number

                    <input
                      type="text"
                      value={
                        account.phone || ''
                      }
                      onChange={(event) =>
                        handleAccountChange(
                          'phone',
                          event.target.value
                        )
                      }
                    />

                  </label>


                  <label>
                    Location

                    <div className="input-with-icon">

                      <MapPin size={17} />

                      <input
                        type="text"
                        value={
                          account.location || ''
                        }
                        onChange={(event) =>
                          handleAccountChange(
                            'location',
                            event.target.value
                          )
                        }
                      />

                    </div>

                  </label>


                  <label>
                    Bio

                    <textarea
                      value={
                        account.bio || ''
                      }
                      maxLength={200}
                      onChange={(event) =>
                        handleAccountChange(
                          'bio',
                          event.target.value
                        )
                      }
                    />

                    <small>
                      {(account.bio || '').length}/200
                    </small>

                  </label>


                  <div className="profile-note">

                    <LeafIcon />

                    <span>
                      Your profile helps buyers trust you and supports a safer marketplace for everyone.
                    </span>

                  </div>


                  <button
                    type="button"
                    className="save-profile-button"
                    onClick={
                      handleSaveProfile
                    }
                    disabled={saving}
                  >

                    <Save size={17} />

                    {saving
                      ? 'Saving...'
                      : 'Save Changes'}

                  </button>

                </div>

              </div>

            </article>


            {/* RIGHT COLUMN */}

            <div className="account-side-column">


              {/* SECURITY */}

              <article className="account-card">

                <div className="account-card-heading">

                  <div className="account-heading-icon purple">
                    <Shield size={24} />
                  </div>

                  <div>

                    <h2>
                      Security
                    </h2>

                    <p>
                      Keep your account safe and secure.
                    </p>

                  </div>

                </div>


                <div className="settings-list">

                  <button
                    type="button"
                    className="settings-row"
                    onClick={() =>
                      setPasswordModal(true)
                    }
                  >

                    <span className="settings-icon">
                      <Lock size={20} />
                    </span>

                    <span className="settings-text">

                      <strong>
                        Change Password
                      </strong>

                      <small>
                        Update your password regularly.
                      </small>

                    </span>

                    <ChevronRight size={18} />

                  </button>


                  <button
                    type="button"
                    className="settings-row"
                    onClick={() =>
                      savePreferences({
                        two_factor_enabled:
                          !preferences.two_factor_enabled
                      })
                    }
                  >

                    <span className="settings-icon">
                      <KeyRound size={20} />
                    </span>

                    <span className="settings-text">

                      <strong>
                        Two-Factor Authentication
                      </strong>

                      <small>
                        Add an extra layer of security to your account.
                      </small>

                    </span>

                    <span
                      className={
                        preferences.two_factor_enabled
                          ? 'switch active'
                          : 'switch'
                      }
                    >
                      <span />
                    </span>

                  </button>


                  <button
                    type="button"
                    className="settings-row"
                    onClick={
                      openLoginActivity
                    }
                  >

                    <span className="settings-icon">
                      <Shield size={20} />
                    </span>

                    <span className="settings-text">

                      <strong>
                        Login Activity
                      </strong>

                      <small>
                        View your recent login activity.
                      </small>

                    </span>

                    <ChevronRight size={18} />

                  </button>

                </div>

              </article>


              {/* PREFERENCES */}

              <article className="account-card">

                <div className="account-card-heading">

                  <div className="account-heading-icon purple">
                    <Settings size={24} />
                  </div>

                  <div>

                    <h2>
                      Preferences
                    </h2>

                    <p>
                      Customize your experience on ReUse Connect.
                    </p>

                  </div>

                </div>


                <div className="settings-list">

                  <button
                    type="button"
                    className="settings-row"
                    onClick={() =>
                      setNotificationModal(true)
                    }
                  >

                    <span className="settings-icon">
                      <Bell size={20} />
                    </span>

                    <span className="settings-text">

                      <strong>
                        Notifications
                      </strong>

                      <small>
                        Manage your notification settings.
                      </small>

                    </span>

                    <ChevronRight size={18} />

                  </button>


                  <button
                    type="button"
                    className="settings-row"
                    onClick={() =>
                      setLanguageModal(true)
                    }
                  >

                    <span className="settings-icon">
                      <Globe size={20} />
                    </span>

                    <span className="settings-text">

                      <strong>
                        Language
                      </strong>

                      <small>
                        {preferences.language || 'English'}
                      </small>

                    </span>

                    <ChevronRight size={18} />

                  </button>


                  <button
                    type="button"
                    className="settings-row"
                    onClick={() =>
                      savePreferences({
                        dark_mode:
                          !preferences.dark_mode
                      })
                    }
                  >

                    <span className="settings-icon">
                      <Moon size={20} />
                    </span>

                    <span className="settings-text">

                      <strong>
                        Dark Mode
                      </strong>

                      <small>
                        Switch between light and dark theme.
                      </small>

                    </span>

                    <span
                      className={
                        preferences.dark_mode
                          ? 'switch active'
                          : 'switch'
                      }
                    >
                      <span />
                    </span>

                  </button>


                  <button
                    type="button"
                    className="settings-row"
                    onClick={() =>
                      setDisplayModal(true)
                    }
                  >

                    <span className="settings-icon">
                      <Tag size={20} />
                    </span>

                    <span className="settings-text">

                      <strong>
                        Display Settings
                      </strong>

                      <small>
                        {preferences.display_settings || 'Standard'}
                      </small>

                    </span>

                    <ChevronRight size={18} />

                  </button>

                </div>

              </article>

            </div>

          </section>

        )}


        {/* ====================================================
            SECURITY TAB
        ==================================================== */}

        {activeTab === 'security' && (

          <section className="single-account-card">

            <article className="account-card security-tab-card">

              <div className="account-card-heading">

                <div className="account-heading-icon purple">
                  <Shield size={24} />
                </div>

                <div>

                  <h2>
                    Security
                  </h2>

                  <p>
                    Manage your account security and login protection.
                  </p>

                </div>

              </div>


              <div className="large-settings-list">

                <button
                  type="button"
                  onClick={() =>
                    setPasswordModal(true)
                  }
                >

                  <span className="large-setting-icon">
                    <Lock size={23} />
                  </span>

                  <span>

                    <strong>
                      Change Password
                    </strong>

                    <small>
                      Keep your password strong and updated.
                    </small>

                  </span>

                  <ChevronRight />

                </button>


                <button
                  type="button"
                  onClick={() =>
                    savePreferences({
                      two_factor_enabled:
                        !preferences.two_factor_enabled
                    })
                  }
                >

                  <span className="large-setting-icon">
                    <KeyRound size={23} />
                  </span>

                  <span>

                    <strong>
                      Two-Factor Authentication
                    </strong>

                    <small>
                      Add an extra security layer to your account.
                    </small>

                  </span>

                  <span
                    className={
                      preferences.two_factor_enabled
                        ? 'switch active'
                        : 'switch'
                    }
                  >
                    <span />
                  </span>

                </button>


                <button
                  type="button"
                  onClick={
                    openLoginActivity
                  }
                >

                  <span className="large-setting-icon">
                    <Shield size={23} />
                  </span>

                  <span>

                    <strong>
                      Login Activity
                    </strong>

                    <small>
                      Review recent account activity.
                    </small>

                  </span>

                  <ChevronRight />

                </button>

              </div>

            </article>

          </section>

        )}


        {/* ====================================================
            PREFERENCES TAB
        ==================================================== */}

        {activeTab === 'preferences' && (

          <section className="single-account-card">

            <article className="account-card security-tab-card">

              <div className="account-card-heading">

                <div className="account-heading-icon purple">
                  <Settings size={24} />
                </div>

                <div>

                  <h2>
                    Preferences
                  </h2>

                  <p>
                    Customize how ReUse Connect works for you.
                  </p>

                </div>

              </div>


              <div className="large-settings-list">

                <button
                  type="button"
                  onClick={() =>
                    setNotificationModal(true)
                  }
                >

                  <span className="large-setting-icon">
                    <Bell size={23} />
                  </span>

                  <span>

                    <strong>
                      Notifications
                    </strong>

                    <small>
                      Manage your notification settings.
                    </small>

                  </span>

                  <ChevronRight />

                </button>


                <button
                  type="button"
                  onClick={() =>
                    setLanguageModal(true)
                  }
                >

                  <span className="large-setting-icon">
                    <Globe size={23} />
                  </span>

                  <span>

                    <strong>
                      Language
                    </strong>

                    <small>
                      {preferences.language || 'English'}
                    </small>

                  </span>

                  <ChevronRight />

                </button>


                <button
                  type="button"
                  onClick={() =>
                    savePreferences({
                      dark_mode:
                        !preferences.dark_mode
                    })
                  }
                >

                  <span className="large-setting-icon">
                    <Moon size={23} />
                  </span>

                  <span>

                    <strong>
                      Dark Mode
                    </strong>

                    <small>
                      Switch between light and dark theme.
                    </small>

                  </span>

                  <span
                    className={
                      preferences.dark_mode
                        ? 'switch active'
                        : 'switch'
                    }
                  >
                    <span />
                  </span>

                </button>


                <button
                  type="button"
                  onClick={() =>
                    setDisplayModal(true)
                  }
                >

                  <span className="large-setting-icon">
                    <Tag size={23} />
                  </span>

                  <span>

                    <strong>
                      Display Settings
                    </strong>

                    <small>
                      {preferences.display_settings || 'Standard'}
                    </small>

                  </span>

                  <ChevronRight />

                </button>

              </div>

            </article>

          </section>

        )}


      </div>


      {/* ======================================================
          CHANGE PASSWORD MODAL
      ====================================================== */}

      {passwordModal && (

        <div className="account-modal-overlay">

          <div className="account-modal">

            <div className="modal-header">

              <div>
                <h3>
                  Change Password
                </h3>

                <p>
                  Update your account password.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPasswordModal(false)
                }
              >
                <X size={20} />
              </button>

            </div>


            <div className="modal-body">

              <label>
                Current Password

                <input
                  type="password"
                  value={
                    passwordForm.currentPassword
                  }
                  onChange={(event) =>
                    setPasswordForm(
                      previous => ({
                        ...previous,
                        currentPassword:
                          event.target.value
                      })
                    )
                  }
                />

              </label>


              <label>
                New Password

                <input
                  type="password"
                  value={
                    passwordForm.newPassword
                  }
                  onChange={(event) =>
                    setPasswordForm(
                      previous => ({
                        ...previous,
                        newPassword:
                          event.target.value
                      })
                    )
                  }
                />

              </label>


              <label>
                Confirm New Password

                <input
                  type="password"
                  value={
                    passwordForm.confirmPassword
                  }
                  onChange={(event) =>
                    setPasswordForm(
                      previous => ({
                        ...previous,
                        confirmPassword:
                          event.target.value
                      })
                    )
                  }
                />

              </label>

            </div>


            <div className="modal-footer">

              <button
                type="button"
                className="modal-cancel"
                onClick={() =>
                  setPasswordModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-primary"
                onClick={
                  handleChangePassword
                }
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Change Password'}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          LOGIN ACTIVITY MODAL
      ====================================================== */}

      {loginModal && (

        <div className="account-modal-overlay">

          <div className="account-modal wide">

            <div className="modal-header">

              <div>
                <h3>
                  Login Activity
                </h3>

                <p>
                  Recent account login activity.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setLoginModal(false)
                }
              >
                <X size={20} />
              </button>

            </div>


            <div className="login-activity-list">

              {loginActivities.length === 0 ? (

                <div className="modal-empty">
                  No recent login activity is available.
                </div>

              ) : (

                loginActivities.map(
                  (
                    activity,
                    index
                  ) => (

                    <div
                      className="login-activity-row"
                      key={
                        activity.id ||
                        activity.activity_id ||
                        index
                      }
                    >

                      <Shield size={20} />

                      <div>

                        <strong>
                          {activity.action ||
                            activity.event ||
                            'Account login'}
                        </strong>

                        <small>
                          {activity.created_at
                            ? new Date(
                                activity.created_at
                              ).toLocaleString()
                            : 'Recent activity'}
                        </small>

                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          NOTIFICATION MODAL
      ====================================================== */}

      {notificationModal && (

        <div className="account-modal-overlay">

          <div className="account-modal small">

            <div className="modal-header">

              <div>
                <h3>
                  Notifications
                </h3>

                <p>
                  Manage your notification settings.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNotificationModal(false)
                }
              >
                <X size={20} />
              </button>

            </div>


            <div className="modal-option">

              <div>

                <strong>
                  Enable Notifications
                </strong>

                <small>
                  Receive important marketplace updates.
                </small>

              </div>

              <button
                type="button"
                className={
                  preferences.notifications_enabled
                    ? 'switch active'
                    : 'switch'
                }
                onClick={() =>
                  savePreferences({
                    notifications_enabled:
                      !preferences.notifications_enabled
                  })
                }
              >
                <span />
              </button>

            </div>


            <div className="modal-footer">

              <button
                type="button"
                className="modal-primary"
                onClick={() =>
                  setNotificationModal(false)
                }
              >
                Done
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          LANGUAGE MODAL
      ====================================================== */}

      {languageModal && (

        <div className="account-modal-overlay">

          <div className="account-modal small">

            <div className="modal-header">

              <div>
                <h3>
                  Language
                </h3>

                <p>
                  Choose your preferred language.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setLanguageModal(false)
                }
              >
                <X size={20} />
              </button>

            </div>


            <div className="language-options">

              {[
                'English',
                'Filipino'
              ].map(
                language => (

                  <button
                    type="button"
                    key={language}
                    className={
                      preferences.language ===
                      language
                        ? 'selected'
                        : ''
                    }
                    onClick={async () => {

                      await savePreferences({
                        language
                      });

                      setLanguageModal(false);

                    }}
                  >

                    <Globe size={18} />

                    <span>
                      {language}
                    </span>

                    {preferences.language ===
                      language && (
                        <Check size={18} />
                    )}

                  </button>

                )
              )}

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          DISPLAY MODAL
      ====================================================== */}

      {displayModal && (

        <div className="account-modal-overlay">

          <div className="account-modal small">

            <div className="modal-header">

              <div>
                <h3>
                  Display Settings
                </h3>

                <p>
                  Adjust how items are shown to you.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDisplayModal(false)
                }
              >
                <X size={20} />
              </button>

            </div>


            <div className="language-options">

              {[
                'Standard',
                'Compact'
              ].map(
                setting => (

                  <button
                    type="button"
                    key={setting}
                    className={
                      preferences.display_settings ===
                      setting
                        ? 'selected'
                        : ''
                    }
                    onClick={async () => {

                      await savePreferences({
                        display_settings:
                          setting
                      });

                      setDisplayModal(false);

                    }}
                  >

                    <Tag size={18} />

                    <span>
                      {setting}
                    </span>

                    {preferences.display_settings ===
                      setting && (
                        <Check size={18} />
                    )}

                  </button>

                )
              )}

            </div>

          </div>

        </div>

      )}

    </main>
  );
}


// ============================================================
// SMALL LEAF ICON
// ============================================================

function LeafIcon() {

  return (
    <span className="leaf-note-icon">
      ✓
    </span>
  );

}