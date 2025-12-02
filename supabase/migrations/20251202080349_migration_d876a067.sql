-- Step 3: Create policies for INSERT and UPDATE operations
-- Allow authenticated users to insert their own profile
CREATE POLICY "users_can_insert_own_profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_can_update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to update any profile
CREATE POLICY "admins_can_update_any_profile" ON profiles
  FOR UPDATE
  USING (check_user_role(auth.uid(), 'admin'))
  WITH CHECK (check_user_role(auth.uid(), 'admin'));