-- 1) Permissions tables for role-based access control

-- Create permissions table (list of modules)
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions table (role-level grants per module)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('admin','manager','user')),
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_read BOOLEAN NOT NULL DEFAULT TRUE,
  can_update BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (role, permission_id)
);

-- Create user_permissions table (per-user overrides; these ADD privileges on top of role)
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_read BOOLEAN NOT NULL DEFAULT FALSE,
  can_update BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, permission_id)
);

-- 2) RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- policies: allow all authenticated to read permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view permissions' AND tablename = 'permissions'
  ) THEN
    CREATE POLICY "Anyone can view permissions" ON permissions FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END$$;

-- Only admins can modify the permissions catalog
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage permissions' AND tablename = 'permissions'
  ) THEN
    CREATE POLICY "Admins can manage permissions" ON permissions
      FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
  END IF;
END$$;

-- role_permissions policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view role permissions' AND tablename = 'role_permissions'
  ) THEN
    CREATE POLICY "Anyone can view role permissions" ON role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage role permissions' AND tablename = 'role_permissions'
  ) THEN
    CREATE POLICY "Admins can manage role permissions" ON role_permissions
      FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
  END IF;
END$$;

-- user_permissions policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all user permissions' AND tablename = 'user_permissions'
  ) THEN
    CREATE POLICY "Admins can view all user permissions" ON user_permissions FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own user permissions' AND tablename = 'user_permissions'
  ) THEN
    CREATE POLICY "Users can view own user permissions" ON user_permissions FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage user permissions' AND tablename = 'user_permissions'
  ) THEN
    CREATE POLICY "Admins can manage user permissions" ON user_permissions
      FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
  END IF;
END$$;

-- 3) Seed permissions for all modules
INSERT INTO permissions (module, description)
VALUES
  ('plant_types', 'Manage plant types and varieties'),
  ('plantings', 'Manage plantings and batch numbers'),
  ('harvests', 'Manage harvests and dispatch slips'),
  ('locations', 'Manage greenhouse locations'),
  ('treatments', 'Track treatments and bulk applications'),
  ('reservations', 'Manage future reservations'),
  ('admin', 'Admin and user management')
ON CONFLICT (module) DO NOTHING;

-- Helper: upsert role permissions quickly
-- Admin: full access to everything
INSERT INTO role_permissions (role, permission_id, can_create, can_read, can_update, can_delete)
SELECT 'admin', id, TRUE, TRUE, TRUE, TRUE FROM permissions
ON CONFLICT (role, permission_id) DO UPDATE SET
  can_create = EXCLUDED.can_create,
  can_read = EXCLUDED.can_read,
  can_update = EXCLUDED.can_update,
  can_delete = EXCLUDED.can_delete;

-- Manager: create/read/update for most, delete disabled
INSERT INTO role_permissions (role, permission_id, can_create, can_read, can_update, can_delete)
SELECT 'manager', id,
  CASE module WHEN 'admin' THEN FALSE ELSE TRUE END,
  TRUE,
  CASE module WHEN 'admin' THEN FALSE ELSE TRUE END,
  FALSE
FROM permissions
ON CONFLICT (role, permission_id) DO UPDATE SET
  can_create = EXCLUDED.can_create,
  can_read = EXCLUDED.can_read,
  can_update = EXCLUDED.can_update,
  can_delete = EXCLUDED.can_delete;

-- User: read-only
INSERT INTO role_permissions (role, permission_id, can_create, can_read, can_update, can_delete)
SELECT 'user', id, FALSE, TRUE, FALSE, FALSE FROM permissions
ON CONFLICT (role, permission_id) DO UPDATE SET
  can_create = EXCLUDED.can_create,
  can_read = EXCLUDED.can_read,
  can_update = EXCLUDED.can_update,
  can_delete = EXCLUDED.can_delete;

-- 4) Fix/re-create the user profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, role)
  VALUES (
    new.id,
    new.email,
    new.raw_app_meta_data ->> 'full_name',
    new.raw_app_meta_data ->> 'username',
    'viewer'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and re-create it to be sure
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();