#!/usr/bin/env pwsh
# Traffinity Authentication Verification Script
# Run this to verify your authentication setup

Write-Host "🔍 Traffinity Authentication Setup Verification" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check 1: .env file exists
Write-Host "1. Checking .env file..." -NoNewline
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "VITE_SUPABASE_URL" -and $envContent -match "VITE_SUPABASE_ANON_KEY") {
        Write-Host " ✅ Found" -ForegroundColor Green
        
        # Verify the specific API key
        if ($envContent -match "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc2VteXpuc3hlaWdtZmh6eWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjgyODcsImV4cCI6MjA3NzUwNDI4N30.xkvQ8w_Lq9eAAsmpu9TETNB8CkAkOnceIdv27-GdCek") {
            Write-Host "   ✅ Correct API key configured" -ForegroundColor Green
        }
    } else {
        Write-Host " ❌ Missing required variables" -ForegroundColor Red
    }
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
}

# Check 2: supabaseClient.js exists
Write-Host "2. Checking supabaseClient.js..." -NoNewline
if (Test-Path "src/supabaseClient.js") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
}

# Check 3: App.jsx has auth logic
Write-Host "3. Checking App.jsx auth implementation..." -NoNewline
if (Test-Path "src/App.jsx") {
    $appContent = Get-Content "src/App.jsx" -Raw
    $checks = @(
        "handleLogout",
        "handleAuth",
        "admin_profiles",
        "onAuthStateChange",
        "supabase.auth.signInWithPassword",
        "supabase.auth.signUp"
    )
    $allPresent = $true
    foreach ($check in $checks) {
        if ($appContent -notmatch [regex]::Escape($check)) {
            $allPresent = $false
            Write-Host " ❌ Missing: $check" -ForegroundColor Red
        }
    }
    if ($allPresent) {
        Write-Host " ✅ All auth functions present" -ForegroundColor Green
    }
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
}

# Check 4: Navbar has logout button
Write-Host "4. Checking Navbar logout button..." -NoNewline
if (Test-Path "src/components/Navbar.jsx") {
    $navbarContent = Get-Content "src/components/Navbar.jsx" -Raw
    if ($navbarContent -match "handleLogout" -and $navbarContent -match "logout-btn") {
        Write-Host " ✅ Logout button configured" -ForegroundColor Green
    } else {
        Write-Host " ❌ Missing logout implementation" -ForegroundColor Red
    }
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
}

# Check 5: schema file exists
Write-Host "5. Checking database schema..." -NoNewline
if (Test-Path "supabase_schema.sql") {
    $schemaContent = Get-Content "supabase_schema.sql" -Raw
    if ($schemaContent -match "admin_profiles") {
        Write-Host " ✅ admin_profiles table defined" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  admin_profiles not found in schema" -ForegroundColor Yellow
    }
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
}

# Check 6: Dev server status
Write-Host "6. Checking dev server..." -NoNewline
$port5173 = netstat -ano | Select-String ":5173"
if ($port5173) {
    Write-Host " ✅ Running on port 5173" -ForegroundColor Green
} else {
    $warningMsg = " WARNING: Not running - Start with npm run dev"
    Write-Host $warningMsg -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "📋 Summary" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your Traffinity authentication is configured to:" -ForegroundColor White
Write-Host "  • Use Supabase URL: https://pmsemyznsxeigmfhzyfg.supabase.co" -ForegroundColor Gray
Write-Host "  • Store user data in 'admin_profiles' table" -ForegroundColor Gray
Write-Host "  • Sync profiles on login/signup" -ForegroundColor Gray
Write-Host "  • Clear state and redirect on logout" -ForegroundColor Gray
Write-Host ""
Write-Host "🧪 Test your setup:" -ForegroundColor Yellow
Write-Host "  1. Open http://localhost:5173" -ForegroundColor Gray
Write-Host "  2. Create a new account" -ForegroundColor Gray
Write-Host "  3. Check Supabase dashboard for new user in admin_profiles" -ForegroundColor Gray
Write-Host "  4. Click logout and verify redirect to login page" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed guide, see: AUTH_FLOW_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
