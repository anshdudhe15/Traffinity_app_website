import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import '../LandingPage.css'; // Import Landing Page styles for theme consistency
import './ParkHub.css'; // Custom overrides

const ParkHub = ({ isDarkMode, toggleTheme, userEmail, userId, session, handleLogout }) => {
  const location = useLocation();
  const isHome = location.pathname === '/parkhub';

  return (
    <div className={`landing-page parkhub-wrapper ${isDarkMode ? 'dark-mode' : ''}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Simple Header matching Landing Page style */}
      <nav className={`navbar visible ${isDarkMode ? 'dark-mode' : ''}`} style={{ position: 'sticky', top: 0 }}>
        <div className="navbar-content">
          <div className="nav-left">
            <Link to="/" className="brand-name" style={{ textDecoration: 'none' }}>
              Traffinity
            </Link>
          </div>
          <div className="nav-right">
            <button className="glass-btn theme-btn" onClick={toggleTheme} aria-label="Toggle Theme" style={{ marginRight: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center' }}>
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              )}
            </button>
            {!isHome && (
              <Link to="/parkhub" className="nav-link" style={{ marginRight: '20px' }}>
                Back to Menu
              </Link>
            )}
            <Link to="/" className="nav-link" style={{ marginRight: '15px' }}>Home</Link>
            <Link to="/profile" className="glass-btn profile-btn" aria-label="Profile" style={{ marginRight: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </Link>
            <button className="glass-btn logout-btn" onClick={handleLogout} aria-label="Log Out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Outlet context={{ userId, userEmail, session }} />
      </main>
    </div>
  );
};

export default ParkHub;
