-- Drop the broken function and create a NEW, SIMPLE, WORKING one
DROP FUNCTION IF EXISTS check_user_role(uuid, text) CASCADE;

CREATE OR REPLACE FUNCTION public.check_user_role(check_user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
    user_role_value int;
    required_role_value int;
BEGIN
    -- Get the user's role from profiles table
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = check_user_id;
    
    -- If user not found, return false
    IF user_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Convert roles to numeric values for comparison
    -- admin (4) >= manager (3) >= staff (2) >= viewer (1)
    user_role_value := CASE user_role
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'staff' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    required_role_value := CASE required_role
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'staff' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    -- User's role value must be >= required role value
    RETURN user_role_value >= required_role_value;
END;
$$;