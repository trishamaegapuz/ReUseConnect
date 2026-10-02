/*
============================================================
ReUse Connect
Admin Layout
Responsive Version
============================================================
*/

import React, {
  useEffect,
  useState
} from 'react';

import {
  Outlet,
  useLocation,
  Navigate
} from 'react-router-dom';

import {
  Menu,
  X
} from 'lucide-react';

import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import AdminFooter from './AdminFooter';

import '../../styles/AdminLayout.css';


const AdminLayout = () => {

  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);


  /*
  ============================================================
  ADMIN PAGE TITLES
  ============================================================
  */

  const titles = {

    '/admin-dashboard':
      'Dashboard',

    '/admin/users':
      'Users & Accounts',

    '/admin/marketplace':
      'Marketplace Management',

    '/admin/community':
      'Community & Support',

    '/admin/reports':
      'Reports & Analytics',

    '/admin/content':
      'Content Management',

    '/admin/system':
      'System'

  };


  const title =
    titles[location.pathname] ||
    'Dashboard';


  /*
  ============================================================
  CLOSE MOBILE SIDEBAR WHEN ROUTE CHANGES
  ============================================================
  */

  useEffect(() => {

    setSidebarOpen(false);

  }, [location.pathname]);


  /*
  ============================================================
  PREVENT BODY SCROLL WHEN MOBILE SIDEBAR IS OPEN
  ============================================================
  */

  useEffect(() => {

    if (sidebarOpen) {

      document.body.classList.add(
        'admin-mobile-menu-open'
      );

    } else {

      document.body.classList.remove(
        'admin-mobile-menu-open'
      );

    }


    return () => {

      document.body.classList.remove(
        'admin-mobile-menu-open'
      );

    };

  }, [sidebarOpen]);


  /*
  ============================================================
  CHECK ADMIN AUTHENTICATION
  ============================================================
  */

  const token =
    localStorage.getItem(
      'reuseconnect_token'
    );


  const storedUser =
    localStorage.getItem(
      'reuseconnect_user'
    );


  let user = null;


  try {

    user = storedUser
      ? JSON.parse(storedUser)
      : null;

  } catch {

    user = null;

  }


  /*
  ============================================================
  NOT LOGGED IN
  ============================================================
  */

  if (!token || !user) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }


  /*
  ============================================================
  NOT ADMIN
  ============================================================
  */

  if (user.role !== 'ADMIN') {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }


  /*
  ============================================================
  ADMIN LAYOUT
  ============================================================
  */

  return (

    <div className="admin-app">


      {/* ======================================================
          MOBILE SIDEBAR OVERLAY
      ====================================================== */}

      {sidebarOpen && (

        <button
          type="button"
          className="admin-sidebar-overlay"
          aria-label="Close admin menu"
          onClick={() =>
            setSidebarOpen(false)
          }
        />

      )}


      {/* ======================================================
          ADMIN SIDEBAR
      ====================================================== */}

      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />


      {/* ======================================================
          MAIN CONTENT AREA
      ====================================================== */}

      <div className="admin-main">


        {/* ====================================================
            MOBILE MENU BUTTON
        ==================================================== */}

        <button
          type="button"
          className="admin-mobile-menu-button"

          aria-label={
            sidebarOpen
              ? 'Close menu'
              : 'Open menu'
          }

          aria-expanded={sidebarOpen}

          onClick={() =>
            setSidebarOpen(
              previous =>
                !previous
            )
          }
        >

          {sidebarOpen ? (

            <X size={23} />

          ) : (

            <Menu size={23} />

          )}

        </button>


        {/* ====================================================
            HEADER
        ==================================================== */}

        <AdminHeader
          title={title}
        />


        {/* ====================================================
            PAGE CONTENT
        ==================================================== */}

        <main className="admin-content">

          <Outlet />

        </main>


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <AdminFooter />


      </div>

    </div>

  );

};


export default AdminLayout;