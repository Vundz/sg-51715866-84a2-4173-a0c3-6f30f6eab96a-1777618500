-- Drop existing policies for treatments table
DROP POLICY IF EXISTS "Anyone can view treatments" ON treatments;
DROP POLICY IF EXISTS "Users can insert treatments" ON treatments;
DROP POLICY IF EXISTS "Users can update treatments" ON treatments;
DROP POLICY IF EXISTS "Users can delete treatments" ON treatments;

-- Create role-based policies for treatments
CREATE POLICY "All authenticated users can view treatments" 
ON treatments FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff and above can insert treatments" 
ON treatments FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update treatments" 
ON treatments FOR UPDATE 
USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete treatments" 
ON treatments FOR DELETE 
USING (public.has_role(auth.uid(), 'manager'));