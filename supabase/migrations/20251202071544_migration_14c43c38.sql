-- Drop existing policies for plant_types table
DROP POLICY IF EXISTS "Anyone can view plant types" ON plant_types;
DROP POLICY IF EXISTS "Users can insert plant types" ON plant_types;
DROP POLICY IF EXISTS "Users can update plant types" ON plant_types;
DROP POLICY IF EXISTS "Users can delete plant types" ON plant_types;

-- Create role-based policies for plant_types
CREATE POLICY "All authenticated users can view plant_types" 
ON plant_types FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers and above can insert plant_types" 
ON plant_types FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers and above can update plant_types" 
ON plant_types FOR UPDATE 
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete plant_types" 
ON plant_types FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));