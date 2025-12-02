-- Create RLS policies for plantings table
CREATE POLICY "Authenticated users can view plantings" ON plantings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert plantings" ON plantings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update plantings" ON plantings
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete plantings" ON plantings
  FOR DELETE USING (auth.uid() IS NOT NULL);