import React from 'react';


// ============================================================
// COMPONENT
// ============================================================

const SellerFooter = () => {

  const currentYear =
    new Date().getFullYear();


  return (

    <footer className="seller-footer">

      <div className="seller-footer-left">

        <span>
          © {currentYear} ReUse Connect
        </span>

        <span className="seller-footer-divider">
          •
        </span>

        <span>
          Seller Center
        </span>

      </div>


      <div className="seller-footer-right">

        <span>
          Give items a second life.
        </span>

      </div>

    </footer>

  );

};


export default SellerFooter;