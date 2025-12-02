-- Drop the overly permissive policies for plantings table
DROP POLICY IF EXISTS "Authenticated users can insert plantings" ON plantings;
DROP POLICY IF EXISTS "Authenticated users can update plantings" ON plantings;
DROP POLICY IF EXISTS "Authenticated users can delete plantings" ON plantings;