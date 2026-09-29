import { Link, useNavigate } from 'react-router-dom';

const GuestHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="guest-header">

      <Link
        to="/"
        className="guest-logo"
      >
        <div className="guest-logo-mark">
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

        <div className="guest-logo-text">
          <strong>ReUse</strong>
          <span>CONNECT</span>
        </div>
      </Link>


      <nav className="guest-navigation">

        <Link
          to="/"
          className="active"
        >
          Home
        </Link>

        <a href="#categories">
          Categories
        </a>

        <a href="#about">
          About
        </a>

        <a href="#help">
          Help
        </a>

      </nav>


      <button
        className="guest-login-button"
        onClick={() => navigate('/login')}
      >
        Login / Register
      </button>

    </header>
  );
};

export default GuestHeader;