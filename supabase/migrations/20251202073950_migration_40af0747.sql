-- Step 1: Drop ALL existing RLS policies from all tables
-- This allows us to drop the function without dependency errors

-- Drop policies from plantings table
DROP POLICY IF EXISTS "All authenticated users can view plantings" ON plantings;
DROP POLICY IF EXISTS "Staff and above can insert plantings" ON plantings;
DROP POLICY IF EXISTS "Staff and above can update plantings" ON plantings;
DROP POLICY IF EXISTS "Managers and above can delete plantings" ON plantings;

-- Drop policies from harvests table
DROP POLICY IF EXISTS "All authenticated users can view harvests" ON harvests;
DROP POLICY IF EXISTS "Staff and above can insert harvests" ON harvests;
DROP POLICY IF EXISTS "Staff and above can update harvests" ON harvests;
DROP POLICY IF EXISTS "Managers and above can delete harvests" ON harvests;

-- Drop policies from locations table
DROP POLICY IF EXISTS "All authenticated users can view locations" ON locations;
DROP POLICY IF EXISTS "Staff and above can insert locations" ON locations;
DROP POLICY IF EXISTS "Staff and above can update locations" ON locations;
DROP POLICY IF EXISTS "Managers and above can delete locations" ON locations;

-- Drop policies from plant_types table
DROP POLICY IF EXISTS "All authenticated users can view plant types" ON plant_types;
DROP POLICY IF EXISTS "Staff and above can insert plant types" ON plant_types;
DROP POLICY IF EXISTS "Staff and above can update plant types" ON plant_types;
DROP POLICY IF EXISTS "Managers and above can delete plant types" ON plant_types;

-- Drop policies from treatments table
DROP POLICY IF EXISTS "All authenticated users can view treatments" ON treatments;
DROP POLICY IF EXISTS "Staff and above can insert treatments" ON treatments;
DROP POLICY IF EXISTS "Staff and above can update treatments" ON treatments;
DROP POLICY IF EXISTS "Managers and above can delete treatments" ON treatments;

-- Drop policies from reservations table
DROP POLICY IF EXISTS "All authenticated users can view reservations" ON reservations;
DROP POLICY IF EXISTS "Staff and above can insert reservations" ON reservations;
DROP POLICY IF EXISTS "Staff and above can update reservations" ON reservations;
DROP POLICY IF EXISTS "Managers and above can delete reservations" ON reservations;