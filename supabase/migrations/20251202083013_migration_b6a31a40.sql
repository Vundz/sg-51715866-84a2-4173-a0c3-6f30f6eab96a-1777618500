-- Create RLS policies for locations table
CREATE POLICY "Authenticated users can view locations" ON locations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert locations" ON locations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update locations" ON locations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete locations" ON locations
  FOR DELETE USING (auth.uid() IS NOT NULL);