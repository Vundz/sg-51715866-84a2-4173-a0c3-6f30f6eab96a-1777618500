-- Create RLS policies for treatments table
CREATE POLICY "Authenticated users can view treatments" ON treatments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert treatments" ON treatments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update treatments" ON treatments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete treatments" ON treatments
  FOR DELETE USING (auth.uid() IS NOT NULL);