-- Test 2: Now let's drop ALL policies and the broken function to start completely fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies from all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;