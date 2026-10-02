import React from 'react';

import {
  Bell,
  Heart,
  ShoppingCart,
  Menu
} from 'lucide-react';

import {
  useNavigate
} from 'react-router-dom';


const BuyerHeader = ({
  user = null,
  notificationCount = 0,
  cartCount = 0,
  onMenuClick = () => {},
}) => {

  const navigate = useNavigate();


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

  const handleNotifications = () => {

    navigate('/buyer/notifications');

  };


  const handleFavorites = () => {

    navigate('/buyer/favorites');

  };


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
          Buyer Dashboard
        </h1>

      </div>


      {/* ====================================================
          HEADER ACTIONS
      ==================================================== */}

      <div className="buyer-header-right">


        {/* ==================================================
            NOTIFICATIONS
        ================================================== */}

        <button
          type="button"
          className="buyer-header-icon-button"
          onClick={handleNotifications}
          title="Notifications"
          aria-label="Notifications"
        >

          <Bell
            size={21}
            strokeWidth={2}
          />


          {notificationCount > 0 && (

            <span className="buyer-notification-badge">

              {notificationCount > 99
                ? '99+'
                : notificationCount}

            </span>

          )}

        </button>


        {/* ==================================================
            FAVORITES
        ================================================== */}

        <button
          type="button"
          className="buyer-header-icon-button"
          onClick={handleFavorites}
          title="Favorites"
          aria-label="Favorites"
        >

          <Heart
            size={21}
            strokeWidth={2}
          />

        </button>


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