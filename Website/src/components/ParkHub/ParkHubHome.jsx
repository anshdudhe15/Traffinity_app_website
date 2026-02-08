import React from 'react';
import { Link } from 'react-router-dom';
import '../LandingPage.css'; // Reuse Landing Page styles

const ParkHubHome = () => {
  const options = [
    {
      title: 'Create Layout',
      description: 'Design new parking lots, define slots, and set pricing.',
      icon: '✏️',
      gradient: 'linear-gradient(135deg, #ff8a00 0%, #d74177 100%)',
      link: '/parkhub/create-layout'
    },
    {
      title: 'Manage Parking',
      description: 'View live status, book slots, and manage vehicle flow.',
      icon: '🅿️',
      gradient: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
      link: '/parkhub/manage-parking'
    }
  ];

  return (
    <div className="features-section" style={{ paddingTop: '2rem' }}>
      <h2 className="features-title">ParkHub</h2>
      <div className="features-grid">
        {options.map((option, index) => (
          <div 
            key={option.title} 
            className="card-wrapper visible" // Force visible since no scroll observer here
            style={{ opacity: 1, transform: 'none' }}
          >
            <Link to={option.link} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
              <div
                className="feature-card"
                style={{ '--card-gradient': option.gradient }}
              >
                <div className="card__border"></div>
                <div className="feature-icon" aria-hidden="true">{option.icon}</div>
                <h3>{option.title}</h3>
                <p>{option.description}</p>
                <div className="feature-meta"></div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParkHubHome;
