-- First, find and fix duplicate batch numbers by appending a suffix
WITH duplicates AS (
  SELECT batch_number, 
         ROW_NUMBER() OVER (PARTITION BY batch_number ORDER BY created_at) as rn
  FROM plantings
  WHERE batch_number IN (
    SELECT batch_number 
    FROM plantings 
    WHERE batch_number IS NOT NULL
    GROUP BY batch_number 
    HAVING COUNT(*) > 1
  )
)
UPDATE plantings p
SET batch_number = p.batch_number || '-' || d.rn
FROM duplicates d
WHERE p.batch_number = d.batch_number 
  AND d.rn > 1
  AND p.id IN (
    SELECT id FROM plantings p2 
    WHERE p2.batch_number = d.batch_number 
    ORDER BY created_at 
    OFFSET (d.rn - 1) LIMIT 1
  );

-- Now add the unique constraint
ALTER TABLE plantings 
ADD CONSTRAINT plantings_batch_number_key UNIQUE (batch_number);