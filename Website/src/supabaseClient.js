import { createClient } from '@supabase/supabase-js'

// Prefer env vars, but fall back to the provided project details for local runs.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pmsemyznsxeigmfhzyfg.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc2VteXpuc3hlaWdtZmh6eWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjgyODcsImV4cCI6MjA3NzUwNDI4N30.xkvQ8w_Lq9eAAsmpu9TETNB8CkAkOnceIdv27-GdCek'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
