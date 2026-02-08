import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import Navbar from '../Navbar';
import './CivicIssuesMap.css';
import tt from '@tomtom-international/web-sdk-maps';
import * as ttServices from '@tomtom-international/web-sdk-services';
import '@tomtom-international/web-sdk-maps/dist/maps.css';

const CivicIssuesMap = ({ isDarkMode, toggleTheme, userEmail, userId, handleLogout }) => {
  const mapContainer = useRef(null);
  const [map, setMap] = useState(null);
  const [issues, setIssues] = useState([]);
  const [activeIssue, setActiveIssue] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapError, setMapError] = useState('');
  const [showError, setShowError] = useState(true);
  const [fetchStatus, setFetchStatus] = useState('Loading...');
  
  // Modals
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  // Resolve Form
  const [resolveDesc, setResolveDesc] = useState('');
  const [resolvePhoto, setResolvePhoto] = useState(null);
  const [resolving, setResolving] = useState(false);

  // 1. Fetch Issues
  useEffect(() => {
    fetchIssues();
    
    const subscription = supabase
      .channel('civic_issues_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'civic_issues' }, () => {
        fetchIssues();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchIssues = async () => {
    setFetchStatus('Loading...');
    try {
      // Use direct REST API to avoid Supabase client hanging issues
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pmsemyznsxeigmfhzyfg.supabase.co';
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc2VteXpuc3hlaWdtZmh6eWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjgyODcsImV4cCI6MjA3NzUwNDI4N30.xkvQ8w_Lq9eAAsmpu9TETNB8CkAkOnceIdv27-GdCek';
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/civic_issues?select=*&is_resolved=eq.false`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data) {
        setIssues(data);
        setFetchStatus(`✅ Loaded ${data.length} issues`);
        updateMapMarkers(data);
      }
    } catch (err) {
      console.error('Error fetching issues:', err);
      setFetchStatus(`Error: ${err.message}`);
    }
  };

  // 2. Initialize Map
  useEffect(() => {
    if (!mapContainer.current || map) return;

    const apiKey = import.meta.env.VITE_TOMTOM_API_KEY;
    if (!apiKey) {
      setMapError('TomTom API key missing');
      return;
    }

    const newMap = tt.map({
      key: apiKey,
      container: mapContainer.current,
      center: [73.8567, 18.5204], // Default to Pune
      zoom: 12,
      style: isDarkMode 
        ? 'https://api.tomtom.com/map/1/style/20.0.0-8/basic_night.json' 
        : 'https://api.tomtom.com/map/1/style/20.0.0-8/basic_main.json',
    });

    newMap.addControl(new tt.FullscreenControl());
    newMap.addControl(new tt.NavigationControl());

    setMap(newMap);

    // Get User Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lon: longitude });
          newMap.flyTo({ center: [longitude, latitude], zoom: 14 });
          
          // Add user marker
          const element = document.createElement('div');
          element.className = 'user-marker';
          element.style.width = '20px';
          element.style.height = '20px';
          element.style.background = '#06D6A0';
          element.style.borderRadius = '50%';
          element.style.border = '3px solid white';
          element.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';

          new tt.Marker({ element })
            .setLngLat([longitude, latitude])
            .addTo(newMap);
        },
        (error) => console.error('Error getting location:', error)
      );
    }

    return () => newMap.remove();
  }, [isDarkMode]);

  // Update Markers
  const markersRef = useRef({});
  const updateMapMarkers = (currentIssues) => {
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    currentIssues.forEach(issue => {
      if (issue.latitude && issue.longitude) {
        const element = document.createElement('div');
        element.className = 'issue-marker';
        element.innerHTML = '⚠️';
        element.style.fontSize = '24px';
        element.style.cursor = 'pointer';

        const marker = new tt.Marker({ element })
          .setLngLat([issue.longitude, issue.latitude])
          .addTo(map);

        marker.getElement().addEventListener('click', () => {
          setActiveIssue(issue);
          map.flyTo({ center: [issue.longitude, issue.latitude], zoom: 16 });
        });

        markersRef.current[issue.id] = marker;
      }
    });
  };

  useEffect(() => {
    if (map && issues.length > 0) {
      updateMapMarkers(issues);
    }
  }, [map, issues]);

  // Actions
  const handleGetDirection = async (issue) => {
    if (!userLocation || !map) {
      alert('User location not found. Please enable GPS.');
      return;
    }

    try {
      const route = await ttServices.services.calculateRoute({
        key: import.meta.env.VITE_TOMTOM_API_KEY,
        locations: `${userLocation.lon},${userLocation.lat}:${issue.longitude},${issue.latitude}`
      });

      if (route.routes && route.routes.length > 0) {
        const geojson = route.routes[0].legs[0].points.map(p => [p.lng, p.lat]);
        
        if (map.getLayer('route')) {
          map.removeLayer('route');
          map.removeSource('route');
        }

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: geojson
            }
          }
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': '#06D6A0',
            'line-width': 6
          }
        });

        const bounds = new tt.LngLatBounds();
        geojson.forEach(point => bounds.extend(point));
        map.fitBounds(bounds, { padding: 50 });
      }
    } catch (err) {
      console.error('Error calculating route:', err);
      alert('Could not calculate route.');
    }
  };

  const openInfoModal = (issue) => {
    setSelectedIssue(issue);
    setShowInfoModal(true);
  };

  const openResolveModal = (issue) => {
    setSelectedIssue(issue);
    setShowResolveModal(true);
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setResolving(true);

    try {
      let photoUrl = null;

      // Upload photo if selected
      if (resolvePhoto) {
        const fileExt = resolvePhoto.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${selectedIssue.id}/${fileName}`;

        // Add timeout to storage upload to prevent hanging
        const uploadPromise = supabase.storage
          .from('civic_issues')
          .upload(filePath, resolvePhoto);
          
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timed out')), 5000)
        );

        try {
          const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

          if (uploadError) {
              console.warn("Upload failed:", uploadError);
          } else {
               const { data: { publicUrl } } = supabase.storage
              .from('civic_issues')
              .getPublicUrl(filePath);
              photoUrl = publicUrl;
          }
        } catch (timeoutErr) {
          console.warn("Photo upload timed out, proceeding without photo.");
        }
      }

      // Update Issue using REST API (to avoid client hanging)
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pmsemyznsxeigmfhzyfg.supabase.co';
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc2VteXpuc3hlaWdtZmh6eWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjgyODcsImV4cCI6MjA3NzUwNDI4N30.xkvQ8w_Lq9eAAsmpu9TETNB8CkAkOnceIdv27-GdCek';

      const updateData = {
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_description: resolveDesc,
        resolved_photo_url: photoUrl,
        resolved_by_name: userEmail || 'Admin', 
        resolved_by_id: userId || null
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/civic_issues?id=eq.${selectedIssue.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation' // Change to representation to verify update
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result && result.length === 0) {
        throw new Error('Update failed. No rows were affected. Check RLS policies.');
      }

      setShowResolveModal(false);
      setResolveDesc('');
      setResolvePhoto(null);
      fetchIssues(); // Refresh list
      alert('Issue resolved successfully!');

    } catch (err) {
      console.error('Error resolving issue:', err);
      alert(`Failed to resolve issue: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className={`civic-map-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <Navbar 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        userEmail={userEmail} 
        handleLogout={handleLogout}
      />

      {mapError && showError && (
        <div style={{ 
          position: 'fixed', 
          top: '70px', 
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 12px', 
          background: '#ffeded', 
          color: '#b00020', 
          borderRadius: '6px', 
          border: '1px solid #f5c2c2', 
          zIndex: 1100, 
          maxWidth: '90%',
          fontSize: '0.85rem',
          fontWeight: '500',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️ {mapError}</span>
          <button 
            onClick={() => setShowError(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b00020',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '0 4px',
              lineHeight: '1'
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="civic-sidebar">
        <h2 className="civic-title">Civic Issues Map</h2>
        <div className="status-bar">{fetchStatus}</div>
        
        <div className="issues-list">
          {issues.map(issue => (
            <div 
              key={issue.id} 
              className={`issue-card ${activeIssue?.id === issue.id ? 'active' : ''}`}
              onClick={() => {
                setActiveIssue(issue);
                if (map) map.flyTo({ center: [issue.longitude, issue.latitude], zoom: 16 });
              }}
            >
              <div className="issue-header">
                <span className="issue-type">{issue.issue_type}</span>
                <span className="issue-time">{new Date(issue.created_at).toLocaleDateString()}</span>
              </div>
              <p className="issue-desc">{issue.description}</p>
              
              <div className="issue-actions">
                <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleGetDirection(issue); }}>
                  📍 Direction
                </button>
                <button className="action-btn" onClick={(e) => { e.stopPropagation(); openInfoModal(issue); }}>
                  ℹ️ Info
                </button>
                <button className="action-btn" onClick={(e) => { e.stopPropagation(); openResolveModal(issue); }}>
                  ✅ Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div ref={mapContainer} className="map-container" />
      {mapError && <div className="map-error">{mapError}</div>}

      {/* Info Modal */}
      {showInfoModal && selectedIssue && (
        <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Issue Details</h3>
              <button className="close-btn" onClick={() => setShowInfoModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-row">
                <div className="info-label">Type</div>
                <div className="info-value">{selectedIssue.issue_type}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Description</div>
                <div className="info-value">{selectedIssue.description}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Location</div>
                <div className="info-value">{selectedIssue.latitude.toFixed(6)}, {selectedIssue.longitude.toFixed(6)}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Reported At</div>
                <div className="info-value">{new Date(selectedIssue.created_at).toLocaleString()}</div>
              </div>
              {selectedIssue.photo_url && (
                <img src={selectedIssue.photo_url} alt="Issue" className="issue-image" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedIssue && (
        <div className="modal-overlay" onClick={() => setShowResolveModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Resolve Issue</h3>
              <button className="close-btn" onClick={() => setShowResolveModal(false)}>×</button>
            </div>
            <form onSubmit={handleResolveSubmit}>
              <div className="form-group">
                <label className="form-label">Resolution Description</label>
                <textarea 
                  className="form-textarea" 
                  rows="4" 
                  value={resolveDesc}
                  onChange={(e) => setResolveDesc(e.target.value)}
                  required
                  placeholder="How was this issue resolved?"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Proof of Resolution (Photo)</label>
                <input 
                  type="file" 
                  className="form-input" 
                  accept="image/*"
                  onChange={(e) => setResolvePhoto(e.target.files[0])}
                />
              </div>
              <button type="submit" className="submit-btn" disabled={resolving}>
                {resolving ? 'Resolving...' : 'Mark as Resolved'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CivicIssuesMap;
