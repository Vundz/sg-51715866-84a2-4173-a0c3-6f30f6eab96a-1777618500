-- Enable RLS on the table (ensure it is on)
ALTER TABLE planting_treatments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean slate and avoid conflicts
DROP POLICY IF EXISTS "Users can view planting_treatments" ON planting_treatments;
DROP POLICY IF EXISTS "Users can insert planting_treatments" ON planting_treatments;
DROP POLICY IF EXISTS "Users can delete planting_treatments" ON planting_treatments;
DROP POLICY IF EXISTS "Enable read access for all users" ON planting_treatments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON planting_treatments;

-- Create comprehensive policies for authenticated users
CREATE POLICY "Users can view planting_treatments" 
ON planting_treatments FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can insert planting_treatments" 
ON planting_treatments FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can delete planting_treatments" 
ON planting_treatments FOR DELETE 
TO authenticated 
USING (true);