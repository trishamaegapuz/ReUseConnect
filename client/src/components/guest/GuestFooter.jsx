import { Link } from 'react-router-dom';

const GuestFooter = () => {
  return (
    <footer className="guest-footer">

      <div className="footer-brand">

        <div className="footer-logo-mark">
          <svg
            viewBox="0 0 64 64"
            fill="none"
          >
            <path
              d="M52 8C31 10 13 20 10 38C8 49 14 56 23 55C42 53 52 35 52 8Z"
              fill="currentColor"
            />

            <path
              d="M14 51C22 37 31 27 44 19"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div>
          <strong>ReUse</strong>
          <span>CONNECT</span>
        </div>

      </div>


      <div className="footer-tagline">
        Reimagine • Reuse • Make a Difference
      </div>


      <div className="footer-links">

        <Link to="/about">
          About Us
        </Link>

        <span>|</span>

        <Link to="/help">
          Help
        </Link>

        <span>|</span>

        <Link to="/privacy">
          Privacy Policy
        </Link>

        <span>|</span>

        <Link to="/terms">
          Terms of Service
        </Link>

      </div>

    </footer>
  );
};

export default GuestFooter;