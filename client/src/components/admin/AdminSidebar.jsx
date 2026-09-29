import React from 'react';

import {
  NavLink,
  useNavigate
} from 'react-router-dom';

const LogoLeaf = () => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
  >
    <path
      d="M52.8 7.2C36.3 8.5 20.1 14.7 13.1 27.4C7.8 37.1 9.5 48.1 17.8 55.6C25.4 62.5 37.2 58.5 44.7 50.6C53.1 41.8 56.3 27.5 52.8 7.2Z"
      fill="currentColor"
    />

    <path
      d="M13 56C18.2 40.2 27.5 28.7 42.6 20.8"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);


const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 11L12 4L20 11V20H4V11Z" />
    <path d="M9 20V14H15V20" />
  </svg>
);


const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <circle
      cx="9"
      cy="8"
      r="3"
    />

    <path d="M3 20C3 16.7 5.5 14 9 14C12.5 14 15 16.7 15 20" />

    <path d="M16 5C18.2 5.2 20 7 20 9.2" />

    <path d="M17 14C19.4 14.7 21 16.8 21 19" />
  </svg>
);


const MarketplaceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M5 9L6.5 4H17.5L19 9" />
    <path d="M4 9H20" />
    <path d="M6 9V20H18V9" />
    <path d="M9 14H15V20H9" />
  </svg>
);


const CommunityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 5H20V16H8L4 20V5Z" />
    <path d="M8 9H16" />
    <path d="M8 12H13" />
  </svg>
);


const ReportsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20V8" />
    <path d="M22 20V6" />
  </svg>
);


const ContentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M5 3H14L19 8V21H5V3Z" />
    <path d="M14 3V8H19" />
    <path d="M8 12H16" />
    <path d="M8 16H16" />
  </svg>
);


const SystemIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <circle
      cx="12"
      cy="12"
      r="3"
    />

    <path d="M19.4 15A1.7 1.7 0 0 0 19.7 17L20 17.3L17.3 20L17 19.7A1.7 1.7 0 0 0 15 19.4C14.4 19.7 14 20.3 14 21V21.5H10V21C10 20.3 9.6 19.7 9 19.4A1.7 1.7 0 0 0 7 19.7L6.7 20L4 17.3L4.3 17A1.7 1.7 0 0 0 4.6 15C4.3 14.4 3.7 14 3 14H2.5V10H3C3.7 10 4.3 9.6 4.6 9A1.7 1.7 0 0 0 4.3 7L4 6.7L6.7 4L7 4.3A1.7 1.7 0 0 0 9 4.6C9.6 4.3 10 3.7 10 3V2.5H14V3C14 3.7 14.4 4.3 15 4.6A1.7 1.7 0 0 0 17 4.3L17.3 4L20 6.7L19.7 7A1.7 1.7 0 0 0 19.4 9C19.7 9.6 20.3 10 21 10H21.5V14H21C20.3 14 19.7 14.4 19.4 15Z" />
  </svg>
);


const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M10 5H5V19H10" />
    <path d="M14 8L19 12L14 16" />
    <path d="M19 12H9" />
  </svg>
);


const AdminSidebar = ({
  isOpen = false,
  onClose = () => {}
}) => {

  const navigate = useNavigate();


  const menuItems = [
    {
      label: 'Dashboard',
      path: '/admin-dashboard',
      icon: <DashboardIcon />
    },

    {
      label: 'Users & Accounts',
      path: '/admin/users',
      icon: <UsersIcon />
    },

    {
      label: 'Marketplace Management',
      path: '/admin/marketplace',
      icon: <MarketplaceIcon />
    },

    {
      label: 'Community & Support',
      path: '/admin/community',
      icon: <CommunityIcon />
    },

    {
      label: 'Reports & Analytics',
      path: '/admin/reports',
      icon: <ReportsIcon />
    },

    {
      label: 'Content Management',
      path: '/admin/content',
      icon: <ContentIcon />
    },

    {
      label: 'System',
      path: '/admin/system',
      icon: <SystemIcon />
    }
  ];


  const handleLogout = () => {

    localStorage.removeItem(
      'reuseconnect_token'
    );

    localStorage.removeItem(
      'reuseconnect_user'
    );

    /*
     * Keep compatibility with older auth
     * keys if they exist.
     */

    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'user'
    );

    onClose();

    navigate('/login');
  };


  const handleNavigation = () => {
    onClose();
  };


  return (
    <aside
      className={`admin-sidebar ${
        isOpen
          ? 'mobile-open'
          : ''
      }`}
    >

      {/* ======================================================
          LOGO
      ====================================================== */}

      <div className="admin-logo">

        <div className="admin-logo-leaf">
          <LogoLeaf />
        </div>

        <div className="admin-logo-text">

          <div className="admin-logo-name">
            ReUse
          </div>

          <div className="admin-logo-connect">
            CONNECT
          </div>

        </div>

      </div>


      {/* ======================================================
          NAVIGATION
      ====================================================== */}

      <nav className="admin-navigation">

        {menuItems.map(
          (item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavigation}
              className={({
                isActive
              }) =>
                `admin-nav-item ${
                  isActive
                    ? 'active'
                    : ''
                }`
              }
            >

              <span className="admin-nav-icon">
                {item.icon}
              </span>

              <span className="admin-nav-label">
                {item.label}
              </span>

            </NavLink>
          )
        )}

      </nav>


      {/* ======================================================
          LOGOUT
      ====================================================== */}

      <div className="admin-sidebar-bottom">

        <button
          type="button"
          className="admin-logout"
          onClick={handleLogout}
        >

          <span className="admin-nav-icon">
            <LogoutIcon />
          </span>

          <span>
            Logout
          </span>

        </button>

      </div>

    </aside>
  );
};


export default AdminSidebar;