-- Run this in Supabase SQL Editor to ensure the table exists and has correct permissions

CREATE TABLE IF NOT EXISTS traffic_incidents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE traffic_incidents ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon) to insert incidents
DROP POLICY IF EXISTS "Anyone can report incident" ON traffic_incidents;
CREATE POLICY "Anyone can report incident" ON traffic_incidents FOR INSERT WITH CHECK (true);

-- Allow anyone (anon) to view incidents
DROP POLICY IF EXISTS "Anyone can view incidents" ON traffic_incidents;
CREATE POLICY "Anyone can view incidents" ON traffic_incidents FOR SELECT USING (true);

-- Allow anyone (anon) to delete incidents (for testing purposes - remove in production)
DROP POLICY IF EXISTS "Anyone can delete incidents" ON traffic_incidents;
CREATE POLICY "Anyone can delete incidents" ON traffic_incidents FOR DELETE USING (true);

-- Enable Realtime (safely check if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'traffic_incidents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE traffic_incidents;
  END IF;
END $$;
