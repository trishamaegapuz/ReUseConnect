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
  // GET LOGGED-IN BUYER
  // ==========================================================

  useEffect(() => {

    /*
    If user is supplied through props,
    use that user.
    */

    if (userProp) {

      setLoggedInUser(userProp);

      return;

    }


    /*
    Get saved user from localStorage.
    */

    const getStoredUser = () => {

      try {

        const storedUser =
          localStorage.getItem('user');


        if (!storedUser) {

          setLoggedInUser(null);

          return;

        }


        const parsedUser =
          JSON.parse(storedUser);


        setLoggedInUser(parsedUser);

      } catch (error) {

        console.error(
          'BUYER LAYOUT USER ERROR:',
          error
        );

        setLoggedInUser(null);

      }

    };


    getStoredUser();


    /*
    Listen for localStorage changes.
    */

    const handleStorageChange = () => {

      getStoredUser();

    };


    window.addEventListener(
      'storage',
      handleStorageChange
    );


    return () => {

      window.removeEventListener(
        'storage',
        handleStorageChange
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