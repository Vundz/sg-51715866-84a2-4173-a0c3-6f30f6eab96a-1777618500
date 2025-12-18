-- Create BOM categories table
CREATE TABLE IF NOT EXISTS bom_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bom_categories ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view BOM categories" ON bom_categories FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert BOM categories" ON bom_categories FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update BOM categories" ON bom_categories FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete BOM categories" ON bom_categories FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Create formula templates table
CREATE TABLE IF NOT EXISTS formula_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  formula TEXT NOT NULL,
  description TEXT,
  variables TEXT[], -- Array of variable names used in formula
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE formula_templates ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view formula templates" ON formula_templates FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert formula templates" ON formula_templates FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update formula templates" ON formula_templates FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete formula templates" ON formula_templates FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Create BOM templates table
CREATE TABLE IF NOT EXISTS bom_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  base_batch_size INTEGER NOT NULL,
  plant_type_id UUID REFERENCES plant_types(id) ON DELETE SET NULL,
  variety TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bom_templates ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view BOM templates" ON bom_templates FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert BOM templates" ON bom_templates FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update BOM templates" ON bom_templates FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete BOM templates" ON bom_templates FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Create BOM items table
CREATE TABLE IF NOT EXISTS bom_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES bom_templates(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('inventory', 'adhoc')),
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  custom_name TEXT,
  custom_unit_price DECIMAL(10, 2),
  custom_unit TEXT,
  quantity_type TEXT NOT NULL CHECK (quantity_type IN ('fixed', 'formula')),
  quantity_value DECIMAL(10, 2),
  quantity_formula TEXT,
  category_id UUID REFERENCES bom_categories(id) ON DELETE SET NULL,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view BOM items" ON bom_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert BOM items" ON bom_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update BOM items" ON bom_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete BOM items" ON bom_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Insert default BOM categories
INSERT INTO bom_categories (name, description, color, sort_order) VALUES
  ('Seeds', 'Seed costs', '#10b981', 1),
  ('Fertilizers', 'Fertilizer and nutrient costs', '#3b82f6', 2),
  ('Chemicals', 'Pesticides and fungicides', '#f59e0b', 3),
  ('Labor', 'Labor costs', '#8b5cf6', 4),
  ('Utilities', 'Water, electricity, etc.', '#ef4444', 5),
  ('Supplies', 'Trays, pots, labels, etc.', '#ec4899', 6),
  ('Overheads', 'Depreciation, rent, etc.', '#6b7280', 7);

-- Insert default formula templates
INSERT INTO formula_templates (name, formula, description, variables) VALUES
  ('Batch Size', 'batch_size', 'Use the full batch size', ARRAY['batch_size']),
  ('With Germination Buffer (10%)', 'batch_size * 1.1', 'Add 10% extra for germination failures', ARRAY['batch_size']),
  ('With Germination Buffer (15%)', 'batch_size * 1.15', 'Add 15% extra for germination failures', ARRAY['batch_size']),
  ('Tray Count', 'batch_size / 220', 'Number of trays needed (220 seedlings per tray)', ARRAY['batch_size']),
  ('Per Tray', 'tray_count * value', 'Multiply by number of trays', ARRAY['tray_count', 'value']),
  ('Percentage of Batch', 'batch_size * (percentage / 100)', 'Calculate as percentage of batch size', ARRAY['batch_size', 'percentage']);