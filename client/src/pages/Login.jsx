import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import AuthBrandPanel from '../components/AuthBrandPanel';

import {
  loginUser,
  saveAuth
} from '../services/api';

import '../styles/Auth.css';


const Login = () => {

  const navigate = useNavigate();


  // ==========================================================
  // FORM
  // ==========================================================

  const [form, setForm] = useState({
    email: '',
    password: ''
  });


  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');


  // ==========================================================
  // HANDLE INPUT
  // ==========================================================

  const handleChange = (e) => {

    const {
      name,
      value
    } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));

    setError('');
  };


  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError('');


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !form.email.trim() ||
      !form.password
    ) {

      setError(
        'Please enter your email and password.'
      );

      return;
    }


    try {

      setLoading(true);


      // ------------------------------------------------------
      // SEND LOGIN REQUEST
      // ------------------------------------------------------

      const data = await loginUser({
        email:
          form.email
            .trim()
            .toLowerCase(),

        password:
          form.password
      });


      // ------------------------------------------------------
      // SAVE AUTHENTICATION
      // ------------------------------------------------------

      saveAuth(data);


      // ------------------------------------------------------
      // GET USER ROLE
      // ------------------------------------------------------

      const role =
        String(
          data?.user?.role || ''
        ).toUpperCase();


      console.log(
        'LOGIN SUCCESS:',
        data
      );

      console.log(
        'USER ROLE:',
        role
      );


      // ======================================================
      // ROLE-BASED REDIRECT
      // ======================================================

      if (role === 'ADMIN') {

        navigate(
          '/admin-dashboard',
          {
            replace: true
          }
        );

        return;
      }


      if (role === 'SELLER') {

        navigate(
          '/seller-dashboard',
          {
            replace: true
          }
        );

        return;
      }


      if (role === 'BUYER') {

        navigate(
          '/buyer-dashboard',
          {
            replace: true
          }
        );

        return;
      }


      // ------------------------------------------------------
      // INVALID ROLE
      // ------------------------------------------------------

      setError(
        'Invalid user role. Please contact the administrator.'
      );


    } catch (err) {

      console.error(
        'LOGIN ERROR:',
        err
      );


      setError(
        err?.message ||
        'Login failed. Please check your credentials.'
      );


    } finally {

      setLoading(false);

    }

  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="auth-page">


      {/* ====================================================
          LEFT SIDE
      ==================================================== */}

      <AuthBrandPanel />


      {/* ====================================================
          RIGHT SIDE
      ==================================================== */}

      <main className="auth-form-side">

        <div className="auth-form-container login-container">


          {/* ==================================================
              LOGIN HEADING
          ================================================== */}

          <div className="auth-heading login-heading">

            <h2>
              Welcome Back!
            </h2>

            <p>
              Log in to your account to continue
              <br />
              to your marketplace.
            </p>

          </div>


          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (

            <div className="auth-error">

              <span className="error-icon">
                !
              </span>

              <span>
                {error}
              </span>

            </div>

          )}


          {/* ==================================================
              LOGIN FORM
          ================================================== */}

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >


            {/* =================================================
                EMAIL
            ================================================= */}

            <div className="input-group">

              <div className="input-icon">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                >

                  <circle
                    cx="12"
                    cy="8"
                    r="3.5"
                    stroke="currentColor"
                    strokeWidth="2"
                  />

                  <path
                    d="M5 20C5 16.7 8.1 14 12 14C15.9 14 19 16.7 19 20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                </svg>

              </div>


              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />

            </div>


            {/* =================================================
                PASSWORD
            ================================================= */}

            <div className="input-group">

              <div className="input-icon">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                >

                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />

                  <path
                    d="M8 10V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V10"
                    stroke="currentColor"
                    strokeWidth="2"
                  />

                </svg>

              </div>


              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />


              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >

                {showPassword ? (

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                  >

                    <path
                      d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />

                    <circle
                      cx="12"
                      cy="12"
                      r="2.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />

                  </svg>

                ) : (

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                  >

                    <path
                      d="M3 3L21 21"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    <path
                      d="M10.6 6.2A10.9 10.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />

                    <path
                      d="M6.2 6.3C3.8 8.1 2.5 12 2.5 12s3.5 6 9.5 6c1.3 0 2.5-.3 3.5-.7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />

                  </svg>

                )}

              </button>

            </div>


            {/* =================================================
                OPTIONS
            ================================================= */}

            <div className="login-options">


              <label className="checkbox-label">

                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) =>
                    setRememberMe(
                      e.target.checked
                    )
                  }
                />

                <span className="custom-checkbox"></span>

                <span>
                  Remember me
                </span>

              </label>


              <button
                type="button"
                className="forgot-button"
                onClick={() =>
                  alert(
                    'Password recovery will be connected in the next authentication step.'
                  )
                }
              >

                Forgot password?

              </button>

            </div>


            {/* =================================================
                LOGIN BUTTON
            ================================================= */}

            <button
              type="submit"
              className="primary-auth-button"
              disabled={loading}
            >

              <span>

                {loading
                  ? 'Logging in...'
                  : 'Log In'}

              </span>


              {!loading && (

                <span className="button-arrow">
                  →
                </span>

              )}

            </button>

          </form>


          {/* ==================================================
              REGISTER CARD
          ================================================== */}

          <div className="auth-bottom-card">


            <div className="bottom-card-icon">

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


            <div className="bottom-card-text">

              <strong>
                New to ReUse Connect?
              </strong>

              <span>
                Join our community and start giving
                items a second life.
              </span>

            </div>


            <Link
              to="/register"
              className="bottom-card-link"
            >

              Create Account

              <span>
                →
              </span>

            </Link>

          </div>

        </div>

      </main>

    </div>

  );

};


export default Login;