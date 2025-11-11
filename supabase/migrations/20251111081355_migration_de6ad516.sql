-- Create plant_types table
CREATE TABLE IF NOT EXISTS plant_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  variety TEXT NOT NULL,
  days_to_maturity INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE plant_types ENABLE ROW LEVEL SECURITY;

-- Create policies for plant_types
CREATE POLICY "Anyone can view plant types" ON plant_types FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert plant types" ON plant_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update plant types" ON plant_types FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete plant types" ON plant_types FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX idx_plant_types_name ON plant_types(name);