-- Create RLS policies for harvests table
CREATE POLICY "Authenticated users can view harvests" ON harvests
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert harvests" ON harvests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update harvests" ON harvests
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete harvests" ON harvests
  FOR DELETE USING (auth.uid() IS NOT NULL);