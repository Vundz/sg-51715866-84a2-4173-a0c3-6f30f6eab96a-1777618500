-- Step 2: Drop ALL policies on profiles table to clear dependencies
DROP POLICY IF EXISTS "Users can view their own profile and admins can view all" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile and admins can update all" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;