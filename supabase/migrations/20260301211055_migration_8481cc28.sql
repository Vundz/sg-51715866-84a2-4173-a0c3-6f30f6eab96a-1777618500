-- RLS Policies for scouting_pest_types
-- Everyone can view active pests
CREATE POLICY "Anyone can view active pest types" ON scouting_pest_types
  FOR SELECT USING (is_active = true OR auth.uid() IS NOT NULL);

-- Only admins can insert pests
CREATE POLICY "Admin can insert pest types" ON scouting_pest_types
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Only admins can update pests
CREATE POLICY "Admin can update pest types" ON scouting_pest_types
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Only admins can delete pests
CREATE POLICY "Admin can delete pest types" ON scouting_pest_types
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );