import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const AdminHeader = () => {
  const location = useLocation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef(null);

  // Close the dropdown when clicking outside or pressing Escape.
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

        <div
          ref={notificationRef}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            onClick={() => setIsNotificationOpen((previous) => !previous)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              border: isNotificationOpen ? '1px solid #ded3f5' : '1px solid transparent',
              borderRadius: '10px',
              background: isNotificationOpen ? '#f5f0ff' : 'transparent',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.2s ease, border-color 0.2s ease'
            }}
            aria-label="Notifications"
            aria-expanded={isNotificationOpen}
            aria-haspopup="dialog"
            title="Notifications"
          >
            <Bell size={20} color="#5b3a82" />
          </button>

          {isNotificationOpen && (
            <div
              role="dialog"
              aria-label="Notifications panel"
              style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                right: 0,
                width: 'min(360px, calc(100vw - 32px))',
                background: '#ffffff',
                border: '1px solid #e8e1f2',
                borderRadius: '14px',
                boxShadow: '0 14px 40px rgba(35, 20, 62, 0.18)',
                zIndex: 2000,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 18px',
                  borderBottom: '1px solid #eee9f5'
                }}
              >
                <div>
                  <div
                    style={{
                      color: '#2d1b4e',
                      fontSize: '15px',
                      fontWeight: 700
                    }}
                  >
                    Notifications
                  </div>
                  <div
                    style={{
                      color: '#8a8198',
                      fontSize: '12px',
                      marginTop: '3px'
                    }}
                  >
                    Admin updates and alerts
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(false)}
                  aria-label="Close notifications"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '30px',
                    border: '1px solid #e8e1f2',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#756b85',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div
                style={{
                  minHeight: '150px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 18px',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: '#f1eaff',
                    color: '#6734d3',
                    marginBottom: '12px'
                  }}
                >
                  <CheckCheck size={22} />
                </div>

                <div
                  style={{
                    color: '#35264d',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  No notifications yet
                </div>

                <div
                  style={{
                    color: '#8a8198',
                    fontSize: '12px',
                    lineHeight: 1.5,
                    marginTop: '6px',
                    maxWidth: '260px'
                  }}
                >
                  New admin alerts will appear here when notifications are
                  connected to the system.
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid #eee9f5',
                  padding: '10px 18px',
                  background: '#fcfbfe',
                  color: '#9a91a6',
                  fontSize: '11px',
                  textAlign: 'center'
                }}
              >
                ReUse Connect · Admin
              </div>
            </div>
          )}
        </div>


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