-- Enable RLS on the table
ALTER TABLE civic_issues ENABLE ROW LEVEL SECURITY;

-- 1. Allow anyone (anon + authenticated) to VIEW issues
CREATE POLICY "Enable read access for all users"
ON civic_issues FOR SELECT
USING (true);

-- 2. Allow anyone to UPDATE issues (needed for the Resolve feature to work via REST API with Anon Key)
CREATE POLICY "Enable update access for all users"
ON civic_issues FOR UPDATE
USING (true)
WITH CHECK (true);

-- 3. Allow anyone to INSERT issues (if you have a report feature)
CREATE POLICY "Enable insert access for all users"
ON civic_issues FOR INSERT
WITH CHECK (true);

-- 4. Allow anyone to upload to the storage bucket
-- (You might have already done this via dashboard, but this ensures it via SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('civic_issues', 'civic_issues', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access Bucket"
ON storage.objects FOR SELECT
USING ( bucket_id = 'civic_issues' );

CREATE POLICY "Public Upload Bucket"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'civic_issues' );
