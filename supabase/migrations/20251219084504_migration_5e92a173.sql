-- Add default_selling_price to plant_types table
ALTER TABLE plant_types
ADD COLUMN IF NOT EXISTS default_selling_price NUMERIC(10,2) DEFAULT 0.00;

-- Add selling_price to plantings table
ALTER TABLE plantings
ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2) DEFAULT 0.00;

-- Add comments for documentation
COMMENT ON COLUMN plant_types.default_selling_price IS 'Default selling price per seedling in ZMW (used as template for new plantings)';
COMMENT ON COLUMN plantings.selling_price IS 'Actual selling price per seedling for this specific planting batch in ZMW';