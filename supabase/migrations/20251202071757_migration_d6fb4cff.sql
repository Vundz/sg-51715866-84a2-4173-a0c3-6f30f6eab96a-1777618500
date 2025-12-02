-- Drop the overly permissive policies for reservations table
DROP POLICY IF EXISTS "Authenticated users can insert reservations" ON reservations;
DROP POLICY IF EXISTS "Authenticated users can update reservations" ON reservations;
DROP POLICY IF EXISTS "Authenticated users can delete reservations" ON reservations;