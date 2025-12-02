-- Drop existing policies for plantings table
DROP POLICY IF EXISTS "Anyone can view plantings" ON plantings;
DROP POLICY IF EXISTS "Users can insert plantings" ON plantings;
DROP POLICY IF EXISTS "Users can update plantings" ON plantings;
DROP POLICY IF EXISTS "Users can delete plantings" ON plantings;

-- Create role-based policies for plantings
CREATE POLICY "All authenticated users can view plantings" 
ON plantings FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff and above can insert plantings" 
ON plantings FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update plantings" 
ON plantings FOR UPDATE 
USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete plantings" 
ON plantings FOR DELETE 
USING (public.has_role(auth.uid(), 'manager'));