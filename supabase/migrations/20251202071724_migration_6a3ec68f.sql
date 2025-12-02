-- Drop the overly permissive policies for harvests table
DROP POLICY IF EXISTS "Authenticated users can insert harvests" ON harvests;
DROP POLICY IF EXISTS "Authenticated users can update harvests" ON harvests;
DROP POLICY IF EXISTS "Authenticated users can delete harvests" ON harvests;