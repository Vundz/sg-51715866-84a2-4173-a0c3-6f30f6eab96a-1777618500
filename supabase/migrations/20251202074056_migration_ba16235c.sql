-- Recreate ALL RLS policies for RESERVATIONS table
CREATE POLICY "All authenticated users can view reservations"
    ON reservations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff and above can insert reservations"
    ON reservations FOR INSERT
    TO authenticated
    WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update reservations"
    ON reservations FOR UPDATE
    TO authenticated
    USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete reservations"
    ON reservations FOR DELETE
    TO authenticated
    USING (check_user_role(auth.uid(), 'manager'));