-- STEP 2: Drop ALL existing RLS policies to start completely fresh
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
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;