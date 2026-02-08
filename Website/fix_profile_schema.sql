-- Fix Admin Profiles Table Structure and Policies

-- 1. Standardize column names (rename Birth_date to birth_date if it exists)
DO $$
BEGIN
  IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='admin_profiles' and column_name='Birth_date')
  THEN
      ALTER TABLE "admin_profiles" RENAME COLUMN "Birth_date" TO "birth_date";
  END IF;
END $$;

-- 2. Ensure columns exist
ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Reset RLS Policies to ensure they are correct
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins insert own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Admins update own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Admins view own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Admins delete own profile" ON admin_profiles;

-- Re-create policies
CREATE POLICY "Admins view own profile" ON admin_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins insert own profile" ON admin_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins update own profile" ON admin_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins delete own profile" ON admin_profiles FOR DELETE USING (auth.uid() = id);

-- 4. Grant permissions (just in case)
GRANT ALL ON admin_profiles TO authenticated;
GRANT ALL ON admin_profiles TO service_role;
