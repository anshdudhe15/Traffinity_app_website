import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const ManageParking = () => {
  const { session } = useOutletContext();
  const [layouts, setLayouts] = useState([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState('');
  const [slots, setSlots] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    userName: '',
    vehicleNumber: '',
    duration: '1' // Default 1 hour
  });

  // Use direct REST API to avoid Supabase client hanging issues
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pmsemyznsxeigmfhzyfg.supabase.co';
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc2VteXpuc3hlaWdtZmh6eWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjgyODcsImV4cCI6MjA3NzUwNDI4N30.xkvQ8w_Lq9eAAsmpu9TETNB8CkAkOnceIdv27-GdCek';
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // Fetch all layouts on mount
  useEffect(() => {
    if (session?.user?.id) {
      fetchLayouts();
    }
  }, [session]);

  // Fetch slots and vehicle types when a layout is selected
  useEffect(() => {
    if (selectedLayoutId) {
      fetchSlots(selectedLayoutId);
      fetchVehicleTypes(selectedLayoutId);
      subscribeToRealtime(selectedLayoutId);
    }
  }, [selectedLayoutId]);

  const fetchLayouts = async () => {
    try {
      // Filter layouts by the current user's ID (owner_id)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/parking_layouts?select=*&owner_id=eq.${session.user.id}&order=created_at.desc`, {
        headers: headers
      });
      
      if (!response.ok) throw new Error('Failed to fetch layouts');
      
      const data = await response.json();
      setLayouts(data);
      if (data.length > 0) setSelectedLayoutId(data[0].id);
    } catch (error) {
      console.error('Error fetching layouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleTypes = async (layoutId) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/vehicle_types?select=*&parking_layout_id=eq.${layoutId}`, {
        headers: headers
      });

      if (!response.ok) throw new Error('Failed to fetch vehicle types');
      
      const data = await response.json();
      setVehicleTypes(data);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  };

  const fetchSlots = async (layoutId) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/parking_slots?select=*&layout_id=eq.${layoutId}&order=slot_label.asc`, {
        headers: headers
      });

      if (!response.ok) throw new Error('Failed to fetch slots');
      
      const data = await response.json();
      setSlots(data);
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  const subscribeToRealtime = (layoutId) => {
    const subscription = supabase
      .channel('parking_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'parking_slots',
        filter: `layout_id=eq.${layoutId}`
      }, (payload) => {
        fetchSlots(layoutId); // Refresh data on change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const getSlotDetails = (slot) => {
    const vType = vehicleTypes.find(v => v.name === slot.vehicle_type);
    return {
      ...slot,
      price_per_hour: vType ? vType.price_per_hour : 'N/A',
      vehicle_type_id: vType ? vType.id : null
    };
  };

  const handleSlotClick = (slot) => {
    const detailedSlot = getSlotDetails(slot);
    setSelectedSlot(detailedSlot);
    // Reset booking form
    setBookingDetails({
      userName: '',
      vehicleNumber: '',
      duration: '1'
    });
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;

    try {
      const durationHours = parseInt(bookingDetails.duration);
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

      // 1. Create Booking Record
      const bookingData = {
        slot_id: selectedSlot.id,
        user_name: bookingDetails.userName,
        vehicle_number: bookingDetails.vehicleNumber,
        vehicle_type: selectedSlot.vehicle_type,
        vehicle_type_id: selectedSlot.vehicle_type_id,
        duration: durationHours,
        booking_start_time: startTime.toISOString(),
        booking_end_time: endTime.toISOString(),
        status: 'approved'
      };

      const bookingResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(bookingData)
      });

      if (!bookingResponse.ok) {
        const errorText = await bookingResponse.text();
        throw new Error(`Failed to create booking: ${errorText}`);
      }

      // 2. Update Slot Status
      const slotResponse = await fetch(`${SUPABASE_URL}/rest/v1/parking_slots?id=eq.${selectedSlot.id}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ status: 'occupied' })
      });

      if (!slotResponse.ok) {
        const errorText = await slotResponse.text();
        throw new Error(`Failed to update slot status: ${errorText}`);
      }

      alert('Booking successful!');
      setSelectedSlot(null);
      fetchSlots(selectedLayoutId); // Refresh UI

    } catch (error) {
      console.error('Error processing booking:', error);
      alert('Failed to process booking: ' + error.message);
    }
  };

  const handleReleaseSlot = async () => {
    if (!selectedSlot) return;
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/parking_slots?id=eq.${selectedSlot.id}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ status: 'available' })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to release slot: ${errorText}`);
      }
      
      alert('Slot released successfully!');
      setSelectedSlot(null);
      fetchSlots(selectedLayoutId);

    } catch (error) {
      console.error('Error releasing slot:', error);
      alert('Failed to release slot.');
    }
  };

  const renderGrid = () => {
    if (slots.length === 0) return <p>No slots defined for this layout yet.</p>;

    return (
      <div className="parking-grid">
        {slots.map(slot => {
          const detailedSlot = getSlotDetails(slot);
          return (
            <div 
              key={slot.id} 
              className={`parking-slot ${slot.status}`}
              onClick={() => handleSlotClick(slot)}
            >
              <span className="slot-label">{slot.slot_label}</span>
              <span className="slot-type">{slot.vehicle_type}</span>
              {slot.status === 'occupied' && <span className="slot-icon">🚗</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="parkhub-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Manage Parking</h1>
        <div className="layout-selector">
          <select 
            className="form-control" 
            value={selectedLayoutId} 
            onChange={(e) => setSelectedLayoutId(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            {layouts.map(layout => (
              <option key={layout.id} value={layout.id}>{layout.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="parking-management-container">
        <div className="parking-view">
          <div className="legend" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div className="legend-item"><span className="dot available"></span> Available</div>
            <div className="legend-item"><span className="dot occupied"></span> Occupied</div>
            <div className="legend-item"><span className="dot selected"></span> Selected</div>
          </div>
          
          {renderGrid()}
        </div>

        <div className="parking-actions">
          <h3>Slot Details</h3>
          {selectedSlot ? (
            <div>
              <p><strong>Slot:</strong> {selectedSlot.slot_label}</p>
              <p><strong>Type:</strong> {selectedSlot.vehicle_type}</p>
              <p><strong>Price:</strong> ${selectedSlot.price_per_hour}/hr</p>
              <p><strong>Status:</strong> <span className={`status-badge ${selectedSlot.status}`}>{selectedSlot.status}</span></p>
              
              <hr style={{ margin: '15px 0', border: '0', borderTop: '1px solid #ddd' }} />
              
              {selectedSlot.status === 'available' ? (
                <form onSubmit={handleBooking}>
                  <h4>Book Slot</h4>
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={bookingDetails.userName}
                      onChange={e => setBookingDetails({...bookingDetails, userName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Vehicle Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={bookingDetails.vehicleNumber}
                      onChange={e => setBookingDetails({...bookingDetails, vehicleNumber: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Duration (Hours)</label>
                    <input 
                      type="number"
                      min="1"
                      className="form-control"
                      value={bookingDetails.duration}
                      onChange={e => setBookingDetails({...bookingDetails, duration: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>Confirm Booking</button>
                </form>
              ) : (
                <div>
                  <h4>Occupied</h4>
                  <p>This slot is currently occupied.</p>
                  <button 
                    onClick={handleReleaseSlot} 
                    className="btn-primary" 
                    style={{ width: '100%', backgroundColor: '#e74c3c' }}
                  >
                    End Booking & Release
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#777', fontStyle: 'italic' }}>Select a slot to view details or make a booking.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageParking;
