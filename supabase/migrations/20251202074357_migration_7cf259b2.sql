-- Drop ALL existing policies and function to start completely fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies from all tables
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Drop the broken function
DROP FUNCTION IF EXISTS check_user_role(uuid, text) CASCADE;

-- Create a NEW, SIMPLE, WORKING function that actually retrieves and compares roles correctly
CREATE OR REPLACE FUNCTION public.check_user_role(user_id_param uuid, required_role_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_role_value text;
    user_role_level integer;
    required_role_level integer;
BEGIN
    -- Get the user's actual role from the profiles table
    SELECT role INTO user_role_value
    FROM public.profiles
    WHERE id = user_id_param;
    
    -- If user not found, return false
    IF user_role_value IS NULL THEN
        RETURN false;
    END IF;
    
    -- Convert user's role to numeric level (admin=4, manager=3, staff=2, viewer=1)
    user_role_level := CASE user_role_value
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'staff' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    -- Convert required role to numeric level
    required_role_level := CASE required_role_param
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'staff' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    -- Check if user's role level is >= required role level
    RETURN user_role_level >= required_role_level;
END;
$$;