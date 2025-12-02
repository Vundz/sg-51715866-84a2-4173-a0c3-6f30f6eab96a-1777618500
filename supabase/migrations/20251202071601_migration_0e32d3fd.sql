-- Drop existing policies for reservations table
DROP POLICY IF EXISTS "Anyone can view reservations" ON reservations;
DROP POLICY IF EXISTS "Users can insert reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update reservations" ON reservations;
DROP POLICY IF EXISTS "Users can delete reservations" ON reservations;

-- Create role-based policies for reservations
CREATE POLICY "All authenticated users can view reservations" 
ON reservations FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff and above can insert reservations" 
ON reservations FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update reservations" 
ON reservations FOR UPDATE 
USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete reservations" 
ON reservations FOR DELETE 
USING (public.has_role(auth.uid(), 'manager'));