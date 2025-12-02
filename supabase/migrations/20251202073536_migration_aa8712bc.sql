-- Step 2: Update RLS policies for PLANTINGS table to use new function
DROP POLICY IF EXISTS "Staff and above can insert plantings" ON plantings;
DROP POLICY IF EXISTS "Staff and above can update plantings" ON plantings;
DROP POLICY IF EXISTS "Managers and above can delete plantings" ON plantings;

CREATE POLICY "Staff and above can insert plantings" 
ON plantings FOR INSERT 
WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update plantings" 
ON plantings FOR UPDATE 
USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete plantings" 
ON plantings FOR DELETE 
USING (check_user_role(auth.uid(), 'manager'));