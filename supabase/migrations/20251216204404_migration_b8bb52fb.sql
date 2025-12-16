-- Create BOM header table
CREATE TABLE IF NOT EXISTS bom_headers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create BOM items table with inventory linkage
CREATE TABLE IF NOT EXISTS bom_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bom_header_id UUID NOT NULL REFERENCES bom_headers(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  inventory_item_id UUID REFERENCES inventory_items(id),
  quantity DECIMAL(10, 4) NOT NULL,
  unit TEXT NOT NULL,
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  formula TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bom_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

-- Create policies for bom_headers
CREATE POLICY "Users can view BOM headers" ON bom_headers FOR SELECT USING (true);
CREATE POLICY "Users can insert BOM headers" ON bom_headers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update BOM headers" ON bom_headers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete BOM headers" ON bom_headers FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create policies for bom_items
CREATE POLICY "Users can view BOM items" ON bom_items FOR SELECT USING (true);
CREATE POLICY "Users can insert BOM items" ON bom_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update BOM items" ON bom_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete BOM items" ON bom_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bom_items_header_id ON bom_items(bom_header_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_inventory_id ON bom_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_bom_headers_status ON bom_headers(status);