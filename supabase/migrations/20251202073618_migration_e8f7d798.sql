-- Step 7: Update RLS policies for RESERVATIONS table
DROP POLICY IF EXISTS "Staff and above can insert reservations" ON reservations;
DROP POLICY IF EXISTS "Staff and above can update reservations" ON reservations;
DROP POLICY IF EXISTS "Managers and above can delete reservations" ON reservations;

CREATE POLICY "Staff and above can insert reservations" 
ON reservations FOR INSERT 
WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update reservations" 
ON reservations FOR UPDATE 
USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete reservations" 
ON reservations FOR DELETE 
USING (check_user_role(auth.uid(), 'manager'));