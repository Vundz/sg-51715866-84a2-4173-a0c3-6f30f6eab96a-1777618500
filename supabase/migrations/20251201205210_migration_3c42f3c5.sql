-- Add collection_date column to reservations table
ALTER TABLE reservations ADD COLUMN collection_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN reservations.collection_date IS 'Optional date when customer wants to collect their order';