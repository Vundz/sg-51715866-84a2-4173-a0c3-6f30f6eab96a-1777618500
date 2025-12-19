-- Create chemical_products table
CREATE TABLE chemical_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fertilizer', 'pesticide', 'fungicide', 'herbicide')),
  form TEXT NOT NULL CHECK (form IN ('solid', 'liquid')),
  
  -- NPK (for fertilizers)
  npk_n DECIMAL(5,2),
  npk_p DECIMAL(5,2),
  npk_k DECIMAL(5,2),
  
  -- Concentration & EC
  ec_factor DECIMAL(10,4),
  recommended_concentration DECIMAL(10,2) NOT NULL,
  min_concentration DECIMAL(10,2),
  max_concentration DECIMAL(10,2),
  
  -- Usage Info
  safety_notes TEXT,
  application_method TEXT,
  manufacturer TEXT,
  
  -- Link to inventory
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create saved_mixes table
CREATE TABLE saved_mixes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES chemical_products(id) ON DELETE CASCADE,
  
  water_volume DECIMAL(10,2),
  chemical_amount DECIMAL(10,2),
  concentration DECIMAL(10,2),
  target_ec DECIMAL(10,2),
  calculated_ec DECIMAL(10,2),
  
  mode TEXT CHECK (mode IN ('water_to_chemical', 'chemical_to_water', 'ec_based')),
  
  notes TEXT,
  applied_to_planting_ids UUID[],
  
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chemical_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_mixes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chemical_products
CREATE POLICY "Anyone can view chemical products" ON chemical_products FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert chemical products" ON chemical_products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update chemical products" ON chemical_products FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete chemical products" ON chemical_products FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for saved_mixes
CREATE POLICY "Users can view their own saved mixes" ON saved_mixes FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert their own saved mixes" ON saved_mixes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own saved mixes" ON saved_mixes FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own saved mmixes" ON saved_mixes FOR DELETE USING (auth.uid() = created_by);

-- Insert some sample products
INSERT INTO chemical_products (name, type, form, npk_n, npk_p, npk_k, ec_factor, recommended_concentration, min_concentration, max_concentration, safety_notes, application_method) VALUES
('NPK 20-20-20', 'fertilizer', 'solid', 20.00, 20.00, 20.00, 0.75, 2.00, 1.00, 4.00, 'Wear gloves when handling. Store in cool, dry place.', 'Dissolve in water and apply as foliar spray or soil drench'),
('NPK 15-15-15', 'fertilizer', 'solid', 15.00, 15.00, 15.00, 0.60, 2.50, 1.50, 5.00, 'Keep away from children. Avoid contact with eyes.', 'Mix thoroughly in water before application'),
('Calcium Nitrate', 'fertilizer', 'solid', 15.50, 0.00, 0.00, 0.85, 1.50, 0.50, 3.00, 'Store away from organic materials. Highly soluble.', 'Dissolve completely before use'),
('Mancozeb 80% WP', 'fungicide', 'solid', NULL, NULL, NULL, NULL, 2.50, 2.00, 3.00, 'Wear protective equipment. Avoid breathing dust. Toxic to aquatic life.', 'Mix with water and spray on foliage'),
('Deltamethrin 2.5% EC', 'pesticide', 'liquid', NULL, NULL, NULL, NULL, 1.00, 0.50, 2.00, 'Highly toxic. Use protective clothing. Keep away from water sources.', 'Dilute and spray on affected plants'),
('Glyphosate 48% SL', 'herbicide', 'liquid', NULL, NULL, NULL, NULL, 3.00, 2.00, 5.00, 'Avoid drift to non-target plants. Wear protective gear.', 'Apply to actively growing weeds');