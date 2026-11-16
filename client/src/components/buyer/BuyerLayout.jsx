import React, { useEffect, useState } from 'react';

import {
  Menu
} from 'lucide-react';

import BuyerHeader from './BuyerHeader';
import BuyerSidebar from './BuyerSidebar';
import BuyerFooter from './BuyerFooter';

import '../../styles/buyer/BuyerLayout.css';

import {
  getCart
} from '../../services/buyer/buyerMarketplaceApi';


// ============================================================
// BUYER LAYOUT
// ============================================================
//
// Contains:
//
// - Buyer Sidebar
// - Buyer Header
// - Buyer Content
// - Buyer Footer
//
// Every Buyer module uses this same layout.
//
// ============================================================

const BuyerLayout = ({
  children,
  user: userProp = null,
  notificationCount = 0,
  cartCount: initialCartCount = 0,
}) => {

  // ==========================================================
  // MOBILE SIDEBAR
  // ==========================================================

  const [
    mobileSidebarOpen,
    setMobileSidebarOpen
  ] = useState(false);


  // ==========================================================
  // LOGGED-IN USER
  // ==========================================================

  const [
    loggedInUser,
    setLoggedInUser
  ] = useState(userProp);


  // ==========================================================
  // CART COUNT
  // ==========================================================

  const [
    currentCartCount,
    setCurrentCartCount
  ] = useState(
    Number(initialCartCount || 0)
  );


  // ==========================================================
  // LOAD CART COUNT
  // ==========================================================

  useEffect(() => {

    const loadCartCount = async () => {

      try {

        const response = await getCart();

        const cart =
          response?.items ||
          response?.cart ||
          response?.data?.items ||
          response?.data?.cart ||
          response?.data ||
          [];

        if (Array.isArray(cart)) {

          setCurrentCartCount(
            cart.length
          );

        }

      } catch (error) {

        console.warn(
          'Unable to load buyer cart count:',
          error
        );

      }

    };


    loadCartCount();


    const handleCartUpdated = () => {

      loadCartCount();

    };


    window.addEventListener(
      'buyer-cart-updated',
      handleCartUpdated
    );


    return () => {

      window.removeEventListener(
        'buyer-cart-updated',
        handleCartUpdated
      );

    };

  }, []);


  // ==========================================================
  // GET AND SYNC LOGGED-IN BUYER
  // ==========================================================

  useEffect(() => {
    const readStoredUser = () => {
      try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (error) {
        console.error('BUYER LAYOUT USER ERROR:', error);
        return null;
      }
    };

    const refreshUser = () => {
      const storedUser = readStoredUser();

      // localStorage contains the latest profile after an Account update.
      // Merge it last so stale userProp photo fields cannot overwrite it.
      if (userProp || storedUser) {
        setLoggedInUser({
          ...(userProp || {}),
          ...(storedUser || {})
        });
      } else {
        setLoggedInUser(null);
      }
    };

    const handleBuyerProfileUpdated = (event) => {
      if (event?.detail?.user) {
        setLoggedInUser({
          ...(userProp || {}),
          ...event.detail.user
        });
      } else {
        refreshUser();
      }
    };

    refreshUser();

    window.addEventListener('storage', refreshUser);
    window.addEventListener(
      'buyer-profile-updated',
      handleBuyerProfileUpdated
    );

    return () => {
      window.removeEventListener('storage', refreshUser);
      window.removeEventListener(
        'buyer-profile-updated',
        handleBuyerProfileUpdated
      );
    };
  }, [userProp]);

  // ==========================================================
  // OPEN MOBILE SIDEBAR
  // ==========================================================

  const openMobileSidebar = () => {

    setMobileSidebarOpen(true);

  };


  // ==========================================================
  // CLOSE MOBILE SIDEBAR
  // ==========================================================

  const closeMobileSidebar = () => {

    setMobileSidebarOpen(false);

  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="buyer-layout">


      {/* ====================================================
          SIDEBAR
      ==================================================== */}

      <BuyerSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={closeMobileSidebar}
      />


      {/* ====================================================
          MAIN AREA
      ==================================================== */}

      <div className="buyer-main-wrapper">


        {/* ==================================================
            HEADER
        ================================================== */}

        <BuyerHeader
          user={loggedInUser}
          notificationCount={notificationCount}
          cartCount={currentCartCount}
          onMenuClick={openMobileSidebar}
        />


        {/* ==================================================
            MAIN CONTENT
        ================================================== */}

        <main className="buyer-content">

          {children}

        </main>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <BuyerFooter />

      </div>

    </div>

  );

};


export default BuyerLayout;