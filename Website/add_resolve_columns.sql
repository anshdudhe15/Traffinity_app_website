-- Add columns for incident resolution tracking
-- Run this in Supabase SQL Editor

-- First check if 'resolved' column exists, if not check for 'resloved' (typo)
DO $$ 
BEGIN
    -- If 'resloved' exists but 'resolved' doesn't, rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_incidents' AND column_name = 'resloved'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_incidents' AND column_name = 'resolved'
    ) THEN
        ALTER TABLE user_incidents RENAME COLUMN resloved TO resolved;
        RAISE NOTICE 'Renamed column resloved to resolved';
    END IF;
END $$;

-- Ensure resolved column exists with correct type
ALTER TABLE user_incidents 
ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false;

-- Add solved_by_admin column (references admin who resolved the incident)
ALTER TABLE user_incidents 
ADD COLUMN IF NOT EXISTS solved_by_admin UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add resolved_at column (timestamp when incident was resolved)
ALTER TABLE user_incidents 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Verify all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_incidents'
AND column_name IN ('solved_by_admin', 'resolved_at', 'resolved', 'resloved')
ORDER BY column_name;
