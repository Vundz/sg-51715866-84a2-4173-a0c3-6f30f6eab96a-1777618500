-- Recreate ALL RLS policies for TREATMENTS table
CREATE POLICY "All authenticated users can view treatments"
    ON treatments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff and above can insert treatments"
    ON treatments FOR INSERT
    TO authenticated
    WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update treatments"
    ON treatments FOR UPDATE
    TO authenticated
    USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete treatments"
    ON treatments FOR DELETE
    TO authenticated
    USING (check_user_role(auth.uid(), 'manager'));