import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import Navbar from '../Navbar';
import './SOSMap.css';
import tt from '@tomtom-international/web-sdk-maps';
import * as ttServices from '@tomtom-international/web-sdk-services';
import '@tomtom-international/web-sdk-maps/dist/maps.css';

const SOSMap = ({ isDarkMode, toggleTheme, userEmail, handleLogout }) => {
  const mapContainer = useRef(null);
  const [map, setMap] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [activeIncident, setActiveIncident] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapError, setMapError] = useState('');
  const [showError, setShowError] = useState(true);
  const [fetchStatus, setFetchStatus] = useState('Loading...');
  const markersRef = useRef({}); 
  
  // Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedIncidentForModal, setSelectedIncidentForModal] = useState(null);

  const getIncidentCoords = (incident) => {
    const latitude = incident?.latitude ?? incident?.lat ?? incident?.location_lat ?? incident?.location_latitude;
    const longitude = incident?.longitude ?? incident?.lng ?? incident?.lon ?? incident?.location_longitude ?? incident?.location_lon;
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null;
    return { lat: latNum, lon: lonNum };
  };

  const getIncidentDescription = (incident) => (
    incident?.description || incident?.incident_description || incident?.details || 'Emergency assistance requested.'
  );

  // 1. Fetch Incidents
  useEffect(() => {
    fetchIncidents();
    
    const subscription = supabase
      .channel('sos_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_incidents' }, () => {
        fetchIncidents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchIncidents = async () => {
    setFetchStatus('Loading...');
    
    try {
      // Use direct REST API (Supabase client was hanging)
      const response = await fetch(import.meta.env.VITE_SUPABASE_URL + '/rest/v1/user_incidents?select=*', {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });
      
      const data = await response.json();
      const error = response.ok ? null : { message: `HTTP ${response.status}` };
      
      if (error) {
        console.error('❌ Error fetching incidents:', error.message);
        setFetchStatus(`❌ Error: ${error.message}`);
        setIncidents([]);
      } else if (!data || data.length === 0) {
        setFetchStatus('⚠️ 0 rows - Click "+ Add Test Incident"');
        setIncidents([]);
      } else {
        // Filter unresolved in frontend
        const unresolved = data.filter(inc => !inc.resolved) || [];
        setFetchStatus(`✅ Loaded ${data.length} total (${unresolved.length} active)`);
        setIncidents(unresolved);
      }
    } catch (err) {
      console.error('💥 Exception:', err);
      setFetchStatus(`💥 Exception: ${err.message}`);
      setIncidents([]);
    }
  };

  // 2. Initialize Map
  useEffect(() => {
    console.log('🗺️ Initializing Leaflet map...');
    if (!mapContainer.current) {
      console.error('❌ Map container ref is null!');
      return;
    }

    // Prevent double initialization
    if (map) {
      return;
    }
    
    try {
      const apiKey = import.meta.env.VITE_TOMTOM_API_KEY;
      if (!apiKey) {
        setMapError('TomTom API key missing');
        return;
      }
      
      // Create TomTom map
      const newMap = tt.map({
        key: apiKey,
        container: mapContainer.current,
        center: [77.2090, 28.6139],
        zoom: 12,
        dragPan: true,
        scrollZoom: true,
        touchZoom: true,
        doubleClickZoom: true
      });

      newMap.addControl(new tt.NavigationControl());
      newMap.addControl(new tt.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }));

      setMap(newMap);

      // Get User Location
      console.log('📍 Requesting geolocation...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          console.log('✅ Location found:', latitude, longitude);
          setUserLocation([longitude, latitude]);
          newMap.setCenter([longitude, latitude]);
          
          // Add blue marker for user location
          const userMarker = document.createElement('div');
          userMarker.style.width = '20px';
          userMarker.style.height = '20px';
          userMarker.style.borderRadius = '50%';
          userMarker.style.backgroundColor = '#4A90E2';
          userMarker.style.border = '3px solid white';
          userMarker.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
          
          new tt.Marker({ element: userMarker })
            .setLngLat([longitude, latitude])
            .addTo(newMap);
        },
        (err) => {
          console.error('❌ Geolocation error:', err);
          alert('Please enable location access to use directions');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

    } catch (err) {
      console.error("Map initialization error:", err);
      setMapError('Map failed to load: ' + err.message);
    }

    return () => {
      if (map) map.remove();
    };
  }, []);

  // 3. Update Markers
  useEffect(() => {
    if (!map || !incidents) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    incidents.forEach(incident => {
      const coords = getIncidentCoords(incident);
      if (!coords) {
        console.warn('⚠️ No coordinates for incident:', incident.id);
        return;
      }

      const element = document.createElement('div');
      element.className = 'marker-sos';
      element.style.backgroundImage = 'url("https://cdn-icons-png.flaticon.com/512/564/564619.png")';
      element.style.width = '40px';
      element.style.height = '40px';
      element.style.backgroundSize = 'cover';

      const marker = new tt.Marker({ element })
        .setLngLat([coords.lon, coords.lat])
        .addTo(map);
      
      marker.getElement().addEventListener('click', () => {
        setActiveIncident(incident);
      });
      
      markersRef.current[incident.id] = marker;
    });
  }, [map, incidents]);

  // 4. Handle Incident Selection (Hover/Click)
  useEffect(() => {
    if (!map || !activeIncident) return;

    const coords = getIncidentCoords(activeIncident);
    if (!coords) return;

    map.flyTo({ center: [coords.lon, coords.lat], zoom: 15 });

  }, [activeIncident, map]);

  // 5. Direction Logic with Extended Routing API
  const handleDirection = async (incident) => {
    console.log('Direction clicked - User location:', userLocation);
    console.log('Map exists:', !!map);
    
    if (!userLocation || !map) {
      alert("Please enable location services and wait for your location to be detected.");
      return;
    }

    const coords = getIncidentCoords(incident);
    console.log('Incident coords:', coords);
    
    if (!coords) {
      alert("Location details missing for this incident.");
      return;
    }

    try {
      console.log('🚗 Calculating route...');
      console.log('From:', userLocation[1], userLocation[0]);
      console.log('To:', coords.lat, coords.lon);
      
      // Use Extended Routing API with detailed parameters
      const response = await fetch(
        `https://api.tomtom.com/routing/1/calculateRoute/${userLocation[1]},${userLocation[0]}:${coords.lat},${coords.lon}/json?` +
        new URLSearchParams({
          key: import.meta.env.VITE_TOMTOM_API_KEY,
          routeType: 'fastest',
          traffic: 'true',
          travelMode: 'car',
          instructionsType: 'text',
          language: 'en-US',
          computeBestOrder: 'false',
          sectionType: 'traffic',
          report: 'effectiveSettings'
        })
      );

      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = data.routes[0];
      const routeCoordinates = route.legs[0].points.map(point => [point.longitude, point.latitude]);

      console.log('✅ Route calculated:', {
        distance: `${(route.summary.lengthInMeters / 1000).toFixed(2)} km`,
        duration: `${Math.round(route.summary.travelTimeInSeconds / 60)} min`,
        instructions: route.guidance?.instructions?.length || 0
      });

      // Remove existing route
      if (map.getLayer('route')) {
        map.removeLayer('route');
        map.removeSource('route');
      }

      // Add route line
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        }
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#06D6A0',
          'line-width': 6,
          'line-opacity': 0.8
        }
      });

      // Fit map to show entire route
      const bounds = new tt.LngLatBounds();
      routeCoordinates.forEach(coord => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 80 });

      // Show route summary
      alert(
        `Route Found!\n\n` +
        `Distance: ${(route.summary.lengthInMeters / 1000).toFixed(2)} km\n` +
        `Duration: ${Math.round(route.summary.travelTimeInSeconds / 60)} minutes\n` +
        `Traffic: ${route.summary.trafficDelayInSeconds ? Math.round(route.summary.trafficDelayInSeconds / 60) + ' min delay' : 'No delays'}`
      );

    } catch (error) {
      console.error("Route error:", error);
      alert("Could not calculate route. Please try again.");
    }
  };

  // 6. Resolve Incident
  const handleResolve = async (incident) => {
    if (window.confirm("Mark this incident as resolved?")) {
      try {
        console.log('🔵 Starting resolve for incident:', incident.id);

        // Get user info WITHOUT waiting for session (avoid hanging)
        let userId = null;
        try {
          const localSession = JSON.parse(localStorage.getItem('sb-pmsemyznsxeigmfhzyfg-auth-token'));
          userId = localSession?.user?.id || 'unknown-admin';
          console.log('📝 Admin ID from localStorage:', userId);
        } catch (e) {
          userId = 'unknown-admin';
          console.warn('⚠️ Could not get user from localStorage, using fallback');
        }

        // Use REST API with anon key (RLS allows public UPDATE)
        const resolvePayload = {
          resolved: true,
          solved_by_admin: userId,
          resolved_at: new Date().toISOString()
        };

        console.log('📦 Payload:', resolvePayload);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_incidents?id=eq.${incident.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(resolvePayload)
          }
        );

        console.log('📡 Response status:', response.status);

        if (response.ok) {
          console.log('✅ Incident resolved successfully!');
          alert("Incident resolved successfully!");
          setActiveIncident(null);
          fetchIncidents();
        } else {
          const errorText = await response.text();
          console.error('❌ Resolve failed:', response.status, errorText);
          alert(`Failed to resolve: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        alert("Error resolving incident: " + error.message);
        console.error('❌ Resolve error:', error);
      }
    }
  };

  return (
    <div className={`sos-map-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <Navbar 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        userEmail={userEmail} 
        handleLogout={handleLogout}
      />

      <div 
        ref={mapContainer} 
        className="map-container" 
        style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '500px'
        }} 
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

      <div className="sos-sidebar">
        <h2 className="sos-title">SOS Incidents</h2>
        {incidents.length === 0 ? (
          <p style={{ color: isDarkMode ? '#ccc' : '#666' }}>No active incidents.</p>
        ) : (
          incidents.map(incident => {
            const reportedAt = incident.sent_at || incident.created_at || incident.createdAt || incident.reported_at;
            const incidentTime = reportedAt ? new Date(reportedAt).toLocaleTimeString() : 'Time unavailable';
            const reporter = incident.user_name || incident.reported_by || incident.user_email;
            const coords = getIncidentCoords(incident);

            return (
              <div 
                key={incident.id}
                className={`incident-card ${activeIncident?.id === incident.id ? 'active' : ''}`}
                onMouseEnter={() => setActiveIncident(incident)}
                onClick={() => setActiveIncident(incident)}
              >
                <div className="incident-header">
                  <span className="incident-type">SOS Signal</span>
                  <span className="incident-time">{incidentTime}</span>
                </div>
                <p className="incident-desc">{getIncidentDescription(incident)}</p>
                {reporter && (
                  <p className="incident-desc" style={{ fontSize: '0.8rem', opacity: 0.8, color: '#06D6A0' }}>
                    Reported by: {reporter}
                  </p>
                )}
                
                {activeIncident?.id === incident.id && (
                  <div 
                    className="incident-actions" 
                    style={{ position: 'relative', zIndex: 999, pointerEvents: 'auto' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      className="btn-direction"
                      onClick={() => {
                        console.log('🚗 Direction button clicked');
                        handleDirection(incident);
                      }}
                      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    >
                      Get Direction
                    </button>
                    <button 
                      className="btn-details"
                      onClick={() => {
                        console.log('👤 Details button clicked');
                        setSelectedIncidentForModal(incident);
                        setShowUserModal(true);
                      }}
                      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    >
                      User Details
                    </button>
                    <button 
                      className="btn-resolve"
                      onClick={() => {
                        console.log('✅ Resolve button clicked');
                        handleResolve(incident);
                      }}
                      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedIncidentForModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">User Details</h3>
              <button className="close-btn" onClick={() => setShowUserModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-row">
                <div className="info-label">Name</div>
                <div className="info-value">{selectedIncidentForModal.user_name || selectedIncidentForModal.reported_by || 'N/A'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Email</div>
                <div className="info-value">{selectedIncidentForModal.user_email || selectedIncidentForModal.email || 'N/A'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Phone</div>
                <div className="info-value">{selectedIncidentForModal.phone_number || 'N/A'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">City</div>
                <div className="info-value">{selectedIncidentForModal.city || 'N/A'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Reported At</div>
                <div className="info-value">
                  {selectedIncidentForModal.sent_at 
                    ? new Date(selectedIncidentForModal.sent_at).toLocaleString() 
                    : (selectedIncidentForModal.created_at ? new Date(selectedIncidentForModal.created_at).toLocaleString() : 'N/A')}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Location</div>
                <div className="info-value">
                  {getIncidentCoords(selectedIncidentForModal)?.lat.toFixed(6)}, {getIncidentCoords(selectedIncidentForModal)?.lon.toFixed(6)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SOSMap;
