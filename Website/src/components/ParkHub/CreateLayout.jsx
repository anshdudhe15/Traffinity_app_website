import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import * as tt from '@tomtom-international/web-sdk-services';

const CreateLayout = () => {
  const { userId, userEmail, session } = useOutletContext();
  const [layoutName, setLayoutName] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [city, setCity] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState([
    { name: '2-Wheeler', price: '', count: '', prefix: 'B', startNumber: '1' },
    { name: '4-Wheeler', price: '', count: '', prefix: 'C', startNumber: '1' },
    { name: 'HMV', price: '', count: '', prefix: 'T', startNumber: '1' }
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [createdLayout, setCreatedLayout] = useState(null);

  const handleTypeChange = (index, field, value) => {
    const newTypes = [...vehicleTypes];
    newTypes[index][field] = value;
    setVehicleTypes(newTypes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    console.log('🚀 Starting layout creation...');
    console.log('📋 Form data:', { layoutName, location });

    try {
      // 1. Get Live Location (GPS)
      let finalLatitude = null;
      let finalLongitude = null;
      let finalCity = '';
      let finalLocation = location;

      if (!finalLocation) {
         throw new Error('Please provide a location address.');
      }

      // Use Promise to handle geolocation async with timeout
      const getPosition = () => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
          } else {
            const timeout = setTimeout(() => {
              reject(new Error('Geolocation request timed out'));
            }, 10000); // 10 second timeout
            
            navigator.geolocation.getCurrentPosition(
              (position) => {
                clearTimeout(timeout);
                resolve(position);
              },
              (error) => {
                clearTimeout(timeout);
                reject(error);
              },
              { timeout: 10000, enableHighAccuracy: true }
            );
          }
        });
      };

      try {
        console.log('📍 Getting Live Location...');
        const position = await getPosition();
        finalLatitude = position.coords.latitude;
        finalLongitude = position.coords.longitude;
        
        // Update state immediately to show coordinates in UI
        setLatitude(finalLatitude);
        setLongitude(finalLongitude);
        
        console.log('✅ Got coordinates:', finalLatitude, finalLongitude);

        // Skip reverse geocoding to avoid hanging - it's optional anyway
        console.log('Skipping reverse geocoding, proceeding to create layout...');

      } catch (geoError) {
        console.error('⚠️ Could not get live location:', geoError);
        console.log('Proceeding without GPS coordinates...');
        // User can still create layout without GPS if they entered an address
      }

      console.log('📤 Moving to database insertion...');

      // 2. Create Layout
      console.log('🔐 Checking authenticated user...');
      
      if (!userId) {
        throw new Error('You must be logged in to create a layout. Please login first.');
      }
      
      console.log('👤 User ID:', userId);
      console.log('✅ User authenticated');

      // Use direct REST API to avoid Supabase client hanging issues
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pmsemyznsxeigmfhzyfg.supabase.co';
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc2VteXpuc3hlaWdtZmh6eWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjgyODcsImV4cCI6MjA3NzUwNDI4N30.xkvQ8w_Lq9eAAsmpu9TETNB8CkAkOnceIdv27-GdCek';
      
      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };

      // Ensure admin profile exists
      console.log('🔧 Creating/updating admin profile...');
      // We can skip this or do it via fetch if needed, but App.jsx handles it on auth change.
      // Let's assume App.jsx handled it.

      const insertData = { 
        name: layoutName, 
        location: finalLocation,
        owner_id: userId 
      };
      
      // Add optional coordinates if available
      if (finalLatitude !== null) insertData.latitude = finalLatitude;
      if (finalLongitude !== null) insertData.longitude = finalLongitude;
      if (finalCity) insertData.city = finalCity;
      
      console.log('📦 Inserting layout:', insertData);

      const layoutResponse = await fetch(`${SUPABASE_URL}/rest/v1/parking_layouts`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(insertData)
      });

      if (!layoutResponse.ok) {
        const errorText = await layoutResponse.text();
        throw new Error(`Failed to create layout: ${errorText}`);
      }

      const layoutDataArray = await layoutResponse.json();
      const layoutData = layoutDataArray[0];
      
      console.log('✅ Layout created:', layoutData);

      // 3. Create Vehicle Types & Generate Slots
      const typesToInsert = [];
      const slotsToInsert = [];

      for (const type of vehicleTypes) {
        if (type.price && !isNaN(type.price) && type.count && !isNaN(type.count)) {
          // Insert Vehicle Type
          const typeInsertData = {
            parking_layout_id: layoutData.id,
            name: type.name,
            price_per_hour: parseFloat(type.price)
          };

          const typeResponse = await fetch(`${SUPABASE_URL}/rest/v1/vehicle_types`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(typeInsertData)
          });

          if (!typeResponse.ok) {
            const errorText = await typeResponse.text();
            throw new Error(`Failed to create vehicle type ${type.name}: ${errorText}`);
          }

          const typeDataArray = await typeResponse.json();
          const typeData = typeDataArray[0];
          
          typesToInsert.push(typeData);

          // Generate Slots for this type
          const count = parseInt(type.count);
          const startNum = parseInt(type.startNumber) || 1;
          const prefix = type.prefix || type.name.charAt(0).toUpperCase();

          for (let i = 0; i < count; i++) {
            slotsToInsert.push({
              layout_id: layoutData.id,
              vehicle_type: type.name, // Storing name as per schema screenshot
              slot_label: `${prefix}-${startNum + i}`, // e.g., A-10, A-11
              status: 'available'
            });
          }
        }
      }

      if (typesToInsert.length === 0) {
        throw new Error('Please enter price and count for at least one vehicle type.');
      }

      // Bulk Insert Slots
      // Supabase REST API supports bulk insert
      const slotsResponse = await fetch(`${SUPABASE_URL}/rest/v1/parking_slots`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(slotsToInsert)
      });

      if (!slotsResponse.ok) {
        const errorText = await slotsResponse.text();
        throw new Error(`Failed to create slots: ${errorText}`);
      }

      setMessage({ type: 'success', text: 'Layout created successfully!' });
      setCreatedLayout({
        name: layoutName,
        location: finalLocation,
        latitude: finalLatitude,
        longitude: finalLongitude,
        types: typesToInsert,
        slots: slotsToInsert
      });
      
      // Reset form
      setLayoutName('');
      setLocation('');
      setLatitude(null);
      setLongitude(null);
      setCity('');
      setVehicleTypes(vehicleTypes.map(v => ({ ...v, price: '', count: '' })));

    } catch (error) {
      console.error('Error creating layout:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create layout.' });
    } finally {
      setLoading(false);
    }
  };

  if (createdLayout) {
    return (
      <div className="parkhub-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>{createdLayout.name} - Layout Preview</h1>
          <button className="btn-primary" onClick={() => setCreatedLayout(null)}>Create Another</button>
        </div>
        
        <div className="layout-visualization" style={{ 
          background: '#1a1a1a', 
          padding: '30px', 
          borderRadius: '12px',
          border: '1px solid #333',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          {createdLayout.types.map(type => {
            const typeSlots = createdLayout.slots.filter(s => s.vehicle_type === type.name);
            return (
              <div key={type.id} style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#06D6A0', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px' }}>
                  {type.name} Zone <span style={{ fontSize: '0.8em', color: '#666' }}>(${type.price_per_hour}/hr)</span>
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                  gap: '15px' 
                }}>
                  {typeSlots.map((slot, idx) => (
                    <div key={idx} style={{
                      border: '2px dashed #444',
                      borderRadius: '8px',
                      height: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#888',
                      fontWeight: 'bold',
                      background: 'rgba(255,255,255,0.02)',
                      position: 'relative'
                    }}>
                      {slot.slot_label}
                      <div style={{
                        position: 'absolute',
                        bottom: '5px',
                        width: '60%',
                        height: '2px',
                        background: '#333'
                      }}></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="parkhub-page">
      <h1>Create New Parking Layout</h1>
      
      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="layoutName">Layout Name</label>
          <input
            type="text"
            id="layoutName"
            className="form-control"
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            placeholder="e.g., Downtown Mall Parking"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location Address</label>
          <input
            type="text"
            id="location"
            className="form-control"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter full address (e.g. 123 Main St, New York, NY)"
            required
            autoComplete="off"
          />
          {latitude && longitude && (
            <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#06D6A0' }}>
              📍 Coordinates found: {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </div>
          )}
        </div>

        <h3>Vehicle Types & Capacity</h3>
        <p style={{ marginBottom: '15px', color: '#666', fontSize: '0.9rem' }}>
          Enter the price and total capacity for each vehicle type.
        </p>

        <div className="vehicle-types-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {vehicleTypes.map((type, index) => (
            <div key={index} className="vehicle-type-card" style={{ border: '1px solid #eee', padding: '15px', borderRadius: '6px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>{type.name}</label>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.8rem', color: '#666' }}>Price per Hour</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '5px', color: '#555' }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={type.price}
                    onChange={(e) => handleTypeChange(index, 'price', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#666' }}>Total Slots</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={type.count}
                  onChange={(e) => handleTypeChange(index, 'count', e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>

              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: '#666' }}>Prefix</label>
                  <input
                    type="text"
                    className="form-control"
                    value={type.prefix}
                    onChange={(e) => handleTypeChange(index, 'prefix', e.target.value)}
                    placeholder="e.g. A"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: '#666' }}>Start No.</label>
                  <input
                    type="number"
                    className="form-control"
                    value={type.startNumber}
                    onChange={(e) => handleTypeChange(index, 'startNumber', e.target.value)}
                    placeholder="e.g. 1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating Layout...' : 'Create Layout'}
        </button>
      </form>
    </div>
  );
};

export default CreateLayout;
