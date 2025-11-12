-- Step 2: Create NEW simplified RLS policies that don't cause recursion
-- Policy 1: Users can view their own profile (simple check)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: Users can update their own profile (simple check)
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Policy 3: Allow authenticated users to view all profiles (for admin checks)
-- This is a simplified approach that works without recursion
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Policy 4: Service role can do anything (for admin operations via edge functions)
CREATE POLICY "Service role can manage profiles" 
ON public.profiles 
FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');