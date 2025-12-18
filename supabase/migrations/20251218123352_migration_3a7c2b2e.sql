-- 1. Create BOM Categories if not exists
CREATE TABLE IF NOT EXISTS bom_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Formula Templates if not exists
CREATE TABLE IF NOT EXISTS formula_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  formula TEXT NOT NULL,
  description TEXT,
  variables TEXT[], -- Array of variable names
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create BOM Templates (The main header)
CREATE TABLE IF NOT EXISTS bom_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  base_batch_size INTEGER NOT NULL DEFAULT 1000,
  plant_type_id UUID REFERENCES plant_types(id),
  variety TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, archived
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Recreate BOM Items to match new structure
-- Note: We'll create a new table structure. If the old one exists and is incompatible, we might need to handle it.
-- Since this is a new feature request, I'll attempt to add columns or recreate.
-- Let's check if we can simply create the table with the right columns.

CREATE TABLE IF NOT EXISTS bom_items (
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
ALTER TABLE bom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

-- Policies (Simple open access for authenticated users for now)
CREATE POLICY "Enable all access for authenticated users" ON bom_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON formula_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON bom_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON bom_items FOR ALL USING (auth.role() = 'authenticated');