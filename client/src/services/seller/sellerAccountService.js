import {
  authenticatedRequest
} from '../api';


// ============================================================
// GET ACCOUNT DATA
// ============================================================

export const getSellerAccount =
  async () => {

    return authenticatedRequest(
      '/seller/account',
      {
        method: 'GET'
      }
    );

  };


// ============================================================
// UPDATE PROFILE
// ============================================================

export const updateSellerProfile =
  async ({
    firstName,
    lastName,
    email,
    phone,
    location,
    bio,
    profileImage
  }) => {

    return authenticatedRequest(
      '/seller/account/profile',
      {
        method: 'PUT',

        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          location,
          bio,
          profileImage
        })
      }
    );

  };


// ============================================================
// CHANGE PASSWORD
// ============================================================

export const changeSellerPassword =
  async ({
    currentPassword,
    newPassword
  }) => {

    return authenticatedRequest(
      '/seller/account/password',
      {
        method: 'PUT',

        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      }
    );

  };


// ============================================================
// UPDATE PREFERENCES
// ============================================================

export const updateSellerPreferences =
  async ({
    notificationsEnabled,
    twoFactorEnabled,
    darkMode,
    language,
    displaySettings
  }) => {

    return authenticatedRequest(
      '/seller/account/preferences',
      {
        method: 'PUT',

        body: JSON.stringify({
          notificationsEnabled,
          twoFactorEnabled,
          darkMode,
          language,
          displaySettings
        })
      }
    );

  };


// ============================================================
// LOGIN ACTIVITY
// ============================================================

export const getSellerLoginActivity =
  async () => {

    return authenticatedRequest(
      '/seller/account/login-activity',
      {
        method: 'GET'
      }
    );

  };


export default {
  getSellerAccount,
  updateSellerProfile,
  changeSellerPassword,
  updateSellerPreferences,
  getSellerLoginActivity
};