import React from 'react';

import {
  ShoppingCart,
  Menu
} from 'lucide-react';

import {
  useLocation,
  useNavigate
} from 'react-router-dom';


const BuyerHeader = ({
  user = null,
  notificationCount = 0,
  cartCount = 0,
  onMenuClick = () => {},
}) => {

  const navigate = useNavigate();
  const location = useLocation();


  /*
  ============================================================
  CURRENT PAGE TITLE
  ============================================================
  */

  const getPageTitle = () => {
    const path = location.pathname.replace(/\/+$/, '') || '/';

    const pageTitles = {
      '/buyer-dashboard': 'Buyer Dashboard',
      '/buyer/marketplace': 'Marketplace',
      '/buyer/transactions': 'Transactions',
      '/buyer/community': 'Community',
      '/buyer/reuse-tools': 'Reuse Tools',
      '/buyer/account': 'Account',
      '/buyer/notifications': 'Notifications',
      '/buyer/favorites': 'Favorites',
      '/buyer/cart': 'Shopping Cart',
    };

    if (pageTitles[path]) {
      return pageTitles[path];
    }

    // Handle nested pages such as marketplace product details
    // and transaction detail pages without leaving the title static.
    if (path.startsWith('/buyer/marketplace/')) {
      return 'Marketplace';
    }

    if (path.startsWith('/buyer/transactions/')) {
      return 'Transactions';
    }

    if (path.startsWith('/buyer/community/')) {
      return 'Community';
    }

    if (path.startsWith('/buyer/reuse-tools/')) {
      return 'Reuse Tools';
    }

    if (path.startsWith('/buyer/account/')) {
      return 'Account';
    }

    return 'Buyer Dashboard';
  };


  /*
  ============================================================
  BUYER INFORMATION
  ============================================================
  */

  const firstName =
    user?.first_name ||
    user?.firstName ||
    '';

  const lastName =
    user?.last_name ||
    user?.lastName ||
    '';


  const buyerName =
    `${firstName} ${lastName}`.trim() ||
    user?.name ||
    'Buyer';


  const profileImage =
    user?.profile_image ||
    user?.profileImage ||
    '';


  /*
  ============================================================
  NAVIGATION
  ============================================================
  */

  const handleCart = () => {

    navigate('/buyer/cart');

  };


  const handleAccount = () => {

    navigate('/buyer/account');

  };


  /*
  ============================================================
  HEADER
  ============================================================
  */

  return (

    <header className="buyer-header">


      {/* ====================================================
          LEFT SIDE
      ==================================================== */}

      <div className="buyer-header-left">


        {/* MOBILE MENU */}

        <button
          type="button"
          className="buyer-header-menu-button"
          onClick={onMenuClick}
          aria-label="Open menu"
        >

          <Menu
            size={22}
            strokeWidth={2}
          />

        </button>


        {/* MOBILE BRAND */}

        <span className="buyer-mobile-brand">
          ReUse Connect
        </span>


        {/* DESKTOP PAGE TITLE */}

        <h1 className="buyer-page-title">
          {getPageTitle()}
        </h1>

      </div>


      {/* ====================================================
          HEADER ACTIONS
      ==================================================== */}

      <div className="buyer-header-right">


        {/* ==================================================
            CART
        ================================================== */}

        <button
          type="button"
          className="buyer-header-icon-button"
          onClick={handleCart}
          title="Shopping Cart"
          aria-label="Shopping Cart"
        >

          <ShoppingCart
            size={21}
            strokeWidth={2}
          />


          {cartCount > 0 && (

            <span className="buyer-cart-badge">

              {cartCount > 99
                ? '99+'
                : cartCount}

            </span>

          )}

        </button>


        {/* ==================================================
            DIVIDER
        ================================================== */}

        <div className="buyer-header-divider"></div>


        {/* ==================================================
            BUYER PROFILE
        ================================================== */}

        <button
          type="button"
          className="buyer-profile-button"
          onClick={handleAccount}
          title="Account"
          aria-label="Account"
        >

          <div className="buyer-profile-avatar">

            {profileImage ? (

              <img
                src={profileImage}
                alt="Buyer profile"
                className="buyer-profile-image"
              />

            ) : (

              <span>
                {buyerName
                  .charAt(0)
                  .toUpperCase()}
              </span>

            )}

          </div>


          <div className="buyer-profile-info">

            <span className="buyer-profile-name">
              {buyerName}
            </span>

            <span className="buyer-profile-role">
              Buyer
            </span>

          </div>

        </button>

      </div>

    </header>

  );

};


export default BuyerHeader;