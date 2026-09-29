import React from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';

// ============================================================
// ADMIN
// ============================================================

import AdminDashboard from './pages/admin/AdminDashboard';
import UsersAccounts from './pages/admin/UsersAccounts';
import MarketplaceManagement from './pages/admin/Marketplace';
import CommunitySupport from './pages/admin/CommunitySupport';
import ReportsAnalytics from './pages/admin/ReportsAnalytics';
import ContentManagement from './pages/admin/ContentManagement';
import SystemManagement from './pages/admin/SystemManagement';
import AdminLayout from './components/admin/AdminLayout';

import './styles/Admin.css';

// ============================================================
// BUYER
// ============================================================

import BuyerDashboard from './pages/buyer/BuyerDashboard';
import BuyerLayout from './components/buyer/BuyerLayout';
import BuyerMarketplace from './pages/buyer/BuyerMarketplace';
import BuyerTransactions from './pages/buyer/BuyerTransactions';
import BuyerCommunity from './pages/buyer/BuyerCommunity';
import BuyerReuseTools from './pages/buyer/BuyerReuseTools';
import BuyerAccount from './pages/buyer/BuyerAccount';
import BuyerMessages from './pages/buyer/BuyerMessages';
import BuyerCheckout from './pages/buyer/BuyerCheckout';
import BuyerCart from './pages/buyer/BuyerCart';

// ============================================================
// SELLER
// ============================================================

import SellerDashboard from './pages/seller/SellerDashboard';
import SellerLayout from './components/seller/SellerLayout';
import SellerMyListings from './pages/seller/SellerMyListings';
import SellerTransactions from './pages/seller/SellerTransactions';
import SellerCommunication from './pages/seller/SellerCommunication';
import SellerTradeExchange from './pages/seller/SellerTradeExchange';
import SellerReuseTools from './pages/seller/SellerReuseTools';
import SellerAccount from './pages/seller/SellerAccount';

// ============================================================
// PLACEHOLDER
// ============================================================

const PlaceholderPage = ({ title }) => {
  return (
    <div
      style={{
        padding: '30px',
        minHeight: '500px'
      }}
    >
      <h2
        style={{
          marginTop: 0,
          color: '#17145f'
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: 0,
          color: '#7774ad'
        }}
      >
        This module will be connected to the database next.
      </p>
    </div>
  );
};

// ============================================================
// BUYER QUICK-LINK ROUTES
// ============================================================

const BuyerMarketplaceRedirect = () => {
  return (
    <Navigate
      to="/buyer/marketplace"
      replace
    />
  );
};

// ============================================================
// APP
// ============================================================

const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* ====================================================
            PUBLIC
        ==================================================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* ====================================================
            ADMIN LAYOUT
        ==================================================== */}

        <Route element={<AdminLayout />}>

          <Route
            path="/admin-dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/users"
            element={<UsersAccounts />}
          />

          <Route
            path="/admin/marketplace"
            element={<MarketplaceManagement />}
          />

          <Route
            path="/admin/community"
            element={<CommunitySupport />}
          />

          <Route
            path="/admin/reports"
            element={
              <ReportsAnalytics />
            }
          />

          <Route
            path="/admin/content"
            element={<ContentManagement />}
          />

          <Route
            path="/admin/system"
            element={<SystemManagement />}
          />

        </Route>

        {/* ====================================================
            BUYER
        ==================================================== */}

        <Route
          path="/buyer-dashboard"
          element={
            <BuyerLayout>
              <BuyerDashboard />
            </BuyerLayout>
          }
        />

        <Route
          path="/buyer/marketplace"
          element={
            <BuyerLayout>
              <BuyerMarketplace />
            </BuyerLayout>
          }
        />

        <Route
          path="/buyer/transactions"
          element={
            <BuyerLayout>
              <BuyerTransactions />
            </BuyerLayout>
          }
        />

        <Route
          path="/buyer/community"
          element={
            <BuyerLayout>
              <BuyerCommunity />
            </BuyerLayout>
          }
        />

        <Route
          path="/buyer/reuse-tools"
          element={
            <BuyerLayout>
              <BuyerReuseTools />
            </BuyerLayout>
          }
        />

        <Route
          path="/buyer/account"
          element={
            <BuyerLayout>
              <BuyerAccount />
            </BuyerLayout>
          }
        />

        {/* ====================================================
            BUYER WISHLIST / CART
        ==================================================== */}

        <Route
          path="/buyer/wishlist"
          element={
            <BuyerMarketplaceRedirect />
          }
        />

        <Route
  path="/buyer/cart"
  element={
    <BuyerLayout>
      <BuyerCart />
    </BuyerLayout>
  }
/>
        <Route
  path="/buyer/messages"
  element={
    <BuyerLayout>
      <BuyerMessages />
    </BuyerLayout>
  }
/>

<Route
  path="/buyer/checkout"
  element={
    <BuyerLayout>
      <BuyerCheckout />
    </BuyerLayout>
  }
/>

        {/* ====================================================
            SELLER LAYOUT
        ==================================================== */}

        <Route element={<SellerLayout />}>

          {/* SELLER DASHBOARD */}

          <Route
            path="/seller-dashboard"
            element={<SellerDashboard />}
          />

          {/* SELLER MY LISTINGS */}

          <Route
            path="/seller/listings"
            element={<SellerMyListings />}
          />

          {/* SELLER TRANSACTIONS */}

          <Route
            path="/seller/transactions"
            element={<SellerTransactions />}
          />

          {/* SELLER COMMUNICATION */}

          {/* SELLER COMMUNICATION */}

<Route
  path="/seller/communication"
  element={
    <SellerCommunication />
  }
/>

          {/* SELLER TRADE & EXCHANGE */}

          <Route
            path="/seller/trade-exchange"
            element={
              <SellerTradeExchange />
            }
          />

          {/* SELLER REUSE TOOLS */}

          <Route
  path="/seller/reuse-tools"
  element={
    <SellerReuseTools />
  }
/>

          {/* SELLER ACCOUNT */}

          <Route
  path="/seller/account"
  element={<SellerAccount />}
/>

        </Route>

        {/* ====================================================
            DEFAULT
        ==================================================== */}

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        {/* ====================================================
            UNKNOWN ROUTES
        ==================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
};

export default App;