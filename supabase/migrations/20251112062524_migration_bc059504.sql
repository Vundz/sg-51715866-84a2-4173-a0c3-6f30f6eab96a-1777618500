-- Step 5: Recreate the policies with the correct enum type syntax
CREATE POLICY "Admins can manage permissions" ON permissions
FOR ALL
TO public
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'admin'::user_role
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'admin'::user_role
));

CREATE POLICY "Admins can manage role permissions" ON role_permissions
FOR ALL
TO public
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'admin'::user_role
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'admin'::user_role
));

CREATE POLICY "Admins can manage user permissions" ON user_permissions
FOR ALL
TO public
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'admin'::user_role
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'admin'::user_role
));

CREATE POLICY "Admins can view all user permissions" ON user_permissions
FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND p.role = 'admin'::user_role
));