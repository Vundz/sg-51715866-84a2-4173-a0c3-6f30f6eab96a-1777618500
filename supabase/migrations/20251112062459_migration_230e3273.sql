-- Step 3: Convert the column to use the enum type
ALTER TABLE profiles 
ALTER COLUMN role TYPE user_role 
USING role::user_role;