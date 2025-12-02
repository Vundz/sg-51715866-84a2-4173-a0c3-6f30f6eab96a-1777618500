-- Drop the overly permissive policies for plant_types table
DROP POLICY IF EXISTS "Authenticated users can insert plant types" ON plant_types;
DROP POLICY IF EXISTS "Authenticated users can update plant types" ON plant_types;
DROP POLICY IF EXISTS "Authenticated users can delete plant types" ON plant_types;