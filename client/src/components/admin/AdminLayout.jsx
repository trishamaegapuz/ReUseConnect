import React from 'react';
import {
  Outlet,
  useLocation,
  Navigate
} from 'react-router-dom';

import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import AdminFooter from './AdminFooter';

const AdminLayout = () => {
  const location = useLocation();

  const titles = {
    '/admin-dashboard': 'Dashboard',

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


  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  if (user.role !== 'ADMIN') {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  return (
    <div className="admin-app">

      <AdminSidebar />

      <div className="admin-main">

        <AdminHeader
          title={title}
        />

        <main className="admin-content">
          <Outlet />
        </main>

        <AdminFooter />

      </div>

    </div>
  );
};

export default AdminLayout;