import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import Spline from '@splinetool/react-spline';
import './LandingPage.css';

const LandingPage = ({ isDarkMode, toggleTheme, userEmail, handleLogout }) => {
  const [showCenterBrand, setShowCenterBrand] = useState(true);
  const spacerRef = useRef(null);

  const features = [
    {
      title: 'ParkHub',
      description: 'Manage parking layouts, vehicle types, and real-time bookings.',
      icon: '🅿️',
      link: '/parkhub'
    },
    {
      title: 'TrafficSync',
      description: 'AI-powered traffic signal control based on real-time vehicle density.',
      icon: '🚦',
      gradient: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
      link: '/trafficsync'
    },
    {
      title: 'SOS Map',
      description: 'Real-time emergency incident tracking and response coordination.',
      icon: '🆘',
      gradient: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
      link: '/sos-map'
    },
    {
      title: 'Civic Issues Map',
      description: 'View and resolve reported civic issues on an interactive map.',
      icon: '📊',
      gradient: 'linear-gradient(135deg, #f83600 0%, #f9d423 100%)',
      link: '/civic-map'
    },
  ];

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      setShowCenterBrand(current < 80); // Only visible near the very top
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    const wrappers = document.querySelectorAll('.card-wrapper');
    wrappers.forEach((wrapper) => observer.observe(wrapper));

    return () => wrappers.forEach((wrapper) => observer.unobserve(wrapper));
  }, []);

  return (
    <div className={`landing-page ${isDarkMode ? 'dark-mode' : ''}`}>
      <Navbar 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        userEmail={userEmail} 
        handleLogout={handleLogout}
      />
      
      <header className="hero-section">
        <div className={`hero-center-brand ${showCenterBrand ? 'visible' : 'hidden'}`}>
          Traffinity
        </div>
        <div className="spline-container">
          <Spline 
            scene={isDarkMode ? "/scene1.splinecode" : "/scene.splinecode"} 
          />
        </div>
      </header>

      <div className="transition-spacer" ref={spacerRef}></div>
      <section className="base-section">
        <div className="features-section">
          <h2 className="features-title">Feature</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={feature.title} 
                className={`card-wrapper ${index % 2 === 0 ? 'slide-left' : 'slide-right'}`}
              >
                {feature.link ? (
                  <Link to={feature.link} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                    <div
                      className="feature-card"
                      style={{ '--card-gradient': feature.gradient }}
                    >
                      <div className="card__border"></div>
                      <div className="feature-icon" aria-hidden="true">{feature.icon}</div>
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                      <div className="feature-meta"></div>
                    </div>
                  </Link>
                ) : (
                  <div
                    className="feature-card"
                    style={{ '--card-gradient': feature.gradient }}
                  >
                    <div className="card__border"></div>
                    <div className="feature-icon" aria-hidden="true">{feature.icon}</div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                    <div className="feature-meta"></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="integrated-footer">
            <div className="footer-promo">
              <div className="footer-promo-content">
                <h2>Experience superior<br />traffic control</h2>
                <p>Empower your citizens with the Traffinity mobile app. Real-time navigation, parking availability, and incident reporting at their fingertips.</p>
                <button className="footer-cta" onClick={() => { window.location.href = '/app'; }}>Get the App</button>
              </div>
              <div className="footer-promo-image">
                 <div className="globe-graphic"></div>
              </div>
            </div>

            <div className="footer-links-container">
                <div className="footer-content-wrapper">
                    <div className="footer-brand-section">
                        <div className="footer-logo">
                            <img src="/logo.png" alt="Traffinity" className="footer-logo-img" />
                            <span>Traffinity</span>
                        </div>
                        <address>
                            Pimpri Chinchwad College of Engineering (PCCoE)<br/>
                            Pune, Maharashtra 411044<br/>
                            India
                        </address>
                        <div className="footer-contact">
                            <div className="contact-group">
                                <label>Phone number</label>
                                <span>+91 12345 67890</span>
                            </div>
                            <div className="contact-group">
                                <label>Email</label>
                                <span>support@traffinity.app</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="footer-nav">
                        <div className="nav-col">
                            <h4>Quick links</h4>
                            <ul>
                                <li><a href="/pricing">Pricing</a></li>
                                <li><a href="/resources">Resources</a></li>
                                <li><a href="/about">About us</a></li>
                                <li><a href="/faq">FAQ</a></li>
                                <li><a href="/contact">Contact us</a></li>
                            </ul>
                        </div>
                        <div className="nav-col">
                            <h4>Social</h4>
                            <ul>
                                <li><a href="https://facebook.com">Facebook</a></li>
                                <li><a href="https://instagram.com">Instagram</a></li>
                                <li><a href="https://linkedin.com">LinkedIn</a></li>
                                <li><a href="https://twitter.com">Twitter</a></li>
                                <li><a href="https://youtube.com">Youtube</a></li>
                            </ul>
                        </div>
                        <div className="nav-col">
                            <h4>Legal</h4>
                            <ul>
                                <li><a href="/terms">Terms of service</a></li>
                                <li><a href="/privacy">Privacy policy</a></li>
                                <li><a href="/cookies">Cookie policy</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="footer-copyright">
                    © {new Date().getFullYear()} Traffinity. All rights reserved.
                </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
