-- Step 3: Set the new default using the enum type
ALTER TABLE profiles 
ALTER COLUMN role SET DEFAULT 'viewer'::user_role;