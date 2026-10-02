import React from 'react';

import {
  LayoutDashboard,
  Tag,
  ArrowLeftRight,
  MessageSquare,
  Repeat2,
  Leaf,
  UserCircle,
  LogOut,
  X
} from 'lucide-react';

import {
  NavLink,
  useNavigate
} from 'react-router-dom';

import '../../styles/seller/Sidebar.css';


// ============================================================
// SELLER SIDEBAR
// ============================================================

const SellerSidebar = ({
  isOpen = false,
  onClose = () => {}
}) => {

  const navigate = useNavigate();


  // ==========================================================
  // SELLER MODULES
  // ==========================================================

  const modules = [
    {
      label: 'Dashboard',
      path: '/seller-dashboard',
      icon: LayoutDashboard
    },

    {
      label: 'My Listings',
      path: '/seller/listings',
      icon: Tag
    },

    {
      label: 'Transactions',
      path: '/seller/transactions',
      icon: ArrowLeftRight
    },

    {
      label: 'Communication',
      path: '/seller/communication',
      icon: MessageSquare
    },

    {
      label: 'Trade & Exchange',
      path: '/seller/trade-exchange',
      icon: Repeat2
    },

    {
      label: 'Reuse Tools',
      path: '/seller/reuse-tools',
      icon: Leaf
    },

    {
      label: 'Account',
      path: '/seller/account',
      icon: UserCircle
    }
  ];


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');

    sessionStorage.clear();

    navigate('/login', {
      replace: true
    });

    onClose();
  };


  // ==========================================================
  // NAVIGATION CLICK
  // ==========================================================

  const handleNavigation = () => {
    onClose();
  };


  return (
    <aside
      className={`seller-sidebar ${isOpen ? 'open' : ''}`}
    >

      {/* =====================================================
          LOGO
      ===================================================== */}

      <div className="seller-sidebar-logo">

        <div className="seller-logo-mark">
          <Leaf
            size={32}
            strokeWidth={1.7}
          />
        </div>

        <div className="seller-logo-text">

          <span className="seller-logo-title">
            ReUse
          </span>

          <span className="seller-logo-subtitle">
            CONNECT
          </span>

        </div>


        {/* ===================================================
            MOBILE CLOSE
        =================================================== */}

        <button
          type="button"
          className="seller-sidebar-close"
          onClick={onClose}
          aria-label="Close seller menu"
        >
          <X
            size={23}
            strokeWidth={2}
          />
        </button>

      </div>


      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="seller-sidebar-nav">

        {modules.map((item) => {

          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={handleNavigation}
              className={({ isActive }) =>
                `seller-sidebar-link ${
                  isActive
                    ? 'seller-sidebar-link-active'
                    : ''
                }`
              }
            >

              <Icon
                className="seller-sidebar-icon"
                size={22}
                strokeWidth={1.8}
              />

              <span>
                {item.label}
              </span>

            </NavLink>
          );

        })}

      </nav>


      {/* =====================================================
          LOGOUT
      ===================================================== */}

      <div className="seller-sidebar-bottom">

        <button
          type="button"
          className="seller-logout-button"
          onClick={handleLogout}
        >

          <LogOut
            size={21}
            strokeWidth={1.8}
          />

          <span>
            Logout
          </span>

        </button>

      </div>

    </aside>
  );
};


export default SellerSidebar;