-- Step 1: Add username column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Step 2: Create unique constraint on username to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON profiles(username) WHERE username IS NOT NULL;

-- Step 3: Make email nullable (it should already be nullable based on schema)
-- Verify the column is nullable
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Step 4: Add a check constraint to ensure either username or email exists
ALTER TABLE profiles ADD CONSTRAINT username_or_email_required 
  CHECK (username IS NOT NULL OR email IS NOT NULL);

-- Step 5: Add index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);