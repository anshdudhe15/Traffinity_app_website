import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import LandingPage from './components/LandingPage'
import ParkHub from './components/ParkHub/ParkHub'
import ParkHubHome from './components/ParkHub/ParkHubHome'
import CreateLayout from './components/ParkHub/CreateLayout'
import ManageParking from './components/ParkHub/ManageParking'
import TrafficSync from './components/TrafficSync/TrafficSync'
import SOSMap from './components/SOSMap/SOSMap'
import CivicIssuesMap from './components/CivicIssues/CivicIssuesMap'
import Profile from './components/Profile'
import './App.css'

function App() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [isLogin, setIsLogin] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [verificationSent, setVerificationSent] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      
      // Ensure profile exists on every auth change (Login, Token Refresh, etc.)
      if (session?.user) {
        // Sync to admin_profiles for ParkHub features
        const { error } = await supabase.from('admin_profiles').upsert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata.full_name,
          updated_at: new Date()
        }, { onConflict: 'id' })
        
        if (error) console.error('Error syncing admin profile:', error)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setMessage(null)
    setEmail('')
    setPassword('')
    setFullName('')
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleLogout = () => {
    console.log('Logout initiated...')
    
    // Immediately clear local state without waiting for Supabase
    setSession(null)
    setIsLogin(true)
    setEmail('')
    setPassword('')
    setFullName('')
    setVerificationSent(false)
    setVerificationCode('')
    setVerificationEmail('')
    setMessage({ type: 'success', text: 'Logged out successfully.' })
    
    // Call Supabase signOut without awaiting (fire and forget)
    supabase.auth.signOut().catch(err => console.error('Supabase signOut error:', err))
    
    // Navigate immediately
    navigate('/', { replace: true })
    console.log('Logout complete')
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          // Handle unconfirmed email by showing verification input
          if (error.message.toLowerCase().includes("not confirmed") || error.message.toLowerCase().includes("not verified")) {
            setVerificationSent(true)
            setVerificationEmail(email)
            setMessage({ type: 'info', text: 'Please enter the verification code sent to your email.' })
            return
          }
          throw error
        }
        // Session will be updated automatically by onAuthStateChange
      } else {
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })
        if (signupError) throw signupError

        // If email confirmation is disabled, session is returned immediately
        if (data.session) {
          setSession(data.session)
          // Profile creation is handled by onAuthStateChange
        } else {
          setVerificationSent(true)
          setVerificationEmail(email)
          setMessage({ type: 'success', text: 'A verification code was emailed to you. Enter it below to verify.' })
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setMessage(null)
    const emailToResend = verificationEmail || email
    if (!emailToResend) {
      setMessage({ type: 'error', text: 'Please enter your email first.' })
      return
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToResend,
      })
      if (error) throw error
      setMessage({ type: 'success', text: 'Verification code resent. Check your email.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    const emailToVerify = verificationEmail || email
    if (!emailToVerify || !verificationCode) {
      setMessage({ type: 'error', text: 'Enter the code sent to your email.' })
      return
    }
    setVerifying(true)
    setMessage(null)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailToVerify,
        token: verificationCode,
        type: 'signup',
      })
      if (error) throw error
      if (data.session) {
        // Create Profile in 'admin_profiles' table
        const { user } = data.session
        const { error: profileError } = await supabase
          .from('admin_profiles')
          .upsert({ 
            id: user.id, 
            full_name: user.user_metadata.full_name,
            email: user.email,
            updated_at: new Date()
          })
        
        if (profileError) {
          console.error('Error creating admin profile:', profileError)
        }

        setSession(data.session)
        setMessage({ type: 'success', text: 'Email verified. You are now logged in.' })
        setVerificationSent(false)
        setVerificationCode('')
      } else {
        setMessage({ type: 'success', text: 'Email verified. Please log in.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setVerifying(false)
    }
  }

  if (session) {
    return (
      <Routes>
        <Route path="/" element={
          <LandingPage 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
            userEmail={session.user.email} 
            handleLogout={handleLogout}
          />
        } />
        <Route path="/parkhub" element={<ParkHub isDarkMode={isDarkMode} toggleTheme={toggleTheme} userEmail={session.user.email} userId={session.user.id} session={session} handleLogout={handleLogout} />}>
          <Route index element={<ParkHubHome />} />
          <Route path="create-layout" element={<CreateLayout />} />
          <Route path="manage-parking" element={<ManageParking />} />
        </Route>
        <Route path="/trafficsync" element={<TrafficSync isDarkMode={isDarkMode} toggleTheme={toggleTheme} userEmail={session.user.email} handleLogout={handleLogout} />} />
        <Route path="/sos-map" element={
          <SOSMap 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
            userEmail={session.user.email} 
            handleLogout={handleLogout}
          />
        } />        <Route path="/civic-map" element={
          <CivicIssuesMap 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
            userEmail={session?.user?.email}
            userId={session?.user?.id}
            handleLogout={handleLogout}
          />
        } />        <Route path="/profile" element={
          <Profile 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
            userEmail={session.user.email} 
            session={session}
            handleLogout={handleLogout}
          />
        } />
      </Routes>
    )
  }

  return (
    <div className={`app-container ${!isLogin ? 'signup-mode' : ''} ${isDarkMode ? 'dark-mode' : ''}`}>
      <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
        {isDarkMode ? (
          // Sun Icon
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        ) : (
          // Moon Icon
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </button>
      <div className="panels-wrapper">
        {/* Text Section */}
        <div className="text-section">
          <div className="brand">Traffinity</div>
          <h1>Turn city chaos into intelligent motion</h1>
          <p className="subtitle">
            Every day, Traffinity helps cities, fleets, and signals think ahead—not just react. 
            Log in and take control of the flow.
          </p>
        </div>

        {/* Form Section */}
        <div className="form-section">
          <div className="form-panel">
            <form className="auth-form" onSubmit={verificationSent ? handleVerifyCode : handleAuth}>
              <h2>{isLogin ? 'Welcome Back' : (verificationSent ? 'Verify Email' : 'Create Account')}</h2>
              
              {message && (
                <div className={`message ${message.type}`}>
                  {message.text}
                </div>
              )}

              {!verificationSent && (
                <>
                  {!isLogin && (
                    <div className="input-group">
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        placeholder="First Last" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={!isLogin}
                      />
                    </div>
                  )}

                  <div className="input-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      placeholder="traffinity@gmail.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button className="submit-btn" disabled={loading}>
                    {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
                  </button>
                </>
              )}

              {verificationSent && (
                <div className="input-group">
                  <p style={{marginBottom: '15px', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                    We sent a code to <strong>{verificationEmail}</strong>
                  </p>
                  <label>Verification Code</label>
                  <input
                    type="text"
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                  <button
                    className="submit-btn"
                    style={{ marginTop: '10px' }}
                    disabled={verifying}
                  >
                    {verifying ? 'Verifying...' : 'Verify Code'}
                  </button>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '15px'}}>
                    <button type="button" className="toggle-link" onClick={handleResend}>
                      Resend Code
                    </button>
                    <button type="button" className="toggle-link" onClick={() => setVerificationSent(false)}>
                      Change Email
                    </button>
                  </div>
                </div>
              )}

              {!verificationSent && (
                <div className="toggle-text">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <span className="toggle-link" onClick={toggleMode}>
                    {isLogin ? 'Create new account' : 'Log in'}
                  </span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
