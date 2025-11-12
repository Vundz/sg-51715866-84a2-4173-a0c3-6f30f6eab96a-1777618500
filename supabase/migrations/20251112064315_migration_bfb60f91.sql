-- Step 2: Create a single, clean set of RLS policies
-- These policies are simple and non-recursive

-- Allow anyone to read any profile (needed for public app functionality)
CREATE POLICY "allow_public_read_profiles" ON profiles
  FOR SELECT
  USING (true);

-- Allow users to insert their own profile (for signup)
CREATE POLICY "allow_user_insert_own_profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "allow_user_update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "allow_user_delete_own_profile" ON profiles
  FOR DELETE
  USING (auth.uid() = id);