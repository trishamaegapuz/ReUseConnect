import React, {
  useEffect,
  useState
} from 'react';

import {
  Menu
} from 'lucide-react';

import {
  Outlet,
  useLocation,
  useNavigate
} from 'react-router-dom';

import SellerSidebar from './SellerSidebar';
import SellerFooter from './SellerFooter';

import '../../styles/seller/SellerLayout.css';


const SellerLayout = () => {

  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keep the header profile in sync with Account updates.
  const [storedUser, setStoredUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const syncUser = () => {
      try {
        setStoredUser(
          JSON.parse(localStorage.getItem('user') || '{}')
        );
      } catch {
        setStoredUser({});
      }
    };

    // Updates dispatched within this tab.
    window.addEventListener('reuseconnect:user-updated', syncUser);

    // Updates made by another tab/window.
    window.addEventListener('storage', syncUser);

    // Initial sync in case account info was changed before layout mounted.
    syncUser();

    return () => {
      window.removeEventListener('reuseconnect:user-updated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);


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


  // ==========================================================
  // CLOSE MOBILE SIDEBAR WHEN ROUTE CHANGES
  // ==========================================================

  useEffect(() => {

    setSidebarOpen(false);

  }, [location.pathname]);


  // ==========================================================
  // PREVENT BODY SCROLL WHEN MOBILE SIDEBAR IS OPEN
  // ==========================================================

  useEffect(() => {

    if (sidebarOpen) {

      document.body.classList.add(
        'seller-sidebar-open'
      );

    } else {

      document.body.classList.remove(
        'seller-sidebar-open'
      );

    }

    return () => {

      document.body.classList.remove(
        'seller-sidebar-open'
      );

    };

  }, [sidebarOpen]);


  return (

    <div className="seller-layout">

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {sidebarOpen && (

        <div
          className="seller-sidebar-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
          aria-hidden="true"
        />

      )}


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <SellerSidebar
        isOpen={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />


      {/* =====================================================
          RIGHT CONTENT
      ===================================================== */}

      <div className="seller-layout-content">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="seller-header">

          <div className="seller-header-left">

            {/* MOBILE MENU BUTTON */}

            <button
              type="button"
              className="seller-mobile-menu-button"
              onClick={() =>
                setSidebarOpen(true)
              }
              aria-label="Open seller menu"
              aria-expanded={sidebarOpen}
            >

              <Menu
                size={23}
                strokeWidth={2}
              />

            </button>


            {/* DASHBOARD WELCOME */}

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


            </div>

          </div>

        </header>


        {/* ===================================================
            MAIN CONTENT
        =================================================== */}

        <main className="seller-main-content">

          <Outlet />

        </main>


        {/* ===================================================
            FOOTER
        =================================================== */}

        <SellerFooter />

      </div>

    </div>

  );

};


export default SellerLayout;