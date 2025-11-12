-- Step 2: Drop ALL policies on profiles table and create the simplest possible policy
DROP POLICY IF EXISTS "Allow all authenticated users to read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow all authenticated users to update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create super simple policies that will definitely work
CREATE POLICY "authenticated_read_all_profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "authenticated_update_own_profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);