-- Create plantings table
CREATE TABLE IF NOT EXISTS plantings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_type_id UUID NOT NULL REFERENCES plant_types(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  date_planted DATE NOT NULL,
  expected_harvest_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  batch_number TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE plantings ENABLE ROW LEVEL SECURITY;

-- Create policies for plantings
CREATE POLICY "Anyone can view plantings" ON plantings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert plantings" ON plantings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update plantings" ON plantings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete plantings" ON plantings FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create indexes for faster lookups
CREATE INDEX idx_plantings_plant_type ON plantings(plant_type_id);
CREATE INDEX idx_plantings_location ON plantings(location_id);
CREATE INDEX idx_plantings_date_planted ON plantings(date_planted);
CREATE INDEX idx_plantings_status ON plantings(status);
CREATE INDEX idx_plantings_batch_number ON plantings(batch_number);