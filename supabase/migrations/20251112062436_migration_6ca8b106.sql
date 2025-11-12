-- Step 1: Drop all policies that reference profiles.role to remove dependencies
DROP POLICY IF EXISTS "Admins can manage permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can manage role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Admins can manage user permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can view all user permissions" ON user_permissions;