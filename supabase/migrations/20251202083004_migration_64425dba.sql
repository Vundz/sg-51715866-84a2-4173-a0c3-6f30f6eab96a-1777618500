-- Create RLS policies for plant_types table
CREATE POLICY "Authenticated users can view plant types" ON plant_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert plant types" ON plant_types
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update plant types" ON plant_types
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete plant types" ON plant_types
  FOR DELETE USING (auth.uid() IS NOT NULL);