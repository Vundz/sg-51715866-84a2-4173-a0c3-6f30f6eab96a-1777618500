-- Step 1: Create the user_role enum type
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;