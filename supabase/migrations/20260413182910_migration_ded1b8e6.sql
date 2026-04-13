-- Update any existing "harvested" plantings to "closed" status
UPDATE plantings SET status = 'closed' WHERE status = 'harvested';

-- Drop the old constraint
ALTER TABLE plantings DROP CONSTRAINT IF EXISTS plantings_status_check;

-- Add new constraint with only "active" and "closed"
ALTER TABLE plantings ADD CONSTRAINT plantings_status_check CHECK (status IN ('active', 'closed'));