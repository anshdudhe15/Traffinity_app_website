import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './TrafficSync.css';
import '../LandingPage.css'; // Import Landing Page styles for theme consistency

const TrafficSync = ({ isDarkMode, toggleTheme, userEmail, handleLogout }) => {
  const [junctionType, setJunctionType] = useState(4); // 3 or 4 way
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [activeLight, setActiveLight] = useState(0); // Index of road currently green
  const [timers, setTimers] = useState({}); // { 0: 30, 1: 0 ... }

  const handleImageUpload = (roadIndex, file) => {
    setImages(prev => ({ ...prev, [roadIndex]: file }));
  };

  const calculateTraffic = async () => {
    // Validate that all images are uploaded
    const missingImages = [];
    for (let i = 0; i < junctionType; i++) {
      if (!images[i]) missingImages.push(i + 1);
    }

    if (missingImages.length > 0) {
      alert(`Please upload images for all roads. Missing: Road ${missingImages.join(', ')}`);
      return;
    }

    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('junction_type', junctionType);
      
      // Append images in order so the backend processes them correctly (Road 1, Road 2, etc.)
      for (let i = 0; i < junctionType; i++) {
        formData.append('files', images[i]);
      }

      // Call the Python Backend
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Analysis Results:", data);

      setResults(data);
      
      // Initialize timers based on the backend response
      const initialTimers = {};
      data.forEach((r) => initialTimers[r.roadId] = r.greenTime);
      setTimers(initialTimers);
      setActiveLight(0);

    } catch (error) {
      console.error("Calculation failed", error);
      alert("Failed to connect to the AI Backend. Make sure the Python server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  // Simulation Loop
  useEffect(() => {
    if (!results) return;

    const interval = setInterval(() => {
      setTimers(prev => {
        const currentTimer = prev[activeLight];
        
        if (currentTimer <= 0) {
          // Switch to next light
          const nextLight = (activeLight + 1) % junctionType;
          setActiveLight(nextLight);
          // Reset timer for the new green light (reload from results)
          return {
            ...prev,
            [nextLight]: results[nextLight].greenTime
          };
        }

        return {
          ...prev,
          [activeLight]: currentTimer - 1
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [results, activeLight, junctionType]);

  return (
    <div className={`trafficsync-page ${isDarkMode ? 'dark-mode' : ''}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: isDarkMode ? '#000000' : '#f8fafc' }}>
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

      <div className="trafficsync-container">
        <div className="trafficsync-header">
          <h1>TrafficSync</h1>
        <p>AI-Powered Adaptive Traffic Control</p>
      </div>

      <div className="trafficsync-grid" style={{ gridTemplateColumns: results ? '1fr 1fr' : '1fr' }}>
        {/* Control Panel */}
        <div className="control-panel" style={{ maxWidth: results ? 'none' : '600px', margin: results ? '0' : '0 auto' }}>
          <h2>Configuration</h2>
          
          <div className="form-group">
            <label>Junction Type</label>
            <select 
              value={junctionType} 
              onChange={(e) => setJunctionType(Number(e.target.value))}
              className="form-control"
            >
              <option value={3}>3-Way Junction</option>
              <option value={4}>4-Way Junction</option>
            </select>
          </div>

          <div className="road-inputs">
            {Array.from({ length: junctionType }).map((_, idx) => (
              <div key={idx} className="road-card">
                <label>Road {idx + 1} Feed</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(idx, e.target.files[0])}
                  className="file-input"
                />
                {results && results[idx] && (
                  <div className="vehicle-counts">
                    <span className="count-badge">🚗 {results[idx].counts.cars}</span>
                    <span className="count-badge">🏍️ {results[idx].counts.bikes}</span>
                    <span className="count-badge">🚛 {results[idx].counts.trucks}</span>
                    <span className="count-badge" style={{color: '#06D6A0'}}>
                      ⏱️ {results[idx].greenTime}s
                    </span>
                    {results[idx].emergency && (
                      <span className="count-badge" style={{backgroundColor: '#ff4757', color: 'white'}}>
                        🚨 EMERGENCY
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button 
            className="calculate-btn" 
            onClick={calculateTraffic}
            disabled={loading}
          >
            {loading ? 'Analyzing Traffic...' : 'Sync Traffic Lights'}
          </button>

          <div style={{marginTop: '20px', fontSize: '0.8rem', color: '#888'}}>
            <p><strong>Note:</strong> To use the actual Python AI backend:</p>
            <ol style={{paddingLeft: '20px'}}>
              <li>Install Python dependencies: <code>pip install -r backend/requirements.txt</code></li>
              <li>Run server: <code>python backend/main.py</code></li>
              <li>This demo uses simulated data for preview.</li>
            </ol>
          </div>
        </div>

        {/* Simulation Panel - Only shown after results are calculated */}
        {results && (
          <div className="simulation-panel">
            <div className="intersection">
              <div className="road road-vertical"></div>
              <div className="road road-horizontal"></div>
              
              {/* Traffic Lights */}
              {Array.from({ length: junctionType }).map((_, idx) => {
                const isGreen = activeLight === idx;
                const positionClass = ['light-top', 'light-right', 'light-bottom', 'light-left'][idx];
                
                return (
                  <div key={idx} className={`traffic-light-wrapper ${positionClass}`} style={{position: 'absolute'}}>
                    <div className={`traffic-light ${isGreen ? 'light-green' : 'light-red'}`}></div>
                    {isGreen && (
                      <div className="timer-display" style={{top: '-20px', left: '50%', transform: 'translateX(-50%)'}}>
                        {timers[idx]}s
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Center Hub */}
              <div style={{
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                width: '20px',
                height: '20px',
                background: '#222',
                borderRadius: '50%',
                zIndex: 10
              }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default TrafficSync;
