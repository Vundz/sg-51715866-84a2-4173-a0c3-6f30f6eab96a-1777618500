-- Create harvests table
CREATE TABLE IF NOT EXISTS harvests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planting_id UUID NOT NULL REFERENCES plantings(id) ON DELETE CASCADE,
  quantity_harvested INTEGER NOT NULL,
  harvest_date DATE NOT NULL,
  quality_grade TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;

-- Create policies for harvests
CREATE POLICY "Anyone can view harvests" ON harvests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert harvests" ON harvests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update harvests" ON harvests FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete harvests" ON harvests FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create indexes for faster lookups
CREATE INDEX idx_harvests_planting ON harvests(planting_id);
CREATE INDEX idx_harvests_date ON harvests(harvest_date);