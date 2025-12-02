-- Drop the overly permissive policies for treatments table
DROP POLICY IF EXISTS "Authenticated users can insert treatments" ON treatments;
DROP POLICY IF EXISTS "Authenticated users can update treatments" ON treatments;
DROP POLICY IF EXISTS "Authenticated users can delete treatments" ON treatments;