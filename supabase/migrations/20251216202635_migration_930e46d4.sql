-- Re-create BOM Seed Costs Table
DROP TABLE IF EXISTS bom_seed_costs CASCADE;
CREATE TABLE bom_seed_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_type_id UUID NOT NULL REFERENCES plant_types(id) ON DELETE CASCADE,
  cost_per_seed DECIMAL(10, 4) DEFAULT 0, -- High precision for seed costs
  germination_rate DECIMAL(5, 2) DEFAULT 90.0, -- Percentage
  buffer_percent DECIMAL(5, 2) DEFAULT 10.0, -- Percentage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plant_type_id)
);

-- Re-create BOM Templates Table
DROP TABLE IF EXISTS bom_templates CASCADE;
CREATE TABLE bom_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_type_id UUID NOT NULL REFERENCES plant_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Overrides for global settings
  medium_volume_per_tray DECIMAL(10, 2),
  planting_hours_per_tray DECIMAL(10, 2),
  maintenance_hours_per_tray_per_week DECIMAL(10, 2),
  harvest_hours_per_tray DECIMAL(10, 2),
  water_liters_per_tray_per_day DECIMAL(10, 2),
  electricity_kwh_per_tray_per_day DECIMAL(10, 2),
  expected_survival_rate DECIMAL(5, 2) DEFAULT 95.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Re-create BOM Template Items (Inputs like fertilizers, chemicals)
DROP TABLE IF EXISTS bom_template_items CASCADE;
CREATE TABLE bom_template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bom_template_id UUID NOT NULL REFERENCES bom_templates(id) ON DELETE CASCADE,
  item_category TEXT NOT NULL, -- 'fertilizer', 'fungicide', 'insecticide', 'other'
  name TEXT NOT NULL, -- Name of the input
  inventory_item_id UUID REFERENCES inventory_items(id), -- Optional link to real inventory
  
  quantity_per_tray DECIMAL(10, 4) NOT NULL, -- Amount needed per tray per application
  unit TEXT NOT NULL, -- ml, g, etc.
  application_frequency TEXT NOT NULL, -- 'once', 'weekly', 'daily'
  applications_per_cycle INTEGER DEFAULT 1, -- Total number of applications
  
  estimated_unit_cost DECIMAL(10, 2), -- Cost per unit if not linked to inventory
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bom_seed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_template_items ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies
CREATE POLICY "Public read bom_seed_costs" ON bom_seed_costs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Public write bom_seed_costs" ON bom_seed_costs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Public update bom_seed_costs" ON bom_seed_costs FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Public delete bom_seed_costs" ON bom_seed_costs FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read bom_templates" ON bom_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Public write bom_templates" ON bom_templates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Public update bom_templates" ON bom_templates FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Public delete bom_templates" ON bom_templates FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public read bom_template_items" ON bom_template_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Public write bom_template_items" ON bom_template_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Public update bom_template_items" ON bom_template_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Public delete bom_template_items" ON bom_template_items FOR DELETE USING (auth.uid() IS NOT NULL);