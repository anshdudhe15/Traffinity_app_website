import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from './Navbar';
import './LandingPage.css';
import './Profile.css';

const Profile = ({ isDarkMode, toggleTheme, userEmail, handleLogout, session }) => {
  // Initialize with session data if available to show something immediately
  const [profile, setProfile] = useState(() => {
    if (session?.user) {
      return {
        email: session.user.email,
        fullName: session.user.user_metadata?.full_name || '',
        birthDate: '',
        avatarUrl: '',
        createdAt: new Date(session.user.created_at).toLocaleDateString(),
        lastSignIn: session.user.last_sign_in_at ? new Date(session.user.last_sign_in_at).toLocaleString() : 'N/A'
      };
    }
    return null;
  });
  
  const [loading, setLoading] = useState(!session?.user);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    birthDate: '',
    avatarUrl: ''
  });

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        console.log('Starting profile fetch...');
        
        let user = session?.user;

        if (!user) {
             // Try getting session first (faster, local)
            const { data: { session: localSession }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('Session error:', sessionError);
            }
            user = localSession?.user;
        }

        // If no session user, try getUser (network call)
        if (!user) {
            console.log('No session user, fetching from server...');
            const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            user = authUser;
        }
        
        if (user && mounted) {
          console.log('User found:', user.id);
          
          // Fetch profile data with timeout
          const fetchPromise = supabase
            .from('admin_profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
            
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), 5000)
          );

          try {
            const { data: adminProfile, error: profileError } = await Promise.race([fetchPromise, timeoutPromise]);
          
            if (profileError) {
                console.error('Error fetching admin profile:', profileError);
            }

            console.log('Admin profile data:', adminProfile);
            
            const profileData = {
                email: user.email,
                fullName: adminProfile?.full_name || user.user_metadata?.full_name || '',
                birthDate: adminProfile?.Birth_date || adminProfile?.birth_date || '',
                avatarUrl: adminProfile?.avatar_url || '',
                createdAt: new Date(user.created_at).toLocaleDateString(),
                lastSignIn: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'
            };
            
            if (mounted) {
                setProfile(profileData);
                setFormData({
                fullName: profileData.fullName,
                birthDate: profileData.birthDate,
                avatarUrl: profileData.avatarUrl
                });
            }
          } catch (err) {
             console.error("Profile fetch failed or timed out", err);
             // Fallback to basic user info if DB fetch fails
             const profileData = {
                email: user.email,
                fullName: user.user_metadata?.full_name || '',
                birthDate: '',
                avatarUrl: '',
                createdAt: new Date(user.created_at).toLocaleDateString(),
                lastSignIn: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'
            };
            if (mounted) {
                setProfile(profileData);
                setFormData({
                    fullName: profileData.fullName,
                    birthDate: '',
                    avatarUrl: ''
                });
            }
          }
        } else if (mounted) {
            console.log('No user found in session or server');
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error);
      } finally {
        if (mounted) {
            console.log('Finished loading');
            setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [session]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const updates = {
          id: user.id,
          email: user.email, // Ensure email is also saved/updated
          full_name: formData.fullName,
          birth_date: formData.birthDate || null, // Use lowercase birth_date
          avatar_url: formData.avatarUrl || null,
          updated_at: new Date()
        };

        console.log('Saving profile updates:', updates);

        const { error } = await supabase
          .from('admin_profiles')
          .upsert(updates);

        if (error) {
            console.error('Supabase update error:', error);
            throw error;
        }

        setProfile(prev => ({
          ...prev,
          fullName: formData.fullName,
          birthDate: formData.birthDate,
          avatarUrl: formData.avatarUrl
        }));
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
          throw new Error('No user found');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile: ' + (error.message || JSON.stringify(error)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`profile-container ${isDarkMode ? 'dark-mode' : ''}`} style={{ 
      minHeight: '100vh',
      background: isDarkMode 
        ? 'linear-gradient(90deg, #000000 0%, #06D6A0 50%, #000000 100%)' 
        : 'linear-gradient(90deg, #f0fdfa 0%, #06D6A0 100%)',
      color: isDarkMode ? '#f1f5f9' : '#1a2e35'
    }}>
      <Navbar 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        userEmail={userEmail} 
        handleLogout={handleLogout}
      />
      
      <div className="profile-content">
        <h1 className="profile-title" style={{ color: isDarkMode ? '#f1f5f9' : '#1a2e35' }}>Profile</h1>
        
        {loading && !profile ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Loading profile...</p>
          </div>
        ) : profile ? (
          <div className="profile-card" style={{ 
            background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="profile-action-btn"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit Profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        fullName: profile.fullName,
                        birthDate: profile.birthDate,
                        avatarUrl: profile.avatarUrl
                      });
                    }}
                    className="profile-action-btn cancel"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="profile-action-btn save"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <div className="profile-field-group">
              {/* Avatar Section */}
              <div className="profile-avatar-container">
                <div className="profile-avatar">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Profile" />
                  ) : (
                    <span>
                      {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                </div>
                {isEditing && (
                  <div style={{ width: '100%' }}>
                    <label className="profile-label" style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>Avatar URL</label>
                    <input
                      type="text"
                      name="avatarUrl"
                      value={formData.avatarUrl}
                      onChange={handleInputChange}
                      className="profile-input"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label className="profile-label" style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="profile-input"
                  />
                ) : (
                  <div className="profile-value">
                    {profile.fullName}
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label className="profile-label" style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                  Birth Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className="profile-input"
                  />
                ) : (
                  <div className="profile-value">
                    {profile.birthDate || 'Not set'}
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label className="profile-label" style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                  Email Address
                </label>
                <div className="profile-value" style={{ opacity: 0.7 }}>
                  {profile.email}
                </div>
              </div>

              <div className="profile-field">
                <label className="profile-label" style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                  Account Created
                </label>
                <div className="profile-value">
                  {profile.createdAt}
                </div>
              </div>

              <div className="profile-field">
                <label className="profile-label" style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                  Last Sign In
                </label>
                <div className="profile-value">
                  {profile.lastSignIn}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              <Link 
                to="/" 
                className="profile-action-btn"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Unable to load profile data.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
