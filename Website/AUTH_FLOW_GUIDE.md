# Traffinity Authentication Flow

## ✅ Configuration Status

### Supabase Configuration
- **URL**: `https://pmsemyznsxeigmfhzyfg.supabase.co`
- **API Key**: Configured in `.env` file ✅
- **Table**: `admin_profiles` (active and configured) ✅

## 🔐 Authentication Flow

### 1. **Sign Up** (New User Registration)
```
User enters email + password + full name
        ↓
Supabase Auth creates user account
        ↓
onAuthStateChange triggers
        ↓
User profile synced to admin_profiles table
        ↓
User logged in automatically
```

**Code Location**: [src/App.jsx](src/App.jsx#L90-L130)

### 2. **Login** (Existing User)
```
User enters email + password
        ↓
Supabase Auth validates credentials
        ↓
onAuthStateChange triggers
        ↓
User profile synced to admin_profiles table
        ↓
User redirected to Landing Page
```

**Code Location**: [src/App.jsx](src/App.jsx#L95-L110)

### 3. **Logout**
```
User clicks logout button
        ↓
supabase.auth.signOut() called
        ↓
Local state cleared (session, forms, etc.)
        ↓
User redirected to login page
        ↓
Success message displayed
```

**Code Location**: [src/App.jsx](src/App.jsx#L68-L85)

## 📊 Admin Profiles Table Structure

```sql
CREATE TABLE admin_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### When Data is Stored:
1. **During signup** - Profile created with user metadata
2. **During login** - Profile synced/updated if exists
3. **On auth state change** - Profile kept in sync with auth user

### Row Level Security (RLS):
- Users can only view/update their own profile
- Auto-insert allowed for authenticated users
- Cascade delete if auth user is deleted

## 🔄 Profile Sync Logic

Located in [src/App.jsx](src/App.jsx#L36-L51):

```javascript
supabase.auth.onAuthStateChange(async (_event, session) => {
  setSession(session)
  
  if (session?.user) {
    await supabase.from('admin_profiles').upsert({
      id: session.user.id,
      email: session.user.email,
      full_name: session.user.user_metadata.full_name,
      updated_at: new Date()
    }, { onConflict: 'id' })
  }
})
```

This ensures:
- Profile is created on first login
- Profile is updated on subsequent logins
- Metadata stays in sync with Supabase Auth

## 🧪 Testing the Flow

### Test Sign Up:
1. Navigate to `http://localhost:5173`
2. Click "Create new account"
3. Fill in email, password, and full name
4. Submit form
5. Verify email (if required)
6. Check `admin_profiles` table for new row

### Test Login:
1. Navigate to `http://localhost:5173`
2. Enter existing credentials
3. Click "Log In"
4. Verify redirect to Landing Page
5. Check `admin_profiles` table was updated

### Test Logout:
1. While logged in, click logout button in navbar
2. Verify redirect to login page
3. Verify "Logged out successfully" message
4. Verify session is cleared (cannot access protected routes)

## 🐛 Troubleshooting

### Issue: User can't sign up
- Check `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Verify email confirmation settings in Supabase dashboard
- Check browser console for errors

### Issue: Profile not created in admin_profiles
- Verify RLS policies allow INSERT for authenticated users
- Check `onAuthStateChange` handler in App.jsx
- Look for errors in browser console

### Issue: Logout not working
- Verify `handleLogout` is passed to all components correctly
- Check if navigation is working (react-router-dom)
- Clear browser cache and local storage

### Issue: "Session expired" errors
- Supabase tokens expire after a set time
- Refresh page to trigger new session fetch
- Check Supabase JWT settings in dashboard

## 📝 Key Files

| File | Purpose |
|------|---------|
| [src/supabaseClient.js](src/supabaseClient.js) | Supabase client initialization |
| [src/App.jsx](src/App.jsx) | Main auth logic and routing |
| [src/components/Navbar.jsx](src/components/Navbar.jsx) | Logout button |
| [.env](.env) | Supabase credentials (DO NOT COMMIT) |
| [supabase_schema.sql](supabase_schema.sql) | Database schema |

## 🔒 Security Notes

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use RLS policies** - Already configured for `admin_profiles`
3. **Validate user input** - Basic validation in place
4. **Use HTTPS in production** - Supabase enforces this
5. **Rotate keys regularly** - Update `.env` as needed

## ✨ Features Implemented

- ✅ User signup with email verification
- ✅ User login with password
- ✅ Automatic profile sync to `admin_profiles`
- ✅ Logout with state cleanup
- ✅ Protected routes (require authentication)
- ✅ Dark mode toggle
- ✅ Success/error messaging
- ✅ Navigation after auth actions

## 🚀 Next Steps (Optional Enhancements)

1. Add password reset functionality
2. Implement social auth (Google, GitHub)
3. Add profile avatar upload
4. Create admin dashboard
5. Add user role management
6. Implement session timeout warnings
7. Add remember me functionality
8. Create audit log for auth events
