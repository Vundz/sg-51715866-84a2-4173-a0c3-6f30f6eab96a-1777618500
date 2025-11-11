-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  plant_type_id UUID NOT NULL REFERENCES plant_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reserved_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Create policies for reservations
CREATE POLICY "Anyone can view reservations" ON reservations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reservations" ON reservations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update reservations" ON reservations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete reservations" ON reservations FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create indexes for faster lookups
CREATE INDEX idx_reservations_location ON reservations(location_id);
CREATE INDEX idx_reservations_plant_type ON reservations(plant_type_id);
CREATE INDEX idx_reservations_date ON reservations(reserved_date);