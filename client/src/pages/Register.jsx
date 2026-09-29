import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AuthBrandPanel from '../components/AuthBrandPanel';
import { registerUser } from '../services/api';
import '../styles/Auth.css';

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20C5 16.2 7.8 13.5 12 13.5C16.2 13.5 19 16.2 19 20" />
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M4 7L12 13L20 7" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M7 3L10 4L11 8L8.5 9.5C9.5 12 12 14.5 14.5 15.5L16 13L20 14L21 17C21.5 19 19.5 21 17.5 20.5C9.5 18.5 5.5 14.5 3.5 6.5C3 4.5 5 2.5 7 3Z" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8 10V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V10" />
  </svg>
);

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 21C12 21 19 14.7 19 9.5C19 5.9 15.9 3 12 3C8.1 3 5 5.9 5 9.5C5 14.7 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

const EyeIcon = ({ slash = false }) => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M2.5 12C4.5 8.5 7.8 6.5 12 6.5C16.2 6.5 19.5 8.5 21.5 12C19.5 15.5 16.2 17.5 12 17.5C7.8 17.5 4.5 15.5 2.5 12Z" />
    <circle cx="12" cy="12" r="2.5" />

    {slash && (
      <path d="M4 4L20 20" />
    )}
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M5 12H19" />
    <path d="M13 6L19 12L13 18" />
  </svg>
);

const Register = () => {
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState('BUYER');

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));

    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      !form.email.trim() ||
      !form.password
    ) {
      setError(
        'Please complete all required fields.'
      );
      return;
    }

    if (form.password.length < 6) {
      setError(
        'Password must be at least 6 characters.'
      );
      return;
    }

    if (
      form.password !== form.confirm_password
    ) {
      setError(
        'Passwords do not match.'
      );
      return;
    }

    if (!agreeTerms) {
      setError(
        'Please agree to the Terms of Service and Privacy Policy.'
      );
      return;
    }

    try {
      setLoading(true);

      const data = await registerUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        postal_code: form.postal_code.trim(),
        role: accountType
      });

      setSuccess(
        data.message ||
        'Registration submitted successfully. Your account is waiting for admin approval.'
      );

      /*
       * IMPORTANT:
       * Do NOT save authentication here.
       * Newly registered BUYER and SELLER accounts
       * are PENDING until approved by an admin.
       */

      setTimeout(() => {
        navigate('/login', {
          state: {
            message:
              'Registration submitted successfully. Please wait for admin approval before logging in.'
          }
        });
      }, 1800);

    } catch (err) {
      setError(
        err.message ||
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page register-page">

      <AuthBrandPanel />

      <main className="auth-form-side register-form-side">

        <div className="auth-form-container register-container">

          {/* Header */}
          <div className="register-heading">

            <div className="register-mobile-logo">
              <div className="register-mobile-leaf">
                <svg
                  viewBox="0 0 64 64"
                  fill="none"
                >
                  <path
                    d="M52.8 7.2C36.3 8.5 20.1 14.7 13.1 27.4C7.8 37.1 9.5 48.1 17.8 55.6C25.4 62.5 37.2 58.5 44.7 50.6C53.1 41.8 56.3 27.5 52.8 7.2Z"
                    fill="currentColor"
                  />
                  <path
                    d="M13 56C18.2 40.2 27.5 28.7 42.6 20.8"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div>
                <div className="register-mobile-name">
                  ReUse
                </div>
                <div className="register-mobile-connect">
                  CONNECT
                </div>
              </div>
            </div>

            <h2>Create Your Account</h2>

            <p>
              Join ReUse Connect and be part of a more
              sustainable future.
            </p>

          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          <form
            className="register-form"
            onSubmit={handleSubmit}
          >

            {/* Account Type */}
            <div className="account-type-section">

              <div className="account-type-title">
                Account Type
              </div>

              <div className="account-types">

                <button
                  type="button"
                  className={`account-type ${
                    accountType === 'BUYER'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() =>
                    setAccountType('BUYER')
                  }
                >
                  <div className="account-type-icon">
                    <UserIcon />
                  </div>

                  <div className="account-type-info">
                    <strong>Buyer</strong>
                    <span>
                      Shop and discover
                      <br />
                      pre-loved items
                    </span>
                  </div>

                  <span className="radio-circle">
                    {accountType === 'BUYER' && (
                      <span />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={`account-type ${
                    accountType === 'SELLER'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() =>
                    setAccountType('SELLER')
                  }
                >
                  <div className="account-type-icon seller-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path d="M4 10L5.5 4H18.5L20 10" />
                      <path d="M5 10V20H19V10" />
                      <path d="M3 10H21" />
                      <path d="M8 14H16V20H8V14Z" />
                    </svg>
                  </div>

                  <div className="account-type-info">
                    <strong>Seller</strong>
                    <span>
                      List your items
                      <br />
                      and earn
                    </span>
                  </div>

                  <span className="radio-circle">
                    {accountType === 'SELLER' && (
                      <span />
                    )}
                  </span>
                </button>

              </div>
            </div>

            {/* Personal Information */}
            <div className="register-section-title">
              Personal Information
            </div>

            <div className="register-grid">

              <div className="input-group">
                <span className="input-icon">
                  <UserIcon />
                </span>

                <input
                  type="text"
                  name="first_name"
                  placeholder="First Name"
                  value={form.first_name}
                  onChange={handleChange}
                  autoComplete="given-name"
                />
              </div>

              <div className="input-group">
                <span className="input-icon">
                  <UserIcon />
                </span>

                <input
                  type="text"
                  name="last_name"
                  placeholder="Last Name"
                  value={form.last_name}
                  onChange={handleChange}
                  autoComplete="family-name"
                />
              </div>

              <div className="input-group">
                <span className="input-icon">
                  <EmailIcon />
                </span>

                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              <div className="input-group">
                <span className="input-icon">
                  <PhoneIcon />
                </span>

                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>

            </div>

            {/* Password */}
            <div className="register-section-title password-section-title">
              Password
            </div>

            <div className="register-password-grid">

              <div className="input-group">
                <span className="input-icon">
                  <LockIcon />
                </span>

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
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  <EyeIcon
                    slash={!showPassword}
                  />
                </button>
              </div>

              <div className="input-group">
                <span className="input-icon">
                  <LockIcon />
                </span>

                <input
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  name="confirm_password"
                  placeholder="Confirm Password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  <EyeIcon
                    slash={!showConfirmPassword}
                  />
                </button>
              </div>

            </div>

            {/* Address */}
            <div className="register-section-title address-section-title">
              Location
            </div>

            <div className="register-address-full">
              <span className="input-icon">
                <LocationIcon />
              </span>

              <input
                type="text"
                name="address"
                placeholder="Complete Address"
                value={form.address}
                onChange={handleChange}
                autoComplete="street-address"
              />
            </div>

            <div className="register-location-grid">

              <input
                type="text"
                name="city"
                placeholder="City"
                value={form.city}
                onChange={handleChange}
                autoComplete="address-level2"
              />

              <input
                type="text"
                name="province"
                placeholder="Province"
                value={form.province}
                onChange={handleChange}
                autoComplete="address-level1"
              />

              <input
                type="text"
                name="postal_code"
                placeholder="Postal Code"
                value={form.postal_code}
                onChange={handleChange}
                autoComplete="postal-code"
              />

            </div>

            {/* Terms */}
            <label className="terms-label">

              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(event) =>
                  setAgreeTerms(
                    event.target.checked
                  )
                }
              />

              <span className="custom-checkbox">
                {agreeTerms && '✓'}
              </span>

              <span className="terms-text">
                I agree to the{' '}
                <button
                  type="button"
                  className="terms-link"
                  onClick={(event) =>
                    event.preventDefault()
                  }
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  className="terms-link"
                  onClick={(event) =>
                    event.preventDefault()
                  }
                >
                  Privacy Policy
                </button>
              </span>

            </label>

            {/* Submit */}
            <button
              type="submit"
              className="primary-auth-button register-submit-button"
              disabled={loading}
            >
              <span>
                {loading
                  ? 'Creating Account...'
                  : 'Create Account'}
              </span>

              {!loading && (
                <span className="button-arrow">
                  <ArrowIcon />
                </span>
              )}
            </button>

          </form>

          {/* Login card */}
          <div className="auth-bottom-card register-login-card">

            <div className="bottom-card-icon">
              <svg
                viewBox="0 0 64 64"
                fill="none"
              >
                <path
                  d="M52.8 7.2C36.3 8.5 20.1 14.7 13.1 27.4C7.8 37.1 9.5 48.1 17.8 55.6C25.4 62.5 37.2 58.5 44.7 50.6C53.1 41.8 56.3 27.5 52.8 7.2Z"
                  fill="currentColor"
                />
                <path
                  d="M13 56C18.2 40.2 27.5 28.7 42.6 20.8"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="bottom-card-text">
              <strong>
                Already have an account?
              </strong>

              <span>
                Log in to your ReUse Connect account.
              </span>
            </div>

            <button
              type="button"
              className="bottom-card-link"
              onClick={() => navigate('/login')}
            >
              Log In
              <ArrowIcon />
            </button>

          </div>

        </div>
      </main>
    </div>
  );
};

export default Register;