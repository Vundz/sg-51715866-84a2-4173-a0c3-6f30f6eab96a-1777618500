-- Create a simple, permissive policy that allows all authenticated users to read any profile
CREATE POLICY "Authenticated users can view profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- Create a policy that allows users to update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Create a policy that allows admins to update any profile
CREATE POLICY "Admins can update any profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (check_user_role(auth.uid(), 'admin'));

-- Create a policy that allows admins to insert profiles (for user creation)
CREATE POLICY "Admins can insert profiles" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (check_user_role(auth.uid(), 'admin'));