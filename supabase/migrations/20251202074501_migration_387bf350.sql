-- STEP 3: Drop the broken check_user_role function
DROP FUNCTION IF EXISTS check_user_role(uuid, text) CASCADE;