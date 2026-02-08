-- Add latitude, longitude, and city columns to parking_layouts table
-- Run this in Supabase SQL Editor

-- Add latitude column (stores GPS latitude coordinate)
ALTER TABLE parking_layouts 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

-- Add longitude column (stores GPS longitude coordinate)
ALTER TABLE parking_layouts 
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add city column (stores city name from TomTom reverse geocoding)
ALTER TABLE parking_layouts 
ADD COLUMN IF NOT EXISTS city TEXT;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'parking_layouts'
AND column_name IN ('latitude', 'longitude', 'city', 'location');
