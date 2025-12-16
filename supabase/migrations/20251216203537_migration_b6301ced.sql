-- Add inventory_item_id to bom_template_items to link to actual inventory
ALTER TABLE bom_template_items 
ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL;

-- Add formula columns for dynamic calculation
ALTER TABLE bom_template_items 
ADD COLUMN IF NOT EXISTS formula_quantity DECIMAL(10, 4) DEFAULT 0, -- e.g., 0.05 (Liters per tray)
ADD COLUMN IF NOT EXISTS formula_unit TEXT; -- e.g., 'L', 'kg', 'g'