-- Recreate ALL RLS policies for PLANT_TYPES table
CREATE POLICY "All authenticated users can view plant types"
    ON plant_types FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff and above can insert plant types"
    ON plant_types FOR INSERT
    TO authenticated
    WITH CHECK (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and above can update plant types"
    ON plant_types FOR UPDATE
    TO authenticated
    USING (check_user_role(auth.uid(), 'staff'));

CREATE POLICY "Managers and above can delete plant types"
    ON plant_types FOR DELETE
    TO authenticated
    USING (check_user_role(auth.uid(), 'manager'));