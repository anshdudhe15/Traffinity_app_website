-- 1. Create Admin Profiles Table (For Website Admins)
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins view own profile" ON admin_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins update own profile" ON admin_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins insert own profile" ON admin_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Parking Layouts (Linked to Admin Profiles)
CREATE TABLE IF NOT EXISTS parking_layouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES admin_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE parking_layouts ENABLE ROW LEVEL SECURITY;

-- Strict Isolation Policies
CREATE POLICY "Admins view own layouts" ON parking_layouts FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Admins create own layouts" ON parking_layouts FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins update own layouts" ON parking_layouts FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Admins delete own layouts" ON parking_layouts FOR DELETE USING (auth.uid() = owner_id);

-- 3. Vehicle Types
CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  layout_id UUID REFERENCES parking_layouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vehicle types" ON vehicle_types FOR ALL USING (
  EXISTS (SELECT 1 FROM parking_layouts WHERE id = vehicle_types.layout_id AND owner_id = auth.uid())
);

-- 4. Parking Slots
CREATE TABLE IF NOT EXISTS parking_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  layout_id UUID REFERENCES parking_layouts(id) ON DELETE CASCADE,
  slot_label TEXT NOT NULL,
  vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(layout_id, slot_label)
);

ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view own slots" ON parking_slots FOR SELECT USING (
  EXISTS (SELECT 1 FROM parking_layouts WHERE id = parking_slots.layout_id AND owner_id = auth.uid())
);
CREATE POLICY "Admins manage own slots" ON parking_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM parking_layouts WHERE id = parking_slots.layout_id AND owner_id = auth.uid())
);

-- 5. Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slot_id UUID REFERENCES parking_slots(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  vehicle_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  duration TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Admins only see bookings for their own layouts
CREATE POLICY "Admins view own bookings" ON bookings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM parking_slots
    JOIN parking_layouts ON parking_slots.layout_id = parking_layouts.id
    WHERE parking_slots.id = bookings.slot_id AND parking_layouts.owner_id = auth.uid()
  )
);

-- Allow creation by anyone (e.g. App users)
CREATE POLICY "Anyone can create booking" ON bookings FOR INSERT WITH CHECK (true);

-- 6. Traffic Incidents (SOS)
-- Table 'traffic_incidents' already exists.
-- We only apply policies to ensure the website admin can view/manage them.

-- Add user_name column if it doesn't exist
ALTER TABLE traffic_incidents ADD COLUMN IF NOT EXISTS user_name TEXT;

ALTER TABLE traffic_incidents ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create (App users)
-- Note: You might already have this policy.
DROP POLICY IF EXISTS "Anyone can report incident" ON traffic_incidents;
CREATE POLICY "Anyone can report incident" ON traffic_incidents FOR INSERT WITH CHECK (true);

-- Allow admins to view and delete
DROP POLICY IF EXISTS "Admins view incidents" ON traffic_incidents;
CREATE POLICY "Admins view incidents" ON traffic_incidents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins delete incidents" ON traffic_incidents;
CREATE POLICY "Admins delete incidents" ON traffic_incidents FOR DELETE USING (true);

-- 7. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE parking_layouts;
ALTER PUBLICATION supabase_realtime ADD TABLE parking_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE traffic_incidents;
