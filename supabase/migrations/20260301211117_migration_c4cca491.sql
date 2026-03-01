-- RLS Policies for scouting_nutrient_types
CREATE POLICY "Anyone can view active nutrient types" ON scouting_nutrient_types
  FOR SELECT USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admin can insert nutrient types" ON scouting_nutrient_types
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update nutrient types" ON scouting_nutrient_types
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin can delete nutrient types" ON scouting_nutrient_types
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );