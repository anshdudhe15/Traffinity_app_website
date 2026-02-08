-- Add columns for resolving civic issues
ALTER TABLE civic_issues
ADD COLUMN IF NOT EXISTS resolved_by_name text,
ADD COLUMN IF NOT EXISTS resolved_by_id uuid,
ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
ADD COLUMN IF NOT EXISTS resolved_photo_url text,
ADD COLUMN IF NOT EXISTS resolved_description text,
ADD COLUMN IF NOT EXISTS is_resolved boolean DEFAULT false;
