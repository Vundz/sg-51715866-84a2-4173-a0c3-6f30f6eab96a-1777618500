-- Drop the old bom_items table and recreate with the correct structure
DROP TABLE IF EXISTS bom_items CASCADE;

-- Create the new bom_items table
CREATE TABLE bom_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES bom_templates(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('inventory', 'adhoc')),
  
  -- Inventory Link
  inventory_item_id UUID REFERENCES inventory_items(id),
  
  -- Ad-hoc Details
  custom_name TEXT,
  custom_unit_price NUMERIC,
  custom_unit TEXT,
  
  -- Quantity Logic
  quantity_type TEXT NOT NULL DEFAULT 'formula' CHECK (quantity_type IN ('fixed', 'formula')),
  quantity_value NUMERIC,
  quantity_formula TEXT,
  
  -- Organization
  category_id UUID REFERENCES bom_categories(id),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

-- Simple policy for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON bom_items FOR ALL USING (auth.role() = 'authenticated');