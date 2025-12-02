-- Step 5: Update RLS policies for PLANT_TYPES table
DROP POLICY IF EXISTS "Staff and above can insert plant types" ON plant_types;
DROP POLICY IF EXISTS "Staff and above can update plant types" ON plant_types;
DROP POLICY IF EXISTS "Managers and above can delete plant types" ON plant_types;

CREATE POLICY "Staff and above can insert plant types" 
ON plant_types FOR INSERT 
WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update plant types" 
ON plant_types FOR UPDATE 
USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete plant types" 
ON plant_types FOR DELETE 
USING (check_user_role(auth.uid(), 'manager'));