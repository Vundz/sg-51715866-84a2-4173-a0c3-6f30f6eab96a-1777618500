-- Recreate ALL RLS policies for LOCATIONS table
CREATE POLICY "All authenticated users can view locations"
    ON locations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff and above can insert locations"
    ON locations FOR INSERT
    TO authenticated
    WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update locations"
    ON locations FOR UPDATE
    TO authenticated
    USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete locations"
    ON locations FOR DELETE
    TO authenticated
    USING (check_user_role(auth.uid(), 'manager'));