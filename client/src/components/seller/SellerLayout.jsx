import React from 'react';

import {
  Bell,
  Heart,
  MessageSquare,
  ChevronDown
} from 'lucide-react';

import {
  Outlet,
  useLocation
} from 'react-router-dom';

import SellerSidebar from './SellerSidebar';
import SellerFooter from './SellerFooter';

import '../../styles/seller/SellerLayout.css';

const SellerLayout = () => {
  const location = useLocation();

  const storedUser = (() => {
    try {
      return JSON.parse(
        localStorage.getItem('user') || '{}'
      );
    } catch {
      return {};
    }
  })();

  const firstName =
    storedUser.first_name ||
    storedUser.firstName ||
    'Seller';

  const lastName =
    storedUser.last_name ||
    storedUser.lastName ||
    '';

  const fullName =
    `${firstName} ${lastName}`.trim();

  const profileImage =
    storedUser.profile_image ||
    storedUser.profileImage ||
    '';

  const isDashboard =
    location.pathname === '/seller-dashboard';

  return (
    <div className="seller-layout">

      {/* SIDEBAR */}

      <SellerSidebar />

      {/* RIGHT CONTENT */}

      <div className="seller-layout-content">

        {/* HEADER */}

        <header className="seller-header">

          <div className="seller-header-left">

            {isDashboard && (
              <div className="seller-welcome">

                <span className="seller-welcome-small">
                  Welcome back,
                </span>

                <strong>
                  {firstName}!
                </strong>

              </div>
            )}

          </div>

          <div className="seller-header-right">

            {/* FAVORITES */}

            <button
              type="button"
              className="seller-header-icon-button"
              aria-label="Favorites"
            >
              <Heart
                size={21}
                strokeWidth={1.8}
              />
            </button>

            {/* MESSAGES */}

            <button
              type="button"
              className="seller-header-icon-button"
              aria-label="Messages"
            >
              <MessageSquare
                size={21}
                strokeWidth={1.8}
              />
            </button>

            {/* NOTIFICATIONS */}

            <button
              type="button"
              className="seller-header-icon-button"
              aria-label="Notifications"
            >
              <Bell
                size={21}
                strokeWidth={1.8}
              />
            </button>

            {/* DIVIDER */}

            <div className="seller-header-divider" />

            {/* PROFILE */}

            <div className="seller-header-profile">

              <div className="seller-profile-image">

                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={fullName}
                  />
                ) : (
                  <div className="seller-profile-placeholder">
                    {firstName
                      .charAt(0)
                      .toUpperCase()}
                  </div>
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

              <ChevronDown
                size={17}
                className="seller-profile-chevron"
              />

            </div>

          </div>

        </header>

        {/* MAIN CONTENT */}

        <main className="seller-main-content">
          <Outlet />
        </main>

        {/* FOOTER */}

        <SellerFooter />

      </div>

    </div>
  );
};

export default SellerLayout;