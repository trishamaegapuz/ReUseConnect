import React from 'react';
import { Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const AdminHeader = () => {
  const location = useLocation();

  const pathname =
    location?.pathname || '/admin-dashboard';

  const getPageTitle = (path) => {
    const safePath =
      typeof path === 'string'
        ? path
        : '';

    /* ============================================================
       DASHBOARD
    ============================================================ */

    if (safePath === '/admin-dashboard') {
      return 'Admin Dashboard';
    }


    /* ============================================================
       USERS & ACCOUNTS
    ============================================================ */

    if (
      safePath.startsWith('/admin/users')
    ) {
      return 'Users & Accounts';
    }


    /* ============================================================
       MARKETPLACE MANAGEMENT
    ============================================================ */

    if (
      safePath.startsWith('/admin/marketplace') ||
      safePath.startsWith('/admin/items') ||
      safePath.startsWith('/admin/categories') ||
      safePath.startsWith('/admin/donations') ||
      safePath.startsWith('/admin/trades') ||
      safePath.startsWith('/admin/reviews')
    ) {
      return 'Marketplace Management';
    }


    /* ============================================================
       COMMUNITY & SUPPORT
    ============================================================ */

    if (
      safePath.startsWith('/admin/community')
    ) {
      return 'Community & Support';
    }


    /* ============================================================
       REPORTS & ANALYTICS
    ============================================================ */

    if (
      safePath.startsWith('/admin/reports') ||
      safePath.startsWith('/admin/impact-tracker')
    ) {
      return 'Reports & Analytics';
    }


    /* ============================================================
       CONTENT MANAGEMENT
    ============================================================ */

    if (
      safePath.startsWith('/admin/content')
    ) {
      return 'Content Management';
    }


    /* ============================================================
       SYSTEM MANAGEMENT
    ============================================================ */

    if (
      safePath.startsWith('/admin/system') ||
      safePath.startsWith('/admin/settings')
    ) {
      return 'System Management';
    }


    /* ============================================================
       DEFAULT
    ============================================================ */

    return 'Admin Dashboard';
  };


  return (
    <header
      style={{
        height: '64px',
        background: '#ffffff',
        borderBottom:
          '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxSizing: 'border-box'
      }}
    >

      {/* ========================================================
          PAGE TITLE
      ======================================================== */}

      <h1
        style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 600,
          color: '#2d1b4e'
        }}
      >
        {getPageTitle(pathname)}
      </h1>


      {/* ========================================================
          RIGHT SIDE
      ======================================================== */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px'
        }}
      >

        {/* ======================================================
            NOTIFICATIONS
        ====================================================== */}

        <button
          type="button"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '6px'
          }}
          aria-label="Notifications"
        >
          <Bell
            size={20}
            color="#5b3a82"
          />
        </button>


        {/* ======================================================
            ADMIN PROFILE
        ====================================================== */}

        <div>

          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#333333'
            }}
          >
            Administrator
          </div>

          <div
            style={{
              fontSize: '12px',
              color: '#777777'
            }}
          >
            Admin
          </div>

        </div>

      </div>

    </header>
  );
};

export default AdminHeader;