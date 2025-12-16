-- ============================================
-- BOM SETTINGS TABLES
-- ============================================

-- 1. BOM Configuration (Global Settings)
CREATE TABLE IF NOT EXISTS bom_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tray Settings
  seedlings_per_tray INTEGER NOT NULL DEFAULT 220,
  tray_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tray_lifespan_uses INTEGER NOT NULL DEFAULT 50,
  
  -- Growing Medium (Coco Peat)
  medium_volume_per_tray DECIMAL(10, 2) NOT NULL DEFAULT 5.0, -- Liters
  medium_cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  medium_unit_type TEXT NOT NULL DEFAULT 'liters', -- liters, kg, bags
  medium_wastage_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.0,
  
  -- Default Seed Settings
  default_germination_rate DECIMAL(5, 2) NOT NULL DEFAULT 90.0,
  default_seed_buffer_percent DECIMAL(5, 2) NOT NULL DEFAULT 10.0,
  
  -- Labor Costs
  labor_rate_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 0,
  planting_hours_per_tray DECIMAL(5, 2) NOT NULL DEFAULT 0.5,
  maintenance_hours_per_tray_per_week DECIMAL(5, 2) NOT NULL DEFAULT 0.1,
  harvest_hours_per_tray DECIMAL(5, 2) NOT NULL DEFAULT 0.5,
  
  -- Utilities
  water_cost_per_liter DECIMAL(10, 4) NOT NULL DEFAULT 0,
  water_liters_per_tray_per_day DECIMAL(10, 2) NOT NULL DEFAULT 2.0,
  electricity_cost_per_kwh DECIMAL(10, 2) NOT NULL DEFAULT 0,
  electricity_kwh_per_tray_per_day DECIMAL(10, 4) NOT NULL DEFAULT 0,
  
  -- Overhead
  overhead_percentage DECIMAL(5, 2) NOT NULL DEFAULT 10.0,
  
  -- Currency
  currency_code TEXT NOT NULL DEFAULT 'ZMW',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- 2. Seed Costs (Per Plant Type/Variety)
CREATE TABLE IF NOT EXISTS bom_seed_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_type_id UUID NOT NULL REFERENCES plant_types(id) ON DELETE CASCADE,
  
  -- Seed Details
  cost_per_seed DECIMAL(10, 4) NOT NULL DEFAULT 0,
  germination_rate DECIMAL(5, 2) DEFAULT NULL, -- If NULL, use default from bom_settings
  buffer_percent DECIMAL(5, 2) DEFAULT NULL, -- If NULL, use default from bom_settings
  
  -- Supplier Info
  supplier_name TEXT,
  supplier_sku TEXT,
  last_purchase_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(plant_type_id)
);

-- 3. BOM Templates (Production Recipes)
CREATE TABLE IF NOT EXISTS bom_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_type_id UUID NOT NULL REFERENCES plant_types(id) ON DELETE CASCADE,
  
  -- Template Info
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  
  -- Growing Medium Override (if different from default)
  medium_volume_per_tray DECIMAL(10, 2), -- NULL = use default
  
  -- Labor Override (if different from default)
  planting_hours_per_tray DECIMAL(5, 2), -- NULL = use default
  maintenance_hours_per_tray_per_week DECIMAL(5, 2), -- NULL = use default
  harvest_hours_per_tray DECIMAL(5, 2), -- NULL = use default
  
  -- Utilities Override
  water_liters_per_tray_per_day DECIMAL(10, 2), -- NULL = use default
  electricity_kwh_per_tray_per_day DECIMAL(10, 4), -- NULL = use default
  
  -- Expected Output
  expected_survival_rate DECIMAL(5, 2) DEFAULT 95.0, -- % of planted seeds that become sellable
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE(plant_type_id, version)
);

-- 4. BOM Template Items (Fertilizers, Treatments, etc.)
CREATE TABLE IF NOT EXISTS bom_template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bom_template_id UUID NOT NULL REFERENCES bom_templates(id) ON DELETE CASCADE,
  
  -- Link to Inventory Item
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL, -- Store name in case inventory item is deleted
  item_category TEXT, -- fungicide, insecticide, fertilizer, etc.
  
  -- Usage Details
  quantity_per_tray DECIMAL(10, 2) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  application_frequency TEXT, -- 'once', 'weekly', 'bi-weekly', 'as-needed'
  applications_per_cycle INTEGER DEFAULT 1, -- Total times applied during growth cycle
  
  -- Timing
  application_timing TEXT, -- 'start', 'week-1', 'week-2', 'end', etc.
  
  -- Cost (snapshot at template creation)
  estimated_unit_cost DECIMAL(10, 2) DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Planting BOM Costs (Actual costs per planting batch)
CREATE TABLE IF NOT EXISTS planting_bom_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  planting_id UUID NOT NULL REFERENCES plantings(id) ON DELETE CASCADE,
  bom_template_id UUID REFERENCES bom_templates(id) ON DELETE SET NULL,
  
  -- Calculated Costs (at planting time)
  estimated_seed_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_tray_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_medium_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_fertilizer_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_treatment_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_labor_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_utilities_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_overhead_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_total_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_cost_per_seedling DECIMAL(10, 4) DEFAULT 0,
  
  -- Actual Costs (updated as batch progresses)
  actual_seed_cost DECIMAL(10, 2) DEFAULT 0,
  actual_tray_cost DECIMAL(10, 2) DEFAULT 0,
  actual_medium_cost DECIMAL(10, 2) DEFAULT 0,
  actual_fertilizer_cost DECIMAL(10, 2) DEFAULT 0,
  actual_treatment_cost DECIMAL(10, 2) DEFAULT 0,
  actual_labor_cost DECIMAL(10, 2) DEFAULT 0,
  actual_utilities_cost DECIMAL(10, 2) DEFAULT 0,
  actual_overhead_cost DECIMAL(10, 2) DEFAULT 0,
  actual_total_cost DECIMAL(10, 2) DEFAULT 0,
  actual_cost_per_seedling DECIMAL(10, 4) DEFAULT 0,
  
  -- Variance Tracking
  cost_variance DECIMAL(10, 2) DEFAULT 0, -- actual - estimated
  variance_percentage DECIMAL(5, 2) DEFAULT 0,
  
  -- Metadata
  calculation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(planting_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_bom_seed_costs_plant_type ON bom_seed_costs(plant_type_id);
CREATE INDEX idx_bom_templates_plant_type ON bom_templates(plant_type_id);
CREATE INDEX idx_bom_templates_active ON bom_templates(is_active);
CREATE INDEX idx_bom_template_items_template ON bom_template_items(bom_template_id);
CREATE INDEX idx_bom_template_items_inventory ON bom_template_items(inventory_item_id);
CREATE INDEX idx_planting_bom_costs_planting ON planting_bom_costs(planting_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE bom_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_seed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planting_bom_costs ENABLE ROW LEVEL SECURITY;

-- BOM Settings Policies
CREATE POLICY "Users can view BOM settings" ON bom_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update BOM settings" ON bom_settings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert BOM settings" ON bom_settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Seed Costs Policies
CREATE POLICY "Users can view seed costs" ON bom_seed_costs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage seed costs" ON bom_seed_costs FOR ALL USING (auth.uid() IS NOT NULL);

-- BOM Templates Policies
CREATE POLICY "Users can view BOM templates" ON bom_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage BOM templates" ON bom_templates FOR ALL USING (auth.uid() IS NOT NULL);

-- BOM Template Items Policies
CREATE POLICY "Users can view template items" ON bom_template_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage template items" ON bom_template_items FOR ALL USING (auth.uid() IS NOT NULL);

-- Planting BOM Costs Policies
CREATE POLICY "Users can view planting costs" ON planting_bom_costs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage planting costs" ON planting_bom_costs FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- INITIALIZE DEFAULT SETTINGS
-- ============================================

-- Insert default BOM settings (only if table is empty)
INSERT INTO bom_settings (
  seedlings_per_tray,
  tray_cost,
  tray_lifespan_uses,
  medium_volume_per_tray,
  medium_cost_per_unit,
  medium_unit_type,
  medium_wastage_percent,
  default_germination_rate,
  default_seed_buffer_percent,
  labor_rate_per_hour,
  planting_hours_per_tray,
  maintenance_hours_per_tray_per_week,
  harvest_hours_per_tray,
  water_cost_per_liter,
  water_liters_per_tray_per_day,
  electricity_cost_per_kwh,
  electricity_kwh_per_tray_per_day,
  overhead_percentage,
  currency_code
)
SELECT 
  220, -- seedlings per tray
  50.00, -- tray cost (ZMW)
  50, -- tray lifespan (uses)
  5.0, -- medium volume per tray (liters)
  150.00, -- medium cost per bag (ZMW)
  'bags',
  5.0, -- wastage %
  90.0, -- germination rate %
  10.0, -- seed buffer %
  15.00, -- labor rate per hour (ZMW)
  0.5, -- planting hours per tray
  0.1, -- maintenance hours per tray per week
  0.5, -- harvest hours per tray
  0.01, -- water cost per liter (ZMW)
  2.0, -- water liters per tray per day
  2.50, -- electricity cost per kWh (ZMW)
  0.05, -- electricity kWh per tray per day
  10.0, -- overhead %
  'ZMW' -- currency
WHERE NOT EXISTS (SELECT 1 FROM bom_settings LIMIT 1);