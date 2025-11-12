-- Step 1: Drop the default constraint on role column
ALTER TABLE profiles 
ALTER COLUMN role DROP DEFAULT;