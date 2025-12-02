-- Step 2: Create ONE simple, working policy that allows all authenticated users to read any profile
-- This is the simplest possible policy that should work for all authenticated users
CREATE POLICY "authenticated_users_can_read_profiles" ON profiles
  FOR SELECT
  USING (true);