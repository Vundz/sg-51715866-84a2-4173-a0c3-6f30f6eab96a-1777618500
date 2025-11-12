-- Step 1: Drop the old unique constraint on the module column if it exists.
ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_module_key;

-- Step 2: Add new columns for more granular permission management
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS action VARCHAR(20);
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS resource VARCHAR(50);

-- Step 3: Clear out old permissions to re-seed them correctly
TRUNCATE TABLE public.permissions CASCADE;

-- Step 4: Insert the new, granular permissions for each module
INSERT INTO public.permissions (name, description, module, action, resource) VALUES
  -- Plant Types Module
  ('view_plant_types', 'View plant types and varieties', 'Planting Setup', 'view', 'plant_types'),
  ('edit_plant_types', 'Create and edit plant types', 'Planting Setup', 'edit', 'plant_types'),
  ('delete_plant_types', 'Delete plant types', 'Planting Setup', 'delete', 'plant_types'),
  
  -- Plantings Module
  ('view_plantings', 'View plantings', 'Plantings', 'view', 'plantings'),
  ('edit_plantings', 'Create and edit plantings', 'Plantings', 'edit', 'plantings'),
  ('delete_plantings', 'Delete plantings', 'Plantings', 'delete', 'plantings'),
  
  -- Harvests Module
  ('view_harvests', 'View harvests', 'Harvests', 'view', 'harvests'),
  ('edit_harvests', 'Create and edit harvests', 'Harvests', 'edit', 'harvests'),
  ('delete_harvests', 'Delete harvests', 'Harvests', 'delete', 'harvests'),
  
  -- Locations Module
  ('view_locations', 'View greenhouse locations', 'Locations', 'view', 'locations'),
  ('edit_locations', 'Create and edit locations', 'Locations', 'edit', 'locations'),
  ('delete_locations', 'Delete locations', 'Locations', 'delete', 'locations'),
  
  -- Treatments Module
  ('view_treatments', 'View treatments', 'Treatments', 'view', 'treatments'),
  ('edit_treatments', 'Create and edit treatments', 'Treatments', 'edit', 'treatments'),
  ('delete_treatments', 'Delete treatments', 'Treatments', 'delete', 'treatments'),
  
  -- Reservations Module
  ('view_reservations', 'View reservations', 'Reservations', 'view', 'reservations'),
  ('edit_reservations', 'Create and edit reservations', 'Reservations', 'edit', 'reservations'),
  ('delete_reservations', 'Delete reservations', 'Reservations', 'delete', 'reservations'),
  
  -- Reports Module
  ('view_reports', 'View all reports', 'Reports', 'view', 'reports'),
  ('export_reports', 'Export reports', 'Reports', 'edit', 'reports'),
  
  -- Admin Module
  ('view_admin', 'Access admin console', 'Admin', 'view', 'admin'),
  ('manage_users', 'Manage users', 'Admin', 'edit', 'users'),
  ('manage_roles', 'Manage roles and permissions', 'Admin', 'edit', 'roles');