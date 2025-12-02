-- Create RLS policies for reservations table
CREATE POLICY "Authenticated users can view reservations" ON reservations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert reservations" ON reservations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update reservations" ON reservations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete reservations" ON reservations
  FOR DELETE USING (auth.uid() IS NOT NULL);