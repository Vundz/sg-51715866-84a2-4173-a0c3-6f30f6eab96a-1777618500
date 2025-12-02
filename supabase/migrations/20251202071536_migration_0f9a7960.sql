-- Drop existing policies for locations table
DROP POLICY IF EXISTS "Anyone can view locations" ON locations;
DROP POLICY IF EXISTS "Users can insert locations" ON locations;
DROP POLICY IF EXISTS "Users can update locations" ON locations;
DROP POLICY IF EXISTS "Users can delete locations" ON locations;

-- Create role-based policies for locations
CREATE POLICY "All authenticated users can view locations" 
ON locations FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers and above can insert locations" 
ON locations FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers and above can update locations" 
ON locations FOR UPDATE 
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete locations" 
ON locations FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));