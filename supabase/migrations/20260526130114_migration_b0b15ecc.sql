-- Find and fix duplicate harvest records
WITH duplicates AS (
  SELECT 
    id,
    planting_id,
    harvest_date,
    quantity_harvested,
    ROW_NUMBER() OVER (
      PARTITION BY planting_id, harvest_date, quantity_harvested 
      ORDER BY created_at
    ) as rn
  FROM harvests
)
-- Delete duplicate records (keep the first one)
DELETE FROM harvests
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE harvests 
ADD CONSTRAINT harvests_planting_date_quantity_unique 
UNIQUE (planting_id, harvest_date, quantity_harvested);