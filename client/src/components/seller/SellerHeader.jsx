import React from 'react';

import {
  Bell,
  ChevronDown,
  UserCircle
} from 'lucide-react';

import {
  useLocation
} from 'react-router-dom';


// ============================================================
// PAGE TITLES
// ============================================================

const pageTitles = {
  '/seller-dashboard': 'Dashboard',

  '/seller/products': 'My Products',

  '/seller/orders': 'Orders',

  '/seller/sales': 'Sales',

  '/seller/inventory': 'Inventory',

  '/seller/messages': 'Messages',

  '/seller/reviews': 'Reviews',

  '/seller/profile': 'My Profile',

  '/seller/settings': 'Settings'
};


// ============================================================
// COMPONENT
// ============================================================

const SellerHeader = () => {

  const location = useLocation();


  // ==========================================================
  // CURRENT PAGE TITLE
  // ==========================================================

  const getPageTitle = () => {

    const currentPath =
      location.pathname;

    if (
      pageTitles[currentPath]
    ) {
      return pageTitles[currentPath];
    }


    // --------------------------------------------------------
    // SUPPORT FOR CHILD ROUTES
    // --------------------------------------------------------

    if (
      currentPath.startsWith(
        '/seller/products/'
      )
    ) {
      return 'My Products';
    }

    if (
      currentPath.startsWith(
        '/seller/orders/'
      )
    ) {
      return 'Orders';
    }

    if (
      currentPath.startsWith(
        '/seller/sales/'
      )
    ) {
      return 'Sales';
    }

    if (
      currentPath.startsWith(
        '/seller/inventory/'
      )
    ) {
      return 'Inventory';
    }

    if (
      currentPath.startsWith(
        '/seller/messages/'
      )
    ) {
      return 'Messages';
    }

    return 'Seller Dashboard';
  };


  // ==========================================================
  // USER INFORMATION
  // ==========================================================

  let user = null;

  try {

    const storedUser =
      localStorage.getItem('user');

    if (storedUser) {
      user = JSON.parse(
        storedUser
      );
    }

  } catch (error) {

    console.error(
      'Unable to read seller user:',
      error
    );

  }


  const firstName =
    user?.first_name ||
    user?.firstName ||
    'Seller';

  const lastName =
    user?.last_name ||
    user?.lastName ||
    '';

  const fullName =
    `${firstName} ${lastName}`.trim();


  const initials =
    `${firstName?.charAt(0) || 'S'}${
      lastName?.charAt(0) || ''
    }`.toUpperCase();


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {

    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'user'
    );

    localStorage.removeItem(
      'auth'
    );

    localStorage.removeItem(
      'authData'
    );

    sessionStorage.clear();

    window.location.href =
      '/login';
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <header className="seller-header">

      <div className="seller-header-left">

        <h1 className="seller-header-title">
          {getPageTitle()}
        </h1>

      </div>


      <div className="seller-header-right">

        {/* ==================================================
            NOTIFICATION
        ================================================== */}

        <button
          type="button"
          className="seller-header-icon-button"
          aria-label="Notifications"
          title="Notifications"
        >

          <Bell
            size={20}
            strokeWidth={2}
          />

          <span className="seller-notification-dot" />

        </button>


        {/* ==================================================
            PROFILE
        ================================================== */}

        <div className="seller-profile-wrapper">

          <div className="seller-profile-avatar">

            {user?.profile_image ? (

              <img
                src={
                  user.profile_image
                }
                alt={fullName}
              />

            ) : (

              <span>
                {initials}
              </span>

            )}

          </div>


          <div className="seller-profile-info">

            <strong>
              {fullName}
            </strong>

            <span>
              Seller
            </span>

          </div>


          <button
            type="button"
            className="seller-profile-menu"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
          >

            <ChevronDown
              size={17}
            />

          </button>

        </div>

      </div>

    </header>

  );
};


export default SellerHeader;