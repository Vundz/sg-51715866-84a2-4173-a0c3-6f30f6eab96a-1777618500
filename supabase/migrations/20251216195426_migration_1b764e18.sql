-- Create inventory_categories table
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_units table
CREATE TABLE IF NOT EXISTS inventory_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('volume', 'weight', 'count')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_suppliers table
CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_categories
CREATE POLICY "Users can view categories" ON inventory_categories 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create categories" ON inventory_categories 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update categories" ON inventory_categories 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete categories" ON inventory_categories 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for inventory_units
CREATE POLICY "Users can view units" ON inventory_units 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create units" ON inventory_units 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update units" ON inventory_units 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete units" ON inventory_units 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for inventory_suppliers
CREATE POLICY "Users can view suppliers" ON inventory_suppliers 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create suppliers" ON inventory_suppliers 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update suppliers" ON inventory_suppliers 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete suppliers" ON inventory_suppliers 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Insert default categories
INSERT INTO inventory_categories (name, color, description) VALUES
  ('Fungicide', '#9333ea', 'Fungal disease treatment'),
  ('Insecticide', '#dc2626', 'Insect pest control'),
  ('Fertilizer', '#16a34a', 'Plant nutrition'),
  ('Other', '#6b7280', 'Miscellaneous items')
ON CONFLICT (name) DO NOTHING;

-- Insert default units
INSERT INTO inventory_units (name, abbreviation, type) VALUES
  ('Liters', 'L', 'volume'),
  ('Milliliters', 'ml', 'volume'),
  ('Kilograms', 'kg', 'weight'),
  ('Grams', 'g', 'weight'),
  ('Bags', 'bags', 'count'),
  ('Bottles', 'bottles', 'count'),
  ('Sachets', 'sachets', 'count'),
  ('Packets', 'packets', 'count'),
  ('Pieces', 'pieces', 'count')
ON CONFLICT (name) DO NOTHING;