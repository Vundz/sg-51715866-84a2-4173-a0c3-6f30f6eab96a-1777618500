-- Drop existing problematic policies and create correct ones
DROP POLICY IF EXISTS "All authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new, correct policies
CREATE POLICY "Enable read access for authenticated users" ON profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for authenticated users" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);