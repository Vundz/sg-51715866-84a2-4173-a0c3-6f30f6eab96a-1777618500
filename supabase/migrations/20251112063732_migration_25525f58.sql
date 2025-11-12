-- Step 1: Add the missing 'name' column to the 'permissions' table
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'default_action';
COMMENT ON COLUMN public.permissions.name IS 'The specific action this permission grants, e.g., ''create_harvest''';

-- Step 2: Drop the faulty, recursive RLS policies on the profiles table
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.profiles;

-- Step 3: Create a new, non-recursive policy.
-- This allows a user to read their own profile, which is essential for login.
-- Admins will get access via bypassing RLS, which is a safer pattern handled in service logic.
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);