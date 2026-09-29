import React from 'react';

const LeafIcon = ({ size = 34 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M52.8 7.2C36.3 8.5 20.1 14.7 13.1 27.4C7.8 37.1 9.5 48.1 17.8 55.6C25.4 62.5 37.2 58.5 44.7 50.6C53.1 41.8 56.3 27.5 52.8 7.2Z"
      fill="currentColor"
    />
    <path
      d="M13 56C18.2 40.2 27.5 28.7 42.6 20.8"
      stroke="white"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  </svg>
);

const RecycleIcon = () => (
  <svg viewBox="0 0 64 64" fill="none">
    <path
      d="M25 9L17 23H25L31 13L36 21"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M43 21L51 35H43L37 25L32 34"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M37 47H21L25 40L17 40"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CommunityIcon = () => (
  <svg viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="20" r="8" stroke="currentColor" strokeWidth="5" />
    <circle cx="15" cy="27" r="6" stroke="currentColor" strokeWidth="5" />
    <circle cx="49" cy="27" r="6" stroke="currentColor" strokeWidth="5" />
    <path
      d="M20 50C20 41 25 35 32 35C39 35 44 41 44 50"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M5 49C5 42 9 37 15 37C18 37 21 39 23 42"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <path
      d="M59 49C59 42 55 37 49 37C46 37 43 39 41 42"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 64 64" fill="none">
    <path
      d="M32 7L51 14V29C51 42 43.5 52 32 57C20.5 52 13 42 13 29V14L32 7Z"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinejoin="round"
    />
    <path
      d="M23 32L29 38L42 24"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AuthBrandPanel = () => {
  return (
    <aside className="auth-brand-panel">
      {/* Decorative background shapes */}
      <div className="brand-orb brand-orb-top" />
      <div className="brand-orb brand-orb-bottom" />
      <div className="brand-wave brand-wave-one" />
      <div className="brand-wave brand-wave-two" />

      <div className="brand-content">

        {/* Logo */}
        <div className="brand-logo">
          <div className="brand-logo-leaf">
            <LeafIcon size={68} />
          </div>

          <div className="brand-logo-text">
            <div className="brand-name">ReUse</div>
            <div className="brand-connect">CONNECT</div>
          </div>
        </div>

        {/* Main message */}
        <div className="brand-message">
          <h1>
            Give items a <span>second life.</span>
            <br />
            Build a <span>stronger community.</span>
          </h1>

          <p>
            ReUse Connect is a sustainable marketplace
            <br />
            where people buy, sell, and share pre-loved items
            <br />
            while making a positive impact on the environment
            <br />
            and community.
          </p>
        </div>

        {/* Feature icons */}
        <div className="brand-features">

          <div className="brand-feature">
            <div className="feature-circle">
              <LeafIcon size={38} />
            </div>
            <div className="feature-title">
              Reduce
              <br />
              Waste
            </div>
          </div>

          <div className="brand-feature">
            <div className="feature-circle">
              <RecycleIcon />
            </div>
            <div className="feature-title">
              Support
              <br />
              Sustainability
            </div>
          </div>

          <div className="brand-feature">
            <div className="feature-circle">
              <CommunityIcon />
            </div>
            <div className="feature-title">
              Grow
              <br />
              Community
            </div>
          </div>

          <div className="brand-feature">
            <div className="feature-circle">
              <ShieldIcon />
            </div>
            <div className="feature-title">
              Safe &
              <br />
              Trusted
            </div>
          </div>

        </div>

        {/* Bottom visual */}
        <div className="brand-bottom-scene">

          <div className="scene-table" />

          <div className="scene-laptop">
            <div className="laptop-screen">
              <div className="laptop-message">
                Pre-loved
                <br />
                Items.
                <br />
                <span>Brighter</span>
                <br />
                Tomorrows.
                <span className="heart">♡</span>
              </div>
            </div>

            <div className="laptop-base">
              <div className="laptop-trackpad" />
            </div>
          </div>

          <div className="scene-box scene-box-one">
            <LeafIcon size={34} />
          </div>

          <div className="scene-box scene-box-two">
            <LeafIcon size={28} />
          </div>

          <div className="scene-fabric fabric-one" />
          <div className="scene-fabric fabric-two" />
          <div className="scene-fabric fabric-three" />

          <div className="scene-phone" />
        </div>

      </div>
    </aside>
  );
};

export default AuthBrandPanel;