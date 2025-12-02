-- Step 3: Update RLS policies for HARVESTS table
DROP POLICY IF EXISTS "Staff and above can insert harvests" ON harvests;
DROP POLICY IF EXISTS "Staff and above can update harvests" ON harvests;
DROP POLICY IF EXISTS "Managers and above can delete harvests" ON harvests;

CREATE POLICY "Staff and above can insert harvests" 
ON harvests FOR INSERT 
WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update harvests" 
ON harvests FOR UPDATE 
USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete harvests" 
ON harvests FOR DELETE 
USING (check_user_role(auth.uid(), 'manager'));