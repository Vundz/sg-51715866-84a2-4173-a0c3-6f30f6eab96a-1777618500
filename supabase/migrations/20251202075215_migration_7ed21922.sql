-- If any tables don't have RLS enabled, enable it now
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('plantings', 'harvests', 'locations', 'plant_types', 'treatments', 'reservations')
        AND rowsecurity = false
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        RAISE NOTICE 'Enabled RLS on table: %', tbl;
    END LOOP;
END $$;