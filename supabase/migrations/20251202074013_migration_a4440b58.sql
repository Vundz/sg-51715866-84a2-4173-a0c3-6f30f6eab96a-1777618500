-- Step 4: Recreate ALL RLS policies for PLANTINGS table
CREATE POLICY "All authenticated users can view plantings"
    ON plantings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff and above can insert plantings"
    ON plantings FOR INSERT
    TO authenticated
    WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update plantings"
    ON plantings FOR UPDATE
    TO authenticated
    USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete plantings"
    ON plantings FOR DELETE
    TO authenticated
    USING (check_user_role(auth.uid(), 'manager'));