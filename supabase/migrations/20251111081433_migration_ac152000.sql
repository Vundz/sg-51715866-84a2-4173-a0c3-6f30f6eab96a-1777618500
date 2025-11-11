-- Create treatments table
CREATE TABLE IF NOT EXISTS treatments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planting_ids UUID[] NOT NULL,
  treatment_type TEXT NOT NULL,
  chemical_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  application_method TEXT NOT NULL,
  date_applied DATE NOT NULL,
  applied_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

-- Create policies for treatments
CREATE POLICY "Anyone can view treatments" ON treatments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert treatments" ON treatments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update treatments" ON treatments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete treatments" ON treatments FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create indexes for faster lookups
CREATE INDEX idx_treatments_date ON treatments(date_applied);
CREATE INDEX idx_treatments_type ON treatments(treatment_type);
CREATE INDEX idx_treatments_planting_ids ON treatments USING GIN(planting_ids);