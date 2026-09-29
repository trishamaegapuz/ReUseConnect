import React from 'react';

const BuyerFooter = () => {
  return (
    <footer className="buyer-footer">
      <div className="buyer-footer-content">

        <span>
          © {new Date().getFullYear()} ReUse Connect
        </span>

        <span className="buyer-footer-separator">
          •
        </span>

        <span>
          Reuse. Connect. Sustain.
        </span>

      </div>
    </footer>
  );
};

export default BuyerFooter;