-- Fix RLS policies for user_incidents table
-- Run this in Supabase SQL Editor

-- Enable RLS if not already enabled
ALTER TABLE user_incidents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Anyone can view user incidents" ON user_incidents;
DROP POLICY IF EXISTS "Anyone can insert user incidents" ON user_incidents;
DROP POLICY IF EXISTS "Anyone can update user incidents" ON user_incidents;
DROP POLICY IF EXISTS "Authenticated users can view incidents" ON user_incidents;

-- Allow ANYONE (including anon) to SELECT incidents
CREATE POLICY "Allow public read access to user_incidents"
ON user_incidents
FOR SELECT
USING (true);

-- Allow ANYONE to INSERT incidents (for mobile app)
CREATE POLICY "Allow public insert to user_incidents"
ON user_incidents
FOR INSERT
WITH CHECK (true);

-- Allow ANYONE to UPDATE incidents (for resolving)
CREATE POLICY "Allow public update to user_incidents"
ON user_incidents
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_incidents';
