-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'fungicide', 'insecticide', 'fertilizer', 'other'
  unit_of_measure TEXT NOT NULL, -- 'liters', 'kg', 'grams', 'ml', 'bags', 'bottles', etc.
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Price per unit in ZMW
  current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  minimum_stock DECIMAL(10, 2) DEFAULT 0, -- Low stock alert threshold
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock_transactions table
CREATE TABLE IF NOT EXISTS stock_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'purchase', 'usage', 'adjustment', 'waste'
  quantity DECIMAL(10, 2) NOT NULL, -- Positive for additions, negative for usage
  unit_price DECIMAL(10, 2), -- Price at time of transaction (for purchases)
  total_cost DECIMAL(10, 2), -- Total cost of transaction (quantity * unit_price)
  reference_id UUID, -- Link to treatment_id if usage is from treatment application
  reference_type TEXT, -- 'treatment', 'manual', etc.
  notes TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_name ON inventory_items(name);
CREATE INDEX idx_stock_transactions_item_id ON stock_transactions(item_id);
CREATE INDEX idx_stock_transactions_reference_id ON stock_transactions(reference_id);
CREATE INDEX idx_stock_transactions_transaction_date ON stock_transactions(transaction_date);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items
CREATE POLICY "Users can view inventory items" ON inventory_items 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create inventory items" ON inventory_items 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update inventory items" ON inventory_items 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete inventory items" ON inventory_items 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for stock_transactions
CREATE POLICY "Users can view stock transactions" ON stock_transactions 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create stock transactions" ON stock_transactions 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update stock transactions" ON stock_transactions 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete stock transactions" ON stock_transactions 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger to update inventory_items.current_stock when stock_transactions are inserted
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current_stock in inventory_items
  UPDATE inventory_items
  SET current_stock = current_stock + NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_stock
AFTER INSERT ON stock_transactions
FOR EACH ROW
EXECUTE FUNCTION update_inventory_stock();

-- Trigger to handle stock_transaction updates (reverse old, apply new)
CREATE OR REPLACE FUNCTION handle_stock_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Reverse the old transaction
  UPDATE inventory_items
  SET current_stock = current_stock - OLD.quantity,
      updated_at = NOW()
  WHERE id = OLD.item_id;
  
  -- Apply the new transaction
  UPDATE inventory_items
  SET current_stock = current_stock + NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_stock_transaction_update
AFTER UPDATE ON stock_transactions
FOR EACH ROW
EXECUTE FUNCTION handle_stock_transaction_update();

-- Trigger to handle stock_transaction deletions
CREATE OR REPLACE FUNCTION handle_stock_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Reverse the transaction
  UPDATE inventory_items
  SET current_stock = current_stock - OLD.quantity,
      updated_at = NOW()
  WHERE id = OLD.item_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_stock_transaction_delete
AFTER DELETE ON stock_transactions
FOR EACH ROW
EXECUTE FUNCTION handle_stock_transaction_delete();