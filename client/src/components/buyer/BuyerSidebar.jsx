import React from 'react';

import {
  LayoutDashboard,
  Store,
  ArrowLeftRight,
  Users,
  Recycle,
  UserCircle,
  LogOut,
  X
} from 'lucide-react';

import {
  useLocation,
  useNavigate
} from 'react-router-dom';

import '../../styles/buyer/BuyerSidebar.css';


// ============================================================
// BUYER SIDEBAR
// ============================================================

const BuyerSidebar = ({
  mobileOpen = false,
  onClose
}) => {

  const navigate = useNavigate();
  const location = useLocation();


  // ==========================================================
  // MENU ITEMS
  // ==========================================================

  const menuItems = [

    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/buyer-dashboard',
    },

    {
      label: 'Marketplace',
      icon: Store,
      path: '/buyer/marketplace',
    },

    {
      label: 'Transactions',
      icon: ArrowLeftRight,
      path: '/buyer/transactions',
    },

    {
      label: 'Community',
      icon: Users,
      path: '/buyer/community',
    },

    {
      label: 'Reuse Tools',
      icon: Recycle,
      path: '/buyer/reuse-tools',
    },

    {
      label: 'Account',
      icon: UserCircle,
      path: '/buyer/account',
    },

  ];


  // ==========================================================
  // ACTIVE MENU
  // ==========================================================

  const isActive = (path) => {

    if (path === '/buyer-dashboard') {

      return location.pathname === '/buyer-dashboard';

    }

    return location.pathname.startsWith(path);

  };


  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handleNavigation = (path) => {

    navigate(path);

    if (onClose) {
      onClose();
    }

  };


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');

    navigate('/login');

  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <>

      {mobileOpen && (

        <div
          className="buyer-sidebar-overlay"
          onClick={onClose}
        />

      )}


      <aside
        className={
          `buyer-sidebar ${
            mobileOpen
              ? 'buyer-sidebar-mobile-open'
              : ''
          }`
        }
      >

        {/* BRAND */}

        <div className="buyer-sidebar-brand">

          <div className="buyer-brand-logo">

            <Recycle
              size={22}
              strokeWidth={2.2}
            />

          </div>


          <div className="buyer-brand-text">

            <span className="buyer-brand-name">
              ReUse
            </span>

            <span className="buyer-brand-connect">
              CONNECT
            </span>

          </div>


          <button
            type="button"
            className="buyer-sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >

            <X size={20} />

          </button>

        </div>


        {/* NAVIGATION */}

        <nav className="buyer-sidebar-nav">

          <div className="buyer-nav-section-title">
            MENU
          </div>


          {menuItems.map((item) => {

            const Icon = item.icon;

            const active =
              isActive(item.path);


            return (

              <button
                key={item.path}
                type="button"
                className={
                  `buyer-nav-item ${
                    active ? 'active' : ''
                  }`
                }
                onClick={() =>
                  handleNavigation(item.path)
                }
              >

                <Icon
                  size={18}
                  strokeWidth={
                    active ? 2.3 : 2
                  }
                />

                <span>
                  {item.label}
                </span>

              </button>

            );

          })}

        </nav>


        {/* BOTTOM */}

        <div className="buyer-sidebar-bottom">

          <div className="buyer-sidebar-divider" />

          <button
            type="button"
            className="buyer-nav-item buyer-logout-item"
            onClick={handleLogout}
          >

            <LogOut
              size={18}
              strokeWidth={2}
            />

            <span>
              Logout
            </span>

          </button>

        </div>

      </aside>

    </>

  );

};


export default BuyerSidebar;