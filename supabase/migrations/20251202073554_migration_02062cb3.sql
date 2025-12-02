-- Step 4: Update RLS policies for LOCATIONS table
DROP POLICY IF EXISTS "Staff and above can insert locations" ON locations;
DROP POLICY IF EXISTS "Staff and above can update locations" ON locations;
DROP POLICY IF EXISTS "Managers and above can delete locations" ON locations;

CREATE POLICY "Staff and above can insert locations" 
ON locations FOR INSERT 
WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update locations" 
ON locations FOR UPDATE 
USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete locations" 
ON locations FOR DELETE 
USING (check_user_role(auth.uid(), 'manager'));