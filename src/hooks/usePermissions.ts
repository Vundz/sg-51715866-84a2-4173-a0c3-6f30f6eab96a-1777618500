import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

interface PermissionConfig {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface ModulePermissions {
  locations: PermissionConfig;
  plant_types: PermissionConfig;
  plantings: PermissionConfig;
  harvests: PermissionConfig;
  treatments: PermissionConfig;
  reservations: PermissionConfig;
  reports: PermissionConfig;
  admin: PermissionConfig;
  inventory: PermissionConfig;
}

/**
 * Default permissions configuration matching the roles-permissions matrix
 */
const DEFAULT_PERMISSIONS: Record<UserRole, ModulePermissions> = {
  admin: {
    locations: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    plant_types: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    plantings: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    harvests: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    treatments: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    reservations: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    reports: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    admin: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
    inventory: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
  },
  manager: {
    locations: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    plant_types: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    plantings: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    harvests: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    treatments: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    reservations: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    reports: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    admin: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
    inventory: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
  },
  staff: {
    locations: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    plant_types: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    plantings: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    harvests: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    treatments: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    reservations: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    reports: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    admin: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
    inventory: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
  },
  viewer: {
    locations: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    plant_types: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    plantings: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    harvests: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    treatments: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    reservations: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    reports: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    admin: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
    inventory: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
  },
};

/**
 * Hook to check user permissions for a specific module
 * Returns permission flags based on user's role
 */
export function usePermissions(module: keyof ModulePermissions) {
  const { profile } = useAuth();

  const permissions = useMemo(() => {
    if (!profile?.role) {
      // Default to viewer permissions if no role
      return DEFAULT_PERMISSIONS.viewer[module];
    }

    return DEFAULT_PERMISSIONS[profile.role][module];
  }, [profile?.role, module]);

  return permissions;
}