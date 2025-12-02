-- Step 6: Update RLS policies for TREATMENTS table
DROP POLICY IF EXISTS "Staff and above can insert treatments" ON treatments;
DROP POLICY IF EXISTS "Staff and above can update treatments" ON treatments;
DROP POLICY IF EXISTS "Managers and above can delete treatments" ON treatments;

CREATE POLICY "Staff and above can insert treatments" 
ON treatments FOR INSERT 
WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update treatments" 
ON treatments FOR UPDATE 
USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete treatments" 
ON treatments FOR DELETE 
USING (check_user_role(auth.uid(), 'manager'));