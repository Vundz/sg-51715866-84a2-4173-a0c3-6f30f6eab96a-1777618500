-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can read permissions" ON permissions;
DROP POLICY IF EXISTS "All authenticated users can read permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can manage role permissions" ON role_permissions;
DROP POLICY IF EXISTS "All authenticated users can read role permissions" ON role_permissions;

-- Permissions table policies
-- Allow all authenticated users to read permissions (needed for permission checks)
CREATE POLICY "All authenticated users can read permissions" 
ON permissions FOR SELECT 
TO authenticated 
USING (true);

-- Allow admins to insert permissions
CREATE POLICY "Admins can insert permissions" 
ON permissions FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to update permissions
CREATE POLICY "Admins can update permissions" 
ON permissions FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to delete permissions
CREATE POLICY "Admins can delete permissions" 
ON permissions FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Role permissions table policies
-- Allow all authenticated users to read role permissions
CREATE POLICY "All authenticated users can read role permissions" 
ON role_permissions FOR SELECT 
TO authenticated 
USING (true);

-- Allow admins to insert role permissions
CREATE POLICY "Admins can insert role permissions" 
ON role_permissions FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to update role permissions
CREATE POLICY "Admins can update role permissions" 
ON role_permissions FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to delete role permissions
CREATE POLICY "Admins can delete role permissions" 
ON role_permissions FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);