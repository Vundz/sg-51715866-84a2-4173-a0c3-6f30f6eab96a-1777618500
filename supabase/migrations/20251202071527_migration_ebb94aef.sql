-- Drop existing policies for harvests table
DROP POLICY IF EXISTS "Anyone can view harvests" ON harvests;
DROP POLICY IF EXISTS "Users can insert harvests" ON harvests;
DROP POLICY IF EXISTS "Users can update harvests" ON harvests;
DROP POLICY IF EXISTS "Users can delete harvests" ON harvests;

-- Create role-based policies for harvests
CREATE POLICY "All authenticated users can view harvests" 
ON harvests FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff and above can insert harvests" 
ON harvests FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update harvests" 
ON harvests FOR UPDATE 
USING (public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete harvests" 
ON harvests FOR DELETE 
USING (public.has_role(auth.uid(), 'manager'));