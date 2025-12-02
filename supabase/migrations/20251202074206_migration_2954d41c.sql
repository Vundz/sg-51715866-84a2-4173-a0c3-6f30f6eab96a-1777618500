-- Drop ALL existing RLS policies on all tables to allow dropping the function
DO $$ 
BEGIN
    -- Drop plantings policies
    DROP POLICY IF EXISTS "All authenticated users can view plantings" ON plantings;
    DROP POLICY IF EXISTS "Staff and above can insert plantings" ON plantings;
    DROP POLICY IF EXISTS "Staff and above can update plantings" ON plantings;
    DROP POLICY IF EXISTS "Managers and above can delete plantings" ON plantings;
    
    -- Drop harvests policies
    DROP POLICY IF EXISTS "All authenticated users can view harvests" ON harvests;
    DROP POLICY IF EXISTS "Staff and above can insert harvests" ON harvests;
    DROP POLICY IF EXISTS "Staff and above can update harvests" ON harvests;
    DROP POLICY IF EXISTS "Managers and above can delete harvests" ON harvests;
    
    -- Drop locations policies
    DROP POLICY IF EXISTS "All authenticated users can view locations" ON locations;
    DROP POLICY IF EXISTS "Staff and above can insert locations" ON locations;
    DROP POLICY IF EXISTS "Staff and above can update locations" ON locations;
    DROP POLICY IF EXISTS "Managers and above can delete locations" ON locations;
    
    -- Drop plant_types policies
    DROP POLICY IF EXISTS "All authenticated users can view plant_types" ON plant_types;
    DROP POLICY IF EXISTS "Staff and above can insert plant_types" ON plant_types;
    DROP POLICY IF EXISTS "Staff and above can update plant_types" ON plant_types;
    DROP POLICY IF EXISTS "Managers and above can delete plant_types" ON plant_types;
    
    -- Drop treatments policies
    DROP POLICY IF EXISTS "All authenticated users can view treatments" ON treatments;
    DROP POLICY IF EXISTS "Staff and above can insert treatments" ON treatments;
    DROP POLICY IF EXISTS "Staff and above can update treatments" ON treatments;
    DROP POLICY IF EXISTS "Managers and above can delete treatments" ON treatments;
    
    -- Drop reservations policies
    DROP POLICY IF EXISTS "All authenticated users can view reservations" ON reservations;
    DROP POLICY IF EXISTS "Staff and above can insert reservations" ON reservations;
    DROP POLICY IF EXISTS "Staff and above can update reservations" ON reservations;
    DROP POLICY IF EXISTS "Managers and above can delete reservations" ON reservations;
END $$;