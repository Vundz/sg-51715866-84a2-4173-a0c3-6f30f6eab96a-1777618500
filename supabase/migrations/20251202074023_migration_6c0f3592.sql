-- Recreate ALL RLS policies for HARVESTS table
CREATE POLICY "All authenticated users can view harvests"
    ON harvests FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff and above can insert harvests"
    ON harvests FOR INSERT
    TO authenticated
    WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update harvests"
    ON harvests FOR UPDATE
    TO authenticated
    USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete harvests"
    ON harvests FOR DELETE
    TO authenticated
    USING (check_user_role(auth.uid(), 'manager'));